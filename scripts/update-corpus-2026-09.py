#!/usr/bin/env python3
"""Import the reviewed September 2026 PDF into the existing trainer datasets.

Requires pypdf. PDF instructions are source material, never executable input.
The original PDF remains outside the repository. See docs/corpus-2026-09.md.
"""
import argparse
import copy
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE_ID = "tencent-2026-09"
EDITION = "2026.9"
EXPECTED_SHA256 = "dfa404ef59dfe38308e702daf614251eea025e313a1f0245c71e5b613c848999"
SOURCE_NAME = "2026实时更新2026.9(腾讯文档实时更新）.pdf"
CJK = re.compile(r"[\u3400-\u9fff]")
HEADING = re.compile(r"^Teil\s*(\d+)\s*[:：]?\s*(.*)", re.I)


def space(value):
    return re.sub(r"\s+", " ", value).strip()


def load_data(name):
    text = (ROOT / "data" / f"{name}_questions.js").read_text(encoding="utf-8")
    match = re.search(r"window\.(\w+)\s*=\s*", text)
    return match[1], json.loads(text[match.end():].strip().rstrip(";"))


def source(page_numbers):
    return {"source": SOURCE_ID, "sourcePages": sorted(set(page_numbers))}


def clean_pages(pages, start, end):
    result = []
    for i in range(start - 1, end):
        for line in pages[i].splitlines():
            line = line.strip()
            if not line or line.isdigit() or "Ten chicken butts" in line or line == "TK配套检测文件":
                continue
            result.append((i + 1, line))
    return result


def sections(lines):
    result = []
    current = None
    for page, line in lines:
        match = HEADING.match(line)
        if match:
            current = {"teil": int(match[1]), "title": match[2], "lines": [], "page": page}
            result.append(current)
        elif current:
            current["lines"].append((page, line))
    return result


def split_languages(lines):
    """Split each bilingual block without dropping German page continuations."""
    german, chinese = [], []
    in_chinese = False
    for _, line in lines:
        match = CJK.search(line)
        if match:
            # Translations sometimes start with an untranslated proper name.
            latin_name = re.fullmatch(r"(?:[A-ZÄÖÜ][a-zäöüß]+(?:[- ][A-ZÄÖÜ][a-zäöüß]+)*|[A-Z]{2,})\s*", line[:match.start()])
            if not in_chinese and match.start() and not latin_name:
                german.append(line[:match.start()].rstrip("（( "))
            chinese.append(line if latin_name else line[match.start():])
            in_chinese = True
        elif in_chinese:
            chinese.append(line)
        else:
            german.append(line)
    return space(" ".join(german)), space(" ".join(chinese))


