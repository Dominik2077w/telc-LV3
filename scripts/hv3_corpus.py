"""Import the reviewed HV3 outline, preserving uncertain source material."""
import argparse
import hashlib
import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SHA256 = "dfa404ef59dfe38308e702daf614251eea025e313a1f0245c71e5b613c848999"
SOURCE = "tencent-2026-09"


def normalized(text):
    return "".join(c for c in unicodedata.normalize("NFKC", text).lower() if c.isalnum())


def build(pages):
    translations = json.loads((ROOT / "scripts/hv3-heading-translations.json").read_text(encoding="utf-8"))
    prompt_translations = json.loads((ROOT / "scripts/hv3-prompt-translations.json").read_text(encoding="utf-8"))
    def heading_translation(text):
        if not re.search(r"[A-Za-zÄÖÜäöüß]", text):
            return ""
        assert translations.get(text), ("Missing HV3 heading translation", text)
        return translations[text]

    sections, section, group = [], None, None
    for line in (ROOT / "scripts/hv3-reviewed.txt").read_text(encoding="utf-8").splitlines():
        if not line or line.startswith("#"):
            continue
        if line.startswith("@"):
            key, title, refs = line[1:].split("|")
            section = {"teil": key, "title": title, "mode": "hv3-outline", "source": SOURCE,
                       "titleChinese": heading_translation(title),
                       "sourcePages": [int(p) for p in refs.split(",")], "questions": []}
            sections.append(section)
        elif line.startswith(">"):
            group = line[1:].split("|")
            assert len(group) == 3
        else:
            fields = line.split("|")
            number, answer, chinese, refs = fields[:4]
            uncertain = number.startswith("?")
            number = number.lstrip("?")
            refs = [int(p) for p in refs.split(",")]
            note = fields[4] if len(fields) > 4 else ""
            heading, before, after = group
            prompt_chinese = ""
            if before or after:
                prompt_chinese = prompt_translations.get(before + "|" + after, "")
                assert re.search(r"[\u3400-\u9fff]", prompt_chinese) and prompt_chinese.count("{blank}") == 1, ("Missing HV3 prompt translation", before, after)
            # Verify printed answers against the actual PDF, not another bank.
            text = normalized(" ".join(pages[p - 1] for p in refs))
            assert not answer or normalized(answer) in text, (section["teil"], number, answer)
            alternatives = []
            if (section["teil"], number) == ("22-1", "68"):
                alternatives = ["sie direkt antidepressiv wirkt", "Schokolade bei schlechter Stimmung hilft"]
            if (section["teil"], number) == ("22-2", "65"):
                alternatives = ["9,5 Kilo", "fast 10 Kilogramm"]
            if (section["teil"], number) == ("16", "74"):
                alternatives = ["miteinander sprechen", "Unterstützung bekommen"]
            if (section["teil"], number) == ("16", "66"):
                alternatives = ["Selbstbeherrschung", "Selbstkontrolle"]
            for alternate in alternatives:
                assert normalized(alternate) in text
            section["questions"].append({
                "number": number, "sourceNumber": int(re.match(r"\d+", number)[0]),
                "heading": heading, "headingChinese": heading_translation(heading), "before": before, "after": after,
                "promptChinese": prompt_chinese,
                "german": "\n".join(filter(None, [heading, before, f"[{number}] ____", after])),
                "answer": "", "answerText": answer, "sourceAnswerText": answer,
                "sourceAlternatives": alternatives, "chinese": chinese,
                "translationSource": "reviewed-study-translation",
                "practiceEligible": bool(answer) and not uncertain,
                "sourceNote": note, "source": SOURCE, "sourcePages": refs,
            })
    # Keep the actual section text available for checking broken/answer-only rows.
    blocks, current = [], None
    for page in range(246, 282):
        for line in pages[page - 1].splitlines():
            if re.search(r"(?:^|\s)Teil\s*\d", line, re.I):
                current = []
                blocks.append(current)
            elif current is not None and line.strip() != str(page):
                current.append(line)
    assert len(blocks) == len(sections) == 28
    for section, block in zip(sections, blocks):
        section["sourceOutline"] = "\n".join(block).strip()
        section["referenceOnly"] = bool(section["questions"]) and not any(q["practiceEligible"] for q in section["questions"])
    assert sum(len(s["questions"]) for s in sections) == 272
    return sections


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pdf", type=Path)
    args = parser.parse_args()
    assert hashlib.sha256(args.pdf.read_bytes()).hexdigest() == SHA256, "Unreviewed PDF edition"
    import fitz
    with fitz.open(args.pdf) as document:
        assert len(document) == 329
        pages = [document[i].get_text(sort=True) if 245 <= i < 281 else "" for i in range(329)]
    data = build(pages)
    text = json.dumps(data, ensure_ascii=False, indent=2)
    (ROOT / "data/hv3_questions.js").write_text("window.HV3_QUESTIONS = " + text + ";\n", encoding="utf-8")
    (ROOT / "data/hv3_questions.json").write_text(text + "\n", encoding="utf-8")
    manifest_path = ROOT / "data/corpus-2026-09.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["modules"]["hv3"] = {"sections": len(data), "questions": sum(len(s["questions"]) for s in data)}
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"sections": len(data), "rows": 272,
        "practice": sum(q["practiceEligible"] for s in data for q in s["questions"]),
        "referenceOnly": [s["teil"] for s in data if s["referenceOnly"]]}))


if __name__ == "__main__":
    main()
