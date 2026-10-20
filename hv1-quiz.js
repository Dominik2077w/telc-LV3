(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Hv1AudioQuiz = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function createSession(batch) {
    const questions = [...batch.questions].sort((a, b) => Number(a.number) - Number(b.number));
    if (questions.length !== 8 || questions.some((question, index) => Number(question.number) !== index + 1)) {
      throw new Error("HV1 audio quiz requires the eight PDF statements in speaker order.");
    }
    return {
      batch,
      questions,
      activeQuestions: batch.reviewQuestions?.length ? [...batch.reviewQuestions] : questions,
      phase: "memory",
      questionIndex: 0,
      answered: false,
      selected: null,
      usedOptions: [],
      missed: [],
      mistakesRecorded: false,
      autoPlay: false,
    };
  }

  function begin(session) {
    if (!session || session.phase !== "memory") return false;
    session.phase = "practice";
    session.autoPlay = true;
    return true;
  }

  function currentQuestion(session) {
    return session?.phase === "practice" ? session.activeQuestions[session.questionIndex] || null : null;
  }

  function choose(session, optionNumber) {
    if (!session || session.phase !== "practice" || session.answered) return null;
    if (isOptionUsed(session, optionNumber)) return null;
    const question = currentQuestion(session);
    if (!question) return null;
    session.selected = String(optionNumber);
    session.usedOptions.push(session.selected);
    session.answered = true;
    const correct = session.selected === String(question.number);
    if (!correct) session.missed.push(question);
    return { question, correct, selected: session.selected };
  }

  function advance(session) {
    if (!session || session.phase !== "practice" || !session.answered) return false;
    session.questionIndex += 1;
    session.answered = false;
    session.selected = null;
    if (session.questionIndex >= session.activeQuestions.length) {
      session.phase = "result";
      session.autoPlay = false;
    } else {
      session.autoPlay = true;
    }
    return true;
  }

  function reviewBatch(session) {
    if (!session || session.mistakesRecorded || !session.missed.length) return null;
    session.mistakesRecorded = true;
    return {
      ...session.batch,
      reviewQuestions: session.missed.map(question => ({ ...question })),
    };
  }

  function isOptionUsed(session, optionNumber) {
    return Boolean(session?.usedOptions?.includes(String(optionNumber)));
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

  return { createSession, begin, currentQuestion, choose, advance, reviewBatch, isOptionUsed, shuffledOptions };
});
