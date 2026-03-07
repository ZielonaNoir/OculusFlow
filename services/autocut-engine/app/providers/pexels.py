from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Any, Dict

from app.config import PEXELS_API_KEY
from app.providers.common import download_to_path, probe_duration_ms, public_url_for_path


async def fetch_pexels_clip(query: str, destination: Path) -> Dict[str, Any] | None:
    import httpx

    if not PEXELS_API_KEY:
        return None

    async with httpx.AsyncClient(timeout=120, follow_redirects=True) as client:
        response = await client.get(
            "https://api.pexels.com/videos/search",
            params={"query": query, "per_page": 1},
            headers={"Authorization": PEXELS_API_KEY},
        )
        if response.status_code >= 400:
            return None
        payload = response.json()
        videos = payload.get("videos", [])
        if not videos:
            return None
        video_files = videos[0].get("video_files", [])
        if not video_files:
            return None
        best = sorted(video_files, key=lambda item: item.get("width", 0), reverse=True)[0]
        url = best.get("link")
        if not url:
            return None
        local_path = await download_to_path(url, destination)
        duration_ms = await asyncio.to_thread(probe_duration_ms, local_path)
        return {
            "provider": "pexels",
            "status": "succeeded",
            "warning": None,
            "source_url": url,
            "local_path": str(local_path),
            "public_url": public_url_for_path(local_path),
            "duration_ms": duration_ms,
            "metadata": {"query": query, "provider_payload": videos[0]},
        }
