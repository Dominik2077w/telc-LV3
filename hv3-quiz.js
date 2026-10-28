(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Hv3Quiz = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const supported = q => q.practiceEligible === true && Boolean(q.answerText);
  const key = text => String(text || "").normalize("NFKC").toLocaleLowerCase("de")
    .replace(/(\d)[,.](?=\d)/g, "$1decimal")
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^\p{L}\p{N}]/gu, "");
  function matches(q, text) {
    const value = key(text);
    return Boolean(value) && [q.answerText, ...(q.sourceAlternatives || [])].some(answer => key(answer) === value);
  }
  function buildBatch(section, mode = "cards") {
    return { ...section, id: `hv3-${section.teil}`, level: "hv3", teilTitle: section.title,
      sectionMode: "hv3-outline-quiz", practiceMode: mode === "writing" ? "writing" : "cards",
      questions: section.questions.map((q, i) => ({ ...q, id: q.id || `hv3-${section.teil}-${q.number}-${i}` })) };
  }
  function practiceRows(batch) {
    return batch.questions.filter(q => supported(q) && (!batch.practiceIds || batch.practiceIds.includes(q.id)));
  }
  function createSession(batch) {
    const rows = batch.questions.map(q => ({ ...q }));
    if (new Set(rows.map(q => q.id)).size !== rows.length) throw new Error("HV3 source variants require unique IDs");
    return { batch, rows, questions: practiceRows({ ...batch, questions: rows }), mode: batch.practiceMode,
      phase: "memory", index: 0, drafts: {}, judgements: {}, result: null, scored: false, reviewed: false };
  }
  const current = session => session.questions[session.index];
  function begin(session) {
    if (session.phase !== "memory") return false;
    session.phase = session.questions.length ? "practice" : "result";
    if (!session.questions.length) finish(session);
    return true;
  }
  function reveal(session) {
    if (session.mode !== "cards" || session.phase !== "practice") return false;
    session.phase = "revealed";
    return true;
  }
  function rate(session, remembered) {
    if (session.mode !== "cards" || session.phase !== "revealed" || typeof remembered !== "boolean") return false;
    session.judgements[current(session).id] = remembered;
    session.phase = "feedback";
    return true;
  }
  function next(session) {
    if (session.phase !== "feedback") return false;
    session.index++;
    if (session.index === session.questions.length) finish(session);
    else session.phase = "practice";
    return true;
  }
  function saveDraft(session, id, text) {
    if (session.mode !== "writing" || session.phase !== "practice" || !session.questions.some(q => q.id === id)) return false;
    session.drafts[id] = String(text);
    return true;
  }
  function submitWriting(session) {
    if (session.mode !== "writing" || session.phase !== "practice") return false;
    for (const q of session.questions) {
      const text = session.drafts[q.id] || "";
      session.judgements[q.id] = !text.trim() ? false : matches(q, text) ? true : null;
    }
    session.phase = "checking";
    return true;
  }
  function decide(session, id, correct) {
    if (session.phase !== "checking" || typeof correct !== "boolean" || !session.questions.some(q => q.id === id)) return false;
    if (correct && !String(session.drafts[id] || "").trim()) return false;
    session.judgements[id] = correct;
    return true;
  }
  function pending(session) {
    return session.questions.filter(q => typeof session.judgements[q.id] !== "boolean").length;
  }
  function finish(session) {
    if (session.mode === "cards" && session.questions.length && !(session.phase === "feedback" && session.index === session.questions.length)) return false;
    if (session.mode === "writing" && session.questions.length && (session.phase !== "checking" || pending(session))) return false;
    const rows = session.questions.map(q => ({ question: q, correct: session.judgements[q.id] === true,
      selected: session.mode === "writing" ? session.drafts[q.id] || "" : session.judgements[q.id] ? "记得" : "不记得" }));
    session.result = { rows, total: rows.length, correct: rows.filter(row => row.correct).length };
    session.phase = "result";
    return true;
  }
  function reviewBatch(session) {
    if (!session.result || session.reviewed) return null;
    session.reviewed = true;
    const wrong = session.result.rows.filter(row => !row.correct).map(row => row.question.id);
    return wrong.length ? { ...session.batch, practiceIds: wrong, missedCount: wrong.length } : null;
  }
  return { supported, matches, buildBatch, practiceRows, createSession, current, begin, reveal, rate, next,
    saveDraft, submitWriting, decide, pending, finish, reviewBatch };
});
