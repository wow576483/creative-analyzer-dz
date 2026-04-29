"""Per-scene speech-to-text via faster-whisper."""

from __future__ import annotations

import logging
from functools import lru_cache
from pathlib import Path

from .config import Settings
from .models import SceneSlice, SceneTranscript

log = logging.getLogger(__name__)


@lru_cache(maxsize=2)
def _load_model(name: str, device: str, compute_type: str):  # noqa: ANN202
    from faster_whisper import WhisperModel  # imported lazily for fast tool startup

    log.info("Loading faster-whisper model=%s device=%s", name, device)
    return WhisperModel(name, device=device, compute_type=compute_type)


def transcribe_scene(audio: Path, settings: Settings) -> SceneTranscript:
    """Transcribe one short audio file. Returns empty text on failure / silence."""
    try:
        model = _load_model(
            settings.whisper_model, settings.whisper_device, settings.whisper_compute_type
        )
        segments, info = model.transcribe(
            str(audio),
            beam_size=1,
            vad_filter=True,
            vad_parameters={"min_silence_duration_ms": 400},
        )
        text = " ".join(seg.text.strip() for seg in segments).strip()
        return SceneTranscript(text=text, language=info.language if info else None)
    except Exception as exc:  # pragma: no cover - defensive
        log.warning("Whisper failed on %s: %s", audio, exc)
        return SceneTranscript(text="", language=None)


def transcribe_all(slices: list[SceneSlice], settings: Settings) -> list[SceneTranscript]:
    return [transcribe_scene(Path(s.audio_path), settings) for s in slices]
