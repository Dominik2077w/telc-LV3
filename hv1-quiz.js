(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Hv1AudioQuiz = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function createSession(batch) {
    const questions = [...batch.questions].sort((a, b) => Number(a.number) - Number(b.number));
    if (questions.length !== 8 || questions.some((question, index) => Number(question.number) !== index + 1)) {
      throw new Error("HV1 audio sorting requires the eight PDF statements in speaker order.");
    }
    return { batch, questions, phase: "memory", order: [], result: null, scored: false, mistakesRecorded: false };
  }

  function shuffledOptions(questions, random = Math.random) {
    const options = questions.map(question => ({ ...question }));
    for (let index = options.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(random() * (index + 1));
      [options[index], options[swap]] = [options[swap], options[index]];
    }
    if (options.length > 1 && options.every((option, index) => option.number === questions[index].number)) {
      options.push(options.shift());
    }
    return options;
  }

  function begin(session, random) {
    if (!session || session.phase !== "memory") return false;
    session.order = shuffledOptions(session.questions, random).map((question, index) => ({
      ...question,
      cardId: String(question.id || `hv1-audio-${question.number}`),
      audioLabel: `录音 ${"ABCDEFGH"[index]}`,
    }));
    session.phase = "practice";
    return true;
  }

  function move(session, from, to) {
    if (!session || session.phase !== "practice" || !Number.isInteger(from) || !Number.isInteger(to) ||
      from < 0 || to < 0 || from >= session.order.length || to >= session.order.length || from === to) return false;
    session.order.splice(to, 0, session.order.splice(from, 1)[0]);
    return true;
  }

  function submit(session) {
    if (!session || session.phase !== "practice") return null;
    const rows = session.order.map((question, index) => ({
      ...question,
      position: index + 1,
      expectedPosition: Number(question.number),
      expectedQuestion: session.questions[index],
      correct: Number(question.number) === index + 1,
    }));
    session.result = { rows, correct: rows.filter(row => row.correct).length, total: rows.length };
    session.phase = "result";
    return session.result;
  }

  function reviewBatch(session) {
    if (!session?.result || session.mistakesRecorded || session.result.correct === session.result.total) return null;
    session.mistakesRecorded = true;
    // The positions are relative to the whole Teil; retries must keep all eight.
    const { reviewQuestions, ...batch } = session.batch;
    return { ...batch, questions: [...session.questions], missedCount: session.result.total - session.result.correct };
  }

  return { createSession, begin, move, submit, reviewBatch, shuffledOptions };
});
