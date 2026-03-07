from __future__ import annotations

import asyncio
import json
import os
import shutil
import subprocess
import wave
from pathlib import Path
from typing import Optional

from app.config import FFPROBE_PATH, PUBLIC_BASE_URL


def ensure_dir(path: Path):
    path.mkdir(parents=True, exist_ok=True)
    return path


async def download_to_path(url: str, destination: Path):
    import httpx

    ensure_dir(destination.parent)
    timeout_seconds = float(os.getenv("AUTOCUT_DOWNLOAD_TIMEOUT_SECONDS", "90"))
    max_retries = max(1, int(os.getenv("AUTOCUT_DOWNLOAD_RETRIES", "3")))
    temp_path = destination.with_suffix(f"{destination.suffix}.part")
    last_error: Exception | None = None

    for attempt in range(1, max_retries + 1):
        try:
            if temp_path.exists():
                temp_path.unlink()
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(timeout_seconds),
                follow_redirects=True,
            ) as client:
                async with client.stream("GET", url) as response:
                    response.raise_for_status()
                    with temp_path.open("wb") as output_file:
                        async for chunk in response.aiter_bytes(chunk_size=1024 * 1024):
                            output_file.write(chunk)
            temp_path.replace(destination)
            return destination
        except Exception as error:
            last_error = error
            if temp_path.exists():
                temp_path.unlink(missing_ok=True)
            if attempt < max_retries:
                await asyncio.sleep(min(2 * attempt, 5))

    raise RuntimeError(f"download failed after {max_retries} attempts: {url}; last_error={last_error}")


def public_url_for_path(path: Path):
    normalized = path.as_posix().split("/.work/")[-1]
    if normalized == path.as_posix():
        normalized = path.as_posix().split(".work/")[-1]
    return f"{PUBLIC_BASE_URL.rstrip('/')}/{normalized}"


def probe_duration_ms(path: Path) -> int:
    if not shutil.which(FFPROBE_PATH):
        return 0
    command = [FFPROBE_PATH, "-v", "error", "-show_entries", "format=duration", "-of", "json", str(path)]
    result = subprocess.run(command, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        return 0
    try:
        payload = json.loads(result.stdout)
        return int(float(payload["format"]["duration"]) * 1000)
    except Exception:
        return 0


def create_silent_wav(path: Path, duration_ms: int = 1500, sample_rate: int = 16000):
    ensure_dir(path.parent)
    frames = int(sample_rate * duration_ms / 1000)
    with wave.open(str(path), "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(b"\x00\x00" * frames)
    return path


def run_command(command: list[str], cwd: Optional[Path] = None):
    result = subprocess.run(command, cwd=str(cwd) if cwd else None, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "command failed")
    return result


def escape_subtitle_path(path: Path):
    return str(path).replace("\\", "/").replace(":", "\\:")
