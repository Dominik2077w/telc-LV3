"""Add the German transcript passages present in the supplied PDF to HV1 data."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[3]
DATA_JSON = ROOT / "data" / "hv1_questions.json"
DATA_JS = ROOT / "data" / "hv1_questions.js"
PAGE_START = 182
PAGE_END = 227


def normalized_positions(value: str) -> tuple[str, list[int]]:
    chars: list[str] = []
    positions: list[int] = []
    for index, char in enumerate(value):
        if char.isalnum():
            chars.append(char.casefold())
            positions.append(index)
    return "".join(chars), positions


def strip_answer_and_footer(block: str, question: dict) -> str:
    marker_texts = [question.get("sourceGerman", ""), question.get("leitsatz", "")]
    normalized_block, positions = normalized_positions(block)
    cut_at: int | None = None
    for marker_text in marker_texts:
        marker, _ = normalized_positions(marker_text)
        if len(marker) < 18:
            continue
        position = normalized_block.rfind(marker)
        if position >= 0:
            cut_at = positions[position]
            break

    if cut_at is not None:
        line_start = block.rfind("\n", 0, cut_at) + 1
        answer_prefix = re.sub(r"\s+", "", block[line_start:cut_at])
        if re.fullmatch(r"(?:\d+)?[A-J][.)-]?", answer_prefix, flags=re.IGNORECASE):
            cut_at = line_start
        block = block[:cut_at]
    else:
        # The answer row is bilingual in the PDF. If text extraction differs in
        # punctuation, the first Chinese character still marks that row.
        chinese = re.search(r"[\u3400-\u9fff]", block)
        if chinese:
            block = block[: chinese.start()]

    lines: list[str] = []
    for line in block.splitlines():
        line = line.strip()
        if not line or line.startswith("--- PDF PAGE "):
            continue
        if line.isdigit() or line.startswith("Ten chicken butts xhs:"):
            continue
        if line.casefold() in {"hv1", "tk配套检测文件"}:
            continue
        lines.append(line)

    joined = "\n".join(lines)
    joined = re.sub(r"(?<=[A-Za-zÄÖÜäöüß])[-‐]\s*\n\s*(?=[a-zäöüß])", "", joined)
    joined = re.sub(r"\s+", " ", joined).strip()
    return joined.rstrip("-–—:;,. ")


def extract_transcripts(pdf_path: Path) -> tuple[list[dict], str]:
    reader = PdfReader(str(pdf_path))
    if len(reader.pages) < PAGE_END:
        raise ValueError(f"Expected at least {PAGE_END} pages, got {len(reader.pages)}")

    page_text = "\n\n".join(
        f"--- PDF PAGE {page_number} ---\n{reader.pages[page_number - 1].extract_text() or ''}"
        for page_number in range(PAGE_START, PAGE_END + 1)
    )
    headings = list(re.finditer(r"(?m)^Teil\s+\d+[^\r\n]*$", page_text))
    data = json.loads(DATA_JSON.read_text(encoding="utf-8"))
    if len(headings) != len(data):
        raise ValueError(f"PDF has {len(headings)} HV1 sections; data has {len(data)}")

    total = 0
    for section_index, (heading, section) in enumerate(zip(headings, data)):
        end = headings[section_index + 1].start() if section_index + 1 < len(headings) else len(page_text)
        text = page_text[heading.start() : end]
        markers = list(
            re.finditer(r"(?im)^(?:Sprecher|Speaker)\s*([1-8])\s*[.:]?\s*$", text)
        )
        section_transcripts: dict[int, str] = {}

        # The first eight headings list the answer statements. Later headings
        # introduce original speaker passages where the PDF includes them.
        for index, marker in enumerate(markers[8:], start=8):
            next_marker = markers[index + 1].start() if index + 1 < len(markers) else len(text)
            number = int(marker.group(1))
            question = next(
                (
                    item
                    for item in section["questions"]
                    if str(item.get("number", "")).isdigit()
                    and int(item["number"]) == number
                ),
                None,
            )
            if question is None:
                continue
            passage = strip_answer_and_footer(text[marker.end() : next_marker], question)
            if len(passage) >= 100:
                section_transcripts[number] = passage

        for question in section["questions"]:
            number = question.get("number")
            transcript = section_transcripts.get(int(number)) if str(number).isdigit() else None
            if transcript:
                question["sourceTranscript"] = transcript
                total += 1
            else:
                question.pop("sourceTranscript", None)

    DATA_JSON.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    DATA_JS.write_text(
        "window.HV1_QUESTIONS = " + json.dumps(data, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8",
    )
    return data, f"Extracted {total} original speaker transcripts from PDF pages {PAGE_START}-{PAGE_END}."


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf", type=Path, help="Path to the 2026.9 corpus PDF")
    args = parser.parse_args()
    data, message = extract_transcripts(args.pdf)
    print(message)
    for section in data:
        count = sum(bool(question.get("sourceTranscript")) for question in section["questions"])
        if count:
            print(f"Teil {section['teil']}: {count}/{len(section['questions'])} transcripts")


if __name__ == "__main__":
    main()
