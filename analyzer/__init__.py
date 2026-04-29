"""creative-analyzer-dz: analyze ad videos and generate Algerian-darija creative variants."""

from __future__ import annotations

import shutil

__version__ = "0.1.0"


def ensure_ffmpeg_on_path() -> None:
    """Make sure ``ffmpeg`` and ``ffprobe`` resolve, falling back to the
    static binaries shipped by the ``static-ffmpeg`` pip package.

    The local dev box has ffmpeg from apt; the auto-generated Fly.io image
    does not. ``static_ffmpeg.add_paths()`` downloads the binaries on first
    call (cached on disk) and prepends them to ``PATH``.

    Call this lazily — at module import time it can trigger a ~50 MB
    download which would block FastAPI startup and fail the Fly health
    check.
    """
    if shutil.which("ffmpeg") and shutil.which("ffprobe"):
        return
    try:
        import static_ffmpeg

        static_ffmpeg.add_paths(weak=True)
    except Exception:  # pragma: no cover - best-effort
        # Leave PATH alone; downstream code will raise a clearer error.
        pass
