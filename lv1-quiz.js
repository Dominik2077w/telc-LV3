(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Lv1Quiz = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function buildBatch(section) {
    return { ...section, id: `lv1-position-${section.teil}`, level: "lv1", teilTitle: section.title,
      sectionMode: "lv1-position-quiz", questions: section.questions.map(q => ({ ...q })) };
  }

  function createSession(batch) {
    const count = batch.positionCount;
    const questions = batch.questions.map(q => ({ ...q }));
    const correct = questions.filter(q => q.position !== null).sort((a, b) => a.position - b.position);
    if (!Number.isInteger(count) || count < 1 || correct.length !== count ||
      correct.some((q, i) => q.position !== i + 1) || questions.some(q => !q.german)) {
      throw new Error("LV1 needs a complete, unique source position for each gap; unused options require explicit null.");
    }
    return { batch, count, questions, correct, phase: "memory", order: [], index: 0, answers: [], result: null, reviewed: false };
  }

  function begin(session, random = Math.random) {
    if (!session || session.phase !== "memory") return false;
    session.order = [...session.questions];
    for (let i = session.order.length - 1; i > 0; i -= 1) {
      const swap = Math.floor(random() * (i + 1));
      [session.order[i], session.order[swap]] = [session.order[swap], session.order[i]];
    }
    if (session.order.length > 1 && session.order.every((q, i) => q === session.questions[i])) session.order.push(session.order.shift());
    session.phase = "practice";
    return true;
  }

  function current(session) {
    return session?.phase === "practice" ? session.order[session.index] || null : null;
  }

  function answered(session) {
    return Boolean(current(session) && session.answers.length > session.index);
  }

  function choose(session, position) {
    const question = current(session);
    if (!question || answered(session) || !Number.isInteger(position) || position < 0 || position > session.count) return null;
    const expectedPosition = question.position;
    const answer = { question, position: position || null, expectedPosition,
      correct: (position || null) === expectedPosition };
    session.answers.push(answer);
    return answer;
  }

  function advance(session) {
    if (!answered(session)) return false;
    session.index += 1;
    if (session.index === session.order.length) {
      session.phase = "result";
      session.result = { rows: [...session.answers], correct: session.answers.filter(a => a.correct).length, total: session.answers.length };
    }
    return true;
  }

  function reviewBatch(session) {
    if (!session?.result || session.reviewed || session.result.correct === session.result.total) return null;
    session.reviewed = true;
    return { ...session.batch, questions: session.questions.map(q => ({ ...q })),
      missedCount: session.result.total - session.result.correct };
  }

  function positionLabel(position) {
    return position === null ? "没有（不填入本文）" : `第 ${position} 空`;
  }

  return { buildBatch, createSession, begin, current, answered, choose, advance, reviewBatch, positionLabel };
});
