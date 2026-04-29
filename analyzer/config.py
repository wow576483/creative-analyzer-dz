"""Runtime configuration loaded from environment variables."""

from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    """Resolved configuration for a single analysis run."""

    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"
    whisper_model: str = "small"
    whisper_device: str = "cpu"
    whisper_compute_type: str = "int8"
    scene_threshold: float = 27.0
    min_scene_seconds: float = 1.2

    @classmethod
    def from_env(cls) -> Settings:
        return cls(
            openai_api_key=os.environ.get("OPENAI_API_KEY") or None,
            openai_model=os.environ.get("OPENAI_MODEL", "gpt-4o-mini"),
            whisper_model=os.environ.get("WHISPER_MODEL", "small"),
            whisper_device=os.environ.get("WHISPER_DEVICE", "cpu"),
            whisper_compute_type=os.environ.get("WHISPER_COMPUTE_TYPE", "int8"),
            scene_threshold=float(os.environ.get("SCENE_THRESHOLD", "27.0")),
            min_scene_seconds=float(os.environ.get("MIN_SCENE_SECONDS", "1.2")),
        )

    @property
    def has_llm(self) -> bool:
        return bool(self.openai_api_key)
