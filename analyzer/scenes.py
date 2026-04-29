"""Scene detection + per-scene asset extraction (keyframe + audio + sub-clip)."""

from __future__ import annotations

import logging
import shutil
import subprocess
from pathlib import Path

from scenedetect import ContentDetector, SceneManager, open_video

from .config import Settings
from .models import SceneSlice

log = logging.getLogger(__name__)


def _ffmpeg_exists() -> bool:
    return shutil.which("ffmpeg") is not None and shutil.which("ffprobe") is not None


def _video_duration(path: Path) -> float:
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
    return float(out)


def detect_scenes(video_path: Path, settings: Settings) -> list[tuple[float, float]]:
    """Run PySceneDetect on the input video and return [(start, end), ...]."""
    video = open_video(str(video_path))
    sm = SceneManager()
    sm.add_detector(ContentDetector(threshold=settings.scene_threshold))
    sm.detect_scenes(video=video, show_progress=False)
    raw = sm.get_scene_list()
    scenes: list[tuple[float, float]] = [
        (float(s.get_seconds()), float(e.get_seconds())) for s, e in raw
    ]

    # Fallback: no scenes detected (e.g. one continuous shot) → split into ~6s chunks.
    if not scenes:
        duration = _video_duration(video_path)
        chunk = 6.0
        t = 0.0
        while t < duration:
            scenes.append((t, min(t + chunk, duration)))
            t += chunk

    # Merge tiny scenes into the next one to avoid 0.3s slivers.
    merged: list[tuple[float, float]] = []
    for start, end in scenes:
        if merged and (end - merged[-1][0]) < settings.min_scene_seconds or (end - start) < settings.min_scene_seconds and merged:
            merged[-1] = (merged[-1][0], end)
        else:
            merged.append((start, end))
    return merged


def _run_ffmpeg(args: list[str]) -> None:
    log.debug("ffmpeg %s", " ".join(args))
    res = subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", *args],
        check=False,
        capture_output=True,
        text=True,
    )
    if res.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {res.stderr.strip()}")


def extract_scene_assets(
    video_path: Path,
    intervals: list[tuple[float, float]],
    out_dir: Path,
) -> list[SceneSlice]:
    """For each (start, end), extract a keyframe, mono 16k audio, and a sub-clip."""
    if not _ffmpeg_exists():
        raise RuntimeError("ffmpeg/ffprobe must be installed and on PATH.")
    out_dir.mkdir(parents=True, exist_ok=True)

    slices: list[SceneSlice] = []
    for i, (start, end) in enumerate(intervals):
        scene_dir = out_dir / f"scene_{i:03d}"
        scene_dir.mkdir(exist_ok=True)
        keyframe = scene_dir / "keyframe.jpg"
        audio = scene_dir / "audio.wav"
        clip = scene_dir / "clip.mp4"

        # Keyframe at the middle of the scene.
        mid = start + (end - start) / 2.0
        _run_ffmpeg(
            [
                "-ss",
                f"{mid:.3f}",
                "-i",
                str(video_path),
                "-frames:v",
                "1",
                "-q:v",
                "3",
                "-vf",
                "scale='min(720,iw)':-2",
                str(keyframe),
            ]
        )

        # Audio (mono, 16kHz, PCM) for whisper.
        _run_ffmpeg(
            [
                "-ss",
                f"{start:.3f}",
                "-to",
                f"{end:.3f}",
                "-i",
                str(video_path),
                "-vn",
                "-ac",
                "1",
                "-ar",
                "16000",
                "-c:a",
                "pcm_s16le",
                str(audio),
            ]
        )

        # Sub-clip (re-encoded, mobile-friendly).
        _run_ffmpeg(
            [
                "-ss",
                f"{start:.3f}",
                "-to",
                f"{end:.3f}",
                "-i",
                str(video_path),
                "-c:v",
                "libx264",
                "-preset",
                "veryfast",
                "-crf",
                "26",
                "-c:a",
                "aac",
                "-movflags",
                "+faststart",
                str(clip),
            ]
        )

        slices.append(
            SceneSlice(
                index=i,
                start=start,
                end=end,
                keyframe_path=str(keyframe),
                audio_path=str(audio),
                video_path=str(clip),
            )
        )
    return slices
