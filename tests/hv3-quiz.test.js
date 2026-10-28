const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const Quiz = require("../hv3-quiz.js");
const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const corpus = JSON.parse(read("data/hv3_questions.json"));
const find = (teil, number) => corpus.find(s => s.teil === teil).questions.find(q => q.number === number);

test("HV3 preserves all 28 PDF entries and 272 rows, with 227 practice items and 45 explicit references", () => {
  const browser = { window: {} };
  vm.runInNewContext(read("data/hv3_questions.js"), browser);
  assert.deepEqual(JSON.parse(JSON.stringify(browser.window.HV3_QUESTIONS)), corpus);
  assert.equal(corpus.length, 28);
  assert.equal(corpus.flatMap(s => s.questions).length, 272);
  assert.equal(corpus.flatMap(s => s.questions).filter(Quiz.supported).length, 227);
  assert.deepEqual(corpus.filter(s => s.referenceOnly).map(s => s.teil), ["17-2", "19-2", "23"]);
  assert.equal(corpus.find(s => s.teil === "14").questions.length, 0);
  assert.ok(corpus.every(s => typeof s.sourceOutline === "string" && s.questions.every(q => q.sourcePages.every(p => p >= 246 && p <= 281))));
  assert.equal(find("11-1", "71").practiceEligible, false);
  assert.equal(find("4", "72").practiceEligible, false);
  assert.equal(find("7", "66").practiceEligible, false);
  assert.ok(find("18-spielen", "73a") && find("18-spielen", "73b"));
  assert.ok(find("18-schlaf", "65"));
  assert.notEqual(find("13", "68a").heading, find("13", "68b").heading);
  assert.notEqual(find("22-1", "72").answerText, find("22-2", "72").answerText);
  for (const section of corpus) {
    assert.match(section.titleChinese, /[\u3400-\u9fff]/);
    for (const q of section.questions.filter(q => /[A-Za-zÄÖÜäöüß]/.test(q.heading))) {
      assert.match(q.headingChinese, /[\u3400-\u9fff]/, q.heading);
    }
  }
  assert.equal(find("1", "70").headingChinese, "必需的词典");
});

test("HV3 preview, revealed cards, writing review and results translate headings while practice keeps them hidden", () => {
  class Element {
    constructor() { this.children = []; this.textContent = ""; }
    append(...children) { this.children.push(...children); }
    replaceChildren() { this.children = []; this.textContent = ""; }
    get lastElementChild() { return this.children.at(-1); }
    addEventListener() {}
    get text() { return this.textContent + this.children.map(child => child.text).join(""); }
  }
  const context = { window: {}, document: { createElement: () => new Element() }, Hv3Quiz: Quiz };
  vm.runInNewContext(read("hv3-view.js"), context);
  const section = corpus.find(s => s.teil === "1");
  const host = new Element(), actions = {};
  for (const mode of ["cards", "writing"]) {
    const session = Quiz.createSession(Quiz.buildBatch(section, mode));
    context.window.Hv3View.render(session, host, actions);
    assert.ok(host.text.includes("必需的词典"));
    Quiz.begin(session);
    context.window.Hv3View.render(session, host, actions);
    assert.ok(!host.text.includes("谁对这一职业感兴趣？"));
    if (mode === "cards") Quiz.reveal(session);
    else Quiz.submitWriting(session);
    context.window.Hv3View.render(session, host, actions);
    assert.ok(host.text.includes("谁对这一职业感兴趣？"));
    session.phase = "result";
    session.result = { correct: 0, total: 1, rows: [{ question: session.questions[0], selected: "", correct: false }] };
    context.window.Hv3View.render(session, host, actions);
    assert.ok(host.text.includes("谁对这一职业感兴趣？"));
  }
});

test("every article starts with its full unscored outline in both modes and does not mutate source", () => {
  const original = JSON.stringify(corpus);
  for (const section of corpus) for (const mode of ["cards", "writing"]) {
    const session = Quiz.createSession(Quiz.buildBatch(section, mode));
    assert.equal(session.phase, "memory");
    assert.deepEqual(session.rows.map(q => q.number), section.questions.map(q => q.number));
    assert.equal(new Set(session.rows.map(q => q.id)).size, session.rows.length);
    assert.equal(Quiz.reveal(session), false);
    assert.equal(Quiz.rate(session, true), false);
    assert.equal(Quiz.saveDraft(session, session.rows[0]?.id, "answer"), false);
    assert.equal(session.questions.length, section.questions.filter(Quiz.supported).length);
    Quiz.begin(session);
    assert.equal(session.phase, session.questions.length ? "practice" : "result");
    if (session.questions.length) assert.equal(Quiz.finish(session), false);
  }
  assert.equal(JSON.stringify(corpus), original);
});

