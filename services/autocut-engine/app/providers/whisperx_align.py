from __future__ import annotations

import json
import shutil
import subprocess
import warnings
from pathlib import Path
from typing import Any, Dict

from app.config import WHISPERX_MODEL
from app.providers.common import probe_duration_ms


def align_audio(audio_path: Path, transcript: str, language: str = "zh") -> Dict[str, Any]:
    try:
        import torch  # type: ignore
        import whisperx  # type: ignore

        with warnings.catch_warnings():
            warnings.filterwarnings(
                "ignore",
                category=UserWarning,
                module=r"pyannote\.audio\.core\.io",
            )
            warnings.filterwarnings(
                "ignore",
                message=r"(?s).*torchcodec is not installed correctly.*",
                category=UserWarning,
            )
            device = "cuda" if torch.cuda.is_available() else "cpu"
            compute_type = "float16" if device == "cuda" else "int8"
            audio = whisperx.load_audio(str(audio_path))
            transcribe_model = whisperx.load_model(
                WHISPERX_MODEL,
                device=device,
                compute_type=compute_type,
                language=language if language else None,
            )
            result = transcribe_model.transcribe(audio, batch_size=4)
            if not result.get("segments"):
                return heuristic_align(audio_path, transcript, "whisperx_no_speech_detected")
            align_model, metadata = whisperx.load_align_model(language_code=result["language"], device=device)
            aligned = whisperx.align(result["segments"], align_model, metadata, audio, device)
        words = []
        for segment in aligned.get("segments", []):
            for word in segment.get("words", []):
                words.append({
                    "word": word.get("word", ""),
                    "start_ms": int(float(word.get("start", 0)) * 1000),
                    "end_ms": int(float(word.get("end", 0)) * 1000),
                })
        return {"status": "succeeded", "warning": None, "words": words}
    except Exception as import_error:
        cli = shutil.which("whisperx")
        if cli:
            return run_whisperx_cli(cli, audio_path, language)
        return heuristic_align(audio_path, transcript, str(import_error))


def run_whisperx_cli(cli_path: str, audio_path: Path, language: str):
    output_dir = audio_path.parent
    command = [
        cli_path,
        str(audio_path),
        "--model",
        WHISPERX_MODEL,
        "--output_dir",
        str(output_dir),
        "--output_format",
        "json",
        "--language",
        language or "zh",
    ]
    result = subprocess.run(command, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        return heuristic_align(audio_path, "", result.stderr.strip() or "whisperx cli failed")

    json_path = output_dir / f"{audio_path.stem}.json"
    if not json_path.exists():
        return heuristic_align(audio_path, "", "whisperx cli missing json output")

    try:
        payload = json.loads(json_path.read_text(encoding="utf-8"))
        words = []
        for segment in payload.get("segments", []):
            for word in segment.get("words", []):
                words.append({
                    "word": word.get("word", ""),
                    "start_ms": int(float(word.get("start", 0)) * 1000),
                    "end_ms": int(float(word.get("end", 0)) * 1000),
                })
        return {"status": "succeeded", "warning": None, "words": words}
    except Exception as error:
        return heuristic_align(audio_path, "", str(error))


def heuristic_align(audio_path: Path, transcript: str, warning: str):
    duration_ms = max(probe_duration_ms(audio_path), 1000)
    tokens = [token for token in transcript.split() if token] or list(transcript.strip()) or [transcript.strip() or "旁白"]
    step = max(duration_ms // max(len(tokens), 1), 250)
    cursor = 0
    words = []
    for token in tokens:
        words.append({"word": token, "start_ms": cursor, "end_ms": min(cursor + step, duration_ms)})
        cursor += step
    return {"status": "partial", "warning": f"whisperx_unavailable:{warning}", "words": words}
