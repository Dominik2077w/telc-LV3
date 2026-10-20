#!/usr/bin/env python3
"""Replace trainer corpora exclusively from the reviewed September 2026 PDF.

Requires pypdf. PDF instructions are source material, never executable input.
The original PDF remains outside the repository. See docs/corpus-2026-09.md.
"""
import argparse
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


HV1_TEILS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, "12-2", 13, "13-2",
             "14-1", "14-2", 15, 16, 17, 18]
HV1_ADDED = {"12-2", "13-2", "14-1", "14-2", 15, 16, 17, 18}
# Teil 1's overview has no individual Chinese lines. These are the translations
# next to its repeated statements on pp. 182-185. #5 has no single-line ZH.
HV1_INTERNET_ZH = [
    (182, "我多年来每天都会上网。"),
    (183, "互联网比日报更及时。"),
    (183, "我的朋友和亲戚生活在其他大洲。"),
    (183, "当我度假回家时，我不会立刻打开电脑。"),
    (182, "原文未提供中文释义"),
    (184, "互联网显著地便利了学术检索。"),
    (185, "对一家企业来说，互联网是生存所必需的。"),
    (185, "我现在上网比以前少了。"),
]


def hv1_transcripts(section, questions):
    """Attach only the long speaker passages actually printed after the summary."""
    markers = [(i, int(m[1])) for i, (_, line) in enumerate(section["lines"])
               if (m := re.fullmatch(r"(?:Sprecher|Speaker)\s*([1-8])\s*[.:]?", line, re.I))]
    for index, (at, number) in enumerate(markers[8:], 8):
        end = markers[index + 1][0] if index + 1 < len(markers) else len(section["lines"])
        question = next((q for q in questions if q["number"] == number), None)
        if question is None:
            continue
        lines = section["lines"][at + 1:end]
        text = "\n".join(line for _, line in lines)
        positions = [i for i, char in enumerate(text) if char.isalnum()]
        normalized = "".join(text[i].casefold() for i in positions)
        cut = None
        for statement in [question["sourceGerman"], question["leitsatz"]]:
            needle = "".join(c.casefold() for c in statement if c.isalnum())
            found = normalized.rfind(needle) if len(needle) >= 18 else -1
            if found >= 0:
                cut = positions[found]
                line_start = text.rfind("\n", 0, cut) + 1
                prefix = re.sub(r"\s+", "", text[line_start:cut])
                if re.fullmatch(r"(?:\d+)?[A-J][.)-]?", prefix, re.I):
                    cut = line_start
                break
        if cut is None:
            chinese = CJK.search(text)
            cut = chinese.start() if chinese else len(text)
        transcript = re.sub(r"(?<=[A-Za-zÄÖÜäöüß])[-‐]\s*\n\s*(?=[a-zäöüß])", "", text[:cut])
        transcript = space(transcript).rstrip("-–—:;,. ")
        if len(transcript) >= 100:
            question["sourceTranscript"] = transcript
            question["sourceTranscriptPages"] = sorted(set(p for p, _ in lines))


def hv1_statement(raw, *, answer_markers=True):
    """Remove printed question/answer markers, never infer answer letters."""
    value = re.sub(r"^(?:4[7-9]|5[0-4])\s*[.：:–-]+\s*", "", space(raw))
    value = re.sub(r"^[1-8]-\s*", "", value)
    prefix = re.match(r"^([A-J])\s*[-.:：)]\s*", value, re.I) if answer_markers else None
    suffix = re.search(r"\(\s*([A-J])\s*\)\.?$", value, re.I) if answer_markers else None
    letter = (prefix[1] if prefix else suffix[1] if suffix else "").upper() or None
    if prefix:
        value = value[prefix.end():]
    if suffix:
        value = re.sub(r"\(\s*[A-J]\s*\)\.?$", "", value, flags=re.I)
    value = re.sub(r"^\.+", "", value).strip()
    value = re.sub(r"(?<=\w)- (?=\w)", "", value)  # PDF line-break hyphen
    value = re.sub(r"\s+([.,;:!?，])", r"\1", value)
    value = re.sub(r"([,;:])(?=[A-Za-zÄÖÜäöüß])", r"\1 ", value)
    return value, letter


