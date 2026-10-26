const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const Quiz = require("../hv1-quiz.js");
const Order = require("../hv1-order.js");
const source = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/hv1_questions.json"), "utf8"));
const batch = () => ({ teil: 1, sectionMode: "hv1-audio-quiz", questions: Array.from({ length: 8 }, (_, index) => ({
  id: "question-" + (index + 1), number: index + 1, leitsatz: "Statement " + (index + 1),
  audio: "speaker-" + (index + 1) + ".mp3", sourceTranscript: "Transcript " + (index + 1),
})) });

test("all 20 supported Teils start in unscored memory and then sort all eight audio cards", () => {
  const sections = source.filter(section => Order.canPractice(section.questions));
  assert.equal(sections.length, 20);
  for (const section of sections) {
    const before = JSON.stringify(section);
    const session = Quiz.createSession(section);
    assert.equal(session.phase, "memory");
    assert.equal(session.result, null);
    assert.equal(session.scored, false);
    assert.equal(Quiz.submit(session), null);
    assert.equal(Quiz.begin(session, () => 0.999), true);
    assert.equal(session.order.length, 8);
    assert.notDeepEqual(session.order.map(question => question.number), [1, 2, 3, 4, 5, 6, 7, 8]);
    assert.equal(new Set(session.order.map(question => question.cardId)).size, 8);
    assert.equal(new Set(session.order.map(question => question.audioLabel)).size, 8);
    for (const question of session.order) assert.ok(question.audio);
    assert.equal(JSON.stringify(section), before);
    assert.equal(Quiz.begin(session), false);
  }
});

test("moving cards keeps their clip, text and neutral audio label attached, without scoring", () => {
  const session = Quiz.createSession(batch());
  Quiz.begin(session, () => 0.999);
  const first = { ...session.order[0] };
  assert.equal(Quiz.move(session, 0, 7), true);
  assert.deepEqual(session.order[7], first);
  assert.equal(session.result, null);
  assert.equal(session.scored, false);
  assert.equal(Quiz.move(session, 7, 0), true);
  assert.deepEqual(session.order[0], first);
  for (const [from, to] of [[-1, 0], [0, 8], [1, 1], [0, 1.5]]) assert.equal(Quiz.move(session, from, to), false);
});

test("one submission reports each item's true position and the correct item for each wrong slot", () => {
  const session = Quiz.createSession(batch());
  Quiz.begin(session);
  session.order.sort((a, b) => a.number - b.number);
  Quiz.move(session, 0, 1);
  const result = Quiz.submit(session);
  assert.equal(result.correct, 6);
  assert.equal(result.total, 8);
  assert.equal(result.rows[0].number, 2);
  assert.equal(result.rows[0].position, 1);
  assert.equal(result.rows[0].expectedPosition, 2);
  assert.equal(result.rows[0].expectedQuestion.number, 1);
  assert.equal(result.rows[0].expectedQuestion.audio, "speaker-1.mp3");
  assert.equal(result.rows[1].correct, false);
  assert.ok(result.rows.slice(2).every(row => row.correct));
  assert.equal(session.phase, "result");
  assert.equal(Quiz.submit(session), null);
  assert.equal(Quiz.move(session, 0, 1), false);
});

test("mistake rounds repeat all eight positions and preserve the previous error count", () => {
  const session = Quiz.createSession({ ...batch(), reviewQuestions: [batch().questions[1]] });
  Quiz.begin(session);
  assert.equal(session.order.length, 8);
  session.order.sort((a, b) => a.number - b.number);
  Quiz.move(session, 0, 1);
  Quiz.submit(session);
  const review = Quiz.reviewBatch(session);
  assert.equal(review.questions.length, 8);
  assert.equal(review.missedCount, 2);
  assert.equal(review.reviewQuestions, undefined);
  assert.equal(Quiz.reviewBatch(session), null);
  const next = Quiz.createSession(review);
  assert.equal(next.phase, "memory");
  assert.equal(next.questions.length, 8);
});

test("perfect ordering has no retry; duplicate and incomplete speaker orders are rejected", () => {
  const session = Quiz.createSession(batch());
  Quiz.begin(session);
  session.order.sort((a, b) => a.number - b.number);
  assert.equal(Quiz.submit(session).correct, 8);
  assert.equal(Quiz.reviewBatch(session), null);
  const invalid = batch();
  invalid.questions[0].number = 2;
  assert.throws(() => Quiz.createSession(invalid), /eight PDF statements/);
  assert.throws(() => Quiz.createSession({ questions: [] }), /eight PDF statements/);
});

test("app scores eight positions together and retains the whole Teil for retries", () => {
  const nodes = new Map();
  const document = {
    querySelector(selector) {
      if (!nodes.has(selector)) nodes.set(selector, { textContent: "", classList: { contains: () => true }, focus() {} });
      return nodes.get(selector);
    },
    querySelectorAll: () => [],
  };
  const context = vm.createContext({ document, window: { matchMedia: () => ({ matches: false }), scrollTo() {} }, Hv1AudioQuiz: Quiz });
  const app = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
  vm.runInContext(app.replace(/^bindEvents\(\);[\s\S]*?^syncMobileLayout\(\);/m, ""), context);
  context.testBatch = batch();
  vm.runInContext(`
    finishHv1AudioDrag = () => {};
    clearHv1SharedPlayer = () => {};
    renderHv1AudioQuizView = () => {};
    hv1AudioState.session = Hv1AudioQuiz.createSession(testBatch);
    state.queue = [{ ...testBatch, sectionMode: 'hv1-audio-quiz' }];
    state.roundMode = 'mistakes';
    submitHv1AudioStep();
  `, context);
  assert.equal(vm.runInContext("state.answeredInRound", context), 0);
  vm.runInContext("hv1AudioState.session.order.sort((a,b) => a.number-b.number); Hv1AudioQuiz.move(hv1AudioState.session,0,1); submitHv1AudioStep()", context);
  assert.equal(vm.runInContext("state.answeredInRound", context), 8);
  assert.equal(vm.runInContext("state.roundMistakes", context), 2);
  assert.equal(vm.runInContext("state.mistakes.length", context), 1);
  assert.equal(nodes.get("#progressText").textContent, "8/8");
  assert.equal(vm.runInContext("countMistakeQuestions(state.mistakes)", context), 2);
});
