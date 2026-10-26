const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const Quiz = require("../baustein-quiz.js");
const Study = require("../baustein-study.js");

function corpus() {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "data", "baustein_questions.js"), "utf8"), context);
  return JSON.parse(JSON.stringify(context.window.BAUSTEIN_QUESTIONS));
}

test("all complete corpus gaps get four unique choices and no accepted alternative is a distractor", () => {
  const sections = corpus();
  const original = JSON.stringify(sections);
  const questions = Study.buildRoundQueue(sections).filter(item => item.sectionMode === "baustein-choice");
  assert.equal(questions.length, 433);
  for (const question of questions) {
    const accepted = question.acceptedTexts.map(text => text.toLocaleLowerCase("de"));
    assert.ok(accepted.includes(question.correctText.toLocaleLowerCase("de")));
    assert.equal(question.distractorSource, "authored-grammar-practice");
    for (const distractor of question.distractors) assert.ok(!accepted.includes(distractor.toLocaleLowerCase("de")));
    for (const random of [() => 0, () => 0.999]) {
      Quiz.prepareQuestion(question, random);
      assert.equal(question.options.length, 4);
      assert.equal(new Set(question.options.map(option => option.text)).size, 4);
      assert.deepEqual(question.options.map(option => option.value), ["A", "B", "C", "D"]);
      assert.equal(question.options.filter(option => option.text === question.correctText).length, 1);
      assert.equal(question.options.find(option => option.value === question.answer).text, question.correctText);
    }
  }
  assert.equal(JSON.stringify(sections), original);
});

test("confusions follow the gap: prepositions, adjective endings, noun case and fixed verb collocations", () => {
  const questions = Study.buildRoundQueue(corpus()).filter(item => item.sectionMode === "baustein-choice");
  const find = (teil, number) => questions.find(question => question.teil === teil && question.number === number);
  assert.deepEqual(find(1, 7).distractors, ["vom", "beim", "im"]);
  assert.match(find(1, 7).quizFocus, /介词/);
  assert.deepEqual(find(7, 2).distractors, ["warme", "warmer", "warmem"]);
  assert.match(find(7, 2).quizFocus, /形容词词尾/);
  assert.deepEqual(find(8, 26).distractors, ["Studiengänge", "Studiengang", "Studiengangs"]);
  assert.deepEqual(find(1, 1).distractors, ["getan", "gestellt", "gelegt"]);
  assert.deepEqual(find(14, 42).distractors, ["zur Wehr stellen", "zur Wehr legen", "zur Wehr nehmen"]);
});

test("source variants remain available for feedback but cannot become competing correct options", () => {
  const questions = Study.buildRoundQueue(corpus()).filter(item => item.sectionMode === "baustein-choice");
  const support = questions.find(item => item.teil === 1 && item.number === 4);
  assert.deepEqual(support.acceptedTexts, ["erfahren", "erhalten"]);
  assert.equal(support.correctText, "erfahren");
  assert.ok(!support.distractors.includes("erhalten"));
  const smoke = questions.find(item => item.teil === 2 && item.number === 14);
  assert.equal(smoke.correctText, "geraucht hätten");
  assert.equal(smoke.sourceAnswerText, "gebraucht hätten / geraucht hätten");
  assert.ok(smoke.reviewGerman.includes("geraucht hätten"));
  assert.ok(!smoke.reviewGerman.includes("gebraucht hätten /"));
});

test("new attempts reshuffle independently and reset submitted state without altering their source", () => {
  const question = Study.buildRoundQueue(corpus())[1];
  Quiz.prepareQuestion(question, () => 0);
  const first = question.options.map(option => option.text);
  question.quizAnswered = true;
  Quiz.prepareQuestion(question, () => 0.999);
  assert.notDeepEqual(question.options.map(option => option.text), first);
  assert.equal(question.quizAnswered, false);
  assert.equal(question.bausteinStudy.answer, "gezogen");
});

test("browser and static build load the quiz engine before the study engine and cache it for offline use", () => {
  const read = name => fs.readFileSync(path.join(__dirname, "..", name), "utf8");
  const html = read("index.html");
  assert.ok(html.indexOf('src="./baustein-quiz.js') < html.indexOf('src="./baustein-study.js'));
  assert.match(read("scripts/build.js"), /"baustein-quiz\.js"/);
  assert.match(read("service-worker.js"), /"\.\/baustein-quiz\.js"/);
  const context = { window: {} };
  vm.runInNewContext(read("baustein-quiz.js"), context);
  vm.runInNewContext(read("baustein-study.js"), context);
  vm.runInNewContext(read("data/baustein_questions.js"), context);
  assert.equal(context.window.BausteinStudy.buildRoundQueue(context.window.BAUSTEIN_QUESTIONS)
    .filter(item => item.sectionMode === "baustein-choice").length, 433);
});
