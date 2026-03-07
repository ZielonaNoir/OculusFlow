# Auto-Cut Engine

Python media engine for the `Auto-Cut` workflow.

## Run

```bash
cd services/autocut-engine
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

## First-time setup

```bash
cd services/autocut-engine
uv python pin 3.12
uv sync
uv add torch whisperx
```

If `ffmpeg` / `ffprobe` are installed by `winget` but not yet visible in your shell `PATH`, the engine will automatically probe the default `WinGet\\Packages\\Gyan.FFmpeg.Essentials...` directory. You can still override both manually with `.env`.

## Environment

- `APIFY_TOKEN`
- `APIFY_TV_MOVIE_CLIPS_ACTOR_ID` (optional)
- `PEXELS_API_KEY`
- `FISHAUDIO_API_KEY`
- `FFMPEG_PATH`
- `FFPROBE_PATH`
- `WHISPERX_MODEL`

Recommended for CPU development:

- `WHISPERX_MODEL=small`

When provider credentials are missing, the engine falls back to mock clip/audio/subtitle outputs so the end-to-end UI flow remains testable.
