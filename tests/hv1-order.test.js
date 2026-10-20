const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const order = require("../hv1-order.js");
const source = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/hv1_questions.json"), "utf8"));
const sample = () => Array.from({ length: 8 }, (_, i) => ({ id: "q" + i, number: i + 1, leitsatz: "Satz " + i }));

test("Every supported Teil starts in memory with all eight statements and no scored attempt", () => {
  const supported = source.filter(section => order.canPractice(section.questions));
  assert.equal(supported.length, 20);
  for (const section of supported) {
    const session = order.createSession(section.questions);
    assert.equal(session.phase, "memory");
    assert.equal(session.correct.length, 8);
    assert.deepEqual(session.correct.map(q => q.number), [1, 2, 3, 4, 5, 6, 7, 8]);
    assert.equal(session.result, null);
    assert.deepEqual(session.order, []);
    assert.equal(order.submit(session), null);
  }
});

test("Order follows Sprecher numbers, never the answer letters in the new corpus", () => {
  const section = source.find(s => s.teil === "12-2");
  const session = order.createSession([...section.questions].reverse());
  assert.match(section.questions[0].answerText, /^C\./);
  assert.equal(session.correct[0].text, section.questions[0].answerText.replace(/^C\.\s*/, ""));
  assert.ok(!session.correct.some(q => /^[A-J]\.\s/.test(q.text)));
});

test("Statements without a known speaker order stay out of scored sorting", () => {
  const unknown = source.find(s => s.teil === 17);
  assert.equal(order.canPractice(unknown.questions), false);
  assert.throws(() => order.createSession(unknown.questions));
  const duplicate = sample();
  duplicate[7].number = 1;
  assert.equal(order.canPractice(duplicate), false);
});

test("Source caveats stay attached to the same statement while sorting and reviewing", () => {
  const section = source.find(s => s.teil === 13);
  const session = order.createSession(section.questions);
  const truncated = session.correct[1];
  assert.match(truncated.text, /zu\.\.\.$/);
  assert.match(truncated.note, /截断/);
  order.begin(session);
  assert.equal(session.order.find(q => q.id === truncated.id).note, truncated.note);
  const result = order.submit(session);
  assert.equal(result.rows.find(q => q.id === truncated.id).note, truncated.note);
});

test("Ready shuffles all eight without mutating the source, even if RNG yields the identity", () => {
  const questions = sample();
  const original = JSON.stringify(questions);
  const session = order.createSession(questions);
  assert.equal(order.begin(session, () => .999), true);
  assert.equal(session.phase, "practice");
  assert.equal(session.order.length, 8);
  assert.notDeepEqual(session.order, session.correct);
  assert.deepEqual(new Set(session.order.map(q => q.id)), new Set(session.correct.map(q => q.id)));
  assert.equal(JSON.stringify(questions), original);
  assert.equal(order.begin(session), false);
});

test("Moving first to last and back preserves every statement; invalid moves do nothing", () => {
  const session = order.createSession(sample());
  order.begin(session);
  const original = session.order.map(q => q.id);
  assert.equal(order.move(session, 0, 7), true);
  assert.equal(order.move(session, 7, 0), true);
  assert.deepEqual(session.order.map(q => q.id), original);
  for (const [from, to] of [[-1, 0], [0, 8], [1, 1], [0, 1.5]]) assert.equal(order.move(session, from, to), false);
});

test("Submission retains the user's order and reports exact wrong and correct positions", () => {
  const session = order.createSession(sample());
  order.begin(session);
  session.order = [...session.correct];
  order.move(session, 0, 1);
  const result = order.submit(session);
  assert.equal(result.correct, 6);
  assert.equal(result.total, 8);
  assert.deepEqual(result.rows.slice(0, 2).map(q => [q.position, q.expectedPosition, q.correct]), [[1, 2, false], [2, 1, false]]);
  assert.equal(session.order[0].id, "q1");
  assert.equal(session.correct[0].id, "q0");
  assert.equal(order.submit(session), null);
  assert.equal(order.move(session, 0, 1), false);
});

test("A perfect attempt scores 8/8 and a repeated Teil starts with a fresh memory phase", () => {
  const session = order.createSession(sample());
  order.begin(session);
  session.order = [...session.correct];
  assert.equal(order.submit(session).correct, 8);
  const repeat = order.createSession(sample());
  assert.equal(repeat.phase, "memory");
  assert.equal(repeat.result, null);
  assert.equal(repeat.scored, false);
});
