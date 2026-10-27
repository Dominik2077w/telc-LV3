const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const Translations = require("../lv1-translations.js");
const Quiz = require("../lv1-quiz.js");
const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const context = { window: {} };
vm.runInNewContext(read("data/lv1_questions.js"), context);
const corpus = JSON.parse(JSON.stringify(context.window.LV1_QUESTIONS));

test("all 126 LV1 options have sentence-specific Chinese, independent of source data and without answer-position hints", () => {
  const before = JSON.stringify(corpus);
  const keys = [];
  for (const section of corpus) for (const question of section.questions) {
    const translation = Translations.get({ ...question, teil: section.teil });
    assert.ok(translation, `${section.teil}/${question.number}: missing Chinese`);
    assert.match(translation.chinese, /[\u3400-\u9fff]/);
    assert.ok(translation.chinese.length > 10);
    assert.doesNotMatch(translation.chinese, /第\s*[1-6一二三四五六]\s*空|暂无|待补译/);
    assert.equal(translation.translationSource, "study-translation");
    keys.push(`${section.teil}:${question.number}`);
  }
  assert.equal(keys.length, 126);
  assert.deepEqual(Object.keys(Translations.entries).sort(), keys.sort());
  assert.equal(JSON.stringify(corpus), before);
});

test("sentence matching refuses a stale translation after source text changes, even if the article and gap number stay the same", () => {
  const question = { ...corpus[0].questions[0], teil: 1 };
  assert.ok(Translations.get(question));
  assert.ok(Translations.get({ ...question, german: `  ${question.german.replace(/ /g, '  ')}  ` }));
  assert.equal(Translations.get({ ...question, german: "Ein völlig anderer Satz." }), null);
  assert.equal(Translations.get({ ...question, teil: 17 }), null);
  assert.equal(Translations.get({ ...question, number: 7 }), null);
  const first = Translations.get(question);
  first.chinese = "changed";
  assert.notEqual(Translations.get(question).chinese, "changed");
});

test("Chinese and source caveats stay attached to the same option through shuffling, answering and retries", () => {
  const questions = corpus[0].questions.map(q => ({ ...q, ...Translations.get({ ...q, teil: 1 }) }));
  const session = Quiz.createSession(Quiz.buildBatch({ ...corpus[0], questions }));
  Quiz.begin(session, () => 0.999);
  while (session.phase === "practice") {
    const question = Quiz.current(session);
    const expected = Translations.get({ ...question, teil: 1 });
    assert.equal(question.chinese, expected.chinese);
    assert.equal(question.translationNote, expected.translationNote);
    Quiz.choose(session, 0);
    Quiz.advance(session);
  }
  const retry = Quiz.reviewBatch(session);
  assert.equal(retry.questions[0].chinese, questions[0].chinese);
  assert.equal(retry.questions[0].translationNote, questions[0].translationNote);
  assert.equal(session.result.rows[0].question.chinese, questions[1].chinese);
});

test("browser, build and cache include LV1 translations before application normalization runs", () => {
  const html = read("index.html");
  assert.ok(html.indexOf('src="./lv1-translations.js') < html.indexOf('src="./app.js'));
  assert.ok(read("scripts/build.js").includes('"lv1-translations.js"'));
  assert.ok(read("service-worker.js").includes('"./lv1-translations.js"'));
});
