const test = require("node:test");
const assert = require("node:assert/strict");
const Hv1AudioQuiz = require("../hv1-quiz.js");

function batch() {
  return {
    teil: 1,
    questions: Array.from({ length: 8 }, (_, index) => ({
      number: index + 1,
      leitsatz: "Statement " + (index + 1),
    })),
  };
}

test("memory phase keeps all eight statements in speaker order", () => {
  const session = Hv1AudioQuiz.createSession(batch());

  assert.equal(session.phase, "memory");
  assert.equal(session.questions.length, 8);
  assert.equal(session.questions[0].number, 1);
  assert.equal(session.questions[7].number, 8);
  assert.equal(Hv1AudioQuiz.currentQuestion(session), null);

  assert.equal(Hv1AudioQuiz.begin(session), true);
  assert.equal(Hv1AudioQuiz.currentQuestion(session).number, 1);
  assert.equal(session.autoPlay, true);
});

test("choices score immediately in speaker order and mistake review keeps only missed items", () => {
  const session = Hv1AudioQuiz.createSession(batch());
  Hv1AudioQuiz.begin(session);

  for (let number = 1; number <= 8; number += 1) {
    // Every statement is a one-use option, so the wrong answer at speaker 2
    // cannot be selected again when speaker 7 is reached.
    const selected = number === 2 ? 7 : number === 7 ? 2 : number;
    const result = Hv1AudioQuiz.choose(session, selected);
    assert.equal(result.question.number, number);
    assert.equal(result.correct, number !== 2 && number !== 7);
    assert.equal(Hv1AudioQuiz.choose(session, selected), null);
    assert.equal(Hv1AudioQuiz.advance(session), true);
  }

  assert.equal(session.phase, "result");
  assert.deepEqual(session.missed.map(question => question.number), [2, 7]);
  assert.deepEqual(Hv1AudioQuiz.reviewBatch(session).reviewQuestions.map(question => question.number), [2, 7]);
  assert.equal(Hv1AudioQuiz.reviewBatch(session), null);
  assert.equal(Hv1AudioQuiz.isOptionUsed(session, 2), true);
  assert.equal(Hv1AudioQuiz.isOptionUsed(session, 7), true);
});

test("a selected statement is unavailable to subsequent questions", () => {
  const session = Hv1AudioQuiz.createSession(batch());
  Hv1AudioQuiz.begin(session);

  assert.equal(Hv1AudioQuiz.choose(session, 4).correct, false);
  assert.equal(Hv1AudioQuiz.advance(session), true);
  assert.equal(Hv1AudioQuiz.currentQuestion(session).number, 2);
  assert.equal(Hv1AudioQuiz.isOptionUsed(session, 4), true);
  assert.equal(Hv1AudioQuiz.choose(session, 4), null);
  assert.equal(Hv1AudioQuiz.isOptionUsed(session, 2), false);
});

test("only a valid one-to-eight PDF answer order is accepted", () => {
  const invalid = batch();
  invalid.questions[0].number = 2;
  assert.throws(() => Hv1AudioQuiz.createSession(invalid), /eight PDF statements/);
});

test("shuffling presents all options and avoids leaving the PDF order unchanged", () => {
  const questions = batch().questions;
  const shuffled = Hv1AudioQuiz.shuffledOptions(questions, () => 0.999999);

  assert.deepEqual(shuffled.map(question => question.number).sort(), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.notDeepEqual(shuffled.map(question => question.number), [1, 2, 3, 4, 5, 6, 7, 8]);
});
