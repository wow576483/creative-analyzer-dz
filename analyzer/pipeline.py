"""Top-level orchestrator that wires every step together."""

from __future__ import annotations

import logging
import shutil
from collections.abc import Callable
from pathlib import Path

from . import ensure_ffmpeg_on_path
from .adapt import build_parts_pool
from .classify import classify_scenes
from .config import Settings
from .dub import dub_video
from .edit_plan import generate_edit_plans_for_top
from .hook_gen import generate_standalone_hooks
from .llm import LLMClient
from .models import AnalysisResult, ProductInfo
from .permutation import generate_scripts
from .ranker import rank_scripts
from .report import write_outputs
from .scenes import detect_scenes, extract_scene_assets
from .transcribe import transcribe_all
from .vision import analyze_all

log = logging.getLogger(__name__)

ProgressCallback = Callable[[int, str], None]


def _noop_progress(percent: int, message: str) -> None:
    return None


def analyze_video(
    video_path: Path,
    product: ProductInfo,
    out_dir: Path,
    settings: Settings | None = None,
    n_creatives: int = 8,
    per_role: int = 5,
    strategy: str = "zip_balanced",
    dub: bool = False,
    burn_subs: bool = False,
    progress: ProgressCallback | None = None,
) -> AnalysisResult:
    """Run the full pipeline on ``video_path`` and return a complete result.

    ``progress``: optional callable invoked at each stage with
    ``(percent: int, message: str)``. ``percent`` is monotonic and ranges
    0 → 100. ``message`` is a short Arabic label describing the current step.
    """
    on_progress = progress or _noop_progress
    ensure_ffmpeg_on_path()
    settings = settings or Settings.from_env()
    out_dir = Path(out_dir)
    if out_dir.exists():
        shutil.rmtree(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    on_progress(2, "تجهيز…")
    log.info("[1/9] Detecting scenes…")
    on_progress(5, "تقطيع المشاهد…")
    intervals = detect_scenes(video_path, settings)
    log.info("Detected %d scenes", len(intervals))

    on_progress(15, f"استخراج {len(intervals)} مشهد…")
    log.info("[2/9] Extracting assets…")
    slices = extract_scene_assets(video_path, intervals, out_dir / "scenes")

    on_progress(25, "تفريغ الصوت (Whisper)…")
    log.info("[3/9] Transcribing audio per scene…")
    transcripts = transcribe_all(slices, settings)

    llm = LLMClient(settings)
    on_progress(40, "تحليل بصري (Vision LLM)…")
    log.info("[4/9] Visual analysis (LLM=%s)…", llm.enabled)
    visions = analyze_all(slices, transcripts, llm)

    on_progress(55, "تصنيف المشاهد…")
    log.info("[5/9] Classifying scene roles…")
    scenes = classify_scenes(slices, transcripts, visions, llm)

    on_progress(65, "إعادة كتابة بالدارجة…")
    log.info("[6/9] Adapting to Algerian darija + permutation…")
    pool = build_parts_pool(scenes, product, llm, per_role=per_role)
    creatives = generate_scripts(pool, product, n=n_creatives, strategy=strategy)

    on_progress(78, "توليد Hooks قوية…")
    log.info("[7/9] Generating standalone hooks (Prompt 4)…")
    standalone_hooks = generate_standalone_hooks(product, llm, count=5)

    on_progress(85, "ترتيب السكريبتات /100…")
    log.info("[8/9] Ranking scripts (Prompt 6)…")
    rankings = rank_scripts(creatives, llm)

    on_progress(90, "توليد خطط التحرير…")
    log.info("[9/9] Generating edit plans for top 3 scripts (Prompt 7)…")
    edit_plans = generate_edit_plans_for_top(creatives, rankings, product, llm, top_n=3)

    result = AnalysisResult(
        product=product,
        source_video=str(video_path),
        scenes=scenes,
        creatives=creatives,
        parts_pool={role.value: parts for role, parts in pool.items()},
        rankings=rankings,
        edit_plans=edit_plans,
        standalone_hooks=standalone_hooks,
    )

    on_progress(95, "كتابة التقارير…")
    write_outputs(result, out_dir)
    log.info("Wrote outputs to %s", out_dir)

    if dub:
        try:
            on_progress(96, "دبلجة الفيديو (Gemini TTS)…")
            log.info("[Dub] Dubbing video with Gemini TTS (burn_subs=%s)…", burn_subs)
            artifacts = dub_video(
                result=result,
                source_video=video_path,
                out_dir=out_dir,
                settings=settings,
                burn_subs=burn_subs,
                product=product,
            )
            log.info("Dubbed video → %s (tts_used=%s)", artifacts["video"], artifacts["tts_used"])
        except Exception as exc:  # noqa: BLE001 - dubbing is best-effort
            log.warning("Dubbing failed: %s", exc)

    on_progress(100, "اكتمل!")
    return result


__all__ = ["analyze_video", "ProgressCallback"]
