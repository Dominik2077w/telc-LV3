(function (root) {
  function buildSections(sections, distractors) {
    return sections.map(section => ({
      ...section,
      questions: section.questions.flatMap(question => (question.items || []).flatMap((item, index) => {
        if (item.unverified) return [];
        const correctText = item.german || item.text;
        const wrongTexts = distractors.paragraphs[section.teil]?.[question.paragraph];
        if (!correctText || wrongTexts?.length !== 2 || new Set([correctText, ...wrongTexts]).size !== 3) {
          throw new Error(`LV2 ${section.teil}/${question.paragraph}: expected a source answer and two distinct distractors`);
        }
        return [{
          ...question,
          id: `${question.id}-item-${index}`,
          sectionMode: "lv2-choice",
          sourceItem: item,
          correctText,
          distractors: wrongTexts,
          distractorSource: distractors.source,
        }];
      })),
    }));
  }

  // Shuffle on every presentation, including mistake rounds. Source paragraphs
  // and item mappings are never mutated or supplemented with invented answers.
  function prepareQuestion(question, random = Math.random) {
    const choices = [
      { text: question.correctText, correct: true, source: question.sourceItem.source },
      ...question.distractors.map(text => ({ text, correct: false, source: question.distractorSource })),
    ];
    for (let i = choices.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }
    question.options = choices.map((choice, index) => ({
      value: "ABC"[index],
      label: `${"ABC"[index]}. ${choice.text}`,
      shortcut: `${index + 1} / ${"ABC"[index]}`,
      source: choice.source,
    }));
    question.answer = "ABC"[choices.findIndex(choice => choice.correct)];
    return question;
  }

  const api = { buildSections, prepareQuestion };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Lv2Quiz = api;
})(typeof window !== "undefined" ? window : globalThis);
