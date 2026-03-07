from __future__ import annotations

import asyncio
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Awaitable, Callable, Dict, Iterable, List

from app.config import FFMPEG_PATH, MOCK_VIDEO_URL, WORK_DIR
from app.providers.apify_clips import fetch_apify_clip
from app.providers.common import ensure_dir, escape_subtitle_path, probe_duration_ms, public_url_for_path, run_command
from app.providers.fish_audio import synthesize_voice
from app.providers.pexels import fetch_pexels_clip
from app.providers.playphrase import fetch_playphrase_clip
from app.providers.whisperx_align import align_audio
from app.providers.yarn import fetch_yarn_clip


@dataclass
class SegmentRenderResult:
    segment_id: str
    segment_type: str
    provider: str
    asset_kind: str
    status: str
    source_query: str | None
    fallback_reason: str | None
    warning: str | None
    local_path: str | None
    public_url: str | None
    duration_ms: int | None
    metadata: Dict[str, Any]


def create_job_dirs(job_id: str):
    base = ensure_dir(WORK_DIR / job_id)
    return {
        "base": base,
        "clips": ensure_dir(base / "clips"),
        "audio": ensure_dir(base / "audio"),
        "subtitles": ensure_dir(base / "subtitles"),
        "segments": ensure_dir(base / "segments"),
        "output": ensure_dir(base / "output"),
    }