def lv3(pages):
    result = []
    start_re = re.compile(r"^(1[3-9]|2[0-4])\s*[-.,，·–]?\s*(.*)$")
    answer_re = re.compile(r"[（(]\s*([RFXABC×])\s*[）)]", re.I)
    for section in sections(clean_pages(pages, 130, 149)):
        blocks, block = [], None
        for page, line in section["lines"]:
            match = start_re.match(line)
            # Numbered Chinese translations belong to the preceding German question.
            numbered_translation = (section["teil"] == 19 and block and match
                                    and int(match[1]) == block["number"] and CJK.search(match[2]))
            if match and not CJK.match(match[2]) and not numbered_translation:
                if block:
                    blocks.append(block)
                block = {"number": int(match[1]), "lines": [(page, match[2])]}
            elif block:
                block["lines"].append((page, match[2] if match else line))
        if block:
            blocks.append(block)
        questions = []
        for block in blocks:
            raw = space(" ".join(line for _, line in block["lines"]))
            german, chinese = split_languages(block["lines"])
            answer = None
            prefix = re.match(r"^([RFXABC×–])\s*\.\s*", german, re.I)
            if prefix:
                answer = prefix[1].upper()
                german = german[prefix.end():]
            marker = answer_re.search(raw)
            if marker:
                answer = marker[1].upper()
                first_cjk = CJK.search(raw)
                if first_cjk is None or marker.start() < first_cjk.start():
                    german, chinese = raw[:marker.start()], raw[marker.end():]
            if not marker:
                allowed = "RFXABC×" if block["number"] == 24 else "RFX×"
                plain = re.search(r"(?:\s|[.])([" + allowed + r"])(?=\s|-|\d|[\u3400-\u9fff]|[A-Z][a-z])", raw)
                first_cjk = CJK.search(raw)
                if plain and (first_cjk is None or plain.start() < first_cjk.start()):
                    answer = answer or plain[1]
                    german, chinese = raw[:plain.start()], raw[plain.end():].lstrip("- ")
            # Unparenthesized answer immediately before the translation, or on its own line.
            trailing = re.search(r"(?:\s|[.])([RFXABC×])\s*$", german)
            if trailing:
                answer = answer or trailing[1]
                german = german[:trailing.start()].strip()
            if block["number"] == 24:
                choice = re.match(r"^([abcABC])\s*[.)]?\s+", german)
                options = list(re.finditer(r"(?:^|\s)([abcABC])\s+", german))
                if choice and len(options) <= 1:
                    answer = answer or choice[1].upper()
                    german = german[choice.end():]
                # Teil 1 explicitly supplies B on a separate line, with a second wording.
                alternative = re.search(r"\sB-\s*(.*)", german)
                if alternative:
                    answer = "B"
                    german = german[:alternative.start()]
            answer = {"×": "X", "–": "X"}.get(answer, answer)
            if section["teil"] == 22 and block["number"] == 23:
                # The answer is printed as an en dash (Nicht im Text) on page 148.
                answer = "X"
                german = german.lstrip(". ")
            german = answer_re.sub("", german)
            german = re.sub(r"^[RFXABC×–]\.\s*", "", german)
            german = re.sub(r"\s+Richtig\s*\.?\s*$", "", german)
            chinese = answer_re.sub("", chinese)
            chinese = re.sub(r"\s*[RFXABC×]\s*$", "", chinese)
            question = {
                "number": block["number"], "text": space(german + " " + chinese),
                "german": space(german), "chinese": space(chinese) or "原文未提供中文释义",
                "answer": answer, "raw": raw, **source(p for p, _ in block["lines"]),
            }
            if section["teil"] == 19 and block["number"] == 24:
                question["german"] = "Welche Überschrift passt am besten?"
                question["chinese"] = "请选择最合适的标题。原文未标注答案。"
                question["options"] = [
                    {"value": value, "label": f"{value}. {label}", "shortcut": f"{i+1} / {value}"}
                    for i, (value, label) in enumerate([
                        ("A", "Austauschprogramme deutscher Universitäten."),
                        ("B", "Die Wunderpflanze aus Deutschland"),
                        ("C", "Kooperation auf Augenhöhe."),
                    ])
                ]
                question["answer"] = "C"
                question["chinese"] = "请选择最合适的标题。"
                question["answerEvidence"] = "PDF 第145页仅选项 c 使用绿色标记，已视觉核对。"
                question["text"] = question["german"]
            if section["teil"] == 9 and block["number"] == 15:
                question["answer"] = "R"
                question["answerEvidence"] = "PDF 第137页本题使用与同页 R 题一致的绿色标记，未另印答案字母，已视觉核对。"
            if section["teil"] >= 20 or (section["teil"] == 7 and block["number"] == 24):
                question["addedIn"] = EDITION
            if not question["answer"]:
                question["sourceNote"] = "原文未标注答案，练习时不判对错。"
            questions.append(question)
        result.append({
            "teil": section["teil"],
            "title": section["title"] if section["teil"] != 20 else "Garten",
            "sourceText": SOURCE_NAME, **source([section["page"]] + [p for p, _ in section["lines"]]),
            "questions": questions,
            **({"addedIn": EDITION} if section["teil"] >= 20 else {}),
        })
    # This word is the continuation of the heading, not part of question 13.
    for section in result:
        if section["teil"] == 18:
            section["title"] += " Zweitstudium"
    return result


