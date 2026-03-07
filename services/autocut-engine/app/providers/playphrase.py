from __future__ import annotations

from typing import Any, Dict


async def fetch_playphrase_clip(query: str) -> Dict[str, Any]:
    return {
        "provider": "playphrase",
        "status": "failed",
        "warning": "playphrase_not_implemented",
        "source_url": None,
        "local_path": None,
        "public_url": None,
        "duration_ms": None,
        "metadata": {"query": query, "reason": "not_implemented"},
    }
