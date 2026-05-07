"""
Generate HV1 audio files using Qwen3-TTS CustomVoice.

Usage:
    pip install qwen-tts
    python scripts/generate-hv1-audio.py [--teil 1] [--output data/audio/hv1]

Requires: NVIDIA GPU with CUDA, qwen-tts package.

Each Sprecher gets a different preset voice so the student hears
8 distinct speakers, matching the real exam format.
"""

import argparse
import json
import os
import sys
import time

# Available speakers in Qwen3-TTS CustomVoice model.
# These are the documented preset voices. The model supports German natively.
SPEAKERS = [
    "Ryan",      # English male, dynamic
    "Aiden",     # English male, sunny
    "Vivian",    # Chinese female, bright
    "Serena",    # Chinese female, warm
    "Uncle_Fu",  # Chinese male, seasoned
    "Dylan",     # Chinese male, Beijing
    "Eric",      # Chinese male, Sichuan
    "Sohee",     # Korean female, warm
]


def load_hv1_data(data_path):
    """Load HV1 question data from JS or JSON file."""
    if data_path.endswith(".json"):
        with open(data_path, "r", encoding="utf-8") as f:
            return json.load(f)

    # Parse JS file: read the window.HV1_QUESTIONS = [...] assignment
    with open(data_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Find the JSON array inside the JS assignment
    start = content.find("[")
    if start == -1:
        raise ValueError("Could not find data array in JS file")

    # Find matching closing bracket
    depth = 0
    end = start
    for i, ch in enumerate(content[start:], start):
        if ch == "[":
            depth += 1
        elif ch == "]":
            depth -= 1
            if depth == 0:
                end = i + 1
                break

    json_str = content[start:end]
    return json.loads(json_str)


def generate_audio_batch(model, batch_items, language="German"):
    """Generate TTS audio for multiple Sprechers in a batch."""
    texts = [item["text"] for item in batch_items]
    speakers = [item["speaker"] for item in batch_items]

    print(f"  Batch generating {len(texts)} audio files...")
    print(f"    Total chars: {sum(len(t) for t in texts)}")

    wavs, sr = model.generate_custom_voice(
        text=texts,
        language=[language] * len(texts),
        speaker=speakers,
    )

    import soundfile as sf
    for i, item in enumerate(batch_items):
        audio = wavs[i]
        if hasattr(audio, "cpu"):
            audio = audio.cpu().numpy()
        sf.write(item["output_path"], audio, sr)
        print(f"    Saved: {os.path.basename(item['output_path'])} ({len(texts[i])} chars)")

    return [item["output_path"] for item in batch_items]


def main():
    parser = argparse.ArgumentParser(description="Generate HV1 TTS audio files")
    parser.add_argument("--data", default="data/hv1_questions.js",
                        help="Path to HV1 data file")
    parser.add_argument("--output", default="data/audio/hv1",
                        help="Output directory for audio files")
    parser.add_argument("--teil", type=int, default=0,
                        help="Generate only this Teil (0 = all)")
    parser.add_argument("--model", default="Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice",
                        help="Qwen3-TTS model ID on HuggingFace")
    parser.add_argument("--dry-run", action="store_true",
                        help="Show what would be generated without running TTS")
    args = parser.parse_args()

    # Load data
    script_dir = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.dirname(script_dir) if os.path.basename(script_dir) == "scripts" else script_dir
    data_path = os.path.join(root_dir, args.data)
    output_dir = os.path.join(root_dir, args.output)

    print(f"Loading data from: {data_path}")
    sections = load_hv1_data(data_path)
    print(f"Loaded {len(sections)} Teils")

    # Filter Teils
    if args.teil > 0:
        sections = [s for s in sections if s["teil"] == args.teil]
        if not sections:
            print(f"Teil {args.teil} not found!")
            return

    # Count total audio files
    total = sum(len(s["questions"]) for s in sections)
    print(f"Total audio files to generate: {total}")

    os.makedirs(output_dir, exist_ok=True)

    if args.dry_run:
        for section in sections:
            for q in section["questions"]:
                speaker_idx = (q["number"] - 1) % len(SPEAKERS)
                filename = f"teil{section['teil']}_sprecher{q['number']}.wav"
                print(f"  [DRY RUN] {filename} <- {SPEAKERS[speaker_idx]} ({len(q['text'])} chars)")
        print(f"\nDry run complete. {total} files would be generated.")
        return

    # Load model
    print(f"\nLoading Qwen3-TTS model: {args.model}")
    print("This may take a few minutes and requires CUDA GPU...")

    import torch
    if not torch.cuda.is_available():
        print("ERROR: CUDA GPU not available. Qwen3-TTS requires a GPU.")
        sys.exit(1)

    from qwen_tts import Qwen3TTSModel

    model = Qwen3TTSModel.from_pretrained(
        args.model,
        device_map="cuda:0",
        dtype=torch.bfloat16,
    )
    print("Model loaded successfully.")

    # Generate audio in batches per Teil
    start_time = time.time()
    generated = 0

    for section in sections:
        teil_num = section["teil"]
        print(f"\n--- Teil {teil_num}: {section['title']} ---")

        # Build batch items for this Teil
        batch = []
        for q in section["questions"]:
            filename = f"teil{teil_num}_sprecher{q['number']}.wav"
            output_path = os.path.join(output_dir, filename)
            if os.path.exists(output_path):
                print(f"  {filename} already exists, skipping.")
                generated += 1
                continue
            speaker_idx = (q["number"] - 1) % len(SPEAKERS)
            batch.append({
                "text": q["text"],
                "speaker": SPEAKERS[speaker_idx],
                "output_path": output_path,
            })

        if not batch:
            continue

        # Generate entire batch at once
        try:
            generate_audio_batch(model, batch)
            generated += len(batch)
        except Exception as e:
            print(f"  Batch ERROR: {e}")
            # Fall back to individual generation
            for item in batch:
                try:
                    wavs, sr = model.generate_custom_voice(
                        text=item["text"],
                        language="German",
                        speaker=item["speaker"],
                    )
                    import soundfile as sf
                    audio = wavs[0]
                    if hasattr(audio, "cpu"):
                        audio = audio.cpu().numpy()
                    sf.write(item["output_path"], audio, sr)
                    print(f"    Saved (fallback): {os.path.basename(item['output_path'])}")
                    generated += 1
                except Exception as e2:
                    print(f"    ERROR: {os.path.basename(item['output_path'])}: {e2}")

    elapsed = time.time() - start_time
    print(f"\nDone. Generated {generated}/{total} files in {elapsed:.1f}s")
    print(f"Output directory: {output_dir}")


if __name__ == "__main__":
    main()
