(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Lv3TableQuiz = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const columns = [
    { value: "R", label: "对", german: "Richtig", symbol: "R" },
    { value: "F", label: "错", german: "Falsch", symbol: "F" },
    { value: "X", label: "没有", german: "Nicht im Text", symbol: "×" },
  ];
  function kind(question) {
    // Two source variants are numbered 24 but still carry R/F judgements.
    // Preserve their actual answer type instead of inferring solely by number.
    if (columns.some(column => column.value === question.answer)) return "judgement";
    return Number(question.number) === 24 || ["A", "B", "C"].includes(question.answer) ? "title" : "judgement";
  }
  function choices(question) {
    if (kind(question) === "judgement") return columns.map(column => ({ ...column }));
    return ["A", "B", "C"].map(value => ({ value,
      label: question.options?.find(option => option.value === value)?.label || value }));
  }
  function isKnown(question) {
    return choices(question).some(choice => choice.value === question.answer);
  }
  function scoredCount(questions) {
    return questions.filter(isKnown).length;
  }
  function buildBatch(section) {
    const questions = section.questions.map((question, index) => ({ ...question,
      id: question.id || `lv3-${section.teil}-${index}` }));
    return { ...section, id: `lv3-table-${section.teil}`, level: "lv3", teilTitle: section.title,
      sectionMode: "lv3-table-quiz", questions };
  }
  function createSession(batch) {
    if (!batch.questions.length) throw new Error("LV3 table needs at least one source item.");
    const questions = batch.questions.map((question, index) => ({ ...question,
      id: question.id || `lv3-${batch.teil}-${index}` })).sort((a, b) => Number(a.number) - Number(b.number));
    if (new Set(questions.map(q => q.id)).size !== questions.length) throw new Error("LV3 rows need unique IDs, including source variants.");
    const counts = new Map(), seen = new Map();
    for (const q of questions) counts.set(String(q.number), (counts.get(String(q.number)) || 0) + 1);
    const rows = questions.map(q => {
      const number = String(q.number), version = (seen.get(number) || 0) + 1;
      seen.set(number, version);
      return { ...q, kind: kind(q), gradable: isKnown(q), choices: choices(q),
        displayNumber: number + (counts.get(number) > 1 ? ` · 版本 ${version}` : "") };
    });
    return { batch, questions, rows, phase: "memory", answers: {}, result: null, reviewed: false };
  }
  function begin(session) {
    if (!session || session.phase !== "memory") return false;
    session.phase = "practice";
    return true;
  }
  function choose(session, id, value) {
    if (!session || session.phase !== "practice") return false;
    const row = session.rows.find(q => q.id === id);
    if (!row?.gradable || !row.choices.some(choice => choice.value === value) || session.answers[id] === value) return false;
    session.answers[id] = value;
    return true;
  }
  function answeredCount(session) {
    return Object.keys(session.answers).length;
  }
  function isComplete(session) {
    return Boolean(session && session.phase === "practice" && session.rows.every(row => !row.gradable || session.answers[row.id]));
  }
  function submit(session) {
    if (!isComplete(session)) return null;
    const rows = session.rows.map(question => ({ question,
      selected: session.answers[question.id] || null,
      correct: question.gradable ? session.answers[question.id] === question.answer : null }));
    session.result = { rows, total: rows.filter(row => row.question.gradable).length,
      correct: rows.filter(row => row.correct === true).length, ungraded: rows.filter(row => row.correct === null).length };
    session.phase = "result";
    return session.result;
  }
  function reviewBatch(session) {
    if (!session?.result || session.reviewed || session.result.correct === session.result.total) return null;
    session.reviewed = true;
    return { ...session.batch, questions: session.questions.map(q => ({ ...q })),
      missedCount: session.result.total - session.result.correct };
  }
  function answerLabel(question, value) {
    if (!value) return "未标答案";
    return kind(question) === "title" ? value : columns.find(column => column.value === value)?.label + " " + (value === "X" ? "×" : value);
  }
  return { columns, choices, isKnown, scoredCount, buildBatch, createSession, begin, choose, answeredCount, isComplete, submit, reviewBatch, answerLabel };
});
