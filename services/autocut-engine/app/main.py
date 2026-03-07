from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.responses import PlainTextResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from app.config import WORK_DIR
from app.pipeline.render import build_render
from app.providers.apify_clips import fetch_apify_clip
from app.providers.fish_audio import synthesize_voice
from app.providers.pexels import fetch_pexels_clip
from app.providers.playphrase import fetch_playphrase_clip
from app.providers.whisperx_align import align_audio
from app.providers.yarn import fetch_yarn_clip


app = FastAPI(title="Auto-Cut Engine", version="0.2.0")
app.mount("/static", StaticFiles(directory=str(WORK_DIR)), name="static")

JOBS_DIR = WORK_DIR / "jobs"
JOBS_DIR.mkdir(parents=True, exist_ok=True)
STAGE_KEYS = ["voice", "clips", "subtitles", "render"]


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def build_stage_snapshot():
    return [{"stage": stage, "status": "queued"} for stage in STAGE_KEYS]


def update_stage(job: Dict[str, Any], stage: str, status: str, detail: Optional[str] = None):
    stages = job.setdefault("stages", build_stage_snapshot())
    match = next((item for item in stages if item.get("stage") == stage), None)
    if match is None:
        match = {"stage": stage, "status": status}
        stages.append(match)
    match["status"] = status
    if detail:
        match["detail"] = detail
    elif "detail" in match:
        match.pop("detail")


def save_job(job: Dict[str, Any]):
    job["updated_at"] = now_iso()
    path = JOBS_DIR / f"{job['job_id']}.json"
    path.write_text(json.dumps(job, ensure_ascii=False, indent=2), encoding="utf-8")


def normalize_job(job: Dict[str, Any]):
    if job.get("status") in {"queued", "running"}:
        job["status"] = "failed"
        job["error"] = job.get("error") or "engine restarted before job completed"
        update_stage(job, "render", "failed", "引擎重启，任务未恢复")
        save_job(job)
    return job


def load_jobs():
    jobs: Dict[str, Dict[str, Any]] = {}
    for path in JOBS_DIR.glob("*.json"):
        try:
            job = json.loads(path.read_text(encoding="utf-8"))
            jobs[job["job_id"]] = normalize_job(job)
        except Exception:
            continue
    return jobs


JOBS: Dict[str, Dict[str, Any]] = load_jobs()


class ProjectPayload(BaseModel):
    id: str
    title: str
    source_text: str
    aspect_ratio: str
    duration_seconds: int
    fish_voice_id: str
    voice_character: str = "anna"
    voice_style: str = "cinematic_narration"
    subtitle_style: str
    settings_snapshot: Dict[str, Any] = Field(default_factory=dict)


class SegmentPayload(BaseModel):
    id: str
    type: str
    order_index: int
    text: str
    language: str = "zh-CN"
    source_title: Optional[str] = None
    source_query: Optional[str] = None
    b_roll_query: Optional[str] = None
    duration_ms: int = 0
    enabled: bool = True
    retrieval_intent: Optional[str] = None
    retrieval_subject: Optional[str] = None
    retrieval_mood: Optional[str] = None
    retrieval_queries: List[str] = Field(default_factory=list)
    retrieval_negative_terms: List[str] = Field(default_factory=list)
    retrieval_visual_constraints: Dict[str, Any] = Field(default_factory=dict)
    voice_emotion: Optional[str] = None
    voice_pace: Optional[str] = None
    voice_intensity: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class RenderRequest(BaseModel):
    project: ProjectPayload
    segments: List[SegmentPayload]
    settings: Dict[str, Any] = Field(default_factory=dict)


class ClipFetchRequest(BaseModel):
    project: ProjectPayload
    segments: List[SegmentPayload]


@app.get("/health")
async def health():
    return {"ok": True}


@app.post("/v1/fetch-clips")
async def fetch_clips(request: ClipFetchRequest):
    job_id = str(uuid.uuid4())
    work_dir = WORK_DIR / job_id / "fetch"
    work_dir.mkdir(parents=True, exist_ok=True)
    items = []
    warnings = []

    for index, segment in enumerate(sorted(request.segments, key=lambda item: item.order_index)):
        if not segment.enabled:
            continue
        destination = work_dir / f"{index:02d}-{segment.id}.mp4"
        if segment.type == "movie_quote":
            result = (
                await fetch_apify_clip(segment.source_query or segment.text, destination)
                or await fetch_yarn_clip(segment.source_query or segment.text)
                or await fetch_playphrase_clip(segment.source_query or segment.text)
                or await fetch_pexels_clip(segment.b_roll_query or segment.text, destination)
            )
        else:
            result = await fetch_pexels_clip(segment.b_roll_query or segment.text, destination)

        items.append(result)
        if result and result.get("warning"):
            warnings.append(result["warning"])

    return {
      "stage": "clips",
      "status": "partial" if warnings else "succeeded",
      "items": items,
      "warnings": warnings,
    }