def hv1(pages):
    """Read only the first eight ordered summary statements of every PDF group.

    Later Sprecher headings are full transcripts, not additional questions.
    Replacement data is built without consulting any previous HV1 corpus.
    """
    result = []
    speaker_re = re.compile(r"^(?:Sprecher|Spreche|Speaker)\s*([1-8])\s*[:.]?$", re.I)
    for section in sections(clean_pages(pages, 182, 227)):
        n, source_title = section["teil"], section["title"]
        key = n
        title = source_title
        if n == 12 and "Grünflächen" in source_title:
            key, title = "12-2", "Grünflächen（第二版）"
        elif n == 13 and "（2）" in source_title:
            key, title = "13-2", "Nebenjob im Studium（第二版）"
        elif n == 14:
            key = "14-1" if "Online" in source_title else "14-2"
        elif n == 17:
            title = "Mode und Trends / Modebranche"
        blocks = []
        for page, line in section["lines"]:
            match = re.match(r"^([A-J])\.\s*(.*)", line) if n == 17 else speaker_re.match(line)
            if match:
                if n != 17 and len(blocks) == 8:
                    break
                blocks.append({"number": match[1] if n == 17 else int(match[1]), "lines": []})
                if n == 17:
                    blocks[-1]["lines"].append((page, match[2]))
            elif blocks:
                blocks[-1]["lines"].append((page, line))
        expected_numbers = list("ABCDEFGHIJ") if n == 17 else list(range(1, 9))
        assert [b["number"] for b in blocks] == expected_numbers, (key, "Missing or repeated summary speakers")
        questions = []
        for block in blocks:
            de_lines, zh_lines = [], []
            for page, line in block["lines"]:
                (zh_lines if CJK.search(line) or zh_lines else de_lines).append((page, line))
            # Summaries for 1-9 append a mnemonic paragraph after the last
            # translation. It is not part of Sprecher 8's statement/translation.
            if n <= 9 and block["number"] == 8:
                zh_lines = zh_lines[:1]
            raw_de = space(" ".join(line for _, line in de_lines))
            german, letter = hv1_statement(raw_de, answer_markers=n >= 11 and n != 17)
            chinese = "".join(line for _, line in zh_lines)
            chinese = re.sub(r"^(?:4[7-9]|5[0-4])\s*[:：]\s*[A-J]\s*[:：]\s*|^[a-j]-\s*", "", chinese, flags=re.I)
            page_numbers = [p for p, _ in de_lines + zh_lines]
            extras = {}
            if n == 1:
                translation_page, chinese = HV1_INTERNET_ZH[block["number"] - 1]
                page_numbers.append(translation_page)
                extras["translationSource"] = "not-provided" if block["number"] == 5 else "source-pdf"
            if n == 3 and block["number"] == 7:
                # Both highlighted variants are printed under the same speaker.
                variants = re.split(r" (?=Wer während des Studiums)", german)
                assert len(variants) == 2, (key, block["number"], "Expected both source variants")
                german = variants[-1]
                extras.update(sourceVariants=variants,
                              studyNote="原文同时列有 kaumer / weniger 两种表述，这里采用后一种。")
            if key == 13 and block["number"] == 2:
                extras["studyNote"] = "原文在“zu...”处截断，保留原样，未补写后文。"
            if key == 13 and block["number"] == 8:
                extras.update(translationSource="source-pdf",
                              studyNote="原文中文与上一项重复、与本句德文不符；保留来源内容，未沿用旧库的补译。")
            assert german and chinese and not CJK.search(german), (key, block["number"], "Invalid bilingual statement")
            note = ("原文标注“暂无答案”，仅复习陈述，不参与顺序评分。" if n == 17
                    else "按 PDF 中 Sprecher 1–8 的顺序练习；只记录原文明示的答案字母。")
            if extras.get("studyNote"):
                note = extras["studyNote"] + "\n" + note
            q = {"number": block["number"], "leitsatz": german,
                 "text": german if n == 17 else f"Sprecher {block['number']}: Welcher Leitsatz passt?",
                 "german": german if n == 17 else f"Sprecher {block['number']}: Welcher Leitsatz passt?",
                 "chinese": chinese, "answer": "", "answerText": (letter + ". " if letter else "") + german,
                 "reviewGerman": "\n\n".join(extras.get("sourceVariants", [german])),
                 "sourceGerman": raw_de, "sourceAnswer": letter,
                 "sourceNote": note, **source(page_numbers), **extras}
            q["addedIn" if key in HV1_ADDED else "updatedIn"] = EDITION
            questions.append(q)
        hv1_transcripts(section, questions)
        record = {"teil": key, "title": title, "mode": "corpus-card", "orderKnown": n != 17,
                  "sourceText": SOURCE_NAME, "sourceTitle": source_title,
                  **source([section["page"]] + [p for p, _ in section["lines"]]), "questions": questions}
        record["addedIn" if key in HV1_ADDED else "updatedIn"] = EDITION
        result.append(record)
    return result


