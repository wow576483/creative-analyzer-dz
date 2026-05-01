"""Text-to-speech wrapper for Algerian-darija dubbing.

Uses Google's `gemini-2.5-flash-preview-tts` model when ``GEMINI_API_KEY`` is
set. The Gemini TTS API returns raw 24 kHz mono PCM (s16le) which we wrap as a
WAV file on disk so downstream ffmpeg steps can consume it directly.

If no key is configured (or the call fails), a silent WAV of the requested
duration is returned so the dubbing pipeline can still finish without
crashing — the caller can detect this via :func:`is_silent_wav`.
"""

from __future__ import annotations

import logging
import os
import struct
import wave
from pathlib import Path

from .config import Settings

log = logging.getLogger(__name__)

# Gemini TTS native output: 24 kHz, mono, 16-bit PCM (little-endian).
TTS_RATE = 24000
TTS_CHANNELS = 1
TTS_SAMPLE_WIDTH = 2

# Default voice for darija marketing — Achird (Friendly) sounds like a young
# woman recommending a product to a friend, much more natural than the
# previous default (Kore = Firm) for ad copy. Override via TTS_VOICE env.
# Other good picks for upbeat ads: "Laomedeia" (Upbeat), "Sulafat" (Warm),
# "Aoede" (Breezy), "Leda" (Youthful).
DEFAULT_VOICE = os.environ.get("TTS_VOICE", "Achird")

# Style prompt prepended to the text. Concrete persona + delivery direction
# lifts the perceived naturalness significantly over a generic instruction.
DARIJA_STYLE = (
    "You are a young Algerian woman in her late twenties recording a TikTok ad "
    "for a friend's online shop. Speak in natural conversational Algerian "
    "Darija (Maghrebi Arabic, NOT formal Fusha) with the relaxed Algiers "
    "rhythm. Be warm, friendly, and a bit excited — like you genuinely use "
    "the product and want your friend to try it. Keep the energy upbeat but "
    "human, with realistic micro-pauses at commas and a short pause at every "
    "full stop. Pronounce French loanwords (livraison, promo, gratuit) with "
    "a Maghrebi accent. Do NOT read any punctuation marks aloud, do NOT "
    "narrate stage directions, do NOT add anything that isn't in the script. "
    "Read this ad copy:\n"
)


def _write_silent_wav(out_path: Path, seconds: float) -> None:
    n_samples = int(seconds * TTS_RATE)
    silence = struct.pack("<" + "h" * n_samples, *([0] * n_samples)) if n_samples else b""
    with wave.open(str(out_path), "wb") as wf:
        wf.setnchannels(TTS_CHANNELS)
        wf.setsampwidth(TTS_SAMPLE_WIDTH)
        wf.setframerate(TTS_RATE)
        wf.writeframes(silence)


def _write_pcm_as_wav(out_path: Path, pcm_bytes: bytes) -> None:
    with wave.open(str(out_path), "wb") as wf:
        wf.setnchannels(TTS_CHANNELS)
        wf.setsampwidth(TTS_SAMPLE_WIDTH)
        wf.setframerate(TTS_RATE)
        wf.writeframes(pcm_bytes)


class TTSClient:
    """Thin Gemini-TTS wrapper.

    Falls back to writing a silent WAV when no provider is configured, so the
    pipeline always produces a valid (if mute) audio file.
    """

    def __init__(self, settings: Settings, voice: str = DEFAULT_VOICE) -> None:
        self.settings = settings
        self.voice = voice
        self._client = None
        if settings.has_gemini_for_tts:
            try:
                from google import genai

                self._client = genai.Client(api_key=settings.tts_api_key)
            except Exception as exc:  # pragma: no cover - import-time
                log.warning("google-genai unavailable, TTS will be silent: %s", exc)
                self._client = None

    @property
    def enabled(self) -> bool:
        return self._client is not None

    def synthesize(self, text: str, out_wav: Path, fallback_seconds: float = 3.0) -> bool:
        """Render ``text`` to ``out_wav`` (24 kHz mono WAV).

        Returns True when real TTS audio was produced, False when a silent
        placeholder was written (so callers can mark the run as degraded).
        """
        out_wav.parent.mkdir(parents=True, exist_ok=True)

        if not self._client or not text.strip():
            _write_silent_wav(out_wav, fallback_seconds)
            return False

        client = self._client
        try:
            from google.genai import types

            resp = client.models.generate_content(
                model=self.settings.tts_model,
                contents=DARIJA_STYLE + text,
                config=types.GenerateContentConfig(
                    response_modalities=["AUDIO"],
                    speech_config=types.SpeechConfig(
                        voice_config=types.VoiceConfig(
                            prebuilt_voice_config=types.PrebuiltVoiceConfig(
                                voice_name=self.voice
                            )
                        )
                    ),
                ),
            )
            candidates = resp.candidates or []
            if not candidates:
                raise RuntimeError("empty candidate list from Gemini TTS")
            content = candidates[0].content
            parts = content.parts if content is not None else None
            if not parts:
                raise RuntimeError("empty parts list from Gemini TTS")
            inline = parts[0].inline_data
            pcm = inline.data if inline is not None else None
            if not pcm:
                raise RuntimeError("empty audio payload from Gemini TTS")
            _write_pcm_as_wav(out_wav, pcm)
            return True
        except Exception as exc:  # pragma: no cover - network-dependent
            log.warning("Gemini TTS failed (%s); writing silent placeholder.", exc)
            _write_silent_wav(out_wav, fallback_seconds)
            return False


def is_silent_wav(path: Path) -> bool:
    """Cheap heuristic: True if the file is shorter than 0.1 s of non-zero audio.

    Used by tests + CLI summary to detect that the TTS pipeline degraded to the
    silent fallback.
    """
    try:
        with wave.open(str(path), "rb") as wf:
            n = wf.getnframes()
            if n == 0:
                return True
            wf.setpos(0)
            sample = wf.readframes(min(n, wf.getframerate()))
        # If every byte in the first second is zero, treat as silent.
        return all(b == 0 for b in sample)
    except Exception:
        return True


__all__ = ["TTSClient", "is_silent_wav", "TTS_RATE"]
