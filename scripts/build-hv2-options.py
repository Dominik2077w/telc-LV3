#!/usr/bin/env python3
"""Build HV2 multiple-choice questions from the reviewed Excel sheet."""

from __future__ import annotations

import json
import os
import re
import zipfile
from collections.abc import Iterable
from pathlib import Path
from xml.etree import ElementTree


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data" / "hv2_questions.js"
DEFAULT_SOURCE = Path("/Users/dominik/Desktop/听力第二部分_人工复核完整版.xlsx")
SOURCE = Path(os.environ.get("HV2_OPTIONS_XLSX", DEFAULT_SOURCE))
UNMARKED_TEIL_ANSWER_ORDER = {
    "11": ["B", "C", "A", "C", "A", "B", "B", "A", "C", "C"],
    "12": ["B", "A", "C", "A", "B", "C", "C", "B", "A", "A"],
    "13": ["C", "B", "A", "B", "C", "A", "A", "C", "B", "B"],
}

TEIL_6_1_ROWS = [
    {
        "number": "55",
        "prompt": "In der Neurobiologie gilt als gesichert, dass ...",
        "answer": "A",
        "chinese": "在神经生物学领域已被证实：青少年在特定发育阶段会出现睡眠障碍。",
        "options": {
            "A": "haben in bestimmten Entwicklungsphasen Schlafstörungen.",
            "B": "brauchen grundsätzlich weniger Schlaf als Erwachsene.",
            "C": "schlafen nur wegen digitaler Medien schlecht.",
        },
    },
    {
        "number": "56",
        "prompt": "Jugendliche gehen abends später zu Bett, ...",
        "answer": "A",
        "chinese": "青少年晚上更晚就寝，因为他们的生物节律发生了变化。",
        "options": {
            "A": "weil sich der Biorhythmus verändert.",
            "B": "weil sie morgens besonders leistungsfähig sind.",
            "C": "weil sie keinen Schlaf benötigen.",
        },
    },
    {
        "number": "57",
        "prompt": "Das Hormon Melatonin ...",
        "answer": "A",
        "chinese": "褪黑素有助于入睡。",
        "options": {
            "A": "hilft beim Einschlafen.",
            "B": "verhindert tiefen Schlaf.",
            "C": "wird nur tagsüber produziert.",
        },
    },
    {
        "number": "58",
        "prompt": "Jugendliche ...",
        "answer": "B",
        "chinese": "青少年过早起床会损害健康。",
        "options": {
            "A": "profitieren von sehr frühem Aufstehen.",
            "B": "schaden durch zu frühes Aufstehen ihrer Gesundheit.",
            "C": "sollten grundsätzlich weniger schlafen.",
        },
    },
    {
        "number": "59",
        "prompt": "Schlafmangel bei Kindern und Jugendlichen ...",
        "answer": "B",
        "chinese": "儿童和青少年睡眠不足可能导致严重的发育问题。",
        "options": {
            "A": "hat kaum Folgen.",
            "B": "kann zu starken Entwicklungsproblemen führen.",
            "C": "verbessert langfristig die Konzentration.",
        },
    },
    {
        "number": "60",
        "prompt": "Frau Prof. Reinecke ...",
        "answer": "B",
        "chinese": "Reinecke 教授主张调整学校作息时间。",
        "options": {
            "A": "fordert längere Hausaufgabenzeiten.",
            "B": "spricht sich für eine Änderung der Schulzeiten aus.",
            "C": "lehnt spätere Schulanfangszeiten ab.",
        },
    },
    {
        "number": "61",
        "prompt": "Schulen ...",
        "answer": "B",
        "chinese": "学校实行的是固定而僵化的时间框架。",
        "options": {
            "A": "passen sich flexibel jedem Schüler an.",
            "B": "haben einen starren Zeitrahmen.",
            "C": "beginnen grundsätzlich am Nachmittag.",
        },
    },
    {
        "number": "62a",
        "prompt": "Schülerinnen und Schüler sollten in der idealen Schule ...",
        "answer": "A",
        "chinese": "在理想学校里，学生应能发挥自己的学习/表现潜能。",
        "options": {
            "A": "ihr Leistungspotenzial nutzen können.",
            "B": "immer zur gleichen Uhrzeit geprüft werden.",
            "C": "möglichst wenig Unterricht haben.",
        },
    },
    {
        "number": "62b",
        "prompt": "Schülerinnen und Schüler sollten optimalerweise ...",
        "answer": "C",
        "chinese": "理想情况下，学生应在自己状态最佳的时段接受教学。",
        "options": {
            "A": "immer zur gleichen Uhrzeit unterrichtet werden.",
            "B": "nur am frühen Morgen lernen.",
            "C": "zu Tageszeiten unterrichtet werden, an denen sie am leistungsfähigsten sind.",
        },
    },
    {
        "number": "63a",
        "prompt": "Viele Lehrer meinen, dass frühes Aufstehen ...",
        "answer": "B",
        "chinese": "很多老师认为，早起是走向成年的一部分。",
        "options": {
            "A": "gesundheitlich gefährlich ist.",
            "B": "zum Erwachsenwerden gehört.",
            "C": "von Schülern vermieden werden sollte.",
        },
    },
    {
        "number": "63b",
        "prompt": "Viele Lehrer meinen, dass frühes Aufstehen ...",
        "answer": "B",
        "chinese": "很多老师认为，早起能够提升表现/效率。",
        "options": {
            "A": "jede Konzentration verhindert.",
            "B": "die Leistungsfähigkeit steigert.",
            "C": "nur kulturelle Tradition ist.",
        },
    },
    {
        "number": "64",
        "prompt": "Frau Prof. Reinecke denkt, dass ...",
        "answer": "B",
        "chinese": "Reinecke 教授认为，早起是由文化因素造成的。",
        "options": {
            "A": "spätes Aufstehen grundsätzlich schädlich ist.",
            "B": "frühes Aufstehen kulturell bedingt ist.",
            "C": "frühes Aufstehen biologisch zwingend notwendig ist.",
        },
    },
]

