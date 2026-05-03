#!/usr/bin/env python3
"""Extract LV2 paragraph flashcard practice data from the cleaned workbook."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from openpyxl import load_workbook


SOURCE_SHEET = "LV2清洗数据"
SKIP_TEILS = {"1"}
UNUSABLE_MARKERS = ("资料未明确", "不作为配题答案", "未配题")


def clean_text(value) -> str:
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value)).strip()


def split_answer_items(numbers: str, item_text: str) -> list[tuple[str, str]]:
    text = clean_text(item_text)
    if not text or any(marker in text for marker in UNUSABLE_MARKERS):
        return []

    number_parts = [part.strip() for part in re.split(r"[;；,，]", clean_text(numbers)) if part.strip()]
    raw_parts = [part.strip() for part in re.split(r"[;；]", text) if part.strip()]

    if len(raw_parts) == 1:
        matches = list(re.finditer(r"(?<!\d)(\d{1,2})[\s.\-]+", raw_parts[0]))
        if len(matches) > 1:
            expanded = []
            for index, match in enumerate(matches):
                start = match.start()
                end = matches[index + 1].start() if index + 1 < len(matches) else len(raw_parts[0])
                expanded.append(raw_parts[0][start:end].strip())
            raw_parts = expanded

    results: list[tuple[str, str]] = []
    for index, part in enumerate(raw_parts):
        match = re.match(r"^\s*(\d{1,2})\s*[-.)]?\s*(.*)$", part)
        if match:
            number, prompt = match.group(1), match.group(2)
        else:
            number = number_parts[index] if index < len(number_parts) else ""
            prompt = part

        prompt = clean_text(prompt)
        prompt = re.sub(r"^[A-E]\s*\)\s*\(?\s*", "", prompt).strip()
        prompt = prompt.strip("() ")
        if not prompt:
            continue
        results.append((number, prompt))

    return results


def build_sections(input_path: Path) -> list[dict]:
    workbook = load_workbook(input_path, read_only=True, data_only=True)
    worksheet = workbook[SOURCE_SHEET]
    rows = list(worksheet.iter_rows(values_only=True))
    header = [clean_text(cell) for cell in rows[0]]
    indexes = {name: index for index, name in enumerate(header)}

    sections: dict[str, dict] = {}

    for row in rows[1:]:
        teil = clean_text(row[indexes["Teil编号"]])
        if not teil or teil in SKIP_TEILS:
            continue

        title = clean_text(row[indexes["篇目标题"]])
        paragraph = clean_text(row[indexes["段落编号"]])
        first_sentence = clean_text(row[indexes["第一句话原文"]])
        summary = clean_text(row[indexes["段落大意（非逐句译文）"]])
        numbers = clean_text(row[indexes["对应题号"]])
        item_text = clean_text(row[indexes["对应题目/答案项"]])
        note = clean_text(row[indexes["备注"]])

        section = sections.setdefault(
            teil,
            {
                "teil": int(teil),
                "title": title,
                "sourceText": "LV2 段落卡片",
                "mode": "paragraph-card",
                "questions": [],
            },
        )

        if paragraph and first_sentence:
            items = [
                {"number": number, "text": prompt}
                for number, prompt in split_answer_items(numbers, item_text)
            ]
            section["questions"].append(
                {
                    "number": paragraph,
                    "text": first_sentence,
                    "german": first_sentence,
                    "chinese": summary,
                    "answer": "",
                    "raw": item_text,
                    "source": "lv2-xlsx",
                    "paragraph": paragraph,
                    "firstSentence": first_sentence,
                    "summary": summary,
                    "items": items,
                    "note": note,
                }
            )

    return [sections[key] for key in sorted(sections, key=lambda value: int(value))]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path, help="Path to LV2 cleaned workbook")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("data/lv2_questions.js"),
        help="Output JavaScript data file",
    )
    args = parser.parse_args()

    sections = build_sections(args.input)
    payload = json.dumps(sections, ensure_ascii=False, indent=2)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(f"window.LV2_QUESTIONS = {payload};\n", encoding="utf-8")

    question_count = sum(len(section["questions"]) for section in sections)
    print(f"Wrote {len(sections)} LV2 sections and {question_count} questions to {args.output}")


if __name__ == "__main__":
    main()
