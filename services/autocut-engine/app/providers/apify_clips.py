from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Any, Dict

from app.config import APIFY_ACTOR_ID, APIFY_TOKEN
from app.providers.common import download_to_path, probe_duration_ms, public_url_for_path


async def fetch_apify_clip(query: str, destination: Path, limit: int = 1) -> Dict[str, Any] | None:
    import httpx

    if not APIFY_TOKEN or not APIFY_ACTOR_ID:
        return None

    # TV & Movie Clips Finder: https://apify.com/easyapi/tv-movie-clips-finder
    run_url = f"https://api.apify.com/v2/acts/{APIFY_ACTOR_ID}/run-sync-get-dataset-items"
    async with httpx.AsyncClient(timeout=120, follow_redirects=True) as client:
        response = await client.post(
            run_url,
            params={"token": APIFY_TOKEN},
            json={"keywords": [query], "maxItems": max(1, min(limit, 25))},
        )
        if response.status_code >= 400:
            return None
        items = response.json()
        if not isinstance(items, list) or not items:
            return None
        first = items[0]
        video_url = first.get("mp4") or first.get("videoUrl") or first.get("url")
        if not video_url:
            return None
        local_path = await download_to_path(video_url, destination)
        duration_ms = await asyncio.to_thread(probe_duration_ms, local_path)
        return {
            "provider": "apify",
            "status": "succeeded",
            "warning": None,
            "source_url": video_url,
            "local_path": str(local_path),
            "public_url": public_url_for_path(local_path),
            "duration_ms": duration_ms,
            "metadata": {"query": query, "provider_payload": first},
        }
