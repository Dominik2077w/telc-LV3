(function (root) {
  function cleanCompletion(value) {
    return String(value || "")
      .trim()
      .replace(/^[A-C](?=\s|[.)：:-])\s*(?:[.)：:-]\s*)?/i, "")
      .trim();
  }

  function getCompletion(question) {
    return cleanCompletion(question.completion || question.answerText || question.reviewGerman);
  }

  function completeSentence(question) {
    const stem = String(question.german || question.text || "")
      .trim()
      .replace(/[.…_\s]+$/u, "")
      .trim();
    const completion = getCompletion(question);
    const sentence = [stem, completion].filter(Boolean).join(" ").replace(/\s+([,.;!?])/g, "$1");
    return sentence && !/[.!?…]$/.test(sentence) ? sentence + "." : sentence;
  }

  function cleanTranslation(value) {
    return String(value || "")
      .trim()
      .replace(/^[A-C](?:[.)：:-])?\s*/i, "")
      .trim();
  }

  function buildReviewRows(section) {
    return (section.questions || []).map((question, index) => ({
      number: String(question.number || question.sourceNumber || ""),
      sourceNumber: String(question.sourceNumber || question.number || ""),
      sentence: completeSentence(question),
      chinese: cleanTranslation(question.chinese),
      index,
    })).sort((a, b) => {
      const aNumber = Number.parseInt(a.sourceNumber, 10);
      const bNumber = Number.parseInt(b.sourceNumber, 10);
      const bySourceNumber = (Number.isFinite(aNumber) ? aNumber : Number.MAX_SAFE_INTEGER) -
        (Number.isFinite(bNumber) ? bNumber : Number.MAX_SAFE_INTEGER);
      return bySourceNumber || a.number.localeCompare(b.number, "en", { numeric: true }) || a.index - b.index;
    });
  }

  function buildRoundQueue(sections, practiceQuestions) {
    return sections.flatMap(section => {
      const questions = Array.isArray(practiceQuestions)
        ? practiceQuestions.filter(question => String(question.teil) === String(section.teil))
        : section.questions || [];
      if (!questions.length) return [];
      const memory = {
        id: `hv2-memory-${section.teil}`,
        level: "hv2",
        teil: section.teil,
        teilTitle: section.title,
        sectionMode: "hv2-memory",
        addedIn: section.addedIn,
        updatedIn: section.updatedIn,
        reviewRows: buildReviewRows(section),
        german: section.title,
        chinese: "",
      };
      return [memory, ...questions.map(question => ({ ...question }))];
    });
  }

  function buildSections(sections) {
    return sections.map(section => {
      const questions = section.questions || [];
      const entries = questions.map((question, index) => ({
        question,
        index,
        sourceNumber: String(question.sourceNumber || question.number || ""),
        completion: getCompletion(question),
      }));
      const prepared = entries.map(entry => {
        if (!entry.completion) return null;
        const candidates = [];
        const seen = new Set();
        for (const other of entries) {
          if (other.sourceNumber === entry.sourceNumber || other.completion === entry.completion || seen.has(other.completion)) continue;
          if (!other.completion) continue;
          seen.add(other.completion);
          candidates.push(other.completion);
        }
        if (candidates.length < 2) return null;
        const distractors = [];
        const start = entry.index % candidates.length;
        for (let offset = 0; offset < candidates.length && distractors.length < 2; offset += 1) {
          const candidate = candidates[(start + offset) % candidates.length];
          if (candidate !== entry.completion && !distractors.includes(candidate)) distractors.push(candidate);
        }
        if (distractors.length !== 2) return null;
        return {
          ...entry.question,
          sectionMode: "hv2-choice",
          correctText: entry.completion,
          distractors,
          distractorSource: "same-teil-pdf-completions",
        };
      });

      // Preserve review cards if a future source group lacks enough distinct
      // PDF completions; never manufacture missing answer content.
      if (prepared.some(question => !question)) return section;
      return { ...section, mode: "hv2-choice", questions: prepared };
    });
  }

  function prepareQuestion(question, random = Math.random) {
    if (!question || question.sectionMode !== "hv2-choice" || question.distractors?.length !== 2) {
      throw new Error("HV2 three-choice questions require one PDF answer and two source-based practice distractors.");
    }
    const choices = [
      { text: question.correctText, correct: true },
      ...question.distractors.map(text => ({ text, correct: false })),
    ];
    for (let index = choices.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(random() * (index + 1));
      [choices[index], choices[swap]] = [choices[swap], choices[index]];
    }
    question.options = choices.map((choice, index) => ({
      value: "ABC"[index],
      label: `${"ABC"[index]}. ${choice.text}`,
      shortcut: `${index + 1} / ${"ABC"[index]}`,
      source: choice.correct ? question.source : question.distractorSource,
    }));
    question.answer = "ABC"[choices.findIndex(choice => choice.correct)];
    return question;
  }

  const api = {
    buildSections,
    buildReviewRows,
    buildRoundQueue,
    cleanCompletion,
    completeSentence,
    getCompletion,
    prepareQuestion,
  };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Hv2Quiz = api;
})(typeof window !== "undefined" ? window : globalThis);