def add_hv1(pages, data):
    replacement = hv1(pages)
    assert [s["teil"] for s in replacement] == HV1_TEILS, "HV1 source groups differ from the reviewed PDF"
    data[:] = replacement


def section_record(section, questions, mode):
    return {"teil": section["teil"], "title": section["title"], "mode": mode,
            "sourceText": SOURCE_NAME, **source([section["page"]] + [p for p, _ in section["lines"]]),
            "questions": questions}


def bilingual_lines(lines):
    """Keep alternating DE/ZH blocks, including German after a page break."""
    german, chinese = [], []
    for page, line in lines:
        # Translations can begin with a Latin proper name or a repeated answer
        # prefix ("c Tourbot 是..."). Never leak that prefix into the DE answer.
        (chinese if CJK.search(line) else german).append((page, line))
    return german, chinese


def lv2(pages):
    result = []
    label_re = re.compile(r"^[({（]?\s*([A-Ea-e])\s*[.)）}]?$")
    item_re = re.compile(r"^(?:(7|8|9|10|11|12)(?:\s*[-–]\s*(10))?\s*[-.,)）]?\s*"
                         r"(?=[A-Za-zÄÖÜäöüß])|(?=[-–]?\s*(?:[A-Za-zÄÖÜäöüß]+\s+){0,6}(?:der|die|des)\s+Aut\w+))(.*)$", re.I)
    for section in sections(clean_pages(pages, 55, 129)):
        paragraphs, current = [], None
        for page, line in section["lines"]:
            label = label_re.fullmatch(line)
            if label:
                current = {"label": label[1].upper(), "page": page, "lines": []}
                paragraphs.append(current)
            elif current:
                current["lines"].append((page, line))
            else:
                section["title"] += " " + line
        assert [p["label"] for p in paragraphs] == list("ABCDE"), section["teil"]
        questions = []
        for paragraph in paragraphs:
            items, body = [], []
            lines = paragraph["lines"]
            i = 0
            while i < len(lines):
                page, line = lines[i]
                match = item_re.match(line)
                if match:
                    raw_lines = [(page, line)]
                    text = match[3].lstrip("-– ")
                    while not re.search(r"[?？]", text) and i + 1 < len(lines) and not CJK.search(text):
                        i += 1
                        raw_lines.append(lines[i])
                        text += " " + lines[i][1]
                    german, chinese = split_languages([(page, text)])
                    german = re.sub(r"(?<=[?？])\s*(?:\d+\s*[-.]\s*|[A-Ea-e]\s*\??\s*)$", "", german)
                    numbers = [match[1]] + ([match[2]] if match[2] else [])
                    for number in numbers:
                        item = {"number": number or "", "text": space(german), "german": space(german),
                                "chinese": chinese, "raw": space(" ".join(l for _, l in raw_lines)),
                                **source(p for p, _ in raw_lines)}
                        if re.search(r"[?？]\s*[A-E]\s*\?", text):
                            item["unverified"] = True
                        items.append(item)
                else:
                    numbered_zh = re.match(r"(7|8|9|10|11|12)\s*[-.,)）]\s*([\u3400-\u9fff].*)", line)
                    if numbered_zh:
                        for item in items:
                            if item["number"] == numbered_zh[1]:
                                item["chinese"] = numbered_zh[2]
                    elif not re.fullmatch(r"\d{1,2}\s*[.,]", line):
                        body.append((page, line))
                i += 1
            german, chinese = split_languages(body)
            extras = {}
            if section["teil"] == 14 and paragraph["label"] == "E":
                # The text layer is empty; this complete sentence and handwritten
                # mapping were visually transcribed from the embedded photographs.
                german = "Die Kommunikation erlebt also gerade einen enormen Wandel."
                items = [{"number": "11", "text": "stellt die Autorin Vermutungen an?",
                          "german": "stellt die Autorin Vermutungen an?", "chinese": "",
                          **source([95, 96]), "extractionMethod": "visual-transcription"}]
                extras = {"extractionMethod": "visual-transcription",
                          "sourceNote": "第96页照片中的 E 段右侧被截断；这里只录入完整可辨认的首句。第11题按照片手写标记对应 E。"}
            german = re.sub(r"[⁰¹²³⁴⁵⁶⁷⁸⁹]", "", german)
            assert german, (section["teil"], paragraph["label"], "Empty paragraph")
            first = re.split(r"(?<=[.!?])\s+(?=[A-ZÄÖÜ„])", german, maxsplit=1)[0]
            first_zh = re.split(r"(?<=[。！？])", chinese, maxsplit=1)[0]
            q = {"number": str(len(questions) + 1), "paragraph": paragraph["label"],
                 "text": first, "german": first, "firstSentence": first,
                 "chinese": chinese or "原文未提供中文释义", "sentenceZh": first_zh,
                 "summary": first_zh or "原文未提供中文释义", "passage": german,
                 "frage": " / ".join(item["text"] for item in items), "answer": "", "items": items,
                 **source([paragraph["page"]] + [p for p, _ in lines] + ([95, 96] if extras else [])), **extras}
            if section["teil"] >= 22:
                q["addedIn"] = EDITION
            questions.append(q)
        # Contradictory source mappings remain visible but cannot be scored.
        mappings = {}
        for q in questions:
            for item in q["items"]:
                if item["number"]:
                    mappings.setdefault(item["number"], []).append(item)
        for entries in mappings.values():
            if len(entries) > 1:
                for item in entries:
                    item["unverified"] = True
        record = section_record(section, questions, "paragraph-card")
        if section["teil"] >= 22:
            record["addedIn"] = EDITION
        result.append(record)
    return result


