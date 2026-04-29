"""Top-level orchestrator that wires every step together."""

from __future__ import annotations

import logging
import shutil
from pathlib import Path

from .adapt import build_parts_pool
from .classify import classify_scenes
from .config import Settings
from .llm import LLMClient
from .models import AnalysisResult, ProductInfo
from .permutation import generate_scripts
from .report import write_outputs
from .scenes import detect_scenes, extract_scene_assets
from .transcribe import transcribe_all
from .vision import analyze_all

log = logging.getLogger(__name__)


def analyze_video(
    video_path: Path,
    product: ProductInfo,
    out_dir: Path,
    settings: Settings | None = None,
    n_creatives: int = 8,
    per_role: int = 5,
    strategy: str = "zip_balanced",
) -> AnalysisResult:
    """Run the full pipeline on ``video_path`` and return a complete result."""
    settings = settings or Settings.from_env()
    out_dir = Path(out_dir)
    if out_dir.exists():
        shutil.rmtree(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    log.info("[1/6] Detecting scenes…")
    intervals = detect_scenes(video_path, settings)
    log.info("Detected %d scenes", len(intervals))

    log.info("[2/6] Extracting assets…")
    slices = extract_scene_assets(video_path, intervals, out_dir / "scenes")

    log.info("[3/6] Transcribing audio per scene…")
    transcripts = transcribe_all(slices, settings)

    llm = LLMClient(settings)
    log.info("[4/6] Visual analysis (LLM=%s)…", llm.enabled)
    visions = analyze_all(slices, transcripts, llm)

    log.info("[5/6] Classifying scene roles…")
    scenes = classify_scenes(slices, transcripts, visions, llm)

    log.info("[6/6] Adapting to Algerian darija + permutation…")
    pool = build_parts_pool(scenes, product, llm, per_role=per_role)
    creatives = generate_scripts(pool, product, n=n_creatives, strategy=strategy)

    result = AnalysisResult(
        product=product,
        source_video=str(video_path),
        scenes=scenes,
        creatives=creatives,
        parts_pool={role.value: parts for role, parts in pool.items()},
    )

    write_outputs(result, out_dir)
    log.info("Wrote outputs to %s", out_dir)
    return result


__all__ = ["analyze_video"]