async def build_render(
    job_id: str,
    project: Dict[str, Any],
    segments: List[Any],
    settings: Dict[str, Any],
    on_progress: Callable[[str, str, Dict[str, Any]], Awaitable[None]] | None = None,
):
    async def _noop_progress(_stage: str, _status: str, _payload: Dict[str, Any]):
        return None

    progress = on_progress or _noop_progress
    dirs = create_job_dirs(job_id)
    warnings: List[str] = []
    segment_results: List[SegmentRenderResult] = []
    video_segment_paths: List[Path] = []
    subtitle_cues: List[Dict[str, Any]] = []
    timeline_cursor = 0
    used_clip_fingerprints: set[str] = set()

    ordered_segments = sorted([segment for segment in segments if segment.enabled], key=lambda item: item.order_index)
    await progress("voice", "running", {"detail": "开始生成配音", "segment_results": [], "warnings": []})
    for index, segment in enumerate(ordered_segments):
        voice_output = dirs["audio"] / f"{index:02d}-{segment.id}.mp3"
        voice_result = await synthesize_voice(
            segment.text,
            project.get("voice_character") or project["fish_voice_id"],
            settings.get("voice_model", "speech-1"),
            voice_output,
            voice_id=project.get("fish_voice_id"),
            voice_style=project.get("voice_style") or settings.get("voice_style", "cinematic_narration"),
            voice_emotion=getattr(segment, "voice_emotion", None) or "neutral",
            voice_pace=getattr(segment, "voice_pace", None) or "medium",
            voice_intensity=getattr(segment, "voice_intensity", None) or "medium",
        )
        audio_path = Path(voice_result["local_path"])
        audio_duration_ms = voice_result["duration_ms"] or max(segment.duration_ms, 1500)
        segment_results.append(
            SegmentRenderResult(
                segment_id=segment.id,
                segment_type=segment.type,
                provider=voice_result["provider"],
                asset_kind="audio",
                status=voice_result["status"],
                source_query=None,
                fallback_reason=None,
                warning=voice_result.get("warning"),
                local_path=voice_result["local_path"],
                public_url=voice_result["public_url"],
                duration_ms=audio_duration_ms,
                metadata=voice_result["metadata"],
            )
        )
        if voice_result.get("warning"):
            warnings.append(voice_result["warning"])
        await progress(
            "voice",
            "running",
            {
                "detail": f"正在处理第 {index + 1}/{len(ordered_segments)} 段配音",
                "segment_results": [result.__dict__ for result in segment_results],
                "warnings": warnings,
            },
        )

        await progress(
            "subtitles",
            "running",
            {
                "detail": f"正在对齐第 {index + 1}/{len(ordered_segments)} 段字幕",
                "segment_results": [result.__dict__ for result in segment_results],
                "warnings": warnings,
            },
        )
        alignment = await asyncio.to_thread(align_audio, audio_path, segment.text, segment.language.split("-")[0].lower())
        if alignment.get("warning"):
            warnings.append(alignment["warning"])

        await progress(
            "clips",
            "running",
            {
                "detail": f"正在抓取第 {index + 1}/{len(ordered_segments)} 段素材",
                "segment_results": [result.__dict__ for result in segment_results],
                "warnings": warnings,
            },
        )
        clip_result = await resolve_segment_clip(
            segment,
            settings,
            dirs["clips"] / f"{index:02d}-{segment.id}.mp4",
            project.get("aspect_ratio") or settings.get("aspect_ratio", "16:9"),
            used_clip_fingerprints,
        )
        if clip_result.get("warning"):
            warnings.append(str(clip_result["warning"]))

        video_path = Path(clip_result["local_path"]) if clip_result.get("local_path") else None
        if video_path is None or not video_path.exists():
            mock_dest = dirs["clips"] / f"{index:02d}-{segment.id}-mock.mp4"
            from app.providers.common import download_to_path as _dl

            try:
                video_path = await _dl(MOCK_VIDEO_URL, mock_dest)
                warnings.append(f"segment_{segment.id}_clip_unavailable:using_mock")
            except Exception as mock_error:
                raise RuntimeError(f"segment {segment.id} missing video clip and mock download failed: {mock_error}") from mock_error

        clip_fingerprint = clip_result.get("source_url") or clip_result.get("public_url") or clip_result.get("local_path")
        if clip_fingerprint:
            used_clip_fingerprints.add(str(clip_fingerprint))

        rendered_segment_path = dirs["segments"] / f"{index:02d}-{segment.id}.mp4"
        await asyncio.to_thread(render_segment_video, video_path, audio_path, rendered_segment_path, audio_duration_ms)
        video_segment_paths.append(rendered_segment_path)

        segment_results.append(
            SegmentRenderResult(
                segment_id=segment.id,
                segment_type=segment.type,
                provider=clip_result["provider"],
                asset_kind="clip" if segment.type == "movie_quote" else "b_roll",
                status=clip_result["status"],
                source_query=clip_result.get("source_query"),
                fallback_reason=clip_result.get("fallback_reason"),
                warning=clip_result.get("warning"),
                local_path=clip_result["local_path"],
                public_url=clip_result["public_url"],
                duration_ms=clip_result.get("duration_ms"),
                metadata=clip_result["metadata"],
            )
        )

        subtitle_cues.append({
            "text": segment.text,
            "start_ms": timeline_cursor,
            "end_ms": timeline_cursor + audio_duration_ms,
            "words": shift_words(alignment.get("words", []), timeline_cursor),
        })
        timeline_cursor += audio_duration_ms
        await progress(
            "clips",
            "running",
            {
                "detail": f"已完成第 {index + 1}/{len(ordered_segments)} 段",
                "segment_results": [result.__dict__ for result in segment_results],
                "warnings": warnings,
            },
        )

    await progress("voice", "succeeded", {"detail": "配音完成", "segment_results": [result.__dict__ for result in segment_results], "warnings": warnings})
    await progress("clips", "succeeded", {"detail": "素材处理完成", "segment_results": [result.__dict__ for result in segment_results], "warnings": warnings})
    await progress("subtitles", "running", {"detail": "正在生成字幕文件", "segment_results": [result.__dict__ for result in segment_results], "warnings": warnings})
    vtt_path = dirs["subtitles"] / "subtitles.vtt"
    srt_path = dirs["subtitles"] / "subtitles.srt"
    write_vtt(vtt_path, subtitle_cues)
    write_srt(srt_path, subtitle_cues)

    subtitle_status = "succeeded"
    if not subtitle_cues:
        subtitle_status = "partial"
        warnings.append("subtitle_generation_failed")

    segment_results.append(
        SegmentRenderResult(
            segment_id="project",
            segment_type="voiceover",
            provider="whisperx",
            asset_kind="subtitle",
            status=subtitle_status,
            source_query=None,
            fallback_reason=None,
            warning=None if subtitle_status == "succeeded" else "subtitle_generation_failed",
            local_path=str(vtt_path),
            public_url=public_url_for_path(vtt_path),
            duration_ms=timeline_cursor,
            metadata={"srt_path": str(srt_path)},
        )
    )
    await progress(
        "subtitles",
        subtitle_status,
        {
            "detail": "字幕文件已生成",
            "segment_results": [result.__dict__ for result in segment_results],
            "warnings": warnings,
            "subtitle_path": str(vtt_path),
            "subtitle_url": public_url_for_path(vtt_path),
        },
    )

    concat_path = dirs["output"] / "concat-list.txt"
    concat_path.write_text("\n".join([f"file '{path.as_posix()}'" for path in video_segment_paths]), encoding="utf-8")

    merged_path = dirs["output"] / "merged.mp4"
    await progress("render", "running", {"detail": "正在合并片段", "segment_results": [result.__dict__ for result in segment_results], "warnings": warnings})
    await asyncio.to_thread(
        run_command,
        [
            FFMPEG_PATH,
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(concat_path),
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            str(merged_path),
        ],
    )

    final_path = dirs["output"] / "final.mp4"
    final_status = "succeeded"
    try:
        await progress("render", "running", {"detail": "正在压制字幕并导出成片", "segment_results": [result.__dict__ for result in segment_results], "warnings": warnings})
        await asyncio.to_thread(
            run_command,
            [
                FFMPEG_PATH,
                "-y",
                "-i",
                str(merged_path),
                "-vf",
                f"subtitles='{escape_subtitle_path(srt_path)}'",
                "-c:v",
                "libx264",
                "-pix_fmt",
                "yuv420p",
                "-c:a",
                "aac",
                str(final_path),
            ],
        )
    except Exception as error:
        final_status = "partial"
        warnings.append(f"subtitle_burn_failed:{error}")
        final_path = merged_path

    return {
        "status": "partial" if warnings or final_status == "partial" else "succeeded",
        "warnings": dedupe_preserve_order(warnings),
        "segment_results": [result.__dict__ for result in segment_results],
        "output_path": str(final_path),
        "output_url": public_url_for_path(final_path),
        "subtitle_path": str(vtt_path),
        "subtitle_url": public_url_for_path(vtt_path),
        "duration_ms": await asyncio.to_thread(probe_duration_ms, final_path),
    }