def hv2(pages):
    result = []
    start_re = re.compile(r"^(5[5-9]|6[0-4])\s*[-.,]?\s*(.*)")
    answer_re = re.compile(r"^([ABCabc])(?:\s*[-:：).]\s*|\s+)(.*)")
    for section in sections(clean_pages(pages, 228, 245)):
        if section["teil"] == 6:
            section["teil"] = "6-2" if "（2）" in section["title"] else "6-1"
        else:
            section["teil"] = str(section["teil"])
        blocks, current = [], None
        for page, line in section["lines"]:
            match = start_re.match(line)
            if match and "→" not in line:
                current = {"number": match[1], "lines": [(page, match[2])]}
                blocks.append(current)
            elif current:
                current["lines"].append((page, line))
        questions = []
        for block in blocks:
            de, zh = bilingual_lines(block["lines"])
            answer_at = next((i for i, (_, line) in enumerate(de) if answer_re.match(line)), None)
            if answer_at is not None:
                stem = space(" ".join(l for _, l in de[:answer_at]))
                answers, answer = [], None
                for page, line in de[answer_at:]:
                    match = answer_re.match(line)
                    if match:
                        answer = {"letter": match[1].upper(), "text": match[2], "page": page}
                        answers.append(answer)
                    elif answer:
                        answer["text"] += " " + line
                completion = " / ".join(a["text"] for a in answers)
                answer_text = " / ".join(a["letter"] + ". " + a["text"] for a in answers)
                printed = answers[0]["letter"]
            else:
                stem = de[0][1]
                completion = space(" ".join(l.lstrip("- ") for _, l in de[1:]))
                answer_text = completion
                printed = None
                if not completion:
                    # Mode #57 is a complete sentence on one source line.
                    answer_text = stem
            assert stem and answer_text, (section["teil"], block)
            same_number = sum(q.get("sourceNumber") == block["number"] for q in questions)
            q = {"number": block["number"], "sourceNumber": block["number"],
                 "text": stem, "german": stem, "chinese": space(" ".join(l for _, l in zh)) or "原文未提供中文释义",
                 "answer": "", "answerText": answer_text, "completion": completion,
                 "reviewGerman": completion or stem, "sourceAnswer": printed,
                 "sourceGerman": space(" ".join(l for _, l in de)),
                 "sourceNote": "原文仅提供正确补全或完整句，未提供其他选项；保留原文用词。",
                 **source(p for p, _ in block["lines"])}
            if same_number:
                first = next(q for q in questions if q["sourceNumber"] == block["number"])
                if first["number"] == block["number"]:
                    first["number"] += "a"
                q["number"] += chr(97 + same_number)
            if int(str(section["teil"]).split("-")[0]) >= 17:
                q["addedIn"] = EDITION
            questions.append(q)
        result.append(section_record(section, questions, "corpus-card"))
    return result


