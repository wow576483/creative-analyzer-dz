"""Dubbing pipeline: pick a winning script, render TTS, mux a final video.

Public entry point: :func:`dub_video`. Given an :class:`AnalysisResult` and the
original video path it:

1. Picks the **winning** Hook / Body / Proof / CTA from the parts pool (auto:
   first variant per role).
2. Maps each detected scene to the winning copy of its role (transitions and
   anything else fall back to the body line).
3. Synthesizes one TTS clip per scene with :class:`~analyzer.tts.TTSClient`.
4. Time-stretches each clip with ffmpeg ``atempo`` so it matches that scene's
   duration; pads with silence at the end if the TTS came up short.
5. Concatenates the per-scene clips into a single new audio track aligned with
   the original video timeline, then muxes it back onto the original video,
   replacing the original audio. Optionally burns subtitles.
"""

from __future__ import annotations

import logging
import shutil
import subprocess
from pathlib import Path

from .config import Settings
from .models import AnalysisResult, AnalyzedScene, CreativePart, ProductInfo, SceneRole
from .tts import TTS_RATE, TTSClient

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# script picker
# ---------------------------------------------------------------------------


def pick_winning_parts(
    pool: dict[str, list[CreativePart]],
) -> dict[SceneRole, CreativePart | None]:
    """Auto-select the first variant in each role pool.

    Returns ``None`` for roles that have no variants (extremely defensive — the
    analyzer always backfills with templates so this shouldn't happen in
    practice).
    """
    chosen: dict[SceneRole, CreativePart | None] = {}
    for role in (SceneRole.HOOK, SceneRole.BODY, SceneRole.PROOF, SceneRole.CTA):
        variants = pool.get(role.value, [])
        chosen[role] = variants[0] if variants else None
    return chosen


def _line_for_scene(
    scene: AnalyzedScene,
    winners: dict[SceneRole, CreativePart | None],
) -> str:
    """Pick the dubbing line for one scene based on its classified role."""
    role = scene.role
    # Transitions or anything not in the winner map fall back to BODY.
    part = winners.get(role) if role in (SceneRole.HOOK, SceneRole.BODY, SceneRole.PROOF, SceneRole.CTA) else None
    if part is None:
        part = winners.get(SceneRole.BODY) or winners.get(SceneRole.HOOK)
    return (part.text_darija if part else "").strip()


# ---------------------------------------------------------------------------
# ffmpeg helpers
# ---------------------------------------------------------------------------


def _ffmpeg(args: list[str]) -> None:
    log.debug("ffmpeg %s", " ".join(args))
    res = subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", *args],
        check=False,
        capture_output=True,
        text=True,
    )
    if res.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {res.stderr.strip()}")


def _audio_duration(path: Path) -> float:
    out = subprocess.check_output(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        text=True,
    ).strip()
    try:
        return float(out)
    except ValueError:
        return 0.0


def _atempo_chain(ratio: float) -> str:
    """Build a chained ``atempo`` filter for arbitrary stretch ratios.

    A single ``atempo`` filter only accepts factors in ``[0.5, 2.0]``; we chain
    multiple instances to cover wider ranges (e.g. 4× = atempo=2,atempo=2).
    """
    ratio = max(0.25, min(4.0, ratio))
    filters: list[str] = []
    while ratio > 2.0:
        filters.append("atempo=2.0")
        ratio /= 2.0
    while ratio < 0.5:
        filters.append("atempo=0.5")
        ratio /= 0.5
    filters.append(f"atempo={ratio:.4f}")
    return ",".join(filters)


def _fit_to_duration(in_wav: Path, out_wav: Path, target_seconds: float) -> None:
    """Stretch/compress ``in_wav`` to ``target_seconds`` and pad with silence
    if needed.
    """
    src_dur = _audio_duration(in_wav)
    if src_dur <= 0.05:
        # TTS returned silence — just emit a silent file at target length.
        _ffmpeg(
            [
                "-f",
                "lavfi",
                "-i",
                f"anullsrc=channel_layout=mono:sample_rate={TTS_RATE}",
                "-t",
                f"{target_seconds:.3f}",
                "-c:a",
                "pcm_s16le",
                str(out_wav),
            ]
        )
        return

    if target_seconds <= 0.05:
        shutil.copyfile(in_wav, out_wav)
        return

    ratio = src_dur / target_seconds
    atempo = _atempo_chain(ratio)
    # After the stretch, pad/trim to exact target so concat math stays aligned.
    pad_filter = f"{atempo},apad,atrim=duration={target_seconds:.3f}"
    _ffmpeg(
        [
            "-i",
            str(in_wav),
            "-filter:a",
            pad_filter,
            "-ar",
            str(TTS_RATE),
            "-ac",
            "1",
            "-c:a",
            "pcm_s16le",
            str(out_wav),
        ]
    )