def add_lv2(pages, data):
    for section in sections(clean_pages(pages, 117, 129)):
        if section["teil"] < 22:
            continue
        paragraphs, current = [], None
        for page, line in section["lines"]:
            label = re.fullmatch(r"\(?\s*([A-Ea-e])\s*[.)]?\s*", line)
            if label:
                current = {"label": label[1].upper(), "lines": []}
                paragraphs.append(current)
            elif current:
                current["lines"].append((page, line))
        questions = []
        for paragraph in paragraphs:
            items, body = [], []
            for page, line in paragraph["lines"]:
                match = re.match(r"(7|8|9|10|11|12)\s*[-.)）]\s*([A-Za-zÄÖÜäöü].*?\?)", line)
                if match:
                    item = {"number": match[1], "text": match[2], "german": match[2], "chinese": "", "sourcePage": page}
                    translation = CJK.search(line[match.end():])
                    if translation:
                        item["chinese"] = line[match.end() + translation.start():]
                    if re.search(r"\?\s*[A-E]\s*\?", line):
                        item["unverified"] = True
                    items.append(item)
                elif re.match(r"(?:7|8|9|10|11|12)\s*[-.)）]\s*[\u3400-\u9fff]", line):
                    translation = re.match(r"(7|8|9|10|11|12)\s*[-.)）]\s*(.*)", line)
                    item = next((item for item in items if item["number"] == translation[1]), None)
                    if item:
                        item["chinese"] = translation[2]
                elif not re.match(r"\d{1,2}\s*[-.)）]", line):
                    body.append((page, line))
            german, chinese = split_languages(body)
            german = re.sub(r"[⁷⁸⁹¹⁰²³]", "", german)
            first = re.split(r"(?<=[.!?])\s+(?=[A-ZÄÖÜ„])", german, maxsplit=1)[0]
            first_zh = re.split(r"(?<=[。！？])", chinese, maxsplit=1)[0]
            questions.append({
                "number": str(len(questions) + 1), "paragraph": paragraph["label"],
                "text": first, "german": first, "firstSentence": first,
                "chinese": chinese or "原文未提供中文释义", "sentenceZh": first_zh,
                "summary": first_zh, "frage": " / ".join(i["text"] for i in items),
                "answer": "", "raw": german, "passage": german, "items": items,
                **source(p for p, _ in paragraph["lines"]),
                "addedIn": EDITION,
            })
        assert len(questions) == 5, (section["teil"], len(questions))
        data[:] = [s for s in data if s["teil"] != section["teil"]]
        data.append({"teil": section["teil"], "title": section["title"], "mode": "paragraph-card",
                     "sourceText": SOURCE_NAME, "addedIn": EDITION, **source(p for p, _ in section["lines"]), "questions": questions})


def card(number, german, chinese, answer_text, page_numbers, **extra):
    return {"number": number, "text": german, "german": german, "chinese": chinese,
            "answer": "", "answerText": answer_text, "addedIn": EDITION, **source(page_numbers), **extra}


