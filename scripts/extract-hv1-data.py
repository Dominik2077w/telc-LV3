"""
Extract HV1 data from PDF - v3.
Process entire HV1 section as continuous text, split by Teil headers.
"""
import pdfplumber, re, json, sys, os

PDF = "2026全套（更新以腾讯文档为准）.pdf"
OUT_JS = "data/hv1_questions.js"
OUT_JSON = "data/hv1_questions.json"


def cjk_ratio(text):
    if not text: return 0
    return len(re.findall(r"[一-鿿]", text)) / max(len(text), 1)


def respace(text):
    """Fix concatenated German words using dictionary-based approach."""
    # Step 1: Insert space at lowercase→uppercase boundaries
    text = re.sub(r"([a-zäöüß])([A-ZÄÖÜ])", r"\1 \2", text)
    # Step 2: After punctuation followed by letter
    text = re.sub(r"([.,:;!?)])([A-Za-zÄÖÜäöüß])", r"\1 \2", text)

    # Step 3: Common German short words that tend to merge
    short_words = [
        "das", "ist", "die", "der", "und", "ich", "nicht", "ein", "eine",
        "auf", "für", "mit", "von", "den", "dem", "des", "aus", "bei",
        "nach", "vor", "zu", "im", "am", "an", "in", "es", "er", "sie",
        "wir", "was", "wie", "so", "auch", "noch", "schon", "nur", "mal",
        "da", "um", "als", "wenn", "dann", "aber", "oder", "man", "sich",
        "mir", "dir", "ihm", "ihr", "uns", "euch", "ihnen", "zum", "zur",
        "hat", "habe", "haben", "hatte", "war", "sein", "sind", "wird",
        "werden", "kann", "können", "muss", "soll", "will", "durch",
        "über", "unter", "neben", "zwischen", "vor", "hinter", "ohne",
        "aber", "sondern", "denn", "weil", "dass", "ob", "bis", "seit",
        "mehr", "sehr", "ganz", "immer", "wieder", "doch", "eben",
        "wohl", "etwa", "etwas", "nichts", "alles", "also", "nun",
    ]
    # Sort by length descending
    short_words.sort(key=len, reverse=True)

    # Apply word splitting at known merge points
    words = text.split()
    result = []
    for word in words:
        if len(word) < 4 or word[0].isupper():
            result.append(word)
            continue

        # Try to split merged lowercase words
        fixed = []
        pos = 0
        while pos < len(word):
            matched = False
            for sw in short_words:
                if word[pos:].startswith(sw):
                    fixed.append(sw)
                    pos += len(sw)
                    matched = True
                    break
            if not matched:
                # Take one char and continue
                if fixed:
                    fixed[-1] += word[pos]
                else:
                    fixed.append(word[pos])
                pos += 1
        result.append(" ".join(fixed))

    return " ".join(result).strip()