# These three groups print the blank number BEFORE the supplied word, without
# parentheses around the word. The spans were reviewed directly in the PDF.
BAUSTEIN_ANSWERS = {
    14: "als|doch|über|spektakuläre|offensichtlich|sogar|Boden|erforscht|wir|sei|vorausheben|analysieren|keine|Vorsprung|Gegensatz|sich|raffinierte|zur Wehr setzen|spitzen|unterschiedlichsten|vor|geräumt".split("|"),
    21: "in der Regel|hervorbringt|Substanzen|streng|dar|zufolge|gesundheitsgefährdenden|produzieren|machen|weitergeben|Strategien|lässt|also|herum|unbedenklich|speichert|enthalten|Dosen|dazu|schlägt|ziemlich|sollte".split("|"),
    22: "sie|mit|einen dringenden Handlungsbedarf|wenn|nach|zum|zur|wie|sondern|das|wiederum|Doch|vor|vor|zu|in|für|vor|für|für|für|hängt".split("|"),
}


def baustein(pages):
    result = []
    for section in sections(clean_pages(pages, 150, 181)):
        if section["teil"] == 13 and section["lines"][0][1] == "变）":
            section["title"] += section["lines"].pop(0)[1]
        de, zh = bilingual_lines(section["lines"])
        # Complete multiline headings end before the first actual paragraph.
        if section["teil"] == 7:
            section["title"] += " " + de.pop(0)[1]
        raw = space(" ".join(l for _, l in de))
        spans = []
        if section["teil"] in BAUSTEIN_ANSWERS:
            matches = list(re.finditer(r"\((2[5-9]|[34]\d)\)\s*", raw))
            assert [int(m[1]) for m in matches] == list(range(25, 47))
            for match, answer in zip(matches, BAUSTEIN_ANSWERS[section["teil"]]):
                assert raw[match.end():].startswith(answer), (section["teil"], answer)
                spans.append((match.start(), match.end() + len(answer), int(match[1]), answer))
        elif section["teil"] == 18:
            questions = [{"number": int(m[1]), "german": f"Plastik im Meer — {m[1]}",
                          "text": f"Plastik im Meer — {m[1]}", "chinese": "原文只有答案字母，未提供题干和选项。",
                          "answer": "", "answerText": m[2], "sourceAnswer": m[2],
                          "sourceNote": "只复习原文明示的答案，不编写题干或干扰选项。", **source([177])}
                         for m in re.finditer(r"(2[5-9]|[34]\d)-([A-D])", raw)]
            assert len(questions) == 22
            result.append(section_record(section, questions, "corpus-card"))
            continue
        elif section["teil"] in (12, 13):
            pattern = r"[（(]\s*([^()（）]+?)\s*(?:[（(]\s*)?(2[5-9]|[34]\d)\s*[）)]"
            for m in re.finditer(pattern, raw):
                spans.append((m.start(), m.end(), int(m[2]), space(m[1])))
            if section["teil"] == 13:
                m = re.search(r"genau\s*\(25\)", raw)
                assert m
                spans.insert(0, (m.start(), m.end(), 25, "genau"))
            assert [s[2] for s in spans] == list(range(25, 47)), (section["teil"], spans)
        else:
            pattern = r"[（(]+\s*([^()（）]+?)\s*[）)]+"
            for m in re.finditer(pattern, raw):
                value = m[1].strip()
                if not re.search(r"[A-Za-zÄÖÜäöüß]", value):
                    continue  # Example (0), never a supplied answer.
                explicit = re.match(r"(\d+)(?:\.\s*|\s+)(.*)", value)
                answer = space((explicit[2] if explicit else value).replace("*", "").rstrip(":."))
                number = int(explicit[1]) if explicit else len(spans) + 1
                bridge = raw[spans[-1][1]:m.start()] if spans else ""
                shared_preposition = section["teil"] == 8 and spans and spans[-1][3] == "zu"
                if spans and not shared_preposition and re.fullmatch(r"\s*/\s*(?:in\s*)?", bridge):
                    previous = spans.pop()
                    prefix = "in " if re.search(r"\bin\b", bridge) else ""
                    spans.append((previous[0], m.end(), previous[2], previous[3] + " / " + prefix + answer))
                else:
                    spans.append((m.start(), m.end(), number, answer))
        questions = []
        filled, masked = raw, raw
        for start, end, number, answer in reversed(spans):
            filled = filled[:start] + answer + filled[end:]
            masked = masked[:start] + f"[{number}]____" + masked[end:]
        for start, end, number, answer in spans:
            # Replace only this target; all other supplied words stay visible.
            context = raw[:start] + f"[{number}]____" + raw[end:]
            for other_start, other_end, _, other_answer in reversed(spans):
                if other_start > start:
                    delta = len(f"[{number}]____") - (end - start)
                    context = context[:other_start + delta] + other_answer + context[other_end + delta:]
                elif other_start < start:
                    context = context[:other_start] + other_answer + context[other_end:]
            token = f"[{number}]____"
            at = context.index(token)
            boundary = context.rfind(". ", 0, at)
            left = boundary + 2 if boundary >= 0 else 0
            right = context.find(". ", at)
            prompt = context[left:right + 1 if right >= 0 else len(context)]
            # Use the PDF's translation of this paragraph, without supplementing
            # it from older worksheets or generating a new explanation.
            offset, source_line = 0, None
            for line in de:
                if offset <= start < offset + len(line[1]) + 1:
                    source_line = line
                    break
                offset += len(line[1]) + 1
            translation = []
            if source_line:
                for page, line in section["lines"][section["lines"].index(source_line) + 1:]:
                    if CJK.search(line):
                        translation.append(line)
                    elif translation:
                        break
            questions.append({"number": number, "text": prompt, "german": prompt,
                              "chinese": space(" ".join(translation)) or "原文未提供中文释义", "answer": "", "answerText": answer,
                              "reviewGerman": prompt.replace(token, answer), "sourceGerman": raw[start:end],
                              "sourceNote": "按原文标出的词语复习；原文没有干扰选项。未编号空使用本地顺序号。",
                              **source(p for p, _ in de)})
        record = section_record(section, questions, "corpus-card")
        record.update(article=masked, sourceGerman=raw, passage=filled,
                      chinese=space(" ".join(l for _, l in zh)))
        if section["teil"] in (14, 21, 22):
            record["addedIn"] = EDITION
            for q in questions:
                q["addedIn"] = EDITION
        result.append(record)
    return result