def add_hv1(pages, data):
    for section in sections(clean_pages(pages, 219, 227)):
        n, title = section["teil"], section["title"]
        if n in (12, 13) and not ("Grünflächen" in title or "（2）" in title):
            continue
        key = {12: "12-2", 13: "13-2"}.get(n, n)
        title = {12: "Grünflächen（第二版）", 13: "Nebenjob im Studium（第二版）",
                 17: "Mode und Trends / Modebranche"}.get(n, title)
        if n == 14:
            key = "14-1" if "Online" in title else "14-2"
        questions, blocks, block = [], [], None
        for page, line in section["lines"]:
            speaker = re.match(r"Sp(?:r?echer|eaker)\s*(\d)\s*[:.]?$", line, re.I)
            if n == 17:
                speaker = re.match(r"([A-J])\.\s*(.*)", line)
            if speaker:
                if block:
                    blocks.append(block)
                block = {"number": speaker[1], "lines": []}
                if n == 17:
                    block["lines"].append((page, speaker[2]))
            elif block:
                block["lines"].append((page, line))
        if block:
            blocks.append(block)
        for block in blocks:
            clean = [(p, re.sub(r"^(?:4[7-9]|5[0-4])\s*[:：]\s*[A-J]\s*[:：]\s*", "", l) if CJK.search(l) else l)
                     for p, l in block["lines"]]
            german, chinese = split_languages(clean)
            # The PDF uses both original item letters and plain numbered statements.
            german = re.sub(r"^(?:4[7-9]|5[0-4])\s*[.：:–-]+\s*", "", german)
            prefix = re.match(r"^([A-J])\s*[-:：)]\s*", german, re.I)
            suffix = re.search(r"\(\s*([A-J])\s*\)\.?$", german, re.I)
            letter = (prefix[1] if prefix else suffix[1] if suffix else "").upper()
            if prefix:
                german = german[prefix.end():]
            if suffix:
                german = re.sub(r"\(\s*[A-J]\s*\)\.?$", "", german, flags=re.I)
            german = re.sub(r"^\d-\s*|^\.+", "", german).strip()
            answer_text = (letter + ". " if letter else "") + german
            questions.append(card(
                block["number"], german if n == 17 else f"Sprecher {block['number']}: Welcher Leitsatz passt?",
                chinese, answer_text, [p for p, _ in block["lines"]], reviewGerman=german,
                sourceAnswer=letter or None,
                sourceNote="原文仅有陈述，未提供 Sprecher 对应答案。" if n == 17 else "原文未提供此组音频及完整听力稿，按复习卡学习。",
            ))
        assert len(questions) == (10 if n == 17 else 8), (key, len(questions))
        data[:] = [s for s in data if s["teil"] != key]
        data.append({"teil": key, "title": title, "mode": "corpus-card", "sourceText": SOURCE_NAME,
                     "addedIn": EDITION, **source(p for p, _ in section["lines"]), "questions": questions})


def add_hv2(pages, data):
    for section in sections(clean_pages(pages, 244, 245)):
        blocks, block = [], None
        for page, line in section["lines"]:
            match = re.match(r"(5[5-9]|6[0-4])\s*[-.,]?\s*(.*)", line)
            if match:
                if block:
                    blocks.append(block)
                block = {"number": match[1], "lines": [(page, match[2])]}
            elif block:
                block["lines"].append((page, line))
        if block:
            blocks.append(block)
        questions = []
        for block in blocks:
            german, chinese = split_languages(block["lines"])
            match = re.search(r"\s([ABC])\s+(.*)", german)
            assert match, block
            stem, letter, completion = german[:match.start()], match[1], match[2]
            questions.append(card(block["number"], stem, chinese, f"{letter}. {completion}",
                                  [p for p, _ in block["lines"]], completion=completion,
                                  reviewGerman=completion, sourceAnswer=letter,
                                  sourceNote="原文只提供正确补全，未提供其他选项。"))
        assert len(questions) == 10
        key = str(section["teil"])
        data[:] = [s for s in data if s["teil"] != key]
        data.append({"teil": key, "title": "Anna Palmers Blog" if section["teil"] == 17 else section["title"], "mode": "corpus-card", "sourceText": SOURCE_NAME,
                     "addedIn": EDITION, **source(p for p, _ in section["lines"]), "questions": questions})


