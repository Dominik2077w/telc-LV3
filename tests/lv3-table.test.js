const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const Quiz = require("../lv3-table.js");
const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const context = { window: {} };
vm.runInNewContext(read("data/lv3_questions.js"), context);
const corpus = JSON.parse(JSON.stringify(context.window.LV3_QUESTIONS));

test("every nonempty LV3 article becomes one ordered table, retaining all 280 rows and duplicate-number variants without changing source", () => {
  const before = JSON.stringify(corpus);
  let rows = 0, scored = 0;
  for (const section of corpus.filter(section => section.questions.length)) {
    const session = Quiz.createSession(Quiz.buildBatch(section));
    assert.equal(session.phase, "memory");
    assert.equal(Quiz.answeredCount(session), 0);
    assert.equal(session.rows.length, section.questions.length);
    assert.equal(new Set(session.rows.map(q => q.id)).size, session.rows.length);
    assert.deepEqual(session.rows.map(q => q.number), section.questions.map(q => q.number).sort((a, b) => a - b));
    for (const q of session.rows) {
      assert.ok(section.questions.some(source => source.german === q.german && source.answer === q.answer));
      assert.equal(q.kind, ["R", "F", "X"].includes(q.answer) ? "judgement" : "title");
    }
    rows += session.rows.length;
    scored += Quiz.scoredCount(session.questions);
  }
  assert.equal(rows, 280);
  assert.equal(scored, 278);
  const first = Quiz.createSession(Quiz.buildBatch(corpus[0]));
  assert.deepEqual(first.rows.filter(q => q.number === 17).map(q => q.displayNumber), ["17 · 版本 1", "17 · 版本 2"]);
  assert.deepEqual(first.rows.filter(q => q.number === 24).map(q => q.kind), ["judgement", "judgement", "title"]);
  assert.equal(JSON.stringify(corpus), before);
});

test("one submission requires every graded answer, permits changes before submission, and never grades an incomplete table", () => {
  for (const section of corpus.filter(section => section.questions.length)) {
    const session = Quiz.createSession(Quiz.buildBatch(section));
    assert.equal(Quiz.choose(session, session.rows[0].id, "F"), false);
    assert.equal(Quiz.submit(session), null);
    assert.equal(Quiz.begin(session), true);
    for (const q of session.rows.filter(q => q.gradable)) {
      assert.equal(Quiz.submit(session), null);
      assert.equal(Quiz.choose(session, q.id, q.answer), true);
      assert.equal(Quiz.choose(session, q.id, q.answer), false);
    }
    assert.equal(Quiz.isComplete(session), true);
    const result = Quiz.submit(session);
    assert.equal(result.correct, result.total);
    assert.equal(result.total, Quiz.scoredCount(session.questions));
    assert.equal(Quiz.submit(session), null);
    assert.equal(Quiz.choose(session, session.rows[0].id, "F"), false);
    assert.equal(Quiz.reviewBatch(session), null);
  }
  const session = Quiz.createSession(Quiz.buildBatch(corpus[0]));
  Quiz.begin(session);
  const row = session.rows[0];
  Quiz.choose(session, row.id, "R");
  Quiz.choose(session, row.id, "F");
  assert.equal(session.answers[row.id], "F");
  assert.equal(Quiz.answeredCount(session), 1);
  assert.equal(session.phase, "practice");
  assert.equal(session.result, null);
  assert.equal(Quiz.choose(session, row.id, "A"), false);
  assert.equal(Quiz.choose(session, "missing", "R"), false);
});

