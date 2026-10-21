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

  const explicitFalseCompletions = {
    "2:55": [
      "hat einen langen Weg zu ihrer Arbeitsstelle",
      "hat keinen kurzen Weg zu ihrer Arbeitsstelle",
    ],
    "2:56": [
      "ist ausschließlich in Europa vertreten",
      "ist überhaupt nicht in Europa vertreten",
    ],
    "2:59": [
      "hörte schon vor dem Studium von den Arbeitsmöglichkeiten bei der ESA",
      "hörte erst nach dem Studium von den Arbeitsmöglichkeiten bei der ESA",
    ],
    "1:55": ["keine Touristen durch ein Museum führt", "Touristen in einem Stadion statt in einem Museum begleitet"],
    "1:57": ["die Roboterentwicklung vollständig eingestellt werden", "die Programmierung nicht weiterentwickelt werden"],
    "1:58a": ["werden sich Reinigungsroboter nicht selbst aufladen können", "bleiben Reinigungsroboter auf externe Stromversorgung angewiesen"],
    "1:58b": ["sind Roboter derzeit nicht in der Lage, sich selbst aufzuladen", "brauchen Roboter immer Menschen zum Aufladen"],
    "1:59b": ["nicht zum Schutz eigener Wohnungen eingesetzt werden", "keinesfalls zum Schutz von Wohnungen eingesetzt werden"],
    "1:63": ["Er sagt, dass Roboter Menschen niemals überlegen sind", "Er sagt, dass Roboter den Menschen immer unterlegen sind"],
    "1:64": ["müssen ethische Aspekte der Robotik nicht beachten", "sollen ethische Aspekte der Robotik vollständig ignorieren"],
    "2:57": ["gefällt Azra dort überhaupt nicht", "missfällt Azra wegen der Stimmung dort"],
    "2:58": ["werden keine gemeinsamen Freizeitaktivitäten angeboten", "werden ausschließlich berufliche Aktivitäten angeboten"],
    "2:61": ["wird keine feste Anzahl von Jobs bei der ESA angeboten", "gibt es unbegrenzt viele Stellen bei der ESA"],
    "2:62": ["können sich erst nach dem Studienabschluss bewerben", "dürfen sich erst nach dem Studienabschluss bewerben"],
    "2:63": ["werden nicht von den jeweiligen Ressorts durchgeführt", "werden zentral von einer einzigen Stelle durchgeführt"],
    "2:64": ["schätzungsweise an derselben ESA-Niederlassung bleiben", "keine andere ESA-Niederlassung suchen"],
    "4:61": [
      "besitzen zahlreiche natürliche kommunikative Fähigkeiten",
      "verfügen weiterhin über ausgeprägte natürliche Kommunikationsfähigkeiten",
    ],
    "3:55": ["kaufen gezielter ein als Männer", "kaufen planvoller ein als Männer"],
    "3:58": ["lässt ihren Mitarbeitern keine Freiräume zum Gestalten", "kontrolliert jeden Gestaltungsschritt ihrer Mitarbeiter"],
    "3:60": ["verursacht hohe Lagerkosten und kann deshalb keine günstigen Preise gewährleisten", "führt zu höheren Lagerkosten und deutlich teureren Preisen"],
    "3:63": ["legt keinen Wert auf die Beständigkeit der Produkte", "setzt vor allem auf kurzlebige Produkte"],
    "3:64": ["fehlte Frau Fischer in ihrer Jugend die Zielstrebigkeit, Geld zu verdienen", "entwickelte Frau Fischer erst später den Wunsch, Geld zu verdienen"],
    "4:55": ["versuchte nicht als erster, Pflanzengeräusche zu hören", "konnte keine Pflanzengeräusche hören"],
    "4:56a": ["ignorieren die Signale im Inneren von Pflanzen", "untersuchen ausschließlich äußere Einflüsse auf Pflanzen"],
    "4:56b": ["ignorieren die Signale im Inneren von Pflanzen", "untersuchen ausschließlich äußere Einflüsse auf Pflanzen"],
    "4:57": ["das Absinken des Wassers im Baum", "die Bewegung von Luft in der Pflanze"],
    "4:58": ["verfolgt primär das Ziel, Schädlinge anzulocken", "dient allein der individuellen Selbstverteidigung"],
    "4:59": ["schädlingsfressende Insekten vertreibt", "Schädlinge mit giftigen Stoffen abtötet"],
    "4:60": ["können ihre Artgenossen nicht vor Schädlingen warnen", "können Artgenossen vor Schädlingen nicht erreichen"],
    "4:62": ["das menschliche Immunsystem schwächen", "keinen positiven Einfluss auf das menschliche Immunsystem haben"],
    "4:63": ["suchen nach Belegen für gesundheitliche Risiken durch Pflanzen", "haben die wohltuende Wirkung von Pflanzen bereits abschließend widerlegt"],
    "4:64": ["geben keinen Aufschluss über den Klimawandel", "sagen nichts über frühere Klimaveränderungen aus"],
    "7:55": [
      "Forschung eine Sache ausschließlich für Laien ist",
      "Forschung ohne Fachwissen betrieben werden kann",
    ],
    "7:61": [
      "können jederzeit auf die Arbeit von Laien verzichten",
      "kommen vollständig ohne die Arbeit von Laien aus",
    ],
    "9:55": [
      "wünscht sich ausdrücklich einen eigenen Garten",
      "träumt von einem eigenen Garten",
    ],
    "5:55": ["wird nun von keiner Wissenschaftlerin untersucht", "bleibt wissenschaftlich völlig unbeachtet"],
    "5:56": ["hat nur eine Gruppe beschrieben", "hat keine Gruppen beschrieben"],
    "5:58": ["gab es keinen Wettbewerb zwischen den Frauen im Haus", "lebten Frauen und Schwiegermütter stets konfliktfrei zusammen"],
    "5:59": ["wurden Schwiegermütter nie Gegenstand der Literatur", "waren Schwiegermütter kein Thema in der Literatur"],
    "5:60": ["einen starken Sohn", "einen selbstbewussten Sohn"],
    "5:61": ["nur sehr wenige Ehefrauen Probleme mit der Schwiegermutter haben", "die Mehrheit der Ehefrauen Probleme mit der Schwiegermutter hat"],
    "5:62": ["sich in die Streitereien einmischen", "den Konflikt offen verschärfen"],
    "5:63": ["respektiert die Privatsphäre des jungen Paares", "hält sich konsequent aus dem Leben des jungen Paares heraus"],
    "5:64": ["Männer ihre neue Familie der Herkunftsfamilie vorziehen", "Männer beide Familien gleich behandeln"],
    "10:55": [
      "hat großes Interesse am Studentenleben außerhalb der Uni",
      "engagiert sich stark im Studentenleben außerhalb der Uni",
    ],
    "10:56": [
      "erkannten Finjas Besonderheit schon kurz nach ihrer Geburt",
      "erkannten Finjas Besonderheit sofort im Säuglingsalter",
    ],
    "10:62": [
      "deutet immer auf eine Hochbegabung hin",
      "beweist in jedem Fall eine Hochbegabung",
    ],
    "11:61": [
      "nimmt die Zahl der nicht im Familienverband Lebenden in den Städten ab",
      "geht die Zahl der nicht im Familienverband Lebenden in den Städten zurück",
    ],
    "13:56": [
      "verkaufen die meisten ihrer Haute-Couture-Modelle",
      "verkaufen nahezu alle ihrer Haute-Couture-Modelle",
    ],
    "14:55": [
      "nutzt das Fahrrad regelmäßig für den Weg zur Arbeit",
      "fährt fast täglich mit dem Fahrrad zur Arbeit",
    ],
    "15:56": [
      "kann man Unterkünfte in allen Preiskategorien buchen",
      "kann man ausschließlich Luxusunterkünfte buchen",
    ],
    "15:64": [
      "seine Website hatte von Anfang an sehr viele Besucher",
      "seine Website war schon zum Start stark besucht",
    ],
    "16:61": [
      "werden durch Wolken gestört",
      "werden häufig von Wolken blockiert",
    ],
    "17:55": [
      "hat sich große Hoffnung auf einen Preis gemacht",
      "rechnete fest mit einem Preis",
    ],
  };

  const finiteVerbs = new Set((
    "hat haben hatte hatten ist sind war waren wird werden wurde wurden kann können konnte " +
    "muss müssen musste soll sollen sollte sollten will wollen möchte möchten darf dürfen " +
    "gefällt gefällt gefallen lässt lasst ließ sagt sagt sagt hält hält denkt meint spricht " +
    "hörte bekommt bekam erkannten erkennt reagierten reagiert zeigt zeigen beginnt begann " +
    "bleibt bleiben steht standen verkauft verkaufen verkauft verfolgt suchen sucht nutzt " +
    "wünscht wünschen spart spart bietet bieten kann können besitzt bestehen besteht " +
    "entwickelt entwickelte benötigt braucht braucht befasst befindet behandelt behandeln " +
    "umfasst umfasst diente dienten erzielt erzielt liegt liegen nimmt nehmen schadet " +
    "schaden führte fuhrt führen arbeitet arbeiten vermittelt konzentriert konzentrieren " +
    "erwähnt erwartet plant meint würde gelten gilt beschreibt beschreiben ermöglichen " +
    "hilft helfen gehört gehören informiert informiert vergleicht vergleiche erfasst " +
    "erhält erwies erwies sich fuhrt führt aufladen aufzuladen erheben erforschen ergründen " +
    "bezeichnet bezeichnete anlockt stärken stärken warnen aufspüren aufgespürt entwickeln " +
    "einkaufen einkaufen verzichten verzichten bewerben besuchen verbessern verkaufen schreiben " +
    "arbeiten lösen beraten anbieten angeboten"
  ).split(/\s+/));

  function insertFalseMarker(completion, marker) {
    const words = String(completion || "").trim().split(/\s+/).filter(Boolean);
    if (!words.length) return "";
    const normalize = (word) => word.replace(/^[^\p{L}]+|[^\p{L}-]+$/gu, "").toLocaleLowerCase("de");
    const first = normalize(words[0]);
    let index = -1;

    if (finiteVerbs.has(first)) {
      index = 1;
      if (["sich", "es"].includes(normalize(words[index]))) {
        index += 1;
        if (words[index] && /^[A-ZÄÖÜ]/u.test(words[index])) index += 1;
      } else if (words[index] && /^[A-ZÄÖÜ]/u.test(words[index])) {
        index += 1;
      }
    } else if (["er", "sie", "es", "man"].includes(first) && finiteVerbs.has(normalize(words[1]))) {
      index = 2;
    } else {
      const articles = new Set(["der", "die", "das", "ein", "eine", "einen", "einem", "einer", "den", "dem"]);
      if (articles.has(first)) {
        index = words.findIndex((word, wordIndex) => wordIndex > 0 && /^[A-ZÄÖÜ]/u.test(word)) + 1;
        if (index === 0) index = 2;
      } else if (words[0] && /^[A-ZÄÖÜ]/u.test(words[0])) {
        index = 1;
      } else if (words[1] && /^[A-ZÄÖÜ]/u.test(words[1])) {
        index = 2;
      }

      if (index < 0) {
        const predicateIndex = words.findLastIndex(word => finiteVerbs.has(normalize(word)));
        if (predicateIndex >= 0) index = predicateIndex;
        else if (words.some(word => normalize(word) === "zu")) index = words.findIndex(word => normalize(word) === "zu");
      }
    }

    if (index < 0) index = 0;
    words.splice(index, 0, marker);
    return words.join(" ");
  }

  function createFalseCompletions(question, correct, teil = question.teil) {
    const key = `${teil}:${question.number}`;
    if (explicitFalseCompletions[key]) return [...explicitFalseCompletions[key]];

    const normalized = correct.toLocaleLowerCase("de");
    if (/\bnicht nur\b/.test(normalized)) {
      const withoutNot = correct.replace(/\bnicht nur\b/i, "nur");
      return [withoutNot, correct.replace(/\bnicht nur\b/i, "überhaupt nicht")];
    }
    if (/\bnicht immer\b/.test(normalized)) {
      return [correct.replace(/\bnicht immer\b/i, "immer"), correct.replace(/\bnicht immer\b/i, "ausnahmslos immer")];
    }
    if (/\bnicht oft\b/.test(normalized)) {
      return [correct.replace(/\bnicht oft\b/i, "oft"), correct.replace(/\bnicht oft\b/i, "regelmäßig")];
    }
    if (/\bkaum mehr\b/.test(normalized)) {
      return [correct.replace(/\bkaum mehr\b/i, "zahlreiche"), correct.replace(/\bkaum mehr\b/i, "ausgeprägte")];
    }
    if (/\bkein(e|en|er|es|em)?\b/i.test(normalized)) {
      return [
        correct.replace(/\bkein(e|en|er|es|em)?\b/i, "ein"),
        correct.replace(/\bkein(e|en|er|es|em)?\b/i, "einen"),
      ];
    }
    return [insertFalseMarker(correct, "nicht"), insertFalseMarker(correct, "niemals")];
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
        const distractors = createFalseCompletions(entry.question, entry.completion, section.teil)
          .map(cleanCompletion)
          .filter((text, index, all) => text && !allSourceAnswers.has(text) && all.indexOf(text) === index);
        if (distractors.length !== 2) return null;
        return {
          ...entry.question,
          sectionMode: "hv2-choice",
          correctText: entry.completion,
          distractors,
          distractorSource: "synthetic-false-completion",
        };
      });

      // Keep review cards if a false option cannot be generated safely.
      if (prepared.some(question => !question)) return section;
      return { ...section, mode: "hv2-choice", questions: prepared };
    });
  }

  function prepareQuestion(question, random = Math.random) {
    if (!question || question.sectionMode !== "hv2-choice" || question.distractors?.length !== 2) {
      throw new Error("HV2 three-choice questions require one PDF answer and two synthetic false distractors.");
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
    createFalseCompletions,
    getCompletion,
    prepareQuestion,
  };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Hv2Quiz = api;
})(typeof window !== "undefined" ? window : globalThis);
