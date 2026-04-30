"""Per-scene visual analysis (keyframe → description + on-screen text + subjects)."""

from __future__ import annotations

from pathlib import Path

from .llm import LLMClient
from .models import SceneSlice, SceneTranscript, SceneVision


def analyze_scene_vision(
    slice_: SceneSlice, transcript: SceneTranscript, llm: LLMClient
) -> SceneVision:
    """Describe the keyframe of a scene. Returns an empty SceneVision when no LLM."""
    if not llm.enabled:
        return SceneVision(description="", on_screen_text="", detected_subjects=[])

    raw = llm.vision_describe(Path(slice_.keyframe_path), transcript.text)
    if not raw:
        return SceneVision()

    subjects_raw = raw.get("subjects") or []
    if isinstance(subjects_raw, str):
        subjects = [s.strip() for s in subjects_raw.split(",") if s.strip()]
    else:
        subjects = [str(s).strip() for s in subjects_raw if str(s).strip()]

    # Support both the new 7-stage prompt (visual_description) and the legacy
    # (description) field so existing tests keep passing.
    description = str(
        raw.get("visual_description") or raw.get("description") or ""
    ).strip()

    return SceneVision(
        description=description,
        on_screen_text=str(raw.get("on_screen_text") or "").strip(),
        detected_subjects=subjects,
        product_action=str(raw.get("product_action") or "").strip(),
        emotion=str(raw.get("emotion") or "").strip(),
        marketing_intent=str(raw.get("marketing_intent") or "").strip(),
    )


def analyze_all(
    slices: list[SceneSlice], transcripts: list[SceneTranscript], llm: LLMClient
) -> list[SceneVision]:
    return [analyze_scene_vision(s, t, llm) for s, t in zip(slices, transcripts, strict=True)]
