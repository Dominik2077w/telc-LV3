#!/usr/bin/env python3
"""Extract LV2 version 2 signal-word matching data from the workbook."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile


SOURCE_SHEET = "LV2信号词表_修正版"
REQUIRED_COLUMNS = (
    "Teil",
    "段号",
    "文中一句/半句（信号词所在处；红色突出）",
    "信号词中文",
    "对应问句",
    "文句对应中文",
)
NS = {
    "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "pkg": "http://schemas.openxmlformats.org/package/2006/relationships",
}


def clean_text(value) -> str:
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value)).strip()


def column_index(cell_ref: str) -> int:
    match = re.match(r"([A-Z]+)", cell_ref)
    if not match:
        return 0
    index = 0
    for char in match.group(1):
        index = index * 26 + ord(char) - 64
    return index - 1


def read_shared_strings(archive: ZipFile) -> list[str]:
    if "xl/sharedStrings.xml" not in archive.namelist():
        return []
    root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
    strings = []
    for item in root.findall("main:si", NS):
        strings.append("".join(node.text or "" for node in item.findall(".//main:t", NS)))
    return strings


def sheet_path_for_name(archive: ZipFile, sheet_name: str) -> str:
    workbook = ET.fromstring(archive.read("xl/workbook.xml"))
    rels = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
    targets = {rel.attrib["Id"]: rel.attrib["Target"] for rel in rels.findall("pkg:Relationship", NS)}

    for sheet in workbook.findall(".//main:sheet", NS):
        if sheet.attrib.get("name") != sheet_name:
            continue
        rel_id = sheet.attrib["{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"]
        target = targets[rel_id].lstrip("/")
        return target if target.startswith("xl/") else "xl/" + target

    available = [sheet.attrib.get("name", "") for sheet in workbook.findall(".//main:sheet", NS)]
    raise ValueError(f"Sheet {sheet_name!r} not found. Available sheets: {', '.join(available)}")


def read_rows(input_path: Path, sheet_name: str) -> list[list[str]]:
    with ZipFile(input_path) as archive:
        shared_strings = read_shared_strings(archive)
        sheet_path = sheet_path_for_name(archive, sheet_name)
        root = ET.fromstring(archive.read(sheet_path))
        rows = []

        for row in root.findall(".//main:sheetData/main:row", NS):
            values: dict[int, str] = {}
            for cell in row.findall("main:c", NS):
                index = column_index(cell.attrib.get("r", "A"))
                cell_type = cell.attrib.get("t")
                value_node = cell.find("main:v", NS)
                text = ""
                if cell_type == "s" and value_node is not None:
                    text = shared_strings[int(value_node.text or "0")]
                elif cell_type == "inlineStr":
                    text = "".join(node.text or "" for node in cell.findall(".//main:t", NS))
                elif value_node is not None:
                    text = value_node.text or ""
                values[index] = clean_text(text)

            if values:
                rows.append([values.get(index, "") for index in range(max(values) + 1)])

        return rows


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


def unique_join(values: list[str], limit: int = 4) -> str:
    seen = []
    for value in values:
        value = clean_text(value)
        if value and value not in seen:
            seen.append(value)
    text = "；".join(seen[:limit])
    if len(seen) > limit:
        text += f"；另 {len(seen) - limit} 条"
    return text


def derive_signalwort_de(sentence: str) -> str:
    sentence = clean_text(sentence)
    if not sentence:
        return ""

    slash_parts = [part.strip() for part in re.split(r"\s*/\s*", sentence) if part.strip()]
    if len(slash_parts) >= 2:
        return " / ".join(slash_parts[: min(3, len(slash_parts))])

    patterns = (
        r"Ist es nicht\b[^?]*\?",
        r"Sollte man\b[^?]*\?",
        r"Wie\s+…\?\s*/\s*Warum\s+…\?",
        r"\b(?:sollte|sollten|muss|müssen|womöglich|vielleicht|möglicherweise|dürfte|könnte|könnten)\b",
        r"\b(?:allerdings|aber|doch|dennoch|zwar|trotzdem|einerseits|andererseits)\b",
        r"\b(?:bezeichnet|bedeutet|heißt|handelt sich um|Definition)\b",
        r"\b(?:erstaunlich|überraschend|verblüffend|seltsam|komisch|Na sowas)\b",
        r"\b(?:Kritiker|Experten|Forscher|Studien|laut|zufolge|Vorwurf)\b[^,.]*",
        r"\b(?:daraus ableiten|kommt zu dem Schluss|lässt sich folgern|folglich)\b",
    )
    for pattern in patterns:
        match = re.search(pattern, sentence, re.IGNORECASE)
        if match:
            return clean_text(match.group(0))

    words = sentence.split()
    return " ".join(words[: min(6, len(words))])


def build_sections(input_path: Path) -> list[dict]:
    rows = read_rows(input_path, SOURCE_SHEET)
    if not rows:
        return []

    header = [clean_text(cell) for cell in rows[0]]
    indexes = {name: index for index, name in enumerate(header)}
    missing = [column for column in REQUIRED_COLUMNS if column not in indexes]
    if missing:
        raise ValueError(f"Missing required columns: {', '.join(missing)}")

    sections: dict[int | str, dict] = {}
    row_number_by_teil: dict[int | str, int] = {}

    def cell(row: list[str], column: str) -> str:
        index = indexes[column]
        return clean_text(row[index] if index < len(row) else "")

    for source_row_number, row in enumerate(rows[1:], start=2):
        teil_raw = cell(row, "Teil")
        paragraph = cell(row, "段号")
        signal_sentence = cell(row, "文中一句/半句（信号词所在处；红色突出）")
        signal_zh = cell(row, "信号词中文")
        frage = cell(row, "对应问句")
        sentence_zh = cell(row, "文句对应中文")

        if not teil_raw or not paragraph or not signal_sentence:
            continue

        teil = teil_value(teil_raw)
        section = sections.setdefault(
            teil,
            {
                "teil": teil,
                "title": "信号词与原句配对",
                "sourceText": "LV2 信号词表 修正版",
                "mode": "lv2-v2-signal-match",
                "questions": [],
            },
        )

        row_number_by_teil[teil] = row_number_by_teil.get(teil, 0) + 1
        signalwort_de = derive_signalwort_de(signal_sentence)
        section["questions"].append(
            {
                "number": str(row_number_by_teil[teil]),
                "text": f"{paragraph} · {signalwort_de}",
                "german": signalwort_de,
                "chinese": sentence_zh,
                "answer": "",
                "raw": signal_sentence,
                "source": "lv2-v2-signal-xlsx",
                "sourceRow": source_row_number,
                "paragraph": paragraph,
                "firstSentence": signal_sentence,
                "summary": frage,
                "signalwort": signalwort_de,
                "signalwortZh": signal_zh,
                "sentence": signal_sentence,
                "sentenceZh": sentence_zh,
                "frage": frage,
                "items": [
                    {
                        "number": paragraph,
                        "text": signal_sentence,
                        "hint": frage,
                        "chinese": sentence_zh,
                        "signalwort": signalwort_de,
                        "signalwortZh": signal_zh,
                        "sourceRow": source_row_number,
                    }
                ],
            }
        )

    return [sections[key] for key in sorted(sections, key=sort_key)]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path, help="Path to LV2 version 2 workbook")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("data/lv2_v2_questions.js"),
        help="Output JavaScript data file",
    )
    args = parser.parse_args()

    sections = build_sections(args.input)
    payload = json.dumps(sections, ensure_ascii=False, indent=2)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(f"window.LV2_V2_QUESTIONS = {payload};\n", encoding="utf-8")

    pair_count = sum(len(section["questions"]) for section in sections)
    print(f"Wrote {len(sections)} LV2 version 2 sections and {pair_count} signal pairs to {args.output}")


if __name__ == "__main__":
    main()
