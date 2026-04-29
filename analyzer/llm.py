"""Thin OpenAI wrapper used by the vision and adaptation steps.

The pipeline is built so that everything still works (with a deterministic
template-based fallback) when ``OPENAI_API_KEY`` is missing — but quality
improves significantly when an API key is set.
"""

from __future__ import annotations

import base64
import json
import logging
from pathlib import Path

from .config import Settings

log = logging.getLogger(__name__)


class LLMClient:
    """Wrapper exposing two operations: ``vision_describe`` and ``json_chat``."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._client = None
        if settings.has_llm:
            from openai import OpenAI

            self._client = OpenAI(api_key=settings.openai_api_key)

    @property
    def enabled(self) -> bool:
        return self._client is not None

    # ------------------------------------------------------------------
    # Vision: describe a single keyframe
    # ------------------------------------------------------------------
    def vision_describe(self, image_path: Path, transcript_hint: str = "") -> dict:
        """Return a dict {description, on_screen_text, subjects}. Falls back to {} if no LLM."""
        if not self._client:
            return {}
        try:
            data_url = _to_data_url(image_path)
            prompt = (
                "أنت تحلّل لقطة من فيديو إعلان لمنتج. صف باختصار:\n"
                "1) ما الذي يحدث في اللقطة (شخص، منتج، فعل).\n"
                "2) أي نص يظهر على الشاشة (انسخه كما هو إن أمكن).\n"
                "3) قائمة المواضيع/العناصر البارزة (subjects).\n"
                f"تلميح صوتي (نص ما يقال): {transcript_hint or '—'}\n\n"
                "أعد الجواب JSON فقط بهذا الشكل:\n"
                '{"description": "...", "on_screen_text": "...", "subjects": ["..."]}'
            )
            resp = self._client.chat.completions.create(
                model=self.settings.openai_model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {"type": "image_url", "image_url": {"url": data_url}},
                        ],
                    }
                ],
                response_format={"type": "json_object"},
                temperature=0.2,
                max_tokens=400,
            )
            content = resp.choices[0].message.content or "{}"
            return json.loads(content)
        except Exception as exc:  # pragma: no cover - network-dependent
            log.warning("vision_describe failed: %s", exc)
            return {}

    # ------------------------------------------------------------------
    # JSON chat: generic structured generation
    # ------------------------------------------------------------------
    def json_chat(self, system: str, user: str, max_tokens: int = 1500) -> dict:
        if not self._client:
            return {}
        try:
            resp = self._client.chat.completions.create(
                model=self.settings.openai_model,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                response_format={"type": "json_object"},
                temperature=0.5,
                max_tokens=max_tokens,
            )
            content = resp.choices[0].message.content or "{}"
            return json.loads(content)
        except Exception as exc:  # pragma: no cover - network-dependent
            log.warning("json_chat failed: %s", exc)
            return {}


def _to_data_url(image_path: Path) -> str:
    raw = image_path.read_bytes()
    b64 = base64.b64encode(raw).decode("ascii")
    suffix = image_path.suffix.lower().lstrip(".")
    mime = "image/jpeg" if suffix in {"jpg", "jpeg"} else f"image/{suffix or 'png'}"
    return f"data:{mime};base64,{b64}"
