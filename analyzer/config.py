"""Runtime configuration loaded from environment variables.

The tool supports two LLM providers transparently:

- **OpenAI** when ``OPENAI_API_KEY`` is set (default model ``gpt-4o-mini``).
- **Google Gemini** when ``GEMINI_API_KEY`` is set (default model
  ``gemini-2.5-flash-lite``), accessed through Google's
  `OpenAI-compatible endpoint`_ so we can keep using the ``openai`` SDK.

.. _OpenAI-compatible endpoint: https://ai.google.dev/gemini-api/docs/openai
"""

from __future__ import annotations

import os
from dataclasses import dataclass

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"


@dataclass(frozen=True)
class Settings:
    """Resolved configuration for a single analysis run."""

    # LLM
    llm_provider: str = "none"   # "openai", "gemini" or "none"
    llm_api_key: str | None = None
    llm_model: str = "gpt-4o-mini"
    llm_base_url: str | None = None

    # Whisper
    whisper_model: str = "small"
    whisper_device: str = "cpu"
    whisper_compute_type: str = "int8"

    # Scenes
    scene_threshold: float = 27.0
    min_scene_seconds: float = 1.2

    # TTS (used by the dubbing pipeline)
    tts_api_key: str | None = None
    tts_model: str = "gemini-2.5-flash-preview-tts"
    tts_voice: str = "Kore"

    @classmethod
    def from_env(cls) -> Settings:
        openai_key = os.environ.get("OPENAI_API_KEY") or None
        gemini_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY") or None

        if openai_key:
            provider = "openai"
            api_key = openai_key
            model = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
            base_url: str | None = os.environ.get("OPENAI_BASE_URL") or None
        elif gemini_key:
            provider = "gemini"
            api_key = gemini_key
            # ``-lite`` keeps latency low and avoids the "thinking" overhead
            # of the regular 2.5-flash, which often returns empty responses
            # at small ``max_tokens``.
            model = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash-lite")
            base_url = os.environ.get("GEMINI_BASE_URL", GEMINI_BASE_URL)
        else:
            provider = "none"
            api_key = None
            model = "gpt-4o-mini"
            base_url = None

        # TTS uses Gemini regardless of which provider drives the chat LLM.
        tts_key = gemini_key

        return cls(
            llm_provider=provider,
            llm_api_key=api_key,
            llm_model=model,
            llm_base_url=base_url,
            whisper_model=os.environ.get("WHISPER_MODEL", "small"),
            whisper_device=os.environ.get("WHISPER_DEVICE", "cpu"),
            whisper_compute_type=os.environ.get("WHISPER_COMPUTE_TYPE", "int8"),
            scene_threshold=float(os.environ.get("SCENE_THRESHOLD", "27.0")),
            min_scene_seconds=float(os.environ.get("MIN_SCENE_SECONDS", "1.2")),
            tts_api_key=tts_key,
            tts_model=os.environ.get("GEMINI_TTS_MODEL", "gemini-2.5-flash-preview-tts"),
            tts_voice=os.environ.get("GEMINI_TTS_VOICE", "Kore"),
        )

    @property
    def has_llm(self) -> bool:
        return self.llm_provider != "none" and bool(self.llm_api_key)

    @property
    def has_gemini_for_tts(self) -> bool:
        return bool(self.tts_api_key)
