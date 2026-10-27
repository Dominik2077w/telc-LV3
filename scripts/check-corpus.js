const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "data/corpus-2026-09.json"), "utf8"));
const datasets = {};
const expectedNew = { lv1: 30, lv2: 25, lv3: 49, hv1: 66, hv2: 20, baustein: 66, speaking: 91, writing: 5 };
assert.equal(manifest.importMode, "replace-from-pdf-only");
assert.deepEqual(Object.keys(manifest.modules).sort(), ["baustein", "hv1", "hv2", "lv1", "lv2", "lv3", "speaking", "writing"]);
for (const obsolete of ["lv2_v2", "baustein_grammar"]) {
  assert.ok(!fs.existsSync(path.join(root, `data/${obsolete}_questions.js`)), `Remove unsupported ${obsolete} corpus`);
  assert.ok(!fs.readFileSync(path.join(root, "index.html"), "utf8").includes(`${obsolete}_questions.js`));
}

for (const [name, expected] of Object.entries(manifest.modules)) {
  const context = { window: {} };
  const script = fs.readFileSync(path.join(root, `data/${name}_questions.js`), "utf8");
  vm.runInNewContext(script, context);
  const sections = JSON.parse(JSON.stringify(Object.values(context.window)[0]));
  datasets[name] = sections;
  assert.equal(sections.length, expected.sections, `${name}: section count`);
  assert.equal(new Set(sections.map((s) => String(s.teil))).size, sections.length, `${name}: unique Teil IDs`);
  const questions = sections.flatMap((s) => s.questions);
  assert.equal(questions.length, expected.questions, `${name}: question count`);
  assert.equal(questions.filter((q) => q.addedIn === "2026.9").length, expectedNew[name], `${name}: new markers`);
  for (const section of sections) {
    assert.equal(section.source, manifest.id, `${name}/${section.teil}: sole source`);
    assert.ok(section.sourcePages?.length);
    for (const q of section.questions) {
      assert.ok(q.german || q.text || q.options?.length, `${name}/${section.teil}/${q.number}: empty prompt`);
      assert.equal(q.source, manifest.id, `${name}/${section.teil}/${q.number}: no legacy content`);
      assert.ok(!q.knowledgePoint && !q.acceptedAnswers && !q.sourceRow, "No worksheet annotations or invented alternatives");
      if (q.source === manifest.id) {
        assert.ok(q.sourcePages?.length, `${name}/${section.teil}/${q.number}: source pages`);
        assert.ok(q.sourcePages.every((p) => Number.isInteger(p) && p > 0 && p <= manifest.pages));
      }
      if (q.answer && q.options?.length) {
        assert.ok(q.options.some((o) => o.value === q.answer), `${name}/${section.teil}/${q.number}: answer absent from options`);
      }
      if (section.mode === "corpus-card") {
        assert.equal(q.answer, "", "Incomplete source material must use self-assessment rather than invented choices");
        assert.ok(q.answerText);
        assert.ok(!q.options);
        if (q.audio) assert.ok(name === "hv1" && /^data\/audio\/hv1\/teil-[\d-]+-speaker-[1-8]\.mp3$/.test(q.audio));
      }
    }
  }
  if (["lv3", "hv1"].includes(name)) {
    const json = JSON.parse(fs.readFileSync(path.join(root, `data/${name}_questions.json`), "utf8"));
    assert.deepEqual(sections, json, `${name}: browser and JSON copies must agree`);
  }
}

