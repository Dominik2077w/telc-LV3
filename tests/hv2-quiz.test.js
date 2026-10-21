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

test("unrelated distractor fragments are independent of every correct completion", () => {
  const source = sourceSections();
  const sections = Hv2Quiz.buildSections(source);
  const allSourceAnswers = new Set(source.flatMap(section => section.questions.map(Hv2Quiz.getCompletion)));
  for (const section of sections) {
    for (const question of section.questions) {
      assert.equal(question.distractorSource, "independent-unrelated-completion");
      assert.equal(question.distractors.length, 2);
      assert.equal(question.distractors.some(text => allSourceAnswers.has(text)), false);
      assert.ok(question.distractors.every(text => /^[a-zäöü]/u.test(text)));
      assert.ok(question.distractors.every(text =>
        !text.toLocaleLowerCase("de").includes(question.correctText.toLocaleLowerCase("de"))
      ));
      assert.equal(new Set([question.correctText, ...question.distractors]).size, 3);
    }
  }
});

test("distractors omit their sentence heads instead of displaying complete unrelated sentences", () => {
  const sections = Hv2Quiz.buildSections(sourceSections());
  const question = sections[0].questions.find(item => item.number === "59b");
  assert.deepEqual(question.distractors, [
    "wurde im vergangenen Jahr restauriert",
    "hat Rezepte aus zwölf Regionen gesammelt",
  ]);
  assert.equal(question.distractors.some(text => /nicht|niemals|keinesfalls/u.test(text)), false);
  assert.equal(question.distractors.some(text => text.includes(question.correctText)), false);
});

test("displayed choices shuffle, retain one correct completion, and score by its displayed letter", () => {
  const question = Hv2Quiz.buildSections(sourceSections())[0].questions[0];
  const originalDistractors = [...question.distractors];
  Hv2Quiz.prepareQuestion(question, () => 0.999999);

  assert.equal(question.options.length, 3);
  assert.equal(new Set(question.options.map(option => option.label.slice(3))).size, 3);
  assert.equal(question.options.filter(option => option.source === question.source).length, 1);
  assert.equal(question.options.find(option => option.value === question.answer).label.slice(3), "Touristen durch ein Museum fuhrt");
  assert.ok(question.options.every(option => !/[.!?…]$/u.test(option.label)));
  assert.deepEqual(question.distractors, originalDistractors);
});

test("practice choices show only the PDF completion while memory rows retain the full sentence", () => {
  const sections = Hv2Quiz.buildSections(sourceSections());
  for (const section of sections) {
    const rows = Hv2Quiz.buildReviewRows(section);
    for (const [index, question] of section.questions.entries()) {
      Hv2Quiz.prepareQuestion(question, () => 0.5);
      const displayedAnswer = question.options.find(option => option.value === question.answer).label.slice(3);
      assert.equal(displayedAnswer, Hv2Quiz.getCompletion(question).replace(/[.!?…\s]+$/u, ""));
      assert.ok(question.options.every(option => !/[.!?…]$/u.test(option.label)));
      assert.equal(rows[index].sentence, Hv2Quiz.completeSentence(question));
      if (question.german && rows[index].sentence !== displayedAnswer) {
        assert.notEqual(displayedAnswer, Hv2Quiz.completeSentence(question));
      }
    }
  }
});

test("review list joins each source stem to its PDF completion and cleans the Chinese translation", () => {
  const section = Hv2Quiz.buildSections(sourceSections())[0];
  const rows = Hv2Quiz.buildReviewRows(section);
  const firstQuestion = section.questions[0];

  assert.equal(rows.length, section.questions.length);
  assert.equal(rows[0].sentence, "Tourbot ist ein Roboter, der Touristen durch ein Museum fuhrt.");
  assert.equal(rows[0].chinese, "Tourbot 是一种能带领游客参观博物馆的机器人。");
  assert.equal(rows[0].number, firstQuestion.number);
  assert.match(rows.find(row => row.number === "59a").sentence, /Roboter als Wachhunde/);
  assert.match(rows.find(row => row.number === "61").sentence, /Roboterkinder beliebter/);
  assert.ok(rows.every(row => row.sentence && row.chinese));
});

test("each HV2 Teil starts with its ordered full-sentence memory list before practice", () => {
  const sections = Hv2Quiz.buildSections(sourceSections().slice(0, 2));
  const queue = Hv2Quiz.buildRoundQueue(sections);
  let position = 0;

  for (const section of sections) {
    const memory = queue[position++];
    assert.equal(memory.sectionMode, "hv2-memory");
    assert.equal(String(memory.teil), String(section.teil));
    assert.equal(memory.reviewRows.length, section.questions.length);
    assert.ok(memory.reviewRows.every(row => row.sentence && row.chinese));
    const practice = queue.slice(position, position + section.questions.length);
    assert.ok(practice.every(question => question.sectionMode === "hv2-choice"));
    assert.equal(practice.length, section.questions.length);
    position += practice.length;
  }
  assert.equal(position, queue.length);
});

test("HV2 mistake rounds keep the article memory list and only queue missed questions", () => {
  const sections = Hv2Quiz.buildSections(sourceSections().slice(0, 2)).map(section => ({
    ...section,
    questions: section.questions.map(question => ({ ...question, teil: section.teil })),
  }));
  const missed = [sections[0].questions[1], sections[1].questions[2]];
  const retry = Hv2Quiz.buildRoundQueue(sections, missed);
  const plainRetry = Array.from(retry);

  assert.deepEqual(plainRetry.filter(question => question.sectionMode === "hv2-memory").map(question => String(question.teil)), [
    String(sections[0].teil), String(sections[1].teil),
  ]);
  assert.deepEqual(plainRetry.filter(question => question.sectionMode === "hv2-choice").map(question => question.number),
    missed.map(question => question.number));
  assert.ok(plainRetry.filter(question => question.sectionMode === "hv2-memory")
    .every((memory, index) => memory.reviewRows.length === sections[index].questions.length));
});

test("unrelated fragments work even when a Teil has fewer than three source answers", () => {
  const sections = [{
    teil: "x",
    mode: "corpus-card",
    questions: [
      { number: 1, sourceNumber: 1, completion: "One" },
      { number: 2, sourceNumber: 2, completion: "Two" },
    ],
  }];
  const result = Hv2Quiz.buildSections(sections)[0];
  assert.equal(result.mode, "hv2-choice");
  assert.ok(result.questions.every(question => question.distractors.length === 2));
  assert.ok(result.questions.every(question => question.distractors.every(text =>
    !result.questions.some(item => Hv2Quiz.getCompletion(item) === text)
  )));
});

test("browser build loads the HV2 quiz engine while LV2 keeps its card entry", () => {
  const index = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  assert.match(index, /hv2-quiz\.js/);
  assert.doesNotMatch(index, /lv2-quiz\.js|lv2_distractors/);
  assert.match(app, /state\.level === "hv2" \? Hv2Quiz\.buildSections/);
  assert.match(app, /Hv2Quiz\.buildRoundQueue/);
  assert.match(app, /sectionMode === "hv2-memory"/);
  assert.doesNotMatch(app, /Lv2Quiz|lv2-choice/);
});
