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

  // Subjectless fragments about topics unrelated to the article. Like the PDF
  // completions, they omit the sentence head; no fragment rewrites a PDF answer.
  const unrelatedCompletionsByTeil = {
    "1": [
      "hat Rezepte aus zwölf Regionen gesammelt",
      "probt jeden Mittwoch in der Aula",
      "wurde im vergangenen Jahr restauriert",
      "bietet jeden Freitag frisches Brot aus der Region an",
    ],
    "2": [
      "bewahrt historische Landkarten auf",
      "führt im Frühjahr eine Operette auf",
      "bereitet die Soße mit regionalen Kräutern zu",
      "zeigt Möbel aus dem 18. Jahrhundert",
    ],
    "3": [
      "weist Schiffen seit über hundert Jahren den Weg",
      "veranstaltet jeden Sommer ein Konzert unter freiem Himmel",
      "hat in einer Höhle Spuren aus der Steinzeit entdeckt",
      "verbindet die beiden Inseln zweimal täglich",
    ],
    "4": [
      "spielt seit vielen Jahren in einem Kammerorchester",
      "zeigt im Herbst eine Komödie aus dem 19. Jahrhundert",
      "wurde aus hellem Sandstein gebaut",
      "findet jeden Donnerstag im Gemeindehaus statt",
    ],
    "5": [
      "entstand während der letzten Eiszeit",
      "wurde zum ersten Mal im Jahr 1923 aufgeführt",
      "überquerte den Atlantik in knapp sechs Wochen",
      "zeigt eine Sammlung antiker Münzen",
    ],
    "6-1": [
      "besitzt einen dreieckigen Innenhof",
      "verkauft handbemalte Schalen",
      "gewann die Regatta vor der Küste",
      "zeigt Porträts aus dem frühen 20. Jahrhundert",
    ],
    "6-2": [
      "besitzt einen dreieckigen Innenhof",
      "verkauft handbemalte Schalen",
      "gewann die Regatta vor der Küste",
      "zeigt Porträts aus dem frühen 20. Jahrhundert",
    ],
    "7": [
      "öffnet am Wochenende bereits um sechs Uhr",
      "trägt die Heimspiele auf einem Kunstrasenplatz aus",
      "serviert ein Menü nach historischen Rezepten",
      "liegt heute als Museumsschiff im Hafen",
    ],
    "8": [
      "stammt aus einem Kochbuch von 1850",
      "fertigt Figuren aus schwarzem Marmor",
      "probt ein Stück von Bertolt Brecht",
      "bewahrt Briefe aus der Zeit der Hanse auf",
    ],
    "9": [
      "baute früher Segelschiffe für den Handel mit Norwegen",
      "gab ein Debüt an der Mailänder Scala",
      "entstand im Jahr 1864",
      "stellt Geschirr nach einer jahrhundertealten Technik her",
    ],
    "10": [
      "hat im Steinbruch mehrere seltene Fossilien gefunden",
      "ist für würzige Käsesorten bekannt",
      "wurde nach einem Brand vollständig wiederaufgebaut",
      "umfasst Prägungen aus sieben Ländern",
    ],
    "11": [
      "spielt Werke aus der Wiener Klassik",
      "wurde im 14. Jahrhundert auf Pergament geschrieben",
      "lässt Bergkäse in einem alten Gewölbekeller reifen",
      "beginnt traditionell am ersten Sonntag im Mai",
    ],
    "12": [
      "fertigte Landschaftsbilder mit Aquarellfarben an",
      "hat früher Marmor in einem Steinbruch abgebaut",
      "wird mit Safran und gerösteten Mandeln serviert",
      "brachte eine römische Mosaikfläche ans Licht",
    ],
    "13": [
      "veröffentlichte das erste Album im vergangenen Frühjahr",
      "hat Keramikgefäße aus der Bronzezeit freigelegt",
      "war mehrere Wochen lang mit bloßem Auge zu sehen",
      "endet mit einem Chor auf der großen Freitreppe",
    ],
    "14": [
      "zeigt eine neue Inszenierung von Faust",
      "ist auf den Bau kleiner Segelschiffe spezialisiert",
      "brennt Schalen bei besonders hoher Temperatur",
      "widmet sich in diesem Jahr dem Stummfilm",
    ],
    "15": [
      "verkauft Schalen auf einem Kunsthandwerkermarkt",
      "findet jedes Jahr in der zweiten Augustwoche statt",
      "enthält eine Abschrift eines antiken Gedichts",
      "bestimmte das Alter des Gesteins anhand seiner Minerale",
    ],
    "16": [
      "enthält Rezepte für traditionelle Gerichte aus Böhmen",
      "führt das Stück in einem historischen Ballsaal auf",
      "erzählt von einer Seereise im 18. Jahrhundert",
      "zeigt Porzellan aus der Meißner Manufaktur",
    ],
    "17": [
      "formt Vasen noch immer von Hand",
      "veranstaltet im Juni eine Regatta auf dem Bodensee",
      "wurde nach einer Vorlage aus der griechischen Mythologie komponiert",
      "zeigt eine historische Schmiede im Heimatmuseum",
    ],
    "18": [
      "spielt jeden Winter ein Konzert in der Dorfkirche",
      "hat die Fundamente eines römischen Tempels freigelegt",
      "widmet sich der Küche Südfrankreichs",
      "stammt aus dem späten Mittelalter",
    ],
    "generic": [
      "probt zweimal in der Woche",
      "zeigt Gemälde aus dem 18. Jahrhundert",
      "enthält Rezepte aus verschiedenen Regionen",
      "wurde aus rotem Sandstein errichtet",
    ],
  };

  function createUnrelatedCompletions(question, teil = question.teil) {
    const statements = unrelatedCompletionsByTeil[String(teil)] || unrelatedCompletionsByTeil.generic;
    const seed = `${teil}:${question.number || question.sourceNumber || ""}:${question.german || question.text || ""}`;
    let hash = 0;
    for (const character of seed) hash = (hash * 31 + character.codePointAt(0)) >>> 0;
    const first = hash % statements.length;
    const offset = 1 + ((hash >>> 4) % (statements.length - 1));
    const second = (first + offset) % statements.length;
    return [statements[first], statements[second]];
  }

  function buildSections(sections) {
    const allSourceAnswers = new Set(sections.flatMap(section =>
      (section.questions || []).map(getCompletion).filter(Boolean)
    ));
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
        const distractors = createUnrelatedCompletions(entry.question, section.teil)
          .filter((text, index, all) => text && !allSourceAnswers.has(text) && all.indexOf(text) === index);
        if (distractors.length !== 2) return null;
        return {
          ...entry.question,
          sectionMode: "hv2-choice",
          correctText: entry.completion,
          distractors,
          distractorSource: "independent-unrelated-completion",
        };
      });

      // Keep review cards if a false option cannot be generated safely.
      if (prepared.some(question => !question)) return section;
      return { ...section, mode: "hv2-choice", questions: prepared };
    });
  }

  function prepareQuestion(question, random = Math.random) {
    if (!question || question.sectionMode !== "hv2-choice" || question.distractors?.length !== 2) {
      throw new Error("HV2 three-choice questions require one PDF answer and two unrelated completion fragments.");
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
      label: `${"ABC"[index]}. ${choice.text.trim().replace(/[.!?…\s]+$/u, "")}`,
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
    createUnrelatedCompletions,
    getCompletion,
    prepareQuestion,
  };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Hv2Quiz = api;
})(typeof window !== "undefined" ? window : globalThis);