def speaking(pages):
    groups, current, participant = [], None, None
    discussion_lines = []
    discussion_started, new_topic = False, False
    for page, line in clean_pages(pages, 282, 305):
        if line.startswith("口语 Teil 2 Diskussion"):
            discussion_started = True
            continue
        if discussion_started:
            discussion_lines.append((page, line))
            continue
        if line == "口语新题：":
            new_topic = True
            continue
        match = re.fullmatch(r"Teilnehmer ([ABC])", line)
        if match:
            participant = match[1]
            if new_topic:
                current = {"participant": participant, "number": "neu", "lines": []}
                groups.append(current)
            else:
                current = None
            continue
        heading = re.match(r"(\d+)\s*[-–]\s*(.*)", line)
        if heading:
            current = {"participant": participant, "number": int(heading[1]), "lines": []}
            groups.append(current)
        elif current:
            current["lines"].append((page, line))
    result = [{"teil": f"1 {p}", "title": f"Präsentation {p}", "mode": "speaking-card",
               "sourceText": SOURCE_NAME, "questions": [], **source([])} for p in "ABC"]
    bullet_re = re.compile(r"^[▪•︎\s]+(.*)")
    # These source prompts have no bullet. Explicit starts also exclude wrapped
    # topic-index headings, which are not part of the exam wording.
    unbulleted_starts = {
        ("A", 4): ("Welchen Stellenwert", "Liegt es"),
        ("A", 13): ("Fast jedes Land", "Halten Sie"),
        ("B", 4): ("Musiker, Künstler", "Politische Quereinsteigarinnen"),
        ("B", 14): ("Sollte Philosophie", "Keine Hausaufgaben"),
        ("C", 1): ("Wählen oder", "In allen Kulturen"),
        ("C", 21): ("Work-Life-Balance",),
    }
    for group in groups:
        prompts, prompt = [], None
        for page, line in group["lines"]:
            bullet = bullet_re.match(line)
            manual_start = line.startswith(unbulleted_starts.get((group["participant"], group["number"]), ()))
            if bullet or manual_start or (group["number"] == "neu" and prompt is None):
                prompt = []
                prompts.append(prompt)
            if prompt is not None:
                prompt.append((page, bullet[1] if bullet else line))
        expected = 1 if group["number"] == "neu" else 2
        assert len(prompts) == expected, (group["participant"], group["number"], prompts)
        target = result["ABC".index(group["participant"])]
        for i, lines in enumerate(prompts, 1):
            german = space(" ".join(l for _, l in lines))
            q = {"number": f"{group['participant']}{group['number']}-{i}", "german": german,
                 "chinese": "原文未提供中文释义", "teilLabel": target["teil"],
                 **source(p for p, _ in lines)}
            if group["number"] == "neu" or group["number"] >= 23:
                q["addedIn"] = EDITION
            target["questions"].append(q)
    blocks, block = [], None
    for page, line in discussion_lines:
        match = re.match(r"(\d+)\s*▪[︎\s▪]*(.*)", line)
        if match:
            block = {"number": match[1], "lines": [(page, match[2])]}
            blocks.append(block)
        elif block:
            block["lines"].append((page, line))
    assert [int(b["number"]) for b in blocks] == list(range(1, 131))
    discussion = {"teil": "2 Diskussion", "title": "Diskussion", "mode": "speaking-card",
                  "sourceText": SOURCE_NAME, "questions": [], **source(p for p, _ in discussion_lines)}
    for block in blocks:
        q = {"number": block["number"], "german": space(" ".join(l for _, l in block["lines"])),
             "chinese": "原文未提供中文释义", "teilLabel": "Teil 2 Diskussion",
             **source(p for p, _ in block["lines"])}
        if int(block["number"]) >= 89:
            q["addedIn"] = EDITION
        discussion["questions"].append(q)
    for record in result:
        record.update(source(p for q in record["questions"] for p in q["sourcePages"]))
    result.append(discussion)
    return result