def extract_teil_from_chunk(chunk, teil_num):
    """Extract questions from a single Teil's text chunk."""
    lines = chunk.split("\n")
    # Find title from first line
    title = ""
    m = re.match(r"Teil\s*\d+\s*(\S+)", lines[0].strip()) if lines else None
    if m:
        title = m.group(1)

    # Find all Leitsätze: lines matching "SprecherN" followed by German text
    leitsaetze = {}
    full_texts = {}
    chinese_texts = {}

    i = 0
    while i < len(lines):
        line = lines[i].strip()
        sm = re.match(r"Sprecher(\d+)\.?\s*$", line)
        if not sm:
            i += 1
            continue
        num = int(sm.group(1))
        i += 1

        # Collect following lines until next Sprecher or end
        body_lines = []
        while i < len(lines):
            nl = lines[i].strip()
            if re.match(r"Sprecher\d", nl) or re.match(r"Teil\s*\d", nl):
                break
            # Skip watermark/header lines
            if nl.startswith("Tenchickenbutts") or nl.startswith("xhs:"):
                i += 1
                continue
            # Skip pure page numbers
            if re.match(r"^\d{1,3}$", nl):
                i += 1
                continue
            body_lines.append(nl)
            i += 1

        body = "\n".join(body_lines)

        # Determine if this is a header entry (short, just Leitsatz + Chinese translation)
        # or a content entry (long German text + Leitsatz + Chinese)
        if len(body) < 150 and cjk_ratio(body) > 0.3:
            # Header entry: short, mixed German+Chinese
            # Extract German part (Leitsatz)
            german_part = []
            for bl in body_lines:
                if cjk_ratio(bl) > 0.5:
                    break
                german_part.append(bl)
            leitsatz = respace(" ".join(german_part))
            if leitsatz and num not in leitsaetze:
                leitsaetze[num] = leitsatz
        elif len(body) > 150:
            # Content entry: long German text, then Leitsatz+Chinese, then Chinese translation
            german_lines = []
            chinese_lines = []
            in_chinese = False
            leitsatz_line_found = False

            for bl in body_lines:
                cr = cjk_ratio(bl)
                if not leitsatz_line_found and cr > 0 and cr <= 0.5:
                    # Mixed line: Leitsatz + Chinese
                    leitsatz_line_found = True
                    in_chinese = True
                    # Extract German part
                    m_cjk = re.search(r"[一-鿿]", bl)
                    if m_cjk:
                        g = bl[:m_cjk.start()].strip()
                        if g and num not in leitsaetze:
                            leitsaetze[num] = respace(g)
                        c = bl[m_cjk.start():].strip()
                        if c:
                            chinese_lines.append(c)
                    continue

                if in_chinese:
                    chinese_lines.append(bl)
                elif cr > 0.5:
                    in_chinese = True
                    chinese_lines.append(bl)
                else:
                    german_lines.append(bl)

            full_text = respace(" ".join(german_lines))
            if full_text:
                full_texts[num] = full_text
            if chinese_lines:
                chinese_texts[num] = "".join(chinese_lines)

    # Assemble questions
    questions = []
    all_nums = sorted(set(list(leitsaetze.keys()) + list(full_texts.keys())))
    for num in all_nums:
        leitsatz = leitsaetze.get(num, "")
        full_text = full_texts.get(num, "")
        chinese = chinese_texts.get(num, "暂无中文释义")

        # If we have full text but no leitsatz, derive from full text first sentence
        if not leitsatz and full_text:
            first_sent = full_text.split(".")[0].strip()
            leitsatz = first_sent[:120]

        questions.append({
            "number": num,
            "leitsatz": leitsatz,
            "text": full_text,
            "german": leitsatz,
            "chinese": chinese,
            "answer": chr(64 + num),
            "audio": f"data/audio/hv1/teil{teil_num}_sprecher{num}.wav",
        })

    questions.sort(key=lambda q: q["number"])
    return {"teil": teil_num, "title": title, "questions": questions}


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    pdf_path = os.path.join(root, PDF)

    print(f"Opening: {pdf_path}")
    with pdfplumber.open(pdf_path) as pdf:
        # Extract all HV1 pages (175-215) as one text
        all_text = ""
        for i in range(174, 215):
            text = pdf.pages[i].extract_text()
            if text:
                all_text += text + "\n"
        print(f"Extracted {len(all_text)} chars from pages 175-215")

    # Split by Teil headers
    teil_chunks = re.split(r"\n(?=Teil\s*\d+)", all_text)
    print(f"Found {len(teil_chunks)} Teil chunks")

    all_sections = []
    for chunk in teil_chunks:
        m = re.match(r"Teil\s*(\d+)\s*(\S+)", chunk.strip())
        if not m:
            continue
        teil_num = int(m.group(1))
        title_raw = m.group(2)
        print(f"\nTeil {teil_num}: {title_raw}", end=" ")

        section = extract_teil_from_chunk(chunk, teil_num)
        qc = len(section["questions"]) if section else 0
        ok = "OK" if qc == 8 else f"({qc}q)"
        print(ok)
        if section:
            for q in section["questions"]:
                print(f"  S{q['number']}: L={len(q['leitsatz'])} T={len(q['text'])} C={len(q['chinese'])}")
            if qc >= 6:
                all_sections.append(section)

    all_sections.sort(key=lambda s: s["teil"])

    # Write
    js = "window.HV1_QUESTIONS = " + json.dumps(all_sections, ensure_ascii=False, indent=2) + ";\n"
    with open(os.path.join(root, OUT_JS), "w", encoding="utf-8") as f:
        f.write(js)
    with open(os.path.join(root, OUT_JSON), "w", encoding="utf-8") as f:
        json.dump(all_sections, f, ensure_ascii=False, indent=2)

    total_q = sum(len(s["questions"]) for s in all_sections)
    print(f"\nDone: {len(all_sections)} Teils, {total_q} questions")


if __name__ == "__main__":
    main()