TEIL_6_2_ROWS = [
    {
        "number": "55",
        "prompt": "Kinder ...",
        "answer": "A",
        "chinese": "儿童在某些发育阶段会出现睡眠障碍。",
        "options": {
            "A": "haben in bestimmten Entwicklungsphasen Schlafstörungen.",
            "B": "schlafen in jeder Entwicklungsphase gleich gut.",
            "C": "brauchen grundsätzlich keinen festen Schlafrhythmus.",
        },
    },
    {
        "number": "56",
        "prompt": "Jugendliche ...",
        "answer": "B",
        "chinese": "青少年晚上更晚入睡，因为他们的生物节律在调整。",
        "options": {
            "A": "gehen früher zu Bett, weil sie morgens wacher sind.",
            "B": "gehen abends später zu Bett, weil sich ihr Biorhythmus umstellt.",
            "C": "schlafen nur schlecht, wenn sie zu wenig Sport treiben.",
        },
    },
    {
        "number": "57",
        "prompt": "Das Hormon Melatonin ...",
        "answer": "C",
        "chinese": "褪黑素有助于入睡。",
        "options": {
            "A": "macht Kinder am Morgen sofort leistungsfähig.",
            "B": "wird nur bei Erwachsenen gebildet.",
            "C": "hilft beim Einschlafen.",
        },
    },
    {
        "number": "58",
        "prompt": "Jugendliche ...",
        "answer": "A",
        "chinese": "过早起床会损害青少年的健康。",
        "options": {
            "A": "nehmen durch zu frühes Aufstehen Schaden.",
            "B": "werden durch frühes Aufstehen gesünder.",
            "C": "sollten ihre Schlafzeiten täglich wechseln.",
        },
    },
    {
        "number": "59",
        "prompt": "Schlafmangel bei Kindern und Jugendlichen ...",
        "answer": "B",
        "chinese": "儿童和青少年睡眠不足可能导致严重的发育问题。",
        "options": {
            "A": "hat kaum Auswirkungen auf die Entwicklung.",
            "B": "kann zu starken Entwicklungsproblemen führen.",
            "C": "steigert langfristig die schulische Leistung.",
        },
    },
    {
        "number": "60",
        "prompt": "Frau Prof. Reinecke ...",
        "answer": "C",
        "chinese": "Reinecke 教授主张调整学校作息时间。",
        "options": {
            "A": "möchte die Schulzeiten unverändert lassen.",
            "B": "fordert einen noch früheren Schulbeginn.",
            "C": "spricht sich für eine Änderung der Schulzeiten aus.",
        },
    },
    {
        "number": "61",
        "prompt": "Schulen ...",
        "answer": "A",
        "chinese": "学校的时间安排框架很僵化。",
        "options": {
            "A": "haben einen starren Zeitrahmen.",
            "B": "passen ihre Zeiten täglich an einzelne Schüler an.",
            "C": "beginnen grundsätzlich erst am Nachmittag.",
        },
    },
    {
        "number": "62",
        "prompt": "Schülerinnen und Schüler sollten optimalerweise ...",
        "answer": "B",
        "chinese": "理想情况下，应在学生状态最佳的时段进行授课。",
        "options": {
            "A": "nur in den frühen Morgenstunden lernen.",
            "B": "zu Tageszeiten unterrichtet werden, an denen sie am leistungsfähigsten sind.",
            "C": "immer nach demselben Stundenplan geprüft werden.",
        },
    },
    {
        "number": "63",
        "prompt": "Viele Lehrer meinen, dass frühes Aufstehen ...",
        "answer": "C",
        "chinese": "许多老师认为，早起能提升表现/效率。",
        "options": {
            "A": "für Jugendliche grundsätzlich schädlich ist.",
            "B": "mit schulischer Leistung nichts zu tun hat.",
            "C": "die Leistungsfähigkeit steigert.",
        },
    },
    {
        "number": "64",
        "prompt": "Frau Prof. Reinecke denkt, dass ...",
        "answer": "A",
        "chinese": "Reinecke 教授认为，早起是由社会因素造成的。",
        "options": {
            "A": "frühes Aufstehen gesellschaftlich bedingt ist.",
            "B": "frühes Aufstehen ausschließlich biologisch notwendig ist.",
            "C": "spätes Aufstehen kulturell vorgeschrieben ist.",
        },
    },
]


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", str(text).replace("..", "...").replace("…", "...").strip()).lower()


