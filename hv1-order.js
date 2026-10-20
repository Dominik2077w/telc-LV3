(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Hv1Order = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function sentence(question) {
    return String(question.leitsatz || question.answerText || question.reviewGerman || question.german || "")
      .replace(/^[A-J][.、]\s*/, "").trim();
  }

  function canPractice(questions) {
    const numbers = questions.map(q => Number(q.number));
    return questions.length === 8 && new Set(numbers).size === questions.length &&
      numbers.every(n => Number.isInteger(n) && n >= 1 && n <= 8) && questions.every(q => sentence(q));
  }

  function createSession(questions) {
    if (!canPractice(questions)) throw new Error("HV1 requires a known speaker order and answer text.");
    const correct = [...questions].sort((a, b) => Number(a.number) - Number(b.number))
      .map(q => ({ id: String(q.id || "hv1-item-" + q.number), text: sentence(q), number: Number(q.number),
        note: q.studyNote || "" }));
    if (new Set(correct.map(q => q.id)).size !== correct.length) throw new Error("Duplicate HV1 item IDs.");
    return { correct, phase: "memory", order: [], result: null, scored: false };
  }

  function shuffled(items, random = Math.random) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    if (copy.length > 1 && copy.every((item, i) => item.id === items[i].id)) copy.push(copy.shift());
    return copy;
  }

  function begin(session, random) {
    if (session.phase !== "memory") return false;
    session.phase = "practice";
    session.order = shuffled(session.correct, random);
    return true;
  }

  function move(session, from, to) {
    if (session.phase !== "practice" || !Number.isInteger(from) || !Number.isInteger(to) ||
      from < 0 || to < 0 || from >= session.order.length || to >= session.order.length || from === to) return false;
    session.order.splice(to, 0, session.order.splice(from, 1)[0]);
    return true;
  }

  function submit(session) {
    if (session.phase !== "practice") return null;
    const rows = session.order.map((item, i) => ({ ...item, position: i + 1,
      expectedPosition: session.correct.findIndex(q => q.id === item.id) + 1, correct: item.id === session.correct[i].id }));
    const result = { rows, correct: rows.filter(row => row.correct).length, total: rows.length };
    session.result = result;
    session.phase = "feedback";
    return result;
  }

  return { sentence, canPractice, createSession, shuffled, begin, move, submit };
});
