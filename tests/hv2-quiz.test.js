const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const Hv2Quiz = require("../hv2-quiz.js");

function sourceSections() {
  const context = { window: {} };
  const source = fs.readFileSync(path.join(__dirname, "..", "data", "hv2_questions.js"), "utf8");
  vm.runInNewContext(source, context);
  return context.window.HV2_QUESTIONS;
}

test("all supported HV2 sections become three-choice practice without changing source questions", () => {
  const source = sourceSections();
  const before = JSON.stringify(source);
  const sections = Hv2Quiz.buildSections(source);

  assert.equal(sections.length, 19);
  assert.equal(sections.every(section => section.mode === "hv2-choice"), true);
  assert.equal(sections.flatMap(section => section.questions).length, 199);
  assert.equal(sections.flatMap(section => section.questions).every(question => question.distractors.length === 2), true);
  assert.equal(JSON.stringify(source), before);
});

test("practice distractors come from other questions in the same Teil and avoid duplicate question numbers", () => {
  const source = sourceSections();
  const sections = Hv2Quiz.buildSections(source);
  const section = sections[0];
  const question = section.questions[0];
  const ownNumber = String(question.sourceNumber || question.number);
  const otherCompletions = new Set(section.questions
    .filter(item => String(item.sourceNumber || item.number) !== ownNumber)
    .map(Hv2Quiz.getCompletion));

  assert.equal(question.distractors.every(text => otherCompletions.has(text)), true);
  assert.equal(question.distractors.includes(question.correctText), false);
  assert.equal(new Set([question.correctText, ...question.distractors]).size, 3);
});

test("displayed choices shuffle, retain one correct completion, and score by its displayed letter", () => {
  const question = Hv2Quiz.buildSections(sourceSections())[0].questions[0];
  const originalDistractors = [...question.distractors];
  Hv2Quiz.prepareQuestion(question, () => 0.999999);

  assert.equal(question.options.length, 3);
  assert.equal(new Set(question.options.map(option => option.label.slice(3))).size, 3);
  assert.equal(question.options.filter(option => option.source === question.source).length, 1);
  assert.equal(question.options.find(option => option.value === question.answer).label.slice(3), question.correctText);
  assert.deepEqual(question.distractors, originalDistractors);
});

test("sections without three distinct PDF completions remain review cards", () => {
  const sections = [{
    teil: "x",
    mode: "corpus-card",
    questions: [
      { number: 1, sourceNumber: 1, completion: "One" },
      { number: 2, sourceNumber: 2, completion: "Two" },
    ],
  }];
  assert.equal(Hv2Quiz.buildSections(sections)[0].mode, "corpus-card");
});

test("browser build loads the HV2 quiz engine while LV2 keeps its card entry", () => {
  const index = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  assert.match(index, /hv2-quiz\.js/);
  assert.doesNotMatch(index, /lv2-quiz\.js|lv2_distractors/);
  assert.match(app, /state\.level === "hv2" \? Hv2Quiz\.buildSections/);
  assert.doesNotMatch(app, /Lv2Quiz|lv2-choice/);
});
