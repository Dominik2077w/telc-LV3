#!/usr/bin/env python3
import argparse
import json
import re
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PDF = ROOT / "2026全套（更新以腾讯文档为准）.pdf"
DEFAULT_OUTPUT = ROOT / "data" / "hv2_questions.js"


TITLE_RE = re.compile(r"^\s*(?:(2402)\s*)?Teil\s*([0-9]+)\s*(?:[（(]\s*([0-9]+)\s*[）)])?\s*(.*?)\s*$", re.I)
QUESTION_RE = re.compile(r"^\s*(5[5-9]|6[0-4])\s*[-–.,：:]?\s*(.*)$")
ANSWER_RE = re.compile(r"^\s*([abcABC])\s*[-–)：:.)]\s*(.*)$")
PAGE_RE = re.compile(r"^\s*(22[0-9]|23[0-6])\s*$")


def normalize_space(text):
    return re.sub(r"\s+", " ", str(text)).strip()


def has_cjk(text):
    return bool(re.search(r"[\u3400-\u9fff]", text))


def clean_line(line):
    line = line.replace("\f", "").strip()
    line = re.sub(r"\s+(22[0-9]|23[0-6])$", "", line).strip()
    return line


def run_pdftotext(pdf_path):
    result = subprocess.run(
        ["pdftotext", "-f", "220", "-l", "236", "-layout", str(pdf_path), "-"],
        check=True,
        text=True,
        stdout=subprocess.PIPE,
    )
    return result.stdout


def split_answer_from_stem(stem):
    parts = re.split(r"\s+[-–]\s+", stem, maxsplit=1)
    if len(parts) == 2 and parts[0] and parts[1]:
        return normalize_space(parts[0]), "", normalize_space(parts[1])
    return normalize_space(stem), "", ""


def flush_question(section, current):
    if not current:
        return

    stem_lines = []
    answer = ""
    completion_lines = []
    chinese_lines = []
    mode = "stem"

    def add_german_part(part):
        nonlocal answer, mode
        part = normalize_space(part)
        if not part:
            return
        answer_match = ANSWER_RE.match(part)
        if answer_match and mode != "chinese":
            answer = answer or answer_match.group(1).lower()
            rest = normalize_space(answer_match.group(2))
            if rest:
                completion_lines.append(rest)
            mode = "completion"
            return
        if mode == "stem":
            stem_lines.append(part)
        else:
            completion_lines.append(part)

    for raw in current["lines"]:
        line = clean_line(raw)
        if not line or PAGE_RE.match(line):
            continue

        if has_cjk(line):
            if mode == "completion" and re.match(r"^\s*[abcABC]\s+[^。！？]*[\u3400-\u9fff]", line):
                chinese_lines.append(re.sub(r"^\s*[abcABC]\s+", "", line).strip())
                mode = "chinese"
                continue
            first_cjk = re.search(r"[\u3400-\u9fff]", line).start()
            add_german_part(line[:first_cjk])
            chinese_lines.append(line[first_cjk:].strip())
            mode = "chinese"
            continue

        add_german_part(line)

    stem = normalize_space(" ".join(stem_lines))
    completion = normalize_space(" ".join(completion_lines))
    chinese = normalize_space(" ".join(chinese_lines))

    if not answer and not completion:
        stem, answer, completion = split_answer_from_stem(stem)

    if not stem and not completion:
        return

    answer_text = f"{answer}) {completion}".strip() if answer else completion
    if not answer_text:
        answer_text = "未标注"

    question = {
        "number": str(current["number"]),
        "text": stem,
        "german": stem,
        "chinese": chinese or "暂无中文释义",
        "answer": answer,
        "completion": completion,
        "raw": normalize_space(" ".join(current["lines"])),
        "source": "hv2-pdf",
        "frontFields": [
            {"label": "题号", "value": str(current["number"])},
            {"label": "句干", "value": stem},
        ],
        "backFields": [
            {"label": "答案", "value": answer_text},
            {"label": "中文", "value": chinese or "暂无中文释义"},
        ],
    }
    section["questions"].append(question)


def make_section_id(number, variant, seen_counts):
    base = str(number)
    if variant:
        return f"{base}.{variant}"
    seen_counts[base] = seen_counts.get(base, 0) + 1
    if seen_counts[base] == 1:
        return base
    return f"{base}.{seen_counts[base]}"


def parse_sections(text):
    lines = [clean_line(line) for line in text.splitlines()]
    sections = []
    current_section = None
    current_question = None
    seen_counts = {}

    def flush_current_question():
        nonlocal current_question
        if current_section and not current_section.get("noAnswer"):
            flush_question(current_section, current_question)
        current_question = None

    for line in lines:
        if not line or line == "TK配套检测文件" or PAGE_RE.match(line):
            continue
        if line == "HV2":
            continue

        title_match = TITLE_RE.match(line)
        if title_match:
            flush_current_question()
            raw_title = normalize_space(title_match.group(4))
            no_answer = "暂无答案" in raw_title
            raw_title = re.sub(r"[（(].*?暂无答案.*", "", raw_title).strip()
            teil = make_section_id(title_match.group(2), title_match.group(3), seen_counts)
            if title_match.group(1):
                raw_title = normalize_space(f"2402 {raw_title}")
            current_section = {
                "teil": teil,
                "title": raw_title or f"Teil {teil}",
                "sourceText": "PDF p220-236",
                "mode": "hv2-card",
                "questions": [],
            }
            if no_answer:
                current_section["note"] = "暂无答案，有了之后腾讯文档及时更新"
                current_section["noAnswer"] = True
            sections.append(current_section)
            continue

        if not current_section:
            continue

        question_match = QUESTION_RE.match(line)
        if question_match:
            flush_current_question()
            current_question = {
                "number": int(question_match.group(1)),
                "lines": [question_match.group(2)],
            }
            continue

        if current_question:
            current_question["lines"].append(line)

    flush_current_question()
    return sections


def main():
    parser = argparse.ArgumentParser(description="Extract HV2 flashcards from the source PDF.")
    parser.add_argument("--pdf", type=Path, default=DEFAULT_PDF)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    text = run_pdftotext(args.pdf)
    sections = parse_sections(text)
    payload = json.dumps(sections, ensure_ascii=False, indent=2)
    args.output.write_text(f"window.HV2_QUESTIONS = {payload};\n", encoding="utf-8")

    question_count = sum(len(section["questions"]) for section in sections)
    print(f"Wrote {len(sections)} sections and {question_count} questions to {args.output}")


if __name__ == "__main__":
    main()
