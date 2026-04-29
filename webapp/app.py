"""FastAPI app exposing a drag-and-drop UI plus a JSON ``/analyze`` endpoint."""

from __future__ import annotations

import logging
import shutil
import threading
import uuid
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from analyzer.config import Settings
from analyzer.models import ProductInfo
from analyzer.pipeline import analyze_video

log = logging.getLogger(__name__)

ROOT = Path(__file__).parent
STATIC = ROOT / "static"
RUNS_DIR = Path("runs").resolve()
UPLOADS_DIR = Path("uploads").resolve()
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


def _run_job(job_id: str, video_path: Path, product: ProductInfo, run_dir: Path) -> None:
    try:
        _set_job(job_id, status="running", progress="detecting scenes…")
        analyze_video(video_path=video_path, product=product, out_dir=run_dir)
        _set_job(
            job_id,
            status="done",
            report_html=f"/runs/{run_dir.name}/report.html",
            report_md=f"/runs/{run_dir.name}/report.md",
            analysis_json=f"/runs/{run_dir.name}/analysis.json",
            creatives_csv=f"/runs/{run_dir.name}/creatives.csv",
        )
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
        "openai_configured": settings.has_llm,
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
        target=_run_job, args=(job_id, upload_path, info, run_dir), daemon=True
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