async def resolve_segment_clip(
    segment: Any,
    settings: Dict[str, Any],
    destination: Path,
    project_aspect_ratio: str,
    used_clip_fingerprints: set[str],
):
    priority = settings.get("clip_provider_priority") or ["apify", "yarn", "playphrase", "pexels"]
    quote_queries = build_structured_queries(segment, project_aspect_ratio, use_quote_queries=True)
    b_roll_queries = build_structured_queries(segment, project_aspect_ratio, use_quote_queries=False)
    failures: List[str] = []

    async def safe_provider_call(provider: str, query: str, candidate_destination: Path):
        try:
            if provider == "apify":
                return await fetch_apify_clip(query, candidate_destination)
            if provider == "yarn":
                return await fetch_yarn_clip(query)
            if provider == "playphrase":
                return await fetch_playphrase_clip(query)
            if provider == "pexels":
                return await fetch_pexels_clip(query, candidate_destination)
            return None
        except Exception as error:
            return {
                "provider": provider,
                "status": "failed",
                "warning": f"{provider}_exception:{error}",
                "source_query": query,
                "fallback_reason": "provider_exception",
                "local_path": None,
                "public_url": None,
                "duration_ms": None,
                "metadata": {"reason": "provider_exception", "query": query},
            }

    async def choose_best_candidate(provider: str, queries: List[str]):
        candidates: List[Dict[str, Any]] = []
        for query_index, query in enumerate(queries):
            candidate_destination = destination.with_name(
                f"{destination.stem}-{provider}-{query_index}{destination.suffix}"
            )
            result = await safe_provider_call(provider, query, candidate_destination)
            if result and result.get("local_path"):
                score = score_clip_candidate(
                    segment,
                    result,
                    query,
                    provider,
                    project_aspect_ratio,
                    used_clip_fingerprints,
                )
                result["source_query"] = query
                result["metadata"] = {
                    **(result.get("metadata") or {}),
                    "retrieval_score": score,
                    "retrieval_provider": provider,
                    "retrieval_query": query,
                    "retrieval_intent": getattr(segment, "retrieval_intent", None),
                    "retrieval_subject": getattr(segment, "retrieval_subject", None),
                    "retrieval_mood": getattr(segment, "retrieval_mood", None),
                }
                candidates.append(result)
            elif result and result.get("warning"):
                failures.append(str(result["warning"]))
        if not candidates:
            return None
        return max(candidates, key=lambda item: float(item.get("metadata", {}).get("retrieval_score", 0)))

    if segment.type in {"voiceover", "b_roll"}:
        pexels = await choose_best_candidate("pexels", b_roll_queries)
        if pexels and pexels.get("local_path"):
            pexels["fallback_reason"] = None
            pexels["warning"] = None if pexels["metadata"].get("retrieval_score", 0) >= 1 else "retrieval_low_confidence"
            return pexels
        return {
            "provider": "mock",
            "status": "partial",
            "warning": "retrieval_low_confidence",
            "source_query": b_roll_queries[0] if b_roll_queries else getattr(segment, "b_roll_query", None) or segment.text,
            "fallback_reason": "provider_unavailable",
            "local_path": None,
            "public_url": None,
            "duration_ms": None,
            "metadata": {"reason": "pexels_unavailable", "queries": b_roll_queries},
        }

    quote_providers = [provider for provider in priority if provider != "pexels"]
    for provider in quote_providers:
        result = await choose_best_candidate(provider, quote_queries)
        if result and result.get("local_path"):
            result["fallback_reason"] = None
            result["warning"] = None if result["metadata"].get("retrieval_score", 0) >= 1 else "retrieval_low_confidence"
            return result

    fallback = await choose_best_candidate("pexels", b_roll_queries)
    if fallback:
        fallback["fallback_reason"] = "quote_not_found"
        fallback["warning"] = "retrieval_low_confidence"
        return fallback

    return {
        "provider": "mock",
        "status": "failed",
        "warning": "retrieval_low_confidence",
        "source_query": quote_queries[0] if quote_queries else segment.text,
        "fallback_reason": "all_providers_failed",
        "local_path": None,
        "public_url": None,
        "duration_ms": None,
        "metadata": {"failures": failures, "quote_queries": quote_queries, "b_roll_queries": b_roll_queries},
    }


