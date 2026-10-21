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

  // These claims are complete statements about subjects unrelated to the article.
  // They are authored independently and never derived from the correct completion.
  const unrelatedStatementsByTeil = {
    "1": [
      "Für das neue Kochbuch wurden Rezepte aus zwölf Regionen gesammelt.",
      "Das Orchester probt jeden Mittwoch in der Aula.",
      "Die mittelalterliche Stadtmauer wurde im vergangenen Jahr restauriert.",
      "Auf dem Wochenmarkt gibt es jeden Freitag frisches Brot aus der Region.",
    ],
    "2": [
      "In der alten Bibliothek werden historische Landkarten aufbewahrt.",
      "Der Chor führt im Frühjahr eine Operette auf.",
      "Die Köchin bereitet die Soße ausschließlich mit regionalen Kräutern zu.",
      "Das Schlossmuseum zeigt Möbel aus dem 18. Jahrhundert.",
    ],
    "3": [
      "Der Leuchtturm am Kap weist Schiffen seit über hundert Jahren den Weg.",
      "Die Philharmonie veranstaltet jeden Sommer ein Konzert unter freiem Himmel.",
      "In der Höhle wurden Spuren aus der Steinzeit entdeckt.",
      "Die Fähre verbindet die beiden Inseln zweimal täglich.",
    ],
    "4": [
      "Die Geigerin spielt seit ihrer Kindheit in einem Kammerorchester.",
      "Das Theater zeigt im Herbst eine Komödie aus dem 19. Jahrhundert.",
      "Die alte Brücke wurde aus hellem Sandstein gebaut.",
      "Der Keramikkurs findet jeden Donnerstag im Gemeindehaus statt.",
    ],
    "5": [
      "Der Bodensee entstand während der letzten Eiszeit.",
      "Die Oper wurde zum ersten Mal im Jahr 1923 aufgeführt.",
      "Das Segelschiff überquerte den Atlantik in knapp sechs Wochen.",
      "Im Museum ist eine Sammlung antiker Münzen zu sehen.",
    ],
    "6-1": [
      "Die Burg besitzt einen dreieckigen Innenhof.",
      "Die Töpferwerkstatt verkauft handbemalte Schalen.",
      "Ein Segelboot gewann die Regatta vor der Küste.",
      "Die Ausstellung zeigt Porträts aus dem frühen 20. Jahrhundert.",
    ],
    "6-2": [
      "Die Burg besitzt einen dreieckigen Innenhof.",
      "Die Töpferwerkstatt verkauft handbemalte Schalen.",
      "Ein Segelboot gewann die Regatta vor der Küste.",
      "Die Ausstellung zeigt Porträts aus dem frühen 20. Jahrhundert.",
    ],
    "7": [
      "Die Bäckerei öffnet am Wochenende bereits um sechs Uhr.",
      "Der Fußballverein trägt seine Heimspiele auf einem Kunstrasenplatz aus.",
      "Die Küche des Schlosses serviert ein Menü nach historischen Rezepten.",
      "Ein alter Dampfer liegt heute als Museumsschiff im Hafen.",
    ],
    "8": [
      "Das Rezept für die Suppe stammt aus einem Kochbuch von 1850.",
      "Der Bildhauer fertigt seine Figuren aus schwarzem Marmor.",
      "Die Theatergruppe probt ein Stück von Bertolt Brecht.",
      "Im Archiv lagern Briefe aus der Zeit der Hanse.",
    ],
    "9": [
      "Die Werft baute früher Segelschiffe für den Handel mit Norwegen.",
      "Die Opernsängerin gab ihr Debüt an der Mailänder Scala.",
      "Das erste Foto des Ortes entstand im Jahr 1864.",
      "Die Töpferei stellt Geschirr nach einer jahrhundertealten Technik her.",
    ],
    "10": [
      "Im Steinbruch wurden mehrere seltene Fossilien gefunden.",
      "Die regionale Küche ist für ihre würzigen Käsesorten bekannt.",
      "Das Theatergebäude wurde nach einem Brand vollständig wiederaufgebaut.",
      "Die Münzsammlung umfasst Prägungen aus sieben Ländern.",
    ],
    "11": [
      "Das Streichquartett spielt Werke aus der Wiener Klassik.",
      "Die Handschrift wurde im 14. Jahrhundert auf Pergament geschrieben.",
      "Die Käserei reift ihren Bergkäse in einem alten Gewölbekeller.",
      "Das Segelrennen beginnt traditionell am ersten Sonntag im Mai.",
    ],
    "12": [
      "Der Maler fertigte die Landschaftsbilder ausschließlich mit Aquarellfarben an.",
      "Im Steinbruch wird seit Jahrzehnten kein Marmor mehr abgebaut.",
      "Das Gericht wird mit Safran und gerösteten Mandeln serviert.",
      "Die Ausgrabung brachte eine römische Mosaikfläche ans Licht.",
    ],
    "13": [
      "Das Jazztrio veröffentlichte sein erstes Album im vergangenen Frühjahr.",
      "Bei der Ausgrabung kamen Keramikgefäße aus der Bronzezeit zum Vorschein.",
      "Der Komet war mehrere Wochen lang mit bloßem Auge zu sehen.",
      "Die Oper endet mit einem Chor auf der großen Freitreppe.",
    ],
    "14": [
      "Das Schauspielhaus zeigt eine neue Inszenierung von Faust.",
      "Die Werft ist auf den Bau kleiner Segelschiffe spezialisiert.",
      "Die Keramikerin brennt ihre Schalen bei besonders hoher Temperatur.",
      "Das Filmfestival widmet sich in diesem Jahr dem Stummfilm.",
    ],
    "15": [
      "Die Töpferin verkauft ihre Schalen auf einem Kunsthandwerkermarkt.",
      "Das Jazzfestival findet jedes Jahr in der zweiten Augustwoche statt.",
      "Die Schriftrolle enthält eine Abschrift eines antiken Gedichts.",
      "Der Geologe bestimmte das Alter des Gesteins anhand seiner Minerale.",
    ],
    "16": [
      "Das Kochbuch enthält Rezepte für traditionelle Gerichte aus Böhmen.",
      "Die Theatergruppe führt das Stück in einem historischen Ballsaal auf.",
      "Der Roman erzählt von einer Seereise im 18. Jahrhundert.",
      "Die Ausstellung zeigt Porzellan aus der Meißner Manufaktur.",
    ],
    "17": [
      "Die Glasbläserin formt ihre Vasen noch immer von Hand.",
      "Der Segelclub veranstaltet im Juni eine Regatta auf dem Bodensee.",
      "Die Oper wurde nach einer Vorlage aus der griechischen Mythologie komponiert.",
      "Im Heimatmuseum ist eine historische Schmiede eingerichtet.",
    ],
    "18": [
      "Das Kammerorchester spielt jeden Winter ein Konzert in der Dorfkirche.",
      "Die Ausgrabungen legten die Fundamente eines römischen Tempels frei.",
      "Das Kochbuch widmet sich ausschließlich der Küche Südfrankreichs.",
      "Die Glasmalerei im Chorraum stammt aus dem späten Mittelalter.",
    ],
    "generic": [
      "Das Kammerorchester probt zweimal in der Woche.",
      "Die Ausstellung zeigt Gemälde aus dem 18. Jahrhundert.",
      "Das Kochbuch enthält Rezepte aus verschiedenen Regionen.",
      "Die alte Brücke wurde aus rotem Sandstein errichtet.",
    ],
  };

  function createUnrelatedStatements(question, teil = question.teil) {
    const statements = unrelatedStatementsByTeil[String(teil)] || unrelatedStatementsByTeil.generic;
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
        const distractors = createUnrelatedStatements(entry.question, section.teil)
          .filter((text, index, all) => text && !allSourceAnswers.has(text) && all.indexOf(text) === index);
        if (distractors.length !== 2) return null;
        return {
          ...entry.question,
          sectionMode: "hv2-choice",
          correctText: entry.completion,
          distractors,
          distractorSource: "independent-unrelated-statement",
        };
      });

      // Keep review cards if a false option cannot be generated safely.
      if (prepared.some(question => !question)) return section;
      return { ...section, mode: "hv2-choice", questions: prepared };
    });
  }

  function prepareQuestion(question, random = Math.random) {
    if (!question || question.sectionMode !== "hv2-choice" || question.distractors?.length !== 2) {
      throw new Error("HV2 three-choice questions require one PDF answer and two unrelated statements.");
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
    createUnrelatedStatements,
    getCompletion,
    prepareQuestion,
  };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Hv2Quiz = api;
})(typeof window !== "undefined" ? window : globalThis);