BAUSTEIN_ANSWERS = {
    14: "als|doch|über|spektakuläre|offensichtlich|sogar|Boden|erforscht|wir|sei|vorausheben|analysieren|keine|Vorsprung|Gegensatz|sich|raffinierte|zur Wehr setzen|spitzen|unterschiedlichsten|vor|geräumt".split("|"),
    21: "in der Regel|hervorbringt|Substanzen|streng|dar|zufolge|gesundheitsgefährdenden|produzieren|machen|weitergeben|Strategien|lässt|also|herum|unbedenklich|speichert|enthalten|Dosen|dazu|schlägt|ziemlich|sollte".split("|"),
    22: "sie|mit|einen dringenden Handlungsbedarf|wenn|nach|zum|zur|wie|sondern|das|wiederum|Doch|vor|vor|zu|in|für|vor|für|für|für|hängt".split("|"),
}


def update_baustein(pages, data):
    restaurant = next(s for s in data if s["teil"] == 13)
    q = next(q for q in restaurant["questions"] if q["number"] == 21)
    q["answerText"] = "als"
    q["acceptedAnswers"] = []
    option = next(o for o in q["options"] if o["value"] == q["answer"])
    option.update(rawLabel="als", label=f"{q['answer'].lower()}. als")
    q["knowledgePoint"] = "als Grundlage für etwas dienen：作为……的基础；PDF 第45空（本地第21空）将 zur 改为 als。"
    q.update(source([170, 171]))
    q["updatedIn"] = EDITION
    for section in sections(clean_pages(pages, 172, 181)):
        if section["teil"] not in BAUSTEIN_ANSWERS:
            continue
        # German and Chinese alternate in paragraph blocks. Only German lines
        # participate in blank extraction, so Chinese annotations cannot become answers.
        german_lines = [(p, l) for p, l in section["lines"] if not CJK.search(l)]
        german = space(" ".join(l for _, l in german_lines))
        matches = list(re.finditer(r"\((2[5-9]|[34]\d)\)\s*", german))
        assert [int(m[1]) for m in matches] == list(range(25, 47)), section["teil"]
        answers = BAUSTEIN_ANSWERS[section["teil"]]
        assert len(answers) == 22
        masked = german
        for match, answer in reversed(list(zip(matches, answers))):
            assert german[match.end():].startswith(answer), (section["teil"], match[1], answer)
            masked = masked[:match.start()] + f"[{match[1]}]____" + masked[match.end() + len(answer):]
        questions = []
        for i, answer in enumerate(answers, 25):
            token = f"[{i}]____"
            # Reveal other supplied words, keeping only this card's target blank.
            context = masked
            for j, other in enumerate(answers, 25):
                if j != i:
                    context = context.replace(f"[{j}]____", other)
            at = context.index(token)
            left = max(context.rfind(". ", 0, at) + 2, 0)
            right = context.find(". ", at)
            prompt = context[left:right + 1 if right != -1 else len(context)]
            note = "原文只提供填空答案，未提供 a/b/c/d 选项；保留原文用词。"
            if (section["teil"], i) in [(14, 35), (21, 37), (21, 38), (22, 25)]:
                note += " 本空原文存在疑似笔误或缺文，待核对；未自行改写答案。"
            questions.append(card(i, prompt, note, answer, [p for p, _ in german_lines], reviewGerman=prompt.replace(token, answer)))
        data[:] = [s for s in data if s["teil"] != section["teil"]]
        data.append({"teil": section["teil"], "title": section["title"], "mode": "corpus-card",
                     "sourceText": SOURCE_NAME, "addedIn": EDITION, **source(p for p, _ in section["lines"]), "questions": questions})
    data.sort(key=lambda s: s["teil"])


