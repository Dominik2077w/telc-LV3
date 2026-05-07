"""
Final HV1 data extraction with all fixes.
Handles: Sprecher/Spreche/Speaker variants, MC-format Teils, missing texts.
"""
import json, re, sys, os, pdfplumber

PDF = "2026全套（更新以腾讯文档为准）.pdf"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def respace(text):
    text = re.sub(r"([a-zäöüß])([A-ZÄÖÜ])", r"\1 \2", text)
    text = re.sub(r"([.,:;!?)])([A-Za-zÄÖÜäöüß])", r"\1 \2", text)
    return text.strip()


def cjk_ratio(text):
    if not text: return 0
    return len(re.findall(r"[一-鿿]", text)) / max(len(text), 1)


def extract_leitsatz(lines):
    """Extract Leitsatz from header lines (short German + optionally Chinese)."""
    result = []
    for line in lines:
        line = line.strip()
        if not line or re.match(r"^\d+$", line): continue
        if line.startswith("Tenchickenbutts") or line.startswith("xhs:"): continue
        cr = cjk_ratio(line)
        if cr > 0.5: break
        result.append(line)
    return respace(" ".join(result))


def extract_chinese(lines):
    """Extract Chinese portion from lines."""
    chinese = []
    for line in lines:
        line = line.strip()
        if cjk_ratio(line) > 0.3:
            chinese.append(line)
    return "".join(chinese)


def parse_teil(chunk, teil_num):
    """Parse a single Teil chunk and return questions."""
    lines = chunk.split("\n")
    leitsaetze = {}
    full_texts = {}
    chinese_texts = {}

    i = 0
    while i < len(lines):
        line = lines[i].strip()
        sm = re.match(r"(?:Sprech(?:er|e)|Speicher|Speaker)\s*(\d+)\s*[.:]?\s*$", line, re.IGNORECASE)
        if sm:
            num = int(sm.group(1))
            i += 1
            body_lines = []
            while i < len(lines):
                nl = lines[i].strip()
                if re.match(r"(?:Sprech(?:er|e)|Speicher|Speaker)\s*\d+", nl, re.IGNORECASE):
                    break
                if re.match(r"Teil\s*\d+", nl):
                    break
                if nl.startswith("Tenchickenbutts") or nl.startswith("xhs:"):
                    i += 1; continue
                if re.match(r"^\d{1,3}$", nl) and len(nl) <= 3:
                    i += 1; continue
                body_lines.append(nl)
                i += 1

            body = "\n".join(body_lines)
            cr = cjk_ratio(body)

            if len(body) < 200 and cr > 0.3:
                # Header entry: short, mixed
                ls = extract_leitsatz(body_lines)
                if ls and num not in leitsaetze:
                    leitsaetze[num] = ls
                ch = extract_chinese(body_lines)
                if ch and num not in chinese_texts:
                    chinese_texts[num] = ch
            elif len(body) > 200:
                # Content entry
                german_lines = []
                chinese_lines = []
                in_ch = False
                for bl in body_lines:
                    cr_bl = cjk_ratio(bl)
                    # Check if this line has an MC answer prefix like "c-", "j-", etc.
                    mc_match = re.match(r"^[a-zA-Z]-", bl.strip())
                    if mc_match and not in_ch:
                        # Could be Leitsatz with answer letter - strip prefix
                        clean = re.sub(r"^[a-zA-Z]-", "", bl.strip()).strip()
                        if cr_bl < 0.3:
                            german_lines.append(clean)
                        else:
                            in_ch = True
                            chinese_lines.append(bl.strip())
                        continue
                    if cr_bl > 0.5 or in_ch:
                        in_ch = True
                        chinese_lines.append(bl)
                    else:
                        german_lines.append(bl)

                ft = respace(" ".join(german_lines))
                if ft and len(ft) > 80:
                    full_texts[num] = ft
                if not ft or len(ft) <= 80:
                    # Short German - this is a Leitsatz, not full text
                    ls = respace(" ".join(german_lines))
                    if ls and num not in leitsaetze:
                        leitsaetze[num] = ls
                ch = "".join(chinese_lines)
                if ch and num not in chinese_texts:
                    chinese_texts[num] = ch
        else:
            i += 1

    # Assemble
    questions = []
    all_nums = sorted(set(list(leitsaetze.keys()) + list(full_texts.keys())))
    for num in all_nums:
        ls = leitsaetze.get(num, "")
        ft = full_texts.get(num, "")
        ch = chinese_texts.get(num, "暂无中文释义")

        if not ls and ft:
            ls = ft.split(".")[0].strip()[:120]

        questions.append({
            "number": num,
            "leitsatz": ls,
            "text": ft,
            "german": ls,
            "chinese": ch,
            "answer": chr(64 + num),
            "audio": f"data/audio/hv1/teil{teil_num}_sprecher{num}.wav" if ft else "",
        })

    questions.sort(key=lambda q: q["number"])
    return questions


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    pdf_path = os.path.join(ROOT, PDF)

    with pdfplumber.open(pdf_path) as pdf:
        all_text = ""
        for i in range(174, 215):
            text = pdf.pages[i].extract_text()
            if text:
                all_text += text + "\n"

    chunks = re.split(r"\n(?=Teil\s*\d+)", all_text)

    # Load manual Teil 1
    with open(os.path.join(ROOT, "data/hv1_questions.js"), "r", encoding="utf-8") as f:
        content = f.read()
    start = content.index("[")
    depth, end = 0, start
    for i, ch in enumerate(content[start:], start):
        if ch == "[": depth += 1
        elif ch == "]": depth -= 1
        if depth == 0: end = i + 1; break
    js_obj = content[start:end]
    js_obj = re.sub(r"//[^\n]*", "", js_obj)
    js_obj = re.sub(r",(\s*[}\]])", r"\1", js_obj)
    js_obj = re.sub(r'([{,])\s*([a-zA-Z_]\w*)\s*:', r'\1 "\2":', js_obj)
    existing = json.loads(js_obj)
    teil1 = [s for s in existing if s["teil"] == 1]

    all_sections = list(teil1)

    for chunk in chunks:
        m = re.match(r"Teil\s*(\d+)\s*(\S+)", chunk.strip())
        if not m: continue
        teil_num = int(m.group(1))
        title = m.group(2)
        if teil_num == 1 or teil_num > 12: continue

        print(f"Teil {teil_num}: {title}", end=" ")
        questions = parse_teil(chunk, teil_num)
        qc = len(questions)
        has_text = sum(1 for q in questions if q["text"])
        has_audio = sum(1 for q in questions if q["audio"])
        print(f"{qc}q (text:{has_text}, audio:{has_audio})")
        if qc > 0:
            all_sections.append({"teil": teil_num, "title": title, "questions": questions})

    all_sections.sort(key=lambda s: s["teil"])

    total_q = sum(len(s["questions"]) for s in all_sections)
    print(f"\nTotal: {len(all_sections)} Teils, {total_q} questions")

    js = "window.HV1_QUESTIONS = " + json.dumps(all_sections, ensure_ascii=False, indent=2) + ";\n"
    with open(os.path.join(ROOT, "data/hv1_questions.js"), "w", encoding="utf-8") as f:
        f.write(js)
    with open(os.path.join(ROOT, "data/hv1_questions.json"), "w", encoding="utf-8") as f:
        json.dump(all_sections, f, ensure_ascii=False, indent=2)
    print("Written to data/hv1_questions.js and .json")


if __name__ == "__main__":
    main()