test("recall cards require revealing before self-rating, count once, and retry only missed items after the full preview", () => {
  const batch = Quiz.buildBatch(corpus.find(s => s.teil === "16"));
  const session = Quiz.createSession(batch);
  Quiz.begin(session);
  for (let i = 0; i < session.questions.length; i++) {
    assert.equal(Quiz.rate(session, true), false);
    assert.equal(Quiz.next(session), false);
    assert.equal(Quiz.reveal(session), true);
    assert.equal(Quiz.reveal(session), false);
    assert.equal(Quiz.rate(session, i !== 0), true);
    assert.equal(Quiz.rate(session, true), false);
    Quiz.next(session);
  }
  assert.equal(session.phase, "result");
  assert.equal(session.result.correct, 9);
  const retry = Quiz.reviewBatch(session);
  assert.equal(Quiz.reviewBatch(session), null);
  const next = Quiz.createSession(retry);
  assert.equal(next.rows.length, 10);
  assert.equal(next.questions.length, 1);
  assert.equal(next.phase, "memory");
  assert.equal(next.mode, "cards");
  assert.equal(next.questions[0].number, "65");
});

test("typing has no early grading; unmatched expressions require explicit self-check, blank inputs cannot be marked correct", () => {
  const session = Quiz.createSession(Quiz.buildBatch(corpus.find(s => s.teil === "16"), "writing"));
  Quiz.begin(session);
  session.questions.forEach((q, i) => Quiz.saveDraft(session, q.id, i === 0 ? "meine Ziele verwirklichen" : i === 1 ? "" : q.answerText));
  assert.deepEqual(session.judgements, {});
  assert.equal(Quiz.finish(session), false);
  assert.equal(Quiz.submitWriting(session), true);
  assert.equal(Quiz.pending(session), 1);
  assert.equal(Quiz.finish(session), false);
  assert.equal(Quiz.saveDraft(session, session.questions[0].id, "changed after submit"), false);
  assert.equal(Quiz.decide(session, session.questions[1].id, true), false);
  assert.equal(Quiz.decide(session, session.questions[0].id, true), true);
  assert.equal(Quiz.decide(session, "reference-only-id", true), false);
  assert.equal(Quiz.finish(session), true);
  assert.equal(session.result.correct, 9);
  assert.equal(session.result.rows[0].selected, "meine Ziele verwirklichen");
  assert.equal(Quiz.finish(session), false);
  assert.equal(Quiz.reviewBatch(session).practiceIds.length, 1);
});

test("reference rows are excluded from typed inputs, scoring, and retries; each supported article can complete perfectly", () => {
  for (const section of corpus) {
    const session = Quiz.createSession(Quiz.buildBatch(section, "writing"));
    Quiz.begin(session);
    for (const q of session.rows.filter(q => !Quiz.supported(q))) assert.equal(Quiz.saveDraft(session, q.id, "invented"), false);
    if (session.questions.length) {
      session.questions.forEach(q => Quiz.saveDraft(session, q.id, q.answerText));
      Quiz.submitWriting(session);
      assert.equal(Quiz.pending(session), 0);
      assert.equal(Quiz.finish(session), true);
    }
    assert.equal(session.result.total, section.questions.filter(Quiz.supported).length);
    assert.equal(session.result.correct, session.result.total);
    assert.equal(Quiz.reviewBatch(session), null);
  }
});

test("source alternatives, case, whitespace, punctuation and umlaut transliteration work without accepting changed numbers or negations", () => {
  assert.equal(Quiz.matches(find("22-1", "68"), "Schokolade bei schlechter Stimmung hilft"), true);
  assert.equal(Quiz.matches(find("16", "66"), "Selbstkontrolle"), true);
  assert.equal(Quiz.matches(find("22-2", "65"), "9.5 KILO"), true);
  assert.equal(Quiz.matches(find("22-2", "65"), "95 Kilo"), false);
  assert.equal(Quiz.matches(find("22-2", "65"), "9 Kilo"), false);
  assert.equal(Quiz.matches(find("16", "65"), "ZIELE   ZU ERREICHEN."), true);
  assert.equal(Quiz.matches(find("16", "65"), "Ziele nicht zu erreichen"), false);
  assert.equal(Quiz.matches(find("16", "65"), "Ziele"), false);
  assert.equal(Quiz.matches(find("5", "74"), "selbstaendiges Denken foerdern"), true);
});

test("HV3 is selectable and ships data, engine and view before app startup, including offline cache and CI", () => {
  const index = read("index.html");
  assert.match(index, /data-level-choice="hv3"/);
  assert.match(index, /id="hv3Mode"/);
  for (const file of ["hv3-quiz.js", "hv3-view.js", "data/hv3_questions.js"]) {
    assert.ok(index.indexOf(`src="./${file}`) < index.indexOf('src="./app.js'));
    assert.ok(read("scripts/build.js").includes(`"${file}"`));
    assert.ok(read("service-worker.js").includes(`"./${file}"`));
  }
  assert.ok(read(".github/workflows/pages.yml").includes("check:hv3"));
});