test("source-unmarked items are distinct from X and title questions retain A/B/C, including the source's complete choices", () => {
  const missing = [];
  for (const section of corpus.filter(s => s.questions.length)) {
    const session = Quiz.createSession(Quiz.buildBatch(section));
    Quiz.begin(session);
    for (const q of session.rows) {
      if (!q.gradable) {
        missing.push([section.teil, q.number]);
        assert.equal(Quiz.choose(session, q.id, "X"), false);
        assert.equal(Quiz.choose(session, q.id, "A"), false);
      } else Quiz.choose(session, q.id, q.answer);
    }
    const result = Quiz.submit(session);
    assert.equal(result.ungraded, session.rows.filter(q => !q.gradable).length);
    assert.ok(result.rows.filter(q => !q.question.gradable).every(q => q.correct === null && q.selected === null));
  }
  assert.deepEqual(missing, [[8, 24], [18, 24]]);
  const section = corpus.find(s => s.teil === 19);
  const title = Quiz.createSession(Quiz.buildBatch(section)).rows.find(q => q.number === 24);
  assert.deepEqual(title.choices.map(q => q.value), ["A", "B", "C"]);
  assert.ok(title.choices[2].label.includes("Kooperation auf Augenhöhe"));
});

test("wrong results retain chosen and correct values and retry the entire article after an unscored preview", () => {
  const batch = Quiz.buildBatch(corpus[0]);
  const session = Quiz.createSession(batch);
  Quiz.begin(session);
  session.rows.forEach((q, i) => Quiz.choose(session, q.id, i ? q.answer : "X"));
  const result = Quiz.submit(session);
  assert.equal(result.correct, result.total - 1);
  assert.equal(result.rows[0].selected, "X");
  assert.equal(result.rows[0].question.answer, "F");
  const retry = Quiz.reviewBatch(session);
  assert.equal(retry.questions.length, batch.questions.length);
  assert.equal(retry.missedCount, 1);
  assert.equal(Quiz.createSession(retry).phase, "memory");
  assert.equal(Quiz.reviewBatch(session), null);
});

test("app counts only graded questions at whole-table submission, queues one full-article retry, and does not score previews or changes", () => {
  const nodes = new Map();
  const document = { querySelector(selector) {
    if (!nodes.has(selector)) nodes.set(selector, { textContent: "", classList: { contains: () => true }, focus() {} });
    return nodes.get(selector);
  }, querySelectorAll: () => [] };
  const context = vm.createContext({ document, window: { matchMedia: () => ({ matches: false }), scrollTo() {} }, Lv3TableQuiz: Quiz });
  vm.runInContext(read("app.js").replace(/^bindEvents\(\);[\s\S]*?^syncMobileLayout\(\);/m, ""), context);
  context.batch = Quiz.buildBatch(corpus.find(s => s.teil === 8));
  vm.runInContext(`
    renderLv3TableQuiz = () => {};
    lv3TableSession = Lv3TableQuiz.createSession(batch);
    state.queue = [batch];
    submitLv3TableStep();
    submitLv3TableStep();
  `, context);
  assert.equal(vm.runInContext("state.answeredInRound", context), 0);
  vm.runInContext(`
    lv3TableSession.rows.filter(q => q.gradable).forEach((q, i) => chooseLv3Answer(q.id, i ? q.answer : q.answer === 'R' ? 'F' : 'R'));
  `, context);
  assert.equal(vm.runInContext("state.answeredInRound", context), 0);
  vm.runInContext("submitLv3TableStep()", context);
  const count = Quiz.scoredCount(context.batch.questions);
  assert.equal(vm.runInContext("state.answeredInRound", context), count);
  assert.equal(vm.runInContext("state.roundMistakes", context), 1);
  assert.equal(vm.runInContext("state.mistakes.length", context), 1);
  assert.equal(vm.runInContext("countMistakeQuestions(state.mistakes)", context), 1);
  assert.equal(nodes.get("#progressText").textContent, `${count}/${count}`);
});

test("table engine ships through the browser, build, cache and CI validation", () => {
  assert.ok(read("index.html").indexOf('src="./lv3-table.js') < read("index.html").indexOf('src="./app.js'));
  assert.ok(read("scripts/build.js").includes('"lv3-table.js"'));
  assert.ok(read("service-worker.js").includes('"./lv3-table.js"'));
  assert.ok(read(".github/workflows/pages.yml").includes("check:lv3"));
});
