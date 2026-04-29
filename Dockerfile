FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    DEBIAN_FRONTEND=noninteractive

# ffmpeg + ffprobe for scene splitting and dubbing,
# libgl1 for opencv (used by scenedetect[opencv]).
RUN apt-get update && apt-get install -y --no-install-recommends \
        ffmpeg \
        libgl1 \
        libglib2.0-0 \
        ca-certificates \
        curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps separately to maximise Docker layer cache hits.
COPY pyproject.toml README.md ./
COPY analyzer/__init__.py analyzer/__init__.py
RUN pip install --upgrade pip \
 && pip install --no-cache-dir .

# Copy the rest of the source.
COPY analyzer ./analyzer
COPY webapp ./webapp

# Persistent dirs (mounted via Fly volume in production).
RUN mkdir -p /data/runs /data/uploads
ENV RUNS_DIR=/data/runs UPLOADS_DIR=/data/uploads

EXPOSE 8000

# uvicorn with one worker is fine — analysis is CPU-bound and we want to keep
# the in-memory job map consistent (it's a per-process dict).
CMD ["uvicorn", "webapp.app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
