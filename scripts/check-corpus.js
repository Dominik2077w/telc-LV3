const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "data/corpus-2026-09.json"), "utf8"));
const datasets = {};
const expectedNew = { lv2: 25, lv3: 49, hv1: 66, hv2: 20, baustein: 66, speaking: 90, writing: 5 };

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
    for (const q of section.questions) {
      assert.ok(q.german || q.text || q.options?.length, `${name}/${section.teil}/${q.number}: empty prompt`);
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
        assert.ok(!q.audio && !q.options);
      }
    }
  }
  if (["lv3", "hv1"].includes(name)) {
    const json = JSON.parse(fs.readFileSync(path.join(root, `data/${name}_questions.json`), "utf8"));
    assert.deepEqual(sections, json, `${name}: browser and JSON copies must agree`);
  }
}

const lv3 = datasets.lv3;
assert.deepEqual(lv3.flatMap((s) => s.questions.filter((q) => !q.answer).map((q) => [s.teil, q.number])), [[8, 24], [18, 24]]);
assert.ok(lv3.every((s) => s.questions.every((q) => !/[\u3400-\u9fff]/.test(q.german))), "LV3 fronts must contain German only");
assert.equal(lv3.find((s) => s.teil === 9).questions.find((q) => q.number === 15).answer, "R");
const nigeria = lv3.find((s) => s.teil === 19).questions.find((q) => q.number === 24);
assert.equal(nigeria.answer, "C");
assert.equal(nigeria.options.length, 3);
const restaurant = datasets.baustein.find((s) => s.teil === 13).questions.find((q) => q.number === 21);
assert.equal(restaurant.answerText, "als");
assert.equal(restaurant.options.find((o) => o.value === restaurant.answer).rawLabel, "als");
assert.equal(datasets.baustein.find((s) => s.teil === 21).title, "„Bio“ giftiger als „Chemie“");
const uncertain = datasets.lv2.find((s) => s.teil === 23).questions.flatMap((q) => q.items).filter((i) => i.unverified);
assert.equal(uncertain.length, 1, "Keep the source's B? item visibly uncertain");
assert.ok(datasets.writing.every((s) => s.questions.length === 2 && s.questions.every((q) => q.positions)));
console.log("Corpus validation passed: 7 modules, synchronized JSON, source pages, new markers, and reviewed answers.");
