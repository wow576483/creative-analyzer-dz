"""Thin LLM wrapper used by the vision and adaptation steps.

Supports two providers behind the same interface:

- **OpenAI** (``OPENAI_API_KEY``) — default model ``gpt-4o-mini``.
- **Google Gemini** (``GEMINI_API_KEY``) via Google's
  `OpenAI-compatible endpoint <https://ai.google.dev/gemini-api/docs/openai>`_,
  default model ``gemini-2.5-flash-lite``.

The pipeline is built so that everything still works (with a deterministic
template-based fallback) when no key is set — but quality improves
significantly when one is.

The wrapper also implements:

- Automatic keyframe down-scaling before sending to the LLM (saves tokens
  and avoids free-tier rate limits on Gemini).
- Exponential backoff with retry on 429 / RESOURCE_EXHAUSTED responses.
"""

from __future__ import annotations

import base64
import io
import json
import logging
import random
import time
from pathlib import Path

from PIL import Image

from .config import Settings

log = logging.getLogger(__name__)

# Down-scale keyframes to this longest-edge before base64-encoding
_VISION_MAX_SIDE = 768
_VISION_QUALITY = 80
_MAX_RETRIES = 4
_BASE_BACKOFF = 2.0


def _is_rate_limited(exc: Exception) -> bool:
    msg = str(exc).lower()
    return any(t in msg for t in ("rate limit", "429", "resource_exhausted", "quota"))


class LLMClient:
    """Wrapper exposing two operations: ``vision_describe`` and ``json_chat``."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._client = None
        if settings.has_llm:
            from openai import OpenAI

            kwargs: dict = {"api_key": settings.llm_api_key}
            if settings.llm_base_url:
                kwargs["base_url"] = settings.llm_base_url
            self._client = OpenAI(**kwargs)

    @property
    def enabled(self) -> bool:
        return self._client is not None

    # ------------------------------------------------------------------
    # Vision: describe a single keyframe
    # ------------------------------------------------------------------
    def vision_describe(
        self,
        image_path: Path,
        transcript_hint: str = "",
        product_context: str = "",
    ) -> dict:
        """Return a dict {description, on_screen_text, subjects}. Falls back to {} if no LLM."""
        if not self._client:
            return {}

        client = self._client

        def _do_call() -> dict:
            from .prompts import VIDEO_ANALYSIS_SYSTEM, VIDEO_ANALYSIS_USER

            data_url = _to_data_url(image_path)
            user_text = VIDEO_ANALYSIS_USER.format(
                transcript=transcript_hint or "—",
                product_context=product_context or "(not provided)",
            )
            resp = client.chat.completions.create(
                model=self.settings.llm_model,
                messages=[
                    {"role": "system", "content": VIDEO_ANALYSIS_SYSTEM},
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": user_text},
                            {"type": "image_url", "image_url": {"url": data_url}},
                        ],
                    },
                ],
                response_format={"type": "json_object"},
                temperature=0.2,
                max_tokens=500,
            )
            content = resp.choices[0].message.content or "{}"
            return json.loads(content)

        return _retry(_do_call, label="vision_describe")

    # ------------------------------------------------------------------
    # JSON chat: generic structured generation
    # ------------------------------------------------------------------
    def json_chat(self, system: str, user: str, max_tokens: int = 1500) -> dict:
        if not self._client:
            return {}

        client = self._client

        def _do_call() -> dict:
            resp = client.chat.completions.create(
                model=self.settings.llm_model,
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

        return _retry(_do_call, label="json_chat")


def _retry(fn, label: str) -> dict:
    """Run ``fn`` with exponential backoff on rate-limit / quota errors."""
    last: Exception | None = None
    for attempt in range(_MAX_RETRIES):
        try:
            return fn()
        except Exception as exc:  # pragma: no cover - network-dependent
            last = exc
            if attempt == _MAX_RETRIES - 1 or not _is_rate_limited(exc):
                log.warning("%s failed: %s", label, exc)
                return {}
            sleep_for = _BASE_BACKOFF * (2**attempt) + random.uniform(0, 1.0)
            log.info("%s rate-limited, retrying in %.1fs (attempt %d)", label, sleep_for, attempt + 1)
            time.sleep(sleep_for)
    if last:
        log.warning("%s gave up after retries: %s", label, last)
    return {}


def _to_data_url(image_path: Path) -> str:
    """Down-scale, JPEG-encode, and base64 encode the image for the chat call."""
    try:
        with Image.open(image_path) as im:
            im = im.convert("RGB")
            im.thumbnail((_VISION_MAX_SIDE, _VISION_MAX_SIDE))
            buf = io.BytesIO()
            im.save(buf, format="JPEG", quality=_VISION_QUALITY, optimize=True)
            raw = buf.getvalue()
        mime = "image/jpeg"
    except Exception:  # pragma: no cover
        raw = image_path.read_bytes()
        suffix = image_path.suffix.lower().lstrip(".")
        mime = "image/jpeg" if suffix in {"jpg", "jpeg"} else f"image/{suffix or 'png'}"
    b64 = base64.b64encode(raw).decode("ascii")
    return f"data:{mime};base64,{b64}"