def clean_cell(value: object) -> str:
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value).strip())


def parse_teil(value: object) -> tuple[str, str]:
    text = clean_cell(value)
    match = re.match(r"Teil\s+(\d+)\s*(.*)", text)
    if not match:
        raise ValueError(f"Cannot parse Teil value: {text!r}")
    return match.group(1), match.group(2).strip()


def load_existing_chinese() -> dict[tuple[str, str, str], str]:
    if not OUTPUT.exists():
        return {}
    match = re.search(r"window\.HV2_QUESTIONS\s*=\s*(\[.*\]);?\s*$", OUTPUT.read_text(encoding="utf-8"), re.S)
    if not match:
        return {}
    existing = json.loads(match.group(1))
    translations: dict[tuple[str, str, str], str] = {}
    fallback: dict[tuple[str, str], str] = {}
    for section in existing:
        teil = str(section.get("teil", "")).split(".")[0]
        for question in section.get("questions", []):
            chinese = question.get("chinese")
            if not chinese or chinese == "暂无中文释义":
                continue
            number = str(question.get("number", ""))
            text = normalize(question.get("text") or question.get("german") or "")
            translations[(teil, number, text)] = chinese
            fallback.setdefault((teil, number), chinese)
    for (teil, number), chinese in fallback.items():
        translations.setdefault((teil, number, ""), chinese)
    return translations


def xml_text(element: ElementTree.Element | None) -> str:
    if element is None:
        return ""
    return "".join(element.itertext())


