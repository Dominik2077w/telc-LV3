#!/usr/bin/env python3
"""Extract LV2 signal-word question data into the main LV2 corpus."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from openpyxl import load_workbook


SOURCE_SHEET = "LV2信号词表_修正版"
REQUIRED_COLUMNS = (
    "Teil",
    "段号",
    "文中一句/半句（信号词所在处；红色突出）",
    "信号词中文",
    "对应问句",
    "文句对应中文",
)


def clean_text(value) -> str:
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value)).strip()


def teil_value(value: str) -> int | str:
    match = re.search(r"\d+", value)
    if match:
        return int(match.group(0))
    return clean_text(value)


def sort_key(value: int | str) -> tuple[int, str]:
    if isinstance(value, int):
        return (value, "")
    if str(value).isdigit():
        return (int(value), "")
    return (9999, str(value))


def build_sections(input_path: Path) -> list[dict]:
    workbook = load_workbook(input_path, read_only=False, data_only=True)
    if SOURCE_SHEET not in workbook.sheetnames:
        raise ValueError(
            f"Sheet {SOURCE_SHEET!r} not found. Available sheets: {', '.join(workbook.sheetnames)}"
        )

    worksheet = workbook[SOURCE_SHEET]
    rows = list(worksheet.iter_rows(values_only=True))
    if not rows:
        return []

    header = [clean_text(cell) for cell in rows[0]]
    indexes = {name: index for index, name in enumerate(header)}
    missing = [column for column in REQUIRED_COLUMNS if column not in indexes]
    if missing:
        raise ValueError(f"Missing required columns: {', '.join(missing)}")

    sections: dict[int | str, dict] = {}
    row_number_by_teil: dict[int | str, int] = {}

    def cell(row: tuple, column: str) -> str:
        index = indexes[column]
        return clean_text(row[index] if index < len(row) else "")

    for source_row_number, row in enumerate(rows[1:], start=2):
        teil_raw = cell(row, "Teil")
        paragraph = cell(row, "段号")
        key_sentence = cell(row, "文中一句/半句（信号词所在处；红色突出）")
        option_chinese = cell(row, "信号词中文")
        option_german = cell(row, "对应问句")
        sentence_chinese = cell(row, "文句对应中文")

        if not teil_raw or not paragraph or not key_sentence:
            continue

        teil = teil_value(teil_raw)
        section = sections.setdefault(
            teil,
            {
                "teil": teil,
                "title": "信号词问句配对",
                "sourceText": "LV2 信号词问句表 修正版",
                "mode": "paragraph-card",
                "questions": [],
            },
        )

        row_number_by_teil[teil] = row_number_by_teil.get(teil, 0) + 1
        number = str(row_number_by_teil[teil])
        section["questions"].append(
            {
                "number": number,
                "text": key_sentence,
                "german": key_sentence,
                "chinese": sentence_chinese,
                "answer": "",
                "raw": option_german,
                "source": "lv2-signal-question-xlsx",
                "sourceRow": source_row_number,
                "paragraph": paragraph,
                "firstSentence": key_sentence,
                "summary": sentence_chinese,
                "sentenceZh": sentence_chinese,
                "frage": option_german,
                "signalwortZh": option_chinese,
                "items": [
                    {
                        "number": paragraph,
                        "text": option_german,
                        "german": option_german,
                        "chinese": sentence_chinese,
                        "hint": sentence_chinese,
                        "sourceRow": source_row_number,
                    }
                ],
            }
        )

    return [sections[key] for key in sorted(sections, key=sort_key)]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path, help="Path to LV2 signal-word workbook")
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
    print(f"Wrote {len(sections)} LV2 sections and {question_count} signal questions to {args.output}")


if __name__ == "__main__":
    main()
