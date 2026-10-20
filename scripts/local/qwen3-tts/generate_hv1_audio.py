"""Generate isolated, compressed German HV1 clips with local Qwen3-TTS."""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
DATA_JSON = ROOT / "data" / "hv1_questions.json"
DATA_JS = ROOT / "data" / "hv1_questions.js"
OUTPUT = ROOT / "data" / "audio" / "hv1"
LOCAL_ROOT = ROOT / ".local-tools" / "qwen3-tts"
MODEL_CACHE = ROOT / ".models" / "qwen3-tts"
MODEL_ID = "Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice"
VOICES = ["ryan", "vivian", "aiden", "serena", "dylan", "ono_anna", "eric", "sohee", "uncle_fu"]


def safe_slug(value: object) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", str(value).casefold()).strip("-")
    return slug or "section"


def update_data(data: list[dict]) -> None:
    DATA_JSON.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    DATA_JS.write_text(
        "window.HV1_QUESTIONS = " + json.dumps(data, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8",
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, help="Generate only the first N missing clips")
    parser.add_argument("--part", help="Generate just one Teil identifier, e.g. 12-2")
    parser.add_argument("--force", action="store_true", help="Regenerate clips already present")
    parser.add_argument("--batch-size", type=int, default=4, help="Number of clips synthesized per model call")
    args = parser.parse_args()
    if args.batch_size < 1:
        parser.error("--batch-size must be at least 1")

    MODEL_CACHE.mkdir(parents=True, exist_ok=True)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    os.environ["HF_HOME"] = str(MODEL_CACHE)
    os.environ["HUGGINGFACE_HUB_CACHE"] = str(MODEL_CACHE / "hub")

    import imageio_ffmpeg
    import numpy as np
    import soundfile as sf
    import torch
    from qwen_tts import Qwen3TTSModel

    if not torch.cuda.is_available():
        raise RuntimeError("Qwen3-TTS requires the installed CUDA runtime; torch.cuda.is_available() is false")
    device = torch.cuda.get_device_name(0)
    dtype = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
    print(f"Loading {MODEL_ID} on {device} with {dtype}.", flush=True)
    model = Qwen3TTSModel.from_pretrained(MODEL_ID, device_map="cuda:0", dtype=dtype)
    supported = set(model.get_supported_speakers())
    voices = [voice for voice in VOICES if voice in supported]
    if len(voices) < 8:
        raise RuntimeError(f"The model exposes only {len(voices)} of the selected voices: {sorted(supported)}")

    data = json.loads(DATA_JSON.read_text(encoding="utf-8"))
    tasks: list[tuple[dict, dict, Path, str, str]] = []
    for section_index, section in enumerate(data):
        if args.part is not None and str(section["teil"]) != args.part:
            continue
        if not section.get("orderKnown") or len(section.get("questions", [])) != 8:
            continue
        slug = "teil-" + safe_slug(section["teil"])
        for question in sorted(section["questions"], key=lambda item: int(item["number"])):
            number = int(question["number"])
            text = (question.get("sourceTranscript") or question.get("leitsatz") or "").strip()
            if not text:
                raise ValueError(f"No PDF text for Teil {section['teil']} Sprecher {number}")
            path = OUTPUT / f"{slug}-speaker-{number}.mp3"
            voice = voices[(section_index * 3 + number - 1) % len(voices)]
            if args.force or not path.is_file() or path.stat().st_size < 1_000:
                tasks.append((section, question, path, text, voice))

    if args.limit is not None:
        tasks = tasks[: max(0, args.limit)]
    if not tasks:
        print("No missing HV1 audio clips to generate.")
    else:
        ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
        temp_dir = LOCAL_ROOT / "working"
        temp_dir.mkdir(parents=True, exist_ok=True)
        print(
            f"Generating {len(tasks)} clips in batches of {args.batch_size}; "
            "outputs are mono MP3 at 24 kHz / 48 kbit/s.",
            flush=True,
        )
        for batch_start in range(0, len(tasks), args.batch_size):
            batch = tasks[batch_start : batch_start + args.batch_size]
            start = time.perf_counter()
            waveforms, sample_rate = model.generate_custom_voice(
                text=[task[3] for task in batch],
                language=["German"] * len(batch),
                speaker=[task[4] for task in batch],
            )
            if len(waveforms) != len(batch):
                raise RuntimeError(f"Model returned {len(waveforms)} waveforms for a batch of {len(batch)}")
            batch_elapsed = time.perf_counter() - start
            for offset, ((section, question, path, _text, voice), waveform) in enumerate(zip(batch, waveforms)):
                temporary_wav = temp_dir / f"{path.stem}.wav"
                temporary_mp3 = temp_dir / f"{path.stem}.mp3"
                samples = np.asarray(waveform, dtype=np.float32)
                if samples.ndim > 1:
                    samples = np.squeeze(samples)
                sf.write(temporary_wav, samples, sample_rate, subtype="PCM_16")
                command = [
                    ffmpeg,
                    "-hide_banner",
                    "-loglevel",
                    "error",
                    "-y",
                    "-i",
                    str(temporary_wav),
                    "-vn",
                    "-ac",
                    "1",
                    "-ar",
                    "24000",
                    "-c:a",
                    "libmp3lame",
                    "-b:a",
                    "48k",
                    "-map_metadata",
                    "-1",
                    str(temporary_mp3),
                ]
                subprocess.run(command, check=True)
                path.parent.mkdir(parents=True, exist_ok=True)
                temporary_mp3.replace(path)
                temporary_wav.unlink(missing_ok=True)
                question["audio"] = "data/audio/hv1/" + path.name
                duration = len(samples) / sample_rate
                index = batch_start + offset + 1
                print(
                    f"[{index}/{len(tasks)}] Teil {section['teil']} Sprecher {question['number']} "
                    f"({voice}) {duration:.1f}s, {path.stat().st_size / 1024:.0f} KB, "
                    f"batch {batch_elapsed:.1f}s",
                    flush=True,
                )

    # Register completed files (including clips created before an interrupted run)
    # while leaving missing clips unreferenced in the deployed corpus.
    for section in data:
        if not section.get("orderKnown") or len(section.get("questions", [])) != 8:
            continue
        slug = "teil-" + safe_slug(section["teil"])
        for question in section["questions"]:
            if not str(question.get("number", "")).isdigit():
                question.pop("audio", None)
                continue
            path = OUTPUT / f"{slug}-speaker-{int(question['number'])}.mp3"
            if path.is_file() and path.stat().st_size > 1_000:
                question["audio"] = "data/audio/hv1/" + path.name
            else:
                question.pop("audio", None)
    update_data(data)
    print(f"Dataset updated: {DATA_JSON.relative_to(ROOT)}", flush=True)


if __name__ == "__main__":
    main()