def read_shared_strings(xlsx: zipfile.ZipFile) -> list[str]:
    try:
        root = ElementTree.fromstring(xlsx.read("xl/sharedStrings.xml"))
    except KeyError:
        return []
    namespace = {"x": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    return [xml_text(item) for item in root.findall("x:si", namespace)]


def get_sheet_path(xlsx: zipfile.ZipFile, sheet_name: str) -> str:
    workbook = ElementTree.fromstring(xlsx.read("xl/workbook.xml"))
    relationships = ElementTree.fromstring(xlsx.read("xl/_rels/workbook.xml.rels"))
    workbook_ns = {"x": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    rel_ns = {"r": "http://schemas.openxmlformats.org/package/2006/relationships"}
    rels = {rel.attrib["Id"]: rel.attrib["Target"] for rel in relationships.findall("r:Relationship", rel_ns)}
    for sheet in workbook.findall("x:sheets/x:sheet", workbook_ns):
        if sheet.attrib.get("name") != sheet_name:
            continue
        rel_id = sheet.attrib.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id")
        target = rels[rel_id]
        target = target.lstrip("/")
        return target if target.startswith("xl/") else "xl/" + target
    raise ValueError(f"Sheet not found in {SOURCE}: {sheet_name}")


def column_name(cell_ref: str) -> str:
    return re.sub(r"\d+", "", cell_ref)


def cell_value(cell: ElementTree.Element, shared_strings: list[str], namespace: dict[str, str]) -> str:
    cell_type = cell.attrib.get("t")
    value_node = cell.find("x:v", namespace)
    if cell_type == "inlineStr":
        return xml_text(cell.find("x:is", namespace))
    if value_node is None:
        return ""
    value = value_node.text or ""
    if cell_type == "s":
        index = int(value)
        return shared_strings[index] if index < len(shared_strings) else ""
    return value


def iter_sheet_rows(xlsx: zipfile.ZipFile, sheet_name: str) -> Iterable[dict[str, str]]:
    shared_strings = read_shared_strings(xlsx)
    sheet_path = get_sheet_path(xlsx, sheet_name)
    root = ElementTree.fromstring(xlsx.read(sheet_path))
    namespace = {"x": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    for row in root.findall("x:sheetData/x:row", namespace):
        values: dict[str, str] = {}
        for cell in row.findall("x:c", namespace):
            values[column_name(cell.attrib["r"])] = cell_value(cell, shared_strings, namespace)
        yield values


def first_existing(mapping: dict[str, str], *keys: str) -> str:
    for key in keys:
        if key in mapping:
            return mapping[key]
    return ""


def make_question(row: dict, source: str) -> dict:
    number = clean_cell(row["number"])
    prompt = clean_cell(row["prompt"]).replace("…", "...")
    options_by_letter = row["options"]
    answer = clean_cell(row["answer"]).upper()
    completion = options_by_letter[answer]
    return {
        "number": number,
        "text": prompt,
        "german": prompt,
        "chinese": clean_cell(row["chinese"]),
        "answer": answer,
        "completion": completion,
        "options": [
            {"value": "A", "label": f"A. {options_by_letter['A']}", "shortcut": "1 / A"},
            {"value": "B", "label": f"B. {options_by_letter['B']}", "shortcut": "2 / B"},
            {"value": "C", "label": f"C. {options_by_letter['C']}", "shortcut": "3 / C"},
        ],
        "source": source,
    }


def distribute_unmarked_correct_option(teil: str, index: int, options: dict[str, str]) -> tuple[dict[str, str], str]:
    answer_order = UNMARKED_TEIL_ANSWER_ORDER.get(teil)
    if not answer_order:
        return options, ""

    correct_answer = answer_order[index % len(answer_order)]
    correct_text = options["A"]
    distractors = [options["B"], options["C"]]
    distributed: dict[str, str] = {}
    distractor_index = 0

    for letter in ["A", "B", "C"]:
        if letter == correct_answer:
            distributed[letter] = correct_text
        else:
            distributed[letter] = distractors[distractor_index]
            distractor_index += 1

    return distributed, correct_answer


def load_rows() -> list[dict]:
    if not SOURCE.exists():
        raise FileNotFoundError(f"HV2 options workbook not found: {SOURCE}")
    with zipfile.ZipFile(SOURCE) as xlsx:
        sheet_name = "完整版"
        try:
            raw_rows = list(iter_sheet_rows(xlsx, sheet_name))
        except ValueError:
            sheet_name = "完整题库"
            raw_rows = list(iter_sheet_rows(xlsx, sheet_name))
    if not raw_rows:
        raise ValueError(f"No rows found in {SOURCE}")
    headers = raw_rows[0]
    column_by_header = {clean_cell(value): column for column, value in headers.items()}
    required = ["题号", "题面", "A", "B", "C", "最终答案"]
    teil_header = "Teil" if "Teil" in column_by_header else "部分"
    required.append(teil_header)
    missing = [column for column in required if column not in column_by_header]
    if missing:
        raise ValueError(f"Missing required columns in {SOURCE}: {', '.join(missing)}")
    rows = []
    for raw_row in raw_rows[1:]:
        row = {header: clean_cell(raw_row.get(column_by_header[header], "")) for header in column_by_header}
        if any(row.get(header) for header in required):
            row["Teil"] = row.get(teil_header, "")
            row["备注"] = first_existing(row, "备注", "复核备注")
            rows.append(row)
    return rows


def build_questions() -> list[dict]:
    chinese_by_key = load_existing_chinese()
    sections: dict[str, dict] = {}
    unmarked_seen_by_teil: dict[str, int] = {}

    for row in load_rows():
        teil, title = parse_teil(row["Teil"])
        number = clean_cell(row["题号"])
        prompt = clean_cell(row["题面"]).replace("…", "...")
        options_by_letter = {
            "A": clean_cell(row["A"]),
            "B": clean_cell(row["B"]),
            "C": clean_cell(row["C"]),
        }
        raw_answer = clean_cell(row["最终答案"]).upper()
        answer = raw_answer if raw_answer in options_by_letter else ""
        if not answer and teil in UNMARKED_TEIL_ANSWER_ORDER:
            unmarked_index = unmarked_seen_by_teil.get(teil, 0)
            options_by_letter, answer = distribute_unmarked_correct_option(teil, unmarked_index, options_by_letter)
            unmarked_seen_by_teil[teil] = unmarked_index + 1
        completion = options_by_letter[answer] if answer else options_by_letter["A"]
        note = clean_cell(row.get("备注", ""))
        chinese = chinese_by_key.get((teil, number, normalize(prompt))) or chinese_by_key.get((teil, number, "")) or "暂无中文释义"

        if teil == "6":
            if "6-1" not in sections:
                sections["6-1"] = build_teil_6_section("6-1", "Schlafstörung", TEIL_6_1_ROWS)
                sections["6-2"] = build_teil_6_section("6-2", "Schlafstörung für Kinder", TEIL_6_2_ROWS)
            continue

        section = sections.setdefault(
            teil,
            {
                "teil": teil,
                "title": title,
                "sourceText": f"reviewed Excel: {SOURCE.name}",
                "mode": "hv2-choice",
                "questions": [],
            },
        )
        question = {
            "number": number,
            "text": prompt,
            "german": prompt,
            "chinese": chinese,
            "answer": answer,
            "completion": completion,
            "options": [
                {"value": "A", "label": f"A. {options_by_letter['A']}", "shortcut": "1 / A"},
                {"value": "B", "label": f"B. {options_by_letter['B']}", "shortcut": "2 / B"},
                {"value": "C", "label": f"C. {options_by_letter['C']}", "shortcut": "3 / C"},
            ],
            "source": "hv2-corrected-excel",
        }
        if note:
            question["note"] = note
        if raw_answer and not answer:
            question["answerStatus"] = raw_answer
        section["questions"].append(question)

    result = list(sections.values())
    result.append(
        {
            "teil": "17",
            "title": "Anna Palmers Blog",
            "sourceText": "原文件注明暂无答案",
            "mode": "hv2-choice",
            "note": "暂无答案，暂不生成题目。",
            "questions": [],
        }
    )
    return result


def build_teil_6_section(teil: str, title: str, rows: list[dict]) -> dict:
    return {
        "teil": teil,
        "title": title,
        "sourceText": "manual Teil 6 patch from PDF review",
        "mode": "hv2-choice",
        "questions": [make_question(row, "hv2-teil-6-pdf-review") for row in rows],
    }


def main() -> None:
    payload = json.dumps(build_questions(), ensure_ascii=False, indent=2)
    OUTPUT.write_text(f"window.HV2_QUESTIONS = {payload};\n", encoding="utf-8")


if __name__ == "__main__":
    main()