def _concat_audio(parts: list[Path], out_wav: Path) -> None:
    """Concatenate WAV ``parts`` into a single PCM WAV using the demuxer."""
    list_file = out_wav.with_suffix(".concat.txt")
    list_file.write_text(
        "\n".join(f"file '{p.resolve()}'" for p in parts) + "\n",
        encoding="utf-8",
    )
    _ffmpeg(
        [
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(list_file),
            "-ar",
            str(TTS_RATE),
            "-ac",
            "1",
            "-c:a",
            "pcm_s16le",
            str(out_wav),
        ]
    )
    list_file.unlink(missing_ok=True)


# ---------------------------------------------------------------------------
# subtitles
# ---------------------------------------------------------------------------


def _format_srt_time(t: float) -> str:
    if t < 0:
        t = 0.0
    h = int(t // 3600)
    m = int((t % 3600) // 60)
    s = int(t % 60)
    ms = int(round((t - int(t)) * 1000))
    if ms == 1000:
        s += 1
        ms = 0
    if s == 60:
        m += 1
        s = 0
    if m == 60:
        h += 1
        m = 0
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def write_srt(
    cues: list[tuple[float, float, str]],
    out_path: Path,
) -> None:
    """Write a minimal UTF-8 SRT file."""
    lines: list[str] = []
    idx = 0
    for start, end, text in cues:
        if not text.strip():
            continue
        idx += 1
        lines.append(str(idx))
        lines.append(f"{_format_srt_time(start)} --> {_format_srt_time(end)}")
        lines.append(text.strip())
        lines.append("")
    out_path.write_text("\n".join(lines), encoding="utf-8")


# ---------------------------------------------------------------------------
# main entry
# ---------------------------------------------------------------------------


def dub_video(
    result: AnalysisResult,
    source_video: Path,
    out_dir: Path,
    settings: Settings,
    burn_subs: bool = False,
    product: ProductInfo | None = None,  # kept for API symmetry / future tweaks
) -> dict[str, str]:
    """Build a fully-dubbed MP4 from ``result.scenes`` and the original video.

    Returns a dict of artifact paths::

        {
            "video": ".../final_dubbed.mp4",
            "audio": ".../final_dubbed.wav",
            "srt":   ".../final_dubbed.srt",
            "tts_used": "true" | "false",
        }
    """
    del product  # unused for now; placeholder for future personalisation
    out_dir = Path(out_dir)
    dub_dir = out_dir / "dub"
    dub_dir.mkdir(parents=True, exist_ok=True)

    winners = pick_winning_parts(result.parts_pool)
    if not any(winners.values()):
        raise RuntimeError("parts pool is empty; cannot dub video.")

    tts = TTSClient(settings, voice=settings.tts_voice)
    log.info("Dubbing: TTS enabled=%s, scenes=%d, burn_subs=%s",
             tts.enabled, len(result.scenes), burn_subs)

    cues: list[tuple[float, float, str]] = []
    fitted_parts: list[Path] = []
    real_audio = False

    for scene in result.scenes:
        line = _line_for_scene(scene, winners)
        cues.append((scene.slice.start, scene.slice.end, line))

        raw_wav = dub_dir / f"scene_{scene.slice.index:03d}.wav"
        produced = tts.synthesize(line, raw_wav, fallback_seconds=scene.slice.duration)
        real_audio = real_audio or produced

        fitted = dub_dir / f"scene_{scene.slice.index:03d}_fit.wav"
        _fit_to_duration(raw_wav, fitted, scene.slice.duration)
        fitted_parts.append(fitted)

    full_audio = dub_dir / "track.wav"
    _concat_audio(fitted_parts, full_audio)

    srt_path = out_dir / "final_dubbed.srt"
    write_srt(cues, srt_path)

    final_video = out_dir / "final_dubbed.mp4"
    if burn_subs:
        # ``subtitles=`` filter expects a relative posix path; pass as-is.
        sub_filter = f"subtitles='{srt_path.as_posix()}'"
        _ffmpeg(
            [
                "-i",
                str(source_video),
                "-i",
                str(full_audio),
                "-map",
                "0:v:0",
                "-map",
                "1:a:0",
                "-vf",
                sub_filter,
                "-c:v",
                "libx264",
                "-preset",
                "veryfast",
                "-crf",
                "22",
                "-c:a",
                "aac",
                "-b:a",
                "192k",
                "-shortest",
                "-movflags",
                "+faststart",
                str(final_video),
            ]
        )
    else:
        _ffmpeg(
            [
                "-i",
                str(source_video),
                "-i",
                str(full_audio),
                "-map",
                "0:v:0",
                "-map",
                "1:a:0",
                "-c:v",
                "copy",
                "-c:a",
                "aac",
                "-b:a",
                "192k",
                "-shortest",
                "-movflags",
                "+faststart",
                str(final_video),
            ]
        )

    return {
        "video": str(final_video),
        "audio": str(full_audio),
        "srt": str(srt_path),
        "tts_used": "true" if real_audio else "false",
    }


__all__ = ["dub_video", "pick_winning_parts", "write_srt"]