@app.post("/v1/generate-voice")
async def generate_voice(request: RenderRequest):
    job_id = str(uuid.uuid4())
    work_dir = WORK_DIR / job_id / "audio"
    work_dir.mkdir(parents=True, exist_ok=True)
    items = []
    warnings = []

    for index, segment in enumerate(sorted(request.segments, key=lambda item: item.order_index)):
        if not segment.enabled:
            continue
        output = work_dir / f"{index:02d}-{segment.id}.mp3"
        result = await synthesize_voice(
            segment.text,
            request.project.voice_character or request.project.fish_voice_id,
            request.settings.get("voice_model", "speech-1"),
            output,
            voice_id=request.project.fish_voice_id,
            voice_style=request.project.voice_style or request.settings.get("voice_style", "cinematic_narration"),
            voice_emotion=segment.voice_emotion or "neutral",
            voice_pace=segment.voice_pace or "medium",
            voice_intensity=segment.voice_intensity or "medium",
        )
        items.append(result)
        if result.get("warning"):
            warnings.append(result["warning"])

    return {
        "stage": "voice",
        "status": "partial" if warnings else "succeeded",
        "items": items,
        "warnings": warnings,
    }


@app.post("/v1/align-subtitles")
async def align_subtitles(request: RenderRequest):
    warnings = []
    items = []
    cursor = 0
    work_dir = WORK_DIR / request.project.id / "audio"

    for segment in sorted(request.segments, key=lambda item: item.order_index):
        if not segment.enabled:
            continue
        audio_path = work_dir / f"{segment.id}.mp3"
        if not audio_path.exists():
            continue
        result = align_audio(audio_path, segment.text, segment.language.split("-")[0].lower())
        if result.get("warning"):
            warnings.append(result["warning"])
        for word in result.get("words", []):
            items.append({
                **word,
                "start_ms": word["start_ms"] + cursor,
                "end_ms": word["end_ms"] + cursor,
            })
        cursor += segment.duration_ms or 0

    return {
        "stage": "subtitles",
        "status": "partial" if warnings else "succeeded",
        "items": items,
        "warnings": warnings,
    }


@app.post("/v1/render-project")
async def render_project(request: RenderRequest, background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())
    JOBS[job_id] = {
        "job_id": job_id,
        "status": "queued",
        "stages": build_stage_snapshot(),
        "output_url": None,
        "subtitle_url": None,
        "payload": {"project_id": request.project.id},
        "error": None,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    save_job(JOBS[job_id])
    background_tasks.add_task(process_render_job, job_id, request)
    return {
        "job_id": job_id,
        "stage": "render",
        "status": "queued",
        "items": [],
        "warnings": [],
        "payload": {"project_id": request.project.id},
    }


@app.get("/v1/jobs/{job_id}")
async def get_job(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        path = JOBS_DIR / f"{job_id}.json"
        if path.exists():
            job = normalize_job(json.loads(path.read_text(encoding="utf-8")))
            JOBS[job_id] = job
    if not job:
        raise HTTPException(status_code=404, detail="job not found")
    return {
        "job_id": job["job_id"],
        "stage": "render",
        "status": job["status"],
        "items": job["payload"].get("segment_results", []),
        "warnings": job["payload"].get("warnings", []),
        "stages": job["stages"],
        "output_url": job["output_url"],
        "subtitle_url": job["subtitle_url"],
        "payload": job["payload"],
        "error": job["error"],
    }


@app.get("/v1/jobs/{job_id}/subtitle.vtt")
async def get_job_subtitle(job_id: str):
    job = JOBS.get(job_id)
    subtitle_path = job.get("payload", {}).get("subtitle_path") if job else None
    if not subtitle_path or not Path(subtitle_path).exists():
        raise HTTPException(status_code=404, detail="subtitle not found")
    return PlainTextResponse(Path(subtitle_path).read_text(encoding="utf-8"), media_type="text/vtt")


async def process_render_job(job_id: str, request: RenderRequest):
    job = JOBS[job_id]

    async def on_progress(stage: str, status: str, payload: Dict[str, Any]):
        update_stage(job, stage, status, payload.get("detail"))
        if "segment_results" in payload:
            job["payload"]["segment_results"] = payload["segment_results"]
        if "warnings" in payload:
            job["payload"]["warnings"] = payload["warnings"]
        if "subtitle_path" in payload:
            job["payload"]["subtitle_path"] = payload["subtitle_path"]
        if "output_path" in payload:
            job["payload"]["output_path"] = payload["output_path"]
        if "output_url" in payload:
            job["output_url"] = payload["output_url"]
        if "subtitle_url" in payload:
            job["subtitle_url"] = payload["subtitle_url"]
        if "error" in payload:
            job["error"] = payload["error"]
        save_job(job)

    try:
        job["status"] = "running"
        update_stage(job, "render", "running", "已提交到引擎")
        save_job(job)
        result = await build_render(
            job_id,
            request.project.model_dump(),
            request.segments,
            {**request.project.settings_snapshot, **request.settings},
            on_progress=on_progress,
        )
        job["status"] = result["status"]
        job["payload"] = {
            "project_id": request.project.id,
            "segment_results": result["segment_results"],
            "warnings": result["warnings"],
            "subtitle_path": result["subtitle_path"],
            "output_path": result["output_path"],
        }
        update_stage(job, "voice", "succeeded")
        update_stage(job, "clips", "partial" if any("clip" in warning for warning in result["warnings"]) else "succeeded")
        update_stage(job, "subtitles", "partial" if any("subtitle" in warning or "whisperx" in warning for warning in result["warnings"]) else "succeeded")
        update_stage(job, "render", result["status"])
        job["output_url"] = result["output_url"]
        job["subtitle_url"] = result["subtitle_url"]
        save_job(job)
    except Exception as exc:  # pragma: no cover
        job["status"] = "failed"
        job["error"] = str(exc)
        update_stage(job, "render", "failed", str(exc))
        save_job(job)