def writing(pages):
    blocks, block = [], None
    for page, line in clean_pages(pages, 306, 329):
        match = re.match(r"(\d+)\s*[,，.]?\s*Thema\s*([AB12])\s*(?:[:：]\s*(.*)|(（题目暂不详）))", line)
        if match:
            block = {"teil": int(match[1]), "number": {"1": "A", "2": "B"}.get(match[2], match[2]),
                     "title": match[3] or match[4], "page": page, "lines": []}
            blocks.append(block)
        elif block:
            block["lines"].append((page, line))
    assert len(blocks) == 128
    result = []
    for block in blocks:
        if (block["teil"], block["number"]) in [(44, "A"), (51, "B")]:
            block["title"] += " " + block["lines"].pop(0)[1]
        if not result or result[-1]["teil"] != block["teil"]:
            result.append({"teil": block["teil"], "title": f"Schreiben Thema {block['teil']}",
                           "sourceText": SOURCE_NAME, "mode": "writing-card", "questions": []})
        title = f"{block['teil']}{block['number']} Thema {block['number']}: {block['title']}"
        q = {"number": block["number"], "text": title, "german": title,
             "sourceTitle": block["title"], "chinese": "原文未提供中文释义", "answer": "",
             "paragraph": block["number"], "firstSentence": title, "summary": "原文未提供中文释义",
             "positions": space(" ".join(l for _, l in block["lines"])),
             **source([block["page"]] + [p for p, _ in block["lines"]])}
        if (block["teil"], block["number"]) in [(30, "B"), (43, "B"), (61, "B"), (64, "A"), (64, "B")]:
            q["addedIn"] = EDITION
        result[-1]["questions"].append(q)
    for record in result:
        record.update(source(p for q in record["questions"] for p in q["sourcePages"]))
    return result


def validate(datasets):
    expected = {"lv2": (26, 130), "lv3": (23, 280), "hv1": (21, 170), "hv2": (19, 199),
                "baustein": (21, 456), "speaking": (4, 311), "writing": (64, 128)}
    ranges = {"lv2": (55, 129), "lv3": (130, 149), "baustein": (150, 181), "hv1": (182, 227),
              "hv2": (228, 245), "speaking": (282, 305), "writing": (306, 329)}
    for name, data in datasets.items():
        assert (len(data), sum(len(s["questions"]) for s in data)) == expected[name], name
        keys = [str(s["teil"]) for s in data]
        assert len(keys) == len(set(keys)), (name, "duplicate Teil")
        for s in data:
            assert s["source"] == SOURCE_ID and s["sourcePages"], (name, s["teil"], "missing section source")
            for q in s["questions"]:
                assert q.get("german") or q.get("text") or q.get("options"), (name, s["teil"], q)
                assert q.get("source") == SOURCE_ID, (name, s["teil"], "non-PDF record")
                low, high = ranges[name]
                assert q.get("sourcePages") and all(low <= p <= high for p in q["sourcePages"])
                if q.get("options") and q.get("answer"):
                    assert q["answer"] in [o["value"] for o in q["options"]]
                assert not q.get("knowledgePoint") and not q.get("acceptedAnswers")
                if name != "lv3":
                    assert not q.get("options") and not q.get("answer"), (name, "invented choices")
        if name == "hv1":
            assert [s["teil"] for s in data] == HV1_TEILS
        elif name == "lv2":
            assert all([q["paragraph"] for q in s["questions"]] == list("ABCDE") for s in data)
        elif name == "baustein":
            assert 19 not in [s["teil"] for s in data], "The PDF has no Baustein Teil 19"
        elif name == "lv3":
            missing = [(s["teil"], q["number"]) for s in data for q in s["questions"] if not q["answer"]]
            assert missing == [(8, 24), (18, 24)], missing


