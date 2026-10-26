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

test("all 20 supported Teils start in unscored memory and then match all eight audio cards", () => {
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

test("connections are one-to-one and can be changed or removed without moving source cards", () => {
  const session = Quiz.createSession(batch());
  Quiz.begin(session, () => 0.999);
  const original = JSON.stringify(session.order);
  const [first, second] = session.order;
  assert.equal(Quiz.connect(session, first.cardId, 1), true);
  assert.equal(Quiz.connect(session, second.cardId, 2), true);
  assert.equal(Quiz.connect(session, first.cardId, 2), true);
  assert.deepEqual(session.matches, { [first.cardId]: 2 });
  assert.equal(Quiz.disconnect(session, first.cardId), true);
  assert.deepEqual(session.matches, {});
  assert.equal(Quiz.disconnect(session, first.cardId), false);
  assert.equal(session.result, null);
  assert.equal(session.scored, false);
  assert.equal(JSON.stringify(session.order), original);
  for (const position of [0, 9, 1.5, "2"]) assert.equal(Quiz.connect(session, first.cardId, position), false);
  assert.equal(Quiz.connect(session, "missing-card", 1), false);
  assert.equal(Quiz.submit(session), null);
  assert.equal(Quiz.isComplete(session), false);
});

function connectAll(session, swapped = false) {
  session.order.forEach(question => Quiz.connect(session, question.cardId,
    swapped && question.number === 1 ? 2 : swapped && question.number === 2 ? 1 : question.number));
}

test("one submission reports each item's true position and the correct item for each wrong slot", () => {
  const session = Quiz.createSession(batch());
  Quiz.begin(session);
  connectAll(session, true);
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
  assert.equal(Quiz.connect(session, session.order[0].cardId, 1), false);
});

test("mistake rounds repeat all eight positions and preserve the previous error count", () => {
  const session = Quiz.createSession({ ...batch(), reviewQuestions: [batch().questions[1]] });
  Quiz.begin(session);
  assert.equal(session.order.length, 8);
  connectAll(session, true);
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
  connectAll(session);
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
    clearHv1SharedPlayer = () => {};
    renderHv1AudioQuizView = () => {};
    hv1AudioState.session = Hv1AudioQuiz.createSession(testBatch);
    state.queue = [{ ...testBatch, sectionMode: 'hv1-audio-quiz' }];
    state.roundMode = 'mistakes';
    submitHv1AudioStep();
  `, context);
  assert.equal(vm.runInContext("state.answeredInRound", context), 0);
  vm.runInContext("submitHv1AudioStep()", context);
  assert.equal(vm.runInContext("hv1AudioState.session.phase", context), "practice");
  assert.equal(vm.runInContext("state.answeredInRound", context), 0);
  vm.runInContext("hv1AudioState.session.order.forEach(q => Hv1AudioQuiz.connect(hv1AudioState.session,q.cardId,q.number === 1 ? 2 : q.number === 2 ? 1 : q.number)); submitHv1AudioStep()", context);
  assert.equal(vm.runInContext("state.answeredInRound", context), 8);
  assert.equal(vm.runInContext("state.roundMistakes", context), 2);
  assert.equal(vm.runInContext("state.mistakes.length", context), 1);
  assert.equal(nodes.get("#progressText").textContent, "8/8");
  assert.equal(vm.runInContext("countMistakeQuestions(state.mistakes)", context), 2);
});

test("position mode shuffles all eight questions in every supported Teil and scores source positions immediately", () => {
  for (const section of source.filter(section => Order.canPractice(section.questions))) {
    const before = JSON.stringify(section);
    const session = Quiz.createSession({ ...section, practiceMode: "position" });
    assert.equal(Quiz.currentPositionQuestion(session), null);
    Quiz.begin(session, () => 0.999);
    const presented = [];
    for (let index = 0; index < 8; index += 1) {
      const question = Quiz.currentPositionQuestion(session);
      presented.push(question.number);
      assert.equal(Quiz.advancePosition(session), false);
      const answer = Quiz.choosePosition(session, Number(question.number));
      assert.equal(answer.correct, true);
      assert.equal(answer.expectedPosition, Number(question.number));
      assert.equal(Quiz.positionAnswered(session), true);
      assert.equal(Quiz.choosePosition(session, 1), null);
      assert.equal(Quiz.advancePosition(session), true);
    }
    assert.notDeepEqual(presented, [1, 2, 3, 4, 5, 6, 7, 8]);
    assert.deepEqual([...presented].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8]);
    assert.equal(session.phase, "result");
    assert.equal(session.result.correct, 8);
    assert.equal(Quiz.reviewBatch(session), null);
    assert.equal(JSON.stringify(section), before);
  }
});

test("position choices report wrong answers, allow the same position in later questions, and keep mode on retry", () => {
  const session = Quiz.createSession({ ...batch(), practiceMode: "position" });
  Quiz.begin(session, () => 0.999);
  for (const invalid of [0, 9, 1.5, "2", undefined]) assert.equal(Quiz.choosePosition(session, invalid), null);
  assert.equal(Quiz.connect(session, session.order[0].cardId, 1), false);
  assert.equal(Quiz.submit(session), null);
  const first = Quiz.choosePosition(session, 1);
  assert.equal(first.correct, false);
  assert.equal(first.position, 1);
  assert.equal(first.expectedPosition, 2);
  Quiz.advancePosition(session);
  assert.ok(Quiz.choosePosition(session, 1));
  Quiz.advancePosition(session);
  while (session.phase === "practice") {
    Quiz.choosePosition(session, Number(Quiz.currentPositionQuestion(session).number));
    Quiz.advancePosition(session);
  }
  const retry = Quiz.reviewBatch(session);
  assert.equal(retry.practiceMode, "position");
  assert.equal(retry.questions.length, 8);
  assert.equal(retry.missedCount, 2);
  assert.equal(Quiz.createSession(retry).mode, "position");
  assert.equal(Quiz.reviewBatch(session), null);
  const matching = Quiz.createSession(batch());
  Quiz.begin(matching);
  assert.equal(Quiz.choosePosition(matching, 1), null);
});

test("position app flow counts each answer once, advances only after an answer, and queues its mode for retry", () => {
  const nodes = new Map();
  const document = {
    querySelector(selector) {
      if (!nodes.has(selector)) nodes.set(selector, { textContent: "", classList: { contains: () => true }, focus() {} });
      return nodes.get(selector);
    }, querySelectorAll: () => [],
  };
  const context = vm.createContext({ document, window: { matchMedia: () => ({ matches: false }), scrollTo() {} }, Hv1AudioQuiz: Quiz });
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../app.js"), "utf8")
    .replace(/^bindEvents\(\);[\s\S]*?^syncMobileLayout\(\);/m, ""), context);
  context.testBatch = { ...batch(), practiceMode: "position" };
  vm.runInContext(`
    clearHv1SharedPlayer = () => {};
    renderHv1AudioQuizView = () => {};
    hv1AudioState.session = Hv1AudioQuiz.createSession(testBatch);
    state.queue = [testBatch];
    submitHv1AudioStep();
    submitHv1AudioStep();
  `, context);
  assert.equal(vm.runInContext("state.answeredInRound", context), 0);
  for (let index = 0; index < 8; index += 1) {
    vm.runInContext(`
      globalThis.correctPosition = Number(Hv1AudioQuiz.currentPositionQuestion(hv1AudioState.session).number);
      chooseHv1Position(${index === 0 ? "correctPosition % 8 + 1" : "correctPosition"});
      chooseHv1Position(correctPosition);
    `, context);
    assert.equal(vm.runInContext("state.answeredInRound", context), index + 1);
    vm.runInContext("submitHv1AudioStep()", context);
  }
  assert.equal(vm.runInContext("state.roundMistakes", context), 1);
  assert.equal(vm.runInContext("hv1AudioState.session.result.correct", context), 7);
  assert.equal(vm.runInContext("state.mistakes[0].practiceMode", context), "position");
  assert.equal(nodes.get("#progressText").textContent, "8/8");
});
