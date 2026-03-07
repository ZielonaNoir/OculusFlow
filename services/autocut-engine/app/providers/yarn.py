from __future__ import annotations

from typing import Any, Dict


async def fetch_yarn_clip(query: str) -> Dict[str, Any]:
    return {
        "provider": "yarn",
        "status": "failed",
        "warning": "yarn_not_implemented",
        "source_url": None,
        "local_path": None,
        "public_url": None,
        "duration_ms": None,
        "metadata": {"query": query, "reason": "not_implemented"},
    }
