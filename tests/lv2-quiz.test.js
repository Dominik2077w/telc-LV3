const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const quiz = require("../lv2-quiz.js");
const distractors = require("../data/lv2_distractors.js");

function corpus() {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../data/lv2_questions.js"), "utf8"), context);
  return JSON.parse(JSON.stringify(context.window.LV2_QUESTIONS)).map(section => ({
    ...section,
    questions: section.questions.map(question => ({ ...question, id: `${section.teil}-${question.paragraph}` })),
  }));
}

test("all verified PDF items have three distinct choices and source content stays unchanged", () => {
  const source = corpus();
  const before = JSON.stringify(source);
  const sections = quiz.buildSections(source, distractors);
  const questions = sections.flatMap(section => section.questions);
  assert.equal(sections.length, 26);
  assert.equal(questions.length, 154);
  assert.equal(new Set(questions.map(q => q.id)).size, 154);
  assert.equal(new Set(questions.map(q => q.id.split("-item-")[0])).size, 117);
  assert.equal(questions.filter(q => q.addedIn === "2026.9").length, 29);
  for (const q of questions) {
    assert.equal(q.correctText, q.sourceItem.german || q.sourceItem.text);
    assert.ok(!q.sourceItem.unverified && q.sourceItem.sourcePages.length);
    quiz.prepareQuestion(q);
    assert.equal(q.options.length, 3);
    assert.equal(new Set(q.options.map(o => o.label.slice(3))).size, 3);
    assert.equal(q.options.filter(o => o.source === "tencent-2026-09").length, 1);
    assert.equal(q.options.filter(o => o.source === distractors.source).length, 2);
    assert.equal(q.options.find(o => o.value === q.answer).label.slice(3), q.correctText);
    for (const wrong of q.distractors) assert.ok(!q.items.some(i => (i.german || i.text) === wrong));
  }
  assert.equal(JSON.stringify(source), before);
});

test("conflicting and missing mappings are excluded; partial transcriptions keep their warning", () => {
  const sections = quiz.buildSections(corpus(), distractors);
  for (const [teil, paragraph] of [[1, "D"], [4, "C"], [7, "C"]]) {
    assert.ok(!sections.find(s => s.teil === teil).questions.some(q => q.paragraph === paragraph));
  }
  assert.ok(!sections.find(s => s.teil === 23).questions.some(q => q.sourceItem.number === "10"));
  assert.ok(sections.find(s => s.teil === 14).questions.some(q => q.paragraph === "E" && q.sourceNote));
});

test("the correct answer follows all six shuffles, including subsequent mistake presentations", () => {
  const q = quiz.buildSections(corpus(), distractors)[0].questions[0];
  const permutations = new Set();
  const positions = new Set();
  for (const first of [0, 0.4, 0.9]) for (const second of [0, 0.9]) {
    const values = [first, second];
    quiz.prepareQuestion(q, () => values.shift());
    permutations.add(q.options.map(o => o.label).join("|"));
    positions.add(q.answer);
    assert.equal(q.options.find(o => o.value === q.answer).label, `${q.answer}. ${q.correctText}`);
    assert.deepEqual(q.options.map(o => o.value), ["A", "B", "C"]);
  }
  assert.equal(permutations.size, 6);
  assert.equal(positions.size, 3);
});

test("missing or duplicate distractors fail instead of silently fabricating source answers", () => {
  const sections = corpus();
  assert.throws(() => quiz.buildSections(sections, { paragraphs: {} }), /expected a source answer/);
  const invalid = JSON.parse(JSON.stringify(distractors));
  invalid.paragraphs[1].A = [sections[0].questions[0].items[0].german, "Other"];
  assert.throws(() => quiz.buildSections(sections, invalid), /two distinct distractors/);
});

test("the browser entry points expose the quiz and authored data", () => {
  const context = { window: {} };
  for (const file of ["data/lv2_distractors.js", "lv2-quiz.js"]) {
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), context);
  }
  assert.equal(context.window.LV2_DISTRACTORS.source, distractors.source);
  assert.equal(context.window.Lv2Quiz.buildSections(corpus(), context.window.LV2_DISTRACTORS).flatMap(s => s.questions).length, 154);
});