def preserve_matching_audio(data):
    """Keep a generated clip only when its PDF reading text is unchanged.

    This reads playback metadata, never supplies any exercise text or answers.
    """
    previous_path = ROOT / "data" / "hv1_questions.json"
    if not previous_path.exists():
        return
    previous = json.loads(previous_path.read_text(encoding="utf-8"))
    old = {(str(s["teil"]), str(q["number"])): q for s in previous for q in s["questions"]}
    for section in data:
        for q in section["questions"]:
            prior = old.get((str(section["teil"]), str(q["number"])), {})
            reading = q.get("sourceTranscript") or q.get("leitsatz")
            old_reading = prior.get("sourceTranscript") or prior.get("leitsatz")
            expected = f"data/audio/hv1/teil-{section['teil']}-speaker-{q['number']}.mp3"
            if reading == old_reading and prior.get("audio") == expected and (ROOT / expected).is_file():
                q["audio"] = expected


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--dry-run", action="store_true", help="Report changes without writing")
    parser.add_argument("--only-hv1", action="store_true", help="Replace HV1 exclusively from PDF pages 182-227")
    args = parser.parse_args()
    from pypdf import PdfReader
    if hashlib.sha256(args.pdf.read_bytes()).hexdigest() != EXPECTED_SHA256:
        raise ValueError("This PDF differs from the reviewed edition. Review its changes before importing.")
    reader = PdfReader(args.pdf)
    if len(reader.pages) != 329:
        raise ValueError("This reviewed import expects the 329-page September 2026 edition.")
    pages = [(p.extract_text() or "") if not args.only_hv1 or 181 <= i < 227 else ""
             for i, p in enumerate(reader.pages)]
    # No existing question file is read to construct the replacement.
    parsers = {"lv2": lv2, "lv3": lv3, "hv1": hv1, "hv2": hv2,
               "baustein": baustein, "speaking": speaking, "writing": writing}
    names = ["hv1"] if args.only_hv1 else list(parsers)
    datasets = {name: parsers[name](pages) for name in names}
    validate(datasets)
    preserve_matching_audio(datasets["hv1"])
    summary = {}
    for name, data in datasets.items():
        variable = f"{name.upper()}_QUESTIONS"
        text = json.dumps(data, ensure_ascii=False, indent=2)
        output = ROOT / "data" / f"{name}_questions.js"
        script = f"window.{variable} = {text};\n"
        summary[name] = {"sections": len(data), "questions": sum(len(s["questions"]) for s in data),
                         "changed": not output.exists() or output.read_text(encoding="utf-8") != script}
        if not args.dry_run:
            output.write_text(script, encoding="utf-8")
            if name in ("lv3", "hv1"):
                (ROOT / "data" / f"{name}_questions.json").write_text(text + "\n", encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    if not args.dry_run:
        manifest_path = ROOT / "data" / "corpus-2026-09.json"
        modules = json.loads(manifest_path.read_text(encoding="utf-8"))["modules"] if args.only_hv1 else {}
        modules.update({n: {k: v for k, v in s.items() if k in ("sections", "questions")} for n, s in summary.items()})
        manifest = {"id": SOURCE_ID, "filename": SOURCE_NAME, "pages": len(pages),
                    "sha256": EXPECTED_SHA256, "importMode": "replace-from-pdf-only",
                    "removedModules": ["lv2v2", "grammar"], "modules": modules}
        (ROOT / "data" / "corpus-2026-09.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