def build_structured_queries(segment: Any, project_aspect_ratio: str, use_quote_queries: bool) -> List[str]:
    retrieval_queries = list(getattr(segment, "retrieval_queries", None) or [])
    retrieval_subject = getattr(segment, "retrieval_subject", None) or segment.text
    retrieval_mood = getattr(segment, "retrieval_mood", None) or "neutral"
    retrieval_intent = getattr(segment, "retrieval_intent", None) or ("quote_scene" if segment.type == "movie_quote" else "generic_broll")
    visual_constraints = getattr(segment, "retrieval_visual_constraints", None) or {}
    shot_size = str(visual_constraints.get("shot_size") or "").strip()
    motion = str(visual_constraints.get("motion") or "").strip()
    time_of_day = str(visual_constraints.get("time_of_day") or "").strip()

    queries: List[str] = []
    if use_quote_queries:
        queries.extend(
            [
                getattr(segment, "source_query", None),
                *retrieval_queries,
                f"{retrieval_subject} {retrieval_mood} movie scene",
                f"{retrieval_subject} {retrieval_mood} cinematic dialogue {shot_size}".strip(),
            ]
        )
    else:
        queries.extend(
            [
                getattr(segment, "b_roll_query", None),
                *retrieval_queries,
                f"{retrieval_subject} {retrieval_mood} {retrieval_intent} {project_aspect_ratio}",
                f"{retrieval_subject} {motion} {time_of_day} cinematic b roll {project_aspect_ratio}".strip(),
            ]
        )

    return dedupe_queries(queries)


def score_clip_candidate(
    segment: Any,
    result: Dict[str, Any],
    query: str,
    provider: str,
    project_aspect_ratio: str,
    used_clip_fingerprints: set[str],
) -> float:
    metadata = result.get("metadata") or {}
    provider_payload = metadata.get("provider_payload") or {}
    haystack = " ".join(
        [
            query,
            getattr(segment, "text", ""),
            getattr(segment, "source_title", "") or "",
            getattr(segment, "retrieval_subject", "") or "",
            getattr(segment, "retrieval_mood", "") or "",
            json.dumps(provider_payload, ensure_ascii=False),
        ]
    ).lower()
    query_tokens = tokenize(query)
    subject_tokens = tokenize(getattr(segment, "retrieval_subject", None) or "")
    mood_tokens = tokenize(getattr(segment, "retrieval_mood", None) or "")

    score = 0.0
    score += 0.8 * token_overlap_score(query_tokens, haystack)
    score += 0.6 * token_overlap_score(subject_tokens, haystack)
    score += 0.4 * token_overlap_score(mood_tokens, haystack)
    score += duration_fit_score(getattr(segment, "duration_ms", 0), result.get("duration_ms"))
    score += aspect_ratio_fit_score(project_aspect_ratio, provider_payload)

    if getattr(segment, "type", "") == "movie_quote":
        score += 1.5 if provider != "pexels" else 0.4
    elif provider == "pexels":
        score += 0.6

    fingerprint = str(result.get("source_url") or result.get("public_url") or result.get("local_path") or "")
    if fingerprint and fingerprint in used_clip_fingerprints:
        score -= 4

    return score


