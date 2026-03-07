from __future__ import annotations

import asyncio
import json
import os
import re
from pathlib import Path
from typing import Any, Dict

from app.config import FISHAUDIO_API_KEY, FISHAUDIO_BASE_URL
from app.providers.common import create_silent_wav, ensure_dir, probe_duration_ms, public_url_for_path


def _load_voice_aliases() -> Dict[str, str]:
    aliases: Dict[str, str] = {}
    raw = os.getenv("FISHAUDIO_VOICE_ALIASES_JSON", "")
    if raw:
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, dict):
                aliases.update({str(key).lower(): str(value) for key, value in parsed.items() if value})
        except Exception:
            pass

    for alias in ("anna", "leo", "nova"):
        env_key = f"FISHAUDIO_VOICE_{alias.upper()}_ID"
        env_value = os.getenv(env_key)
        if env_value:
            aliases[alias] = env_value
    return aliases


def _looks_like_reference_id(value: str) -> bool:
    normalized = value.strip()
    if not normalized:
        return False
    if normalized.startswith(("ref:", "profile:", "voice:")):
        return True
    return bool(re.fullmatch(r"[0-9a-fA-F-]{16,}", normalized))


def _resolve_voice_reference(voice_character: str, voice_id: str | None) -> Dict[str, Any]:
    aliases = _load_voice_aliases()
    candidates = [voice_id, voice_character]
    for candidate in candidates:
        if not candidate:
            continue
        normalized = str(candidate).strip()
        lowered = normalized.lower()
        if lowered in aliases:
            return {
                "voice_character": voice_character,
                "voice_key": lowered,
                "reference_id": aliases[lowered],
                "resolution": "env_alias",
            }
        if normalized.startswith(("ref:", "profile:", "voice:")):
            return {
                "voice_character": voice_character,
                "voice_key": None,
                "reference_id": normalized.split(":", 1)[1],
                "resolution": "explicit_prefix",
            }
        if _looks_like_reference_id(normalized):
            return {
                "voice_character": voice_character,
                "voice_key": None,
                "reference_id": normalized,
                "resolution": "explicit_reference",
            }

    return {
        "voice_character": voice_character,
        "voice_key": (voice_character or voice_id or "default").strip().lower(),
        "reference_id": None,
        "resolution": "voice_key_only",
    }


def _build_tts_text(text: str, voice_style: str, voice_emotion: str, voice_pace: str, voice_intensity: str) -> str:
    tags: list[str] = []

    style_tags = {
        "cinematic_narration": ["narration", "cinematic"],
        "calm_inspiring": ["calm", "inspiring"],
        "intense_trailer": ["dramatic", "intense"],
    }
    emotion_tags = {
        "neutral": [],
        "determined": ["determined"],
        "tense": ["tense"],
        "warm": ["warm"],
        "urgent": ["urgent"],
    }
    pace_tags = {
        "slow": ["slowly"],
        "medium": [],
        "fast": ["fast"],
    }
    intensity_tags = {
        "low": ["softly"],
        "medium": [],
        "high": ["strong"],
    }

    tags.extend(style_tags.get(voice_style, []))
    tags.extend(emotion_tags.get(voice_emotion, []))
    tags.extend(pace_tags.get(voice_pace, []))
    tags.extend(intensity_tags.get(voice_intensity, []))

    if not tags:
        return text

    prefix = " ".join(f"({tag})" for tag in tags)
    return f"{prefix} {text}".strip()


async def synthesize_voice(
    text: str,
    voice_character: str,
    model: str,
    output_path: Path,
    *,
    voice_id: str | None = None,
    voice_style: str = "cinematic_narration",
    voice_emotion: str = "neutral",
    voice_pace: str = "medium",
    voice_intensity: str = "medium",
) -> Dict[str, Any]:
    import httpx

    ensure_dir(output_path.parent)
    resolved_voice = _resolve_voice_reference(voice_character, voice_id)
    normalized_text = _build_tts_text(text, voice_style, voice_emotion, voice_pace, voice_intensity)
    normalized_model = "s1" if model in ("speech-1", "") else model

    if not FISHAUDIO_API_KEY:
        fallback = output_path.with_suffix(".wav")
        await asyncio.to_thread(create_silent_wav, fallback, max(len(text) * 120, 1500))
        duration_ms = await asyncio.to_thread(probe_duration_ms, fallback)
        return {
            "provider": "fishaudio",
            "status": "partial",
            "warning": "FISHAUDIO_API_KEY 未配置，已生成静音占位音频",
            "local_path": str(fallback),
            "public_url": public_url_for_path(fallback),
            "duration_ms": duration_ms,
            "metadata": {
                "voice_character": resolved_voice["voice_character"],
                "voice_id": voice_id,
                "voice_resolution": resolved_voice["resolution"],
                "voice_reference_id": resolved_voice["reference_id"],
                "model": normalized_model,
                "voice_style": voice_style,
                "voice_emotion": voice_emotion,
                "voice_pace": voice_pace,
                "voice_intensity": voice_intensity,
                "normalized_text": normalized_text,
                "fallback": "silent",
            },
        }

    payload: Dict[str, Any] = {
        "text": normalized_text,
        "format": "mp3",
    }
    if resolved_voice["reference_id"]:
        payload["reference_id"] = resolved_voice["reference_id"]

    headers = {
        "Authorization": f"Bearer {FISHAUDIO_API_KEY}",
        "Content-Type": "application/json",
        "model": normalized_model,
    }
    async with httpx.AsyncClient(timeout=120, follow_redirects=True) as client:
        response = await client.post(f"{FISHAUDIO_BASE_URL.rstrip('/')}/v1/tts", json=payload, headers=headers)
        response.raise_for_status()

        content_type = response.headers.get("content-type", "")
        if "application/json" in content_type:
            data = response.json()
            url = data.get("audio_url") or data.get("url")
            if not url:
                raise RuntimeError("Fish Audio 未返回音频 URL")
            audio_response = await client.get(url)
            audio_response.raise_for_status()
            output_path.write_bytes(audio_response.content)
        else:
            output_path.write_bytes(response.content)

    return {
        "provider": "fishaudio",
        "status": "succeeded",
        "warning": None,
        "local_path": str(output_path),
        "public_url": public_url_for_path(output_path),
        "duration_ms": await asyncio.to_thread(probe_duration_ms, output_path),
        "metadata": {
            "voice_character": resolved_voice["voice_character"],
            "voice_key": resolved_voice["voice_key"],
            "voice_id": voice_id,
            "voice_resolution": resolved_voice["resolution"],
            "voice_reference_id": resolved_voice["reference_id"],
            "model": normalized_model,
            "voice_style": voice_style,
            "voice_emotion": voice_emotion,
            "voice_pace": voice_pace,
            "voice_intensity": voice_intensity,
            "normalized_payload": payload,
        },
    }