const lv3 = datasets.lv3;
assert.deepEqual(datasets.lv1.map(s => s.teil), Array.from({ length: 22 }, (_, i) => i + 1));
for (const section of datasets.lv1) {
  assert.equal(section.mode, "lv1-position");
  assert.deepEqual(section.questions.map(q => q.position), section.teil === 17 ? [] : [1, 2, 3, 4, 5, 6]);
  assert.ok(section.questions.every(q => q.sourcePages.every(p => p >= 20 && p <= 54)));
  assert.ok(section.questions.every(q => !/[\u3400-\u9fff]/.test(q.german) && !/[()]/.test(q.german)));
}
const hv1 = datasets.hv1;
assert.deepEqual(hv1.map(s => s.teil), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, "12-2", 13, "13-2", "14-1", "14-2", 15, 16, 17, 18]);
const hv1Letters = { 11: "CDBJEAGH", 12: "AIDBEJGC", "12-2": "CIBDEJGA", 13: "GCFJBHIA",
  "13-2": "GBACFDHI", "14-2": "HBEDAFCJ", 15: "GEBHAJFD", 16: "HIABFCJE", 18: "GIBHFCEJ" };
for (const section of hv1) {
  assert.equal(section.mode, "corpus-card");
  assert.equal(section.orderKnown, section.teil !== 17);
  assert.deepEqual(section.questions.map(q => q.number), section.orderKnown ? [1, 2, 3, 4, 5, 6, 7, 8] : Array.from("ABCDEFGHIJ"));
  for (const [i, q] of section.questions.entries()) {
    assert.equal(q.source, manifest.id, "HV1 must only contain this PDF's statements");
    assert.ok(q.sourcePages.every(p => p >= 182 && p <= 227));
    assert.ok(q.leitsatz && q.sourceGerman && q.chinese);
    assert.equal(q.sourceAnswer, hv1Letters[section.teil]?.[i] || null, "Keep only source-printed letters, never synthetic A-H");
    assert.ok(!q.options && !q.text.includes("\n"), "No invented distractors");
    if (q.sourceTranscript) assert.ok(q.sourceTranscriptPages?.every(p => p >= 182 && p <= 227));
  }
}
assert.deepEqual(lv3.flatMap((s) => s.questions.filter((q) => !q.answer).map((q) => [s.teil, q.number])), [[8, 24], [18, 24]]);
assert.ok(lv3.every((s) => s.questions.every((q) => !/[\u3400-\u9fff]/.test(q.german))), "LV3 fronts must contain German only");
assert.equal(lv3.find((s) => s.teil === 9).questions.find((q) => q.number === 15).answer, "R");
const nigeria = lv3.find((s) => s.teil === 19).questions.find((q) => q.number === 24);
assert.equal(nigeria.answer, "C");
assert.equal(nigeria.options.length, 3);
const restaurant = datasets.baustein.find((s) => s.teil === 13).questions.find((q) => q.number === 45);
assert.equal(restaurant.answerText, "als");
assert.ok(!datasets.baustein.some(s => s.teil === 19));
assert.equal(datasets.baustein.find(s => s.teil === 18).questions.length, 22);
assert.equal(datasets.baustein.find(s => s.teil === 16).questions.length, 22);
assert.equal(datasets.baustein.find(s => s.teil === 20).questions[0].number, 25);
assert.equal(datasets.baustein.find((s) => s.teil === 21).title, "„Bio“ giftiger als „Chemie“");
const uncertain = datasets.lv2.find((s) => s.teil === 23).questions.flatMap((q) => q.items).filter((i) => i.unverified);
assert.equal(uncertain.length, 1, "Keep the source's B? item visibly uncertain");
assert.ok(datasets.writing.every((s) => s.questions.length === 2 && s.questions.every((q) => q.positions)));
assert.deepEqual(datasets.lv2.map(s => s.teil), Array.from({ length: 26 }, (_, i) => i + 1));
assert.ok(datasets.lv2.every(s => s.questions.map(q => q.paragraph).join("") === "ABCDE"));
assert.equal(datasets.hv2.find(s => s.teil === "4").questions.length, 11, "Keep both source variants of #56");
assert.ok(datasets.hv2.every(s => s.mode === "corpus-card" && s.questions.every(q => !q.options && !q.answer)));
assert.ok(datasets.speaking.every(s => s.questions.every(q => q.chinese === "原文未提供中文释义")));
console.log("Corpus validation passed: 8 PDF-only modules, 1800 records, source pages, synchronized JSON, and no legacy question banks.");
