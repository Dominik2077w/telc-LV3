const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const Quiz = require("../lv1-quiz.js");
const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const corpusContext = { window: {} };
vm.runInNewContext(read("data/lv1_questions.js"), corpusContext);
const corpus = JSON.parse(JSON.stringify(corpusContext.window.LV1_QUESTIONS));

test("all 21 supplied LV1 articles preview six source insertions and shuffle them without changing their text", () => {
  assert.equal(corpus.length, 22);
  assert.equal(corpus[16].questions.length, 0);
  const before = JSON.stringify(corpus);
  for (const section of corpus.filter(s => s.questions.length)) {
    const session = Quiz.createSession(Quiz.buildBatch(section));
    assert.equal(session.phase, "memory");
    assert.equal(session.answers.length, 0);
    assert.deepEqual(session.correct.map(q => q.position), [1, 2, 3, 4, 5, 6]);
    assert.equal(Quiz.choose(session, 1), null);
    Quiz.begin(session, () => 0.999);
    assert.notDeepEqual(session.order.map(q => q.position), [1, 2, 3, 4, 5, 6]);
    assert.equal(new Set(session.order.map(q => q.position)).size, 6);
    while (session.phase === "practice") {
      assert.equal(Quiz.advance(session), false);
      const q = Quiz.current(session);
      assert.equal(Quiz.choose(session, q.position).correct, true);
      assert.equal(Quiz.choose(session, q.position), null);
      assert.equal(Quiz.advance(session), true);
    }
    assert.equal(session.result.correct, 6);
    assert.equal(Quiz.reviewBatch(session), null);
  }
  assert.equal(JSON.stringify(corpus), before);
});

test("variable counts and multiple source-unused options support none; invalid and duplicate answers do not score", () => {
  const session = Quiz.createSession({ positionCount: 5, questions: [
    ...Array.from({ length: 5 }, (_, i) => ({ position: i + 1, german: `Satz ${i + 1}` })),
    { position: null, german: "Nicht verwendet A" }, { position: null, german: "Nicht verwendet B" },
  ] });
  Quiz.begin(session, () => 0.999);
  for (const value of [-1, 6, 1.5, "1", null, undefined]) assert.equal(Quiz.choose(session, value), null);
  let unused = 0;
  while (session.phase === "practice") {
    const question = Quiz.current(session);
    if (question.position === null) unused += 1;
    assert.equal(Quiz.choose(session, question.position || 0).correct, true);
    Quiz.advance(session);
  }
  assert.equal(unused, 2);
  assert.equal(session.result.correct, 7);
  assert.equal(Quiz.positionLabel(null), "没有（不填入本文）");
});

test("wrong positions including none report the source answer and retry the whole article after another preview", () => {
  const batch = Quiz.buildBatch(corpus[0]);
  const session = Quiz.createSession(batch);
  Quiz.begin(session, () => 0.999);
  assert.deepEqual(Quiz.choose(session, 0), { question: session.order[0], position: null, expectedPosition: 2, correct: false });
  Quiz.advance(session);
  while (session.phase === "practice") {
    Quiz.choose(session, Quiz.current(session).position);
    Quiz.advance(session);
  }
  const retry = Quiz.reviewBatch(session);
  assert.equal(retry.missedCount, 1);
  assert.equal(retry.questions.length, 6);
  assert.equal(Quiz.createSession(retry).phase, "memory");
  assert.equal(Quiz.reviewBatch(session), null);
  assert.throws(() => Quiz.createSession({ ...batch, positionCount: 5 }), /complete/);
  assert.throws(() => Quiz.createSession({ positionCount: 1, questions: [{ german: "Missing position" }] }), /complete/);
});

test("app flow scores each random item once, requires an answer before advancing, and retains a retry", () => {
  const nodes = new Map();
  const document = { querySelector(selector) {
    if (!nodes.has(selector)) nodes.set(selector, { textContent: "", classList: { contains: () => true }, focus() {} });
    return nodes.get(selector);
  }, querySelectorAll: () => [] };
  const context = vm.createContext({ document, window: { matchMedia: () => ({ matches: false }), scrollTo() {} }, Lv1Quiz: Quiz });
  vm.runInContext(read("app.js").replace(/^bindEvents\(\);[\s\S]*?^syncMobileLayout\(\);/m, ""), context);
  context.batch = Quiz.buildBatch(corpus[0]);
  vm.runInContext(`
    renderLv1PositionQuiz = () => {};
    lv1PositionSession = Lv1Quiz.createSession(batch);
    state.queue = [batch];
    submitLv1PositionStep();
    submitLv1PositionStep();
  `, context);
  assert.equal(vm.runInContext("state.answeredInRound", context), 0);
  for (let i = 0; i < 6; i += 1) {
    vm.runInContext(`chooseLv1Position(${i ? "Lv1Quiz.current(lv1PositionSession).position" : "0"}); chooseLv1Position(1); submitLv1PositionStep()`, context);
    assert.equal(vm.runInContext("state.answeredInRound", context), i + 1);
  }
  assert.equal(nodes.get("#progressText").textContent, "6/6");
  assert.equal(vm.runInContext("state.roundMistakes", context), 1);
  assert.equal(vm.runInContext("state.mistakes.length", context), 1);
  assert.equal(vm.runInContext("countMistakeQuestions(state.mistakes)", context), 1);
});

test("LV1 is selectable and ships its data and engine through the static build and cache", () => {
  const html = read("index.html");
  assert.match(html, /data-level-choice="lv1"/);
  assert.match(html, /data-level-switch="lv1"/);
  for (const filename of ["lv1-quiz.js", "data/lv1_questions.js"]) {
    assert.ok(html.includes(`src="./${filename}`));
    assert.ok(read("scripts/build.js").includes(`"${filename}"`));
    assert.ok(read("service-worker.js").includes(`"./${filename}"`));
  }
});