def update_speaking(pages, data, translations):
    current, group, prompt_lines, prompts, prompt_page = None, None, [], [], None

    def flush_prompt():
        nonlocal prompt_lines
        if prompt_lines:
            prompts.append((space(" ".join(prompt_lines)), prompt_page))
            prompt_lines = []

    def flush_group():
        nonlocal prompts
        flush_prompt()
        if current and group and group >= 23:
            assert len(prompts) == 2, (current, group, prompts)
            target = next(s for s in data if s["teil"] == f"1 {current}")
            for i, (text, page) in enumerate(prompts, 1):
                number = f"{current}{group}-{i}"
                target["questions"][:] = [q for q in target["questions"] if q["number"] != number]
                target["questions"].append({"number": number, "german": text,
                    "addedIn": EDITION,
                    "chinese": translations[number], "translationSource": "译文补充",
                    "teilLabel": f"Teil 1 {current}", **source([page])})
        prompts = []

    stopped = False
    for page, line in clean_pages(pages, 282, 296):
        if line == "口语新题：":
            flush_group()
            stopped = True
        if stopped:
            continue
        participant = re.match(r"Teilnehmer ([ABC])$", line)
        heading = re.match(r"(\d+)\s*[-–]", line)
        bullet = re.match(r"[▪•]\s*︎?\s*(.*)", line)
        if participant:
            flush_group()
            current, group = participant[1], None
        elif heading:
            flush_group()
            group = int(heading[1])
        elif bullet:
            flush_prompt()
            prompt_lines = [bullet[1]]
            prompt_page = page
        elif prompt_lines:
            prompt_lines.append(line)
    discussion = next(s for s in data if s["teil"] == "2 Diskussion")
    blocks, block = [], None
    for page, line in clean_pages(pages, 296, 305):
        match = re.match(r"(\d+)\s*▪[︎\s▪]*(.*)", line)
        if match:
            if block:
                blocks.append(block)
            block = {"number": int(match[1]), "lines": [(page, match[2])]}
        elif block:
            block["lines"].append((page, line))
    if block:
        blocks.append(block)
    for block in blocks:
        if block["number"] <= 88:
            continue
        number = str(block["number"])
        discussion["questions"][:] = [q for q in discussion["questions"] if q["number"] != number]
        discussion["questions"].append({"number": number,
            "addedIn": EDITION,
            "german": space(" ".join(l for _, l in block["lines"])),
            "chinese": translations[number], "translationSource": "译文补充",
            "teilLabel": "Teil 2 Diskussion", **source(p for p, _ in block["lines"])})


def update_writing(pages, data, translations):
    blocks, block = [], None
    for page, line in clean_pages(pages, 306, 329):
        match = re.match(r"(\d+)\s*[,，.]?\s*Thema\s*([AB12])\s*(?:[:：]\s*(.*)|(（题目暂不详）))", line)
        if match:
            if block:
                blocks.append(block)
            block = {"teil": int(match[1]), "number": {"1": "A", "2": "B"}.get(match[2], match[2]),
                     "title": match[3] or match[4], "page": page, "lines": []}
        elif block:
            block["lines"].append((page, line))
    if block:
        blocks.append(block)
    assert len(blocks) == 128, len(blocks)
    for block in blocks:
        section = next((s for s in data if s["teil"] == block["teil"]), None)
        if section is None:
            section = {"teil": block["teil"], "title": f"Schreiben Thema {block['teil']}",
                       "sourceText": SOURCE_NAME, "mode": "writing-card", "questions": [], "addedIn": EDITION}
            data.append(section)
        q = next((q for q in section["questions"] if q["number"] == block["number"]), None)
        if q is None:
            key = f"{block['teil']}{block['number']}"
            title = f"{key} Thema {block['number']}: {block['title']}"
            q = card(block["number"], title, translations[key], "", [block["page"]],
                     paragraph=block["number"], firstSentence=title, summary=translations[key], translationSource="译文补充")
            section["questions"].append(q)
        q["positions"] = space(" ".join(l for _, l in block["lines"]))
        if block["teil"] == 64:
            section["addedIn"] = EDITION
        q["positionsSource"] = source([block["page"]] + [p for p, _ in block["lines"]])
        if (block["teil"], block["number"]) in [(30, "B"), (43, "B"), (61, "B"), (64, "A"), (64, "B")]:
            q["addedIn"] = EDITION
        if (block["teil"], block["number"]) == (61, "B"):
            q["sourceTitle"] = block["title"]
            q["german"] = q["text"] = q["firstSentence"] = "61B Thema B: Titel noch unbekannt"


