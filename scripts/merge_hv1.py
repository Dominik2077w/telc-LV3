"""Merge manually-verified Teil 1 with extracted Teils 2-12."""
import json, re, sys, os

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Load manually-verified Teil 1 from git backup
# Try different encodings
content = None
for enc in ["utf-8", "utf-16", "utf-16-le", "gbk"]:
    try:
        with open(os.path.join(root, "data/hv1_teil1_backup.js"), "r", encoding=enc) as f:
            content = f.read()
        break
    except:
        continue
if content is None:
    print("ERROR: Cannot read backup file")
    sys.exit(1)
start = content.index("[")
depth = 0
end = start
for i, ch in enumerate(content[start:], start):
    if ch == "[": depth += 1
    elif ch == "]":
        depth -= 1
        if depth == 0: end = i + 1; break
js_obj = content[start:end]
js_obj = re.sub(r"//[^\n]*", "", js_obj)
js_obj = re.sub(r",(\s*[}\]])", r"\1", js_obj)
js_obj = re.sub(r'([{,])\s*([a-zA-Z_]\w*)\s*:', r'\1 "\2":', js_obj)
teil1 = json.loads(js_obj)
print(f"Teil 1 (manual): {len(teil1)} section(s), {sum(len(s['questions']) for s in teil1)} questions")

# Load extracted data
with open(os.path.join(root, "data/hv1_questions.json"), "r", encoding="utf-8") as f:
    extracted = json.load(f)

# Merge: keep manual Teil 1, use extracted for Teil 2+
merged = list(teil1)  # Keep manual Teil 1
for section in extracted:
    if section["teil"] == 1:
        continue  # Skip extracted Teil 1
    merged.append(section)

merged.sort(key=lambda s: s["teil"])

print(f"\nMerged data:")
for s in merged:
    print(f"  Teil {s['teil']}: {s['title']} - {len(s['questions'])} questions")
    for q in s["questions"]:
        print(f"    S{q['number']}: L={len(q['leitsatz'])} T={len(q['text'])} C={len(q['chinese'])}")

# Write merged JS
js = "window.HV1_QUESTIONS = " + json.dumps(merged, ensure_ascii=False, indent=2) + ";\n"
with open(os.path.join(root, "data/hv1_questions.js"), "w", encoding="utf-8") as f:
    f.write(js)
print(f"\nWrote merged data to data/hv1_questions.js")

# Write JSON
with open(os.path.join(root, "data/hv1_questions.json"), "w", encoding="utf-8") as f:
    json.dump(merged, f, ensure_ascii=False, indent=2)
print("Wrote JSON")

# Report gaps
for s in merged:
    nums = {q["number"] for q in s["questions"]}
    missing = set(range(1, 9)) - nums
    if missing:
        print(f"  GAP Teil {s['teil']}: missing Sprechers {sorted(missing)}")
    short_texts = [q for q in s["questions"] if len(q["text"]) < 200]
    if short_texts:
        print(f"  SHORT Teil {s['teil']}: Sprechers {[q['number'] for q in short_texts]}")
