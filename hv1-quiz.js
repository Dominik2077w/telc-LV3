(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Hv1AudioQuiz = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function createSession(batch) {
    const questions = [...batch.questions].sort((a, b) => Number(a.number) - Number(b.number));
    if (questions.length !== 8 || questions.some((question, index) => Number(question.number) !== index + 1)) {
      throw new Error("HV1 audio matching requires the eight PDF statements in speaker order.");
    }
    return { batch, questions, mode: batch.practiceMode === "position" ? "position" : "matching",
      phase: "memory", order: [], matches: {}, itemIndex: 0, answers: [], result: null, scored: false, mistakesRecorded: false };
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

  function connect(session, cardId, position) {
    if (!session || session.mode !== "matching" || session.phase !== "practice" || !Number.isInteger(position) || position < 1 || position > 8 ||
      !session.order.some(question => question.cardId === cardId)) return false;
    // A sentence and a position each have at most one connection. Reconnecting
    // releases both the previous position and any previous occupant of the new one.
    Object.keys(session.matches).forEach(id => {
      if (session.matches[id] === position) delete session.matches[id];
    });
    session.matches[cardId] = position;
    return true;
  }

  function disconnect(session, cardId) {
    if (!session || session.mode !== "matching" || session.phase !== "practice" || !Object.hasOwn(session.matches, cardId)) return false;
    delete session.matches[cardId];
    return true;
  }

  function isComplete(session) {
    return Boolean(session && session.order.length === 8 && Object.keys(session.matches).length === 8);
  }

  function submit(session) {
    if (!session || session.mode !== "matching" || session.phase !== "practice" || !isComplete(session)) return null;
    const rows = session.questions.map((expectedQuestion, index) => {
      const question = session.order.find(item => session.matches[item.cardId] === index + 1);
      return {
        ...question,
        position: index + 1,
        expectedPosition: Number(question.number),
        expectedQuestion,
        correct: Number(question.number) === index + 1,
      };
    });
    session.result = { rows, correct: rows.filter(row => row.correct).length, total: rows.length };
    session.phase = "result";
    return session.result;
  }

  function currentPositionQuestion(session) {
    return session?.mode === "position" && session.phase === "practice" ? session.order[session.itemIndex] || null : null;
  }

  function positionAnswered(session) {
    return Boolean(currentPositionQuestion(session) && session.answers.length > session.itemIndex);
  }

  function choosePosition(session, position) {
    const question = currentPositionQuestion(session);
    if (!question || positionAnswered(session) || !Number.isInteger(position) || position < 1 || position > 8) return null;
    const answer = { ...question, position, expectedPosition: Number(question.number),
      correct: position === Number(question.number) };
    session.answers.push(answer);
    return answer;
  }

  function advancePosition(session) {
    if (!positionAnswered(session)) return false;
    session.itemIndex += 1;
    if (session.itemIndex === session.order.length) {
      session.result = { rows: [...session.answers], correct: session.answers.filter(answer => answer.correct).length, total: session.answers.length };
      session.phase = "result";
    }
    return true;
  }

  function reviewBatch(session) {
    if (!session?.result || session.mistakesRecorded || session.result.correct === session.result.total) return null;
    session.mistakesRecorded = true;
    // The positions are relative to the whole Teil; retries must keep all eight.
    const { reviewQuestions, ...batch } = session.batch;
    return { ...batch, questions: [...session.questions], missedCount: session.result.total - session.result.correct };
  }

  return { createSession, begin, connect, disconnect, isComplete, submit, reviewBatch, shuffledOptions,
    currentPositionQuestion, positionAnswered, choosePosition, advancePosition };
});