def render_segment_video(video_path: Path, audio_path: Path, output_path: Path, duration_ms: int):
    duration_seconds = max(duration_ms / 1000.0, 1.0)
    run_command([
        FFMPEG_PATH,
        "-y",
        "-stream_loop",
        "-1",
        "-i",
        str(video_path),
        "-i",
        str(audio_path),
        "-t",
        f"{duration_seconds:.3f}",
        "-map",
        "0:v:0",
        "-map",
        "1:a:0",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-shortest",
        str(output_path),
    ])


def shift_words(words: List[Dict[str, Any]], offset_ms: int):
    return [{**word, "start_ms": int(word.get("start_ms", 0)) + offset_ms, "end_ms": int(word.get("end_ms", 0)) + offset_ms} for word in words]


def write_vtt(path: Path, cues: List[Dict[str, Any]]):
    lines = ["WEBVTT", ""]
    for cue in cues:
        lines.append(f"{format_ts(cue['start_ms'])} --> {format_ts(cue['end_ms'])}")
        lines.append(cue["text"])
        lines.append("")
    path.write_text("\n".join(lines), encoding="utf-8")


def write_srt(path: Path, cues: List[Dict[str, Any]]):
    lines = []
    for index, cue in enumerate(cues, start=1):
        lines.append(str(index))
        lines.append(f"{format_ts(cue['start_ms'], srt=True)} --> {format_ts(cue['end_ms'], srt=True)}")
        lines.append(cue["text"])
        lines.append("")
    path.write_text("\n".join(lines), encoding="utf-8")


def format_ts(ms: int, srt: bool = False):
    total_seconds = ms // 1000
    milliseconds = ms % 1000
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    seconds = total_seconds % 60
    separator = "," if srt else "."
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}{separator}{milliseconds:03d}"


def dedupe_queries(items: Iterable[str | None]) -> List[str]:
    seen: set[str] = set()
    normalized: List[str] = []
    for item in items:
        if not item:
            continue
        value = re.sub(r"\s+", " ", str(item)).strip()
        if not value:
            continue
        key = value.lower()
        if key in seen:
            continue
        seen.add(key)
        normalized.append(value)
    return normalized[:4]


def tokenize(text: str) -> List[str]:
    return [token for token in re.split(r"[^a-z0-9]+", text.lower()) if len(token) >= 3]


def token_overlap_score(tokens: List[str], haystack: str) -> float:
    if not tokens:
        return 0.0
    matched = sum(1 for token in tokens if token in haystack)
    return matched / len(tokens)


def duration_fit_score(target_ms: int | None, candidate_ms: int | None) -> float:
    if not target_ms or not candidate_ms:
        return 0.0
    diff_ratio = abs(candidate_ms - target_ms) / max(target_ms, 1000)
    return max(-1.0, 1.0 - diff_ratio)


def aspect_ratio_fit_score(target_ratio: str, provider_payload: Dict[str, Any]) -> float:
    width = provider_payload.get("width")
    height = provider_payload.get("height")
    if not width or not height:
        video_files = provider_payload.get("video_files")
        if isinstance(video_files, list) and video_files:
            best = max(video_files, key=lambda item: item.get("width", 0))
            width = best.get("width")
            height = best.get("height")
    if not width or not height:
        return 0.0

    target_map = {
        "16:9": 16 / 9,
        "9:16": 9 / 16,
        "1:1": 1.0,
        "4:3": 4 / 3,
        "21:9": 21 / 9,
    }
    target = target_map.get(target_ratio, 16 / 9)
    actual = float(width) / max(float(height), 1.0)
    diff = abs(actual - target)
    return max(-0.5, 1.0 - diff)


def dedupe_preserve_order(items: List[str]) -> List[str]:
    seen: set[str] = set()
    deduped: List[str] = []
    for item in items:
        if item in seen:
            continue
        seen.add(item)
        deduped.append(item)
    return deduped
