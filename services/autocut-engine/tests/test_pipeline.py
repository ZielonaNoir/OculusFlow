import tempfile
import unittest
from pathlib import Path

from app.pipeline.render import format_ts, write_vtt
from app.providers.common import create_silent_wav
from app.providers.whisperx_align import heuristic_align


class AutoCutEngineTests(unittest.TestCase):
    def test_heuristic_align_produces_word_timestamps(self):
        with tempfile.TemporaryDirectory() as tmp:
            audio_path = Path(tmp) / "sample.wav"
            create_silent_wav(audio_path, duration_ms=2000)
            result = heuristic_align(audio_path, "hello world", "fallback")
            self.assertGreaterEqual(len(result["words"]), 2)
            self.assertEqual(result["status"], "partial")

    def test_write_vtt_outputs_valid_header(self):
        with tempfile.TemporaryDirectory() as tmp:
            vtt_path = Path(tmp) / "sample.vtt"
            write_vtt(
                vtt_path,
                [{"text": "字幕内容", "start_ms": 0, "end_ms": 1200, "words": []}],
            )
            content = vtt_path.read_text(encoding="utf-8")
            self.assertTrue(content.startswith("WEBVTT"))

    def test_format_ts_supports_vtt_and_srt(self):
        self.assertEqual(format_ts(1234), "00:00:01.234")
        self.assertEqual(format_ts(1234, srt=True), "00:00:01,234")


if __name__ == "__main__":
    unittest.main()
