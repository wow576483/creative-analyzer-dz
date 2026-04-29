"""Unit tests for the dubbing helpers (no network, no ffmpeg)."""

from __future__ import annotations

import wave
from pathlib import Path

import pytest

from analyzer.config import Settings
from analyzer.dub import (
    _atempo_chain,
    _format_srt_time,
    pick_winning_parts,
    write_srt,
)
from analyzer.models import CreativePart, SceneRole
from analyzer.tts import TTSClient, is_silent_wav


def _part(role: SceneRole, text: str) -> CreativePart:
    return CreativePart(role=role, text_darija=text)


def test_pick_winning_parts_returns_first_variant_per_role() -> None:
    pool = {
        "hook": [_part(SceneRole.HOOK, "h1"), _part(SceneRole.HOOK, "h2")],
        "body": [_part(SceneRole.BODY, "b1")],
        "proof": [_part(SceneRole.PROOF, "p1")],
        "cta": [_part(SceneRole.CTA, "c1")],
    }
    winners = pick_winning_parts(pool)
    assert winners[SceneRole.HOOK].text_darija == "h1"
    assert winners[SceneRole.BODY].text_darija == "b1"
    assert winners[SceneRole.PROOF].text_darija == "p1"
    assert winners[SceneRole.CTA].text_darija == "c1"


def test_pick_winning_parts_handles_missing_roles() -> None:
    winners = pick_winning_parts({"hook": [_part(SceneRole.HOOK, "h1")]})
    assert winners[SceneRole.HOOK] is not None
    assert winners[SceneRole.BODY] is None
    assert winners[SceneRole.PROOF] is None
    assert winners[SceneRole.CTA] is None


@pytest.mark.parametrize(
    "ratio,min_chain",
    [(1.0, 1), (1.5, 1), (0.7, 1), (3.0, 2), (0.3, 2), (5.0, 2), (0.2, 2)],
)
def test_atempo_chain_chains_for_extreme_ratios(ratio: float, min_chain: int) -> None:
    chain = _atempo_chain(ratio)
    assert chain.count("atempo=") >= min_chain


def test_format_srt_time_pads_correctly() -> None:
    assert _format_srt_time(0) == "00:00:00,000"
    assert _format_srt_time(1.5) == "00:00:01,500"
    assert _format_srt_time(65.234) == "00:01:05,234"
    assert _format_srt_time(3661.001) == "01:01:01,001"


def test_write_srt_skips_empty_cues(tmp_path: Path) -> None:
    cues = [
        (0.0, 1.0, "first"),
        (1.0, 2.0, "  "),
        (2.0, 3.5, "third"),
    ]
    out = tmp_path / "t.srt"
    write_srt(cues, out)
    content = out.read_text(encoding="utf-8")
    assert "first" in content
    assert "third" in content
    assert "1\n00:00:00,000 --> 00:00:01,000\nfirst" in content
    # Index 2 should be "third", not the empty cue.
    assert "2\n00:00:02,000 --> 00:00:03,500\nthird" in content


def test_tts_client_writes_silent_wav_without_key(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    settings = Settings.from_env()
    assert not settings.has_gemini_for_tts

    client = TTSClient(settings)
    out = tmp_path / "out.wav"
    produced = client.synthesize("hello world", out, fallback_seconds=0.5)
    assert produced is False
    assert out.exists()

    with wave.open(str(out), "rb") as wf:
        assert wf.getnchannels() == 1
        assert wf.getframerate() == 24000
        assert wf.getnframes() > 0
    assert is_silent_wav(out)
