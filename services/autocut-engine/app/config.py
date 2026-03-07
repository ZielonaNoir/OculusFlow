from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parents[1]
load_dotenv(ROOT_DIR / ".env")
WORK_DIR = ROOT_DIR / ".work"
WORK_DIR.mkdir(parents=True, exist_ok=True)

APIFY_TOKEN = os.getenv("APIFY_TOKEN", "")
APIFY_ACTOR_ID = os.getenv("APIFY_TV_MOVIE_CLIPS_ACTOR_ID", "")
PEXELS_API_KEY = os.getenv("PEXELS_API_KEY", "")
FISHAUDIO_API_KEY = os.getenv("FISHAUDIO_API_KEY", "")
FISHAUDIO_BASE_URL = os.getenv("FISHAUDIO_BASE_URL", "https://api.fish.audio")
WHISPERX_MODEL = os.getenv("WHISPERX_MODEL", "small")
os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")
os.environ.setdefault("HF_HUB_DISABLE_XET", "1")
PUBLIC_BASE_URL = os.getenv("AUTOCUT_PUBLIC_BASE_URL", "http://127.0.0.1:8000/static")
MOCK_VIDEO_URL = "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4"


def detect_winget_binary(package_dir: str, binary_name: str):
    package_root = Path.home() / "AppData" / "Local" / "Microsoft" / "WinGet" / "Packages"
    candidate_root = package_root / package_dir
    if not candidate_root.exists():
        return None

    matches = sorted(candidate_root.rglob(binary_name), reverse=True)
    return str(matches[0]) if matches else None


def ensure_runtime_dll_path(binary_path: str):
    try:
        binary_dir = str(Path(binary_path).parent)
    except Exception:
        return
    current_path = os.environ.get("PATH", "")
    if binary_dir not in current_path:
        os.environ["PATH"] = f"{binary_dir};{current_path}" if current_path else binary_dir
    if os.name == "nt" and hasattr(os, "add_dll_directory"):
        try:
            os.add_dll_directory(binary_dir)
        except Exception:
            pass


FFMPEG_SHARED_PATH = detect_winget_binary(
    "Gyan.FFmpeg.Shared_Microsoft.Winget.Source_8wekyb3d8bbwe",
    "ffmpeg.exe",
)
FFPROBE_SHARED_PATH = detect_winget_binary(
    "Gyan.FFmpeg.Shared_Microsoft.Winget.Source_8wekyb3d8bbwe",
    "ffprobe.exe",
)
FFMPEG_ESSENTIALS_PATH = detect_winget_binary(
    "Gyan.FFmpeg.Essentials_Microsoft.Winget.Source_8wekyb3d8bbwe",
    "ffmpeg.exe",
)
FFPROBE_ESSENTIALS_PATH = detect_winget_binary(
    "Gyan.FFmpeg.Essentials_Microsoft.Winget.Source_8wekyb3d8bbwe",
    "ffprobe.exe",
)

FFMPEG_PATH = os.getenv(
    "FFMPEG_PATH",
    FFMPEG_SHARED_PATH
    or FFMPEG_ESSENTIALS_PATH
    or "ffmpeg",
)
FFPROBE_PATH = os.getenv(
    "FFPROBE_PATH",
    FFPROBE_SHARED_PATH
    or FFPROBE_ESSENTIALS_PATH
    or "ffprobe",
)

ensure_runtime_dll_path(FFMPEG_PATH)
ensure_runtime_dll_path(FFPROBE_PATH)