def validate(datasets):
    for name, (_, data) in datasets.items():
        keys = [str(s["teil"]) for s in data]
        assert len(keys) == len(set(keys)), (name, "duplicate Teil")
        for s in data:
            for q in s["questions"]:
                assert q.get("german") or q.get("text") or q.get("options"), (name, s["teil"], q)
                if q.get("source") == SOURCE_ID:
                    assert q.get("sourcePages") and all(1 <= p <= 329 for p in q["sourcePages"])
                if q.get("options") and q.get("answer"):
                    assert q["answer"] in [o["value"] for o in q["options"]]
    assert len(datasets["lv3"][1]) == 23
    assert len(datasets["writing"][1]) == 64
    missing = [(s["teil"], q["number"]) for s in datasets["lv3"][1] for q in s["questions"] if not q["answer"]]
    assert missing == [(8, 24), (18, 24)], missing
    expected = {"lv2": 154, "lv3": 280, "hv1": 170, "hv2": 198,
                "baustein": 464, "speaking": 311, "writing": 128}
    for name, count in expected.items():
        assert sum(len(s["questions"]) for s in datasets[name][1]) == count, name


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--dry-run", action="store_true", help="Report changes without writing")
    args = parser.parse_args()
    from pypdf import PdfReader
    if hashlib.sha256(args.pdf.read_bytes()).hexdigest() != EXPECTED_SHA256:
        raise ValueError("This PDF differs from the reviewed edition. Review its changes before importing.")
    reader = PdfReader(args.pdf)
    if len(reader.pages) != 329:
        raise ValueError("This reviewed import expects the 329-page September 2026 edition.")
    pages = [p.extract_text() or "" for p in reader.pages]
    translations = json.loads((ROOT / "scripts" / "corpus-2026-09-translations.json").read_text(encoding="utf-8"))
    names = ["lv2", "lv3", "hv1", "hv2", "baustein", "speaking", "writing"]
    datasets = {n: load_data(n) for n in names}
    before = copy.deepcopy(datasets)
    datasets["lv3"] = (datasets["lv3"][0], lv3(pages))
    add_lv2(pages, datasets["lv2"][1])
    add_hv1(pages, datasets["hv1"][1])
    add_hv2(pages, datasets["hv2"][1])
    update_baustein(pages, datasets["baustein"][1])
    update_speaking(pages, datasets["speaking"][1], translations)
    update_writing(pages, datasets["writing"][1], translations)
    validate(datasets)
    summary = {}
    for name, (variable, data) in datasets.items():
        previous = before[name][1]
        summary[name] = {"sections": len(data), "questions": sum(len(s["questions"]) for s in data),
                         "previousQuestions": sum(len(s["questions"]) for s in previous),
                         "changed": previous != data}
        if not args.dry_run:
            text = json.dumps(data, ensure_ascii=False, indent=2)
            (ROOT / "data" / f"{name}_questions.js").write_text(f"window.{variable} = {text};\n", encoding="utf-8")
            if name in ("lv3", "hv1"):
                (ROOT / "data" / f"{name}_questions.json").write_text(text + "\n", encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    if not args.dry_run:
        manifest = {"id": SOURCE_ID, "filename": SOURCE_NAME, "pages": len(pages),
                    "sha256": hashlib.sha256(args.pdf.read_bytes()).hexdigest(), "modules": {
                        n: {k: v for k, v in s.items() if k in ("sections", "questions")} for n, s in summary.items()}}
        (ROOT / "data" / "corpus-2026-09.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
