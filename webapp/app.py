"""FastAPI app exposing a drag-and-drop UI plus a JSON ``/analyze`` endpoint."""

from __future__ import annotations

import contextlib
import logging
import os
import shutil
import threading
import uuid
from pathlib import Path

# Best-effort load of a gitignored production secrets file. Used on Fly.io
# where the auto-generated image has no other way to receive env vars.
with contextlib.suppress(ImportError):
    from webapp import _prod_secrets  # type: ignore[unused-ignore]  # noqa: F401

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from analyzer.config import Settings
from analyzer.models import ProductInfo

log = logging.getLogger(__name__)

ROOT = Path(__file__).parent
STATIC = ROOT / "static"
# Allow overriding via env so the same app works locally (./runs)
# and on Fly.io with a mounted volume (/data/runs). When /data exists
# (Fly volume), prefer it transparently.
_default_root = Path("/data") if Path("/data").is_dir() and os.access("/data", os.W_OK) else Path()
RUNS_DIR = Path(os.environ.get("RUNS_DIR", str(_default_root / "runs") if _default_root != Path() else "runs")).resolve()
UPLOADS_DIR = Path(os.environ.get("UPLOADS_DIR", str(_default_root / "uploads") if _default_root != Path() else "uploads")).resolve()
RUNS_DIR.mkdir(parents=True, exist_ok=True)
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="creative-analyzer-dz")
app.mount("/static", StaticFiles(directory=str(STATIC)), name="static")

# Mount runs/ so the HTML report can reference scene keyframes.
app.mount("/runs", StaticFiles(directory=str(RUNS_DIR), check_dir=False), name="runs")


# ---------------------------------------------------------------------------
# Job tracking (in-memory; sufficient for single-user local use)
# ---------------------------------------------------------------------------
_JOBS: dict[str, dict] = {}
_JOBS_LOCK = threading.Lock()


def _set_job(job_id: str, **kwargs) -> None:
    with _JOBS_LOCK:
        _JOBS.setdefault(job_id, {})
        _JOBS[job_id].update(kwargs)


def _get_job(job_id: str) -> dict | None:
    with _JOBS_LOCK:
        return _JOBS.get(job_id)


def _run_job(
    job_id: str,
    video_path: Path,
    product: ProductInfo,
    run_dir: Path,
    dub: bool = False,
    burn_subs: bool = False,
) -> None:
    try:
        _set_job(job_id, status="running", progress="detecting scenes…")
        # Lazy import: keeps app boot fast (faster-whisper + ctranslate2 +
        # opencv are heavy at import time).
        from analyzer.pipeline import analyze_video

        analyze_video(
            video_path=video_path,
            product=product,
            out_dir=run_dir,
            dub=dub,
            burn_subs=burn_subs,
        )
        outputs = {
            "status": "done",
            "report_html": f"/runs/{run_dir.name}/report.html",
            "report_md": f"/runs/{run_dir.name}/report.md",
            "analysis_json": f"/runs/{run_dir.name}/analysis.json",
            "creatives_csv": f"/runs/{run_dir.name}/creatives.csv",
        }
        if dub and (run_dir / "final_dubbed.mp4").exists():
            outputs["dubbed_video"] = f"/runs/{run_dir.name}/final_dubbed.mp4"
            outputs["dubbed_srt"] = f"/runs/{run_dir.name}/final_dubbed.srt"
        _set_job(job_id, **outputs)
    except Exception as exc:  # pragma: no cover - runtime failure
        log.exception("Job %s failed", job_id)
        _set_job(job_id, status="error", error=str(exc))


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.get("/", response_class=HTMLResponse)
def index(request: Request) -> HTMLResponse:
    html = (STATIC / "index.html").read_text(encoding="utf-8")
    return HTMLResponse(html)


@app.get("/health")
def health() -> dict:
    settings = Settings.from_env()
    return {
        "ok": True,
        "llm_provider": settings.llm_provider,
        "openai_configured": settings.has_llm,
        "tts_configured": settings.has_gemini_for_tts,
        "whisper_model": settings.whisper_model,
    }


@app.post("/analyze")
async def analyze(
    video: UploadFile = File(...),
    product: str = Form(...),
    description: str = Form(""),
    price: float | None = Form(None),
    old_price: float | None = Form(None),
    currency: str = Form("DZD"),
    phone: str | None = Form(None),
    free_shipping: bool = Form(True),
    dub: bool = Form(False),
    burn_subs: bool = Form(False),
) -> JSONResponse:
    """Kick off a new background analysis job."""
    if not video.filename:
        raise HTTPException(400, "missing video")

    job_id = uuid.uuid4().hex[:10]
    run_dir = RUNS_DIR / job_id
    run_dir.mkdir(parents=True, exist_ok=True)
    upload_path = UPLOADS_DIR / f"{job_id}_{Path(video.filename).name}"
    with upload_path.open("wb") as f:
        shutil.copyfileobj(video.file, f)

    info = ProductInfo(
        name=product,
        description=description,
        price=price,
        old_price=old_price,
        currency=currency,
        landing_phone=phone,
        free_shipping=free_shipping,
    )

    _set_job(job_id, status="queued")
    threading.Thread(
        target=_run_job,
        args=(job_id, upload_path, info, run_dir, dub, burn_subs),
        daemon=True,
    ).start()

    return JSONResponse({"job_id": job_id, "status": "queued"})


@app.get("/jobs/{job_id}")
def job_status(job_id: str) -> JSONResponse:
    job = _get_job(job_id)
    if job is None:
        raise HTTPException(404, "unknown job")
    return JSONResponse(job)


@app.get("/jobs/{job_id}/report")
def job_report(job_id: str) -> FileResponse:
    job = _get_job(job_id)
    if not job or job.get("status") != "done":
        raise HTTPException(404, "report not ready")
    path = RUNS_DIR / job_id / "report.html"
    if not path.exists():
        raise HTTPException(404, "report missing on disk")
    return FileResponse(path, media_type="text/html")
