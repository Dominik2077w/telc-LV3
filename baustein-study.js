(function (root) {
  function tidyGerman(value) {
    return String(value || "").replace(/\s+/g, " ").replace(/\s+([,.;:!?])/g, "$1")
      .replace(/([,;:])(?=\p{L})/gu, "$1 ").trim();
  }

  function sentenceBounds(text, target) {
    const boundaries = [0];
    for (let index = 0; index < text.length; index += 1) {
      if (!/[.!?…]/u.test(text[index])) continue;
      if (text[index] === ".") {
        const before = text.slice(0, index + 1);
        const after = text.slice(index + 1);
        if (/(?<!\p{L})(?:Dr|Prof|bzw|ca|Nr|sog|usw|Chr|\p{L})\.$/u.test(before)) continue;
        if (/\d\.$/.test(before) && /^\s*(?:\d|Jahrhundert|Jahrtausend|Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)/u.test(after)) continue;
        if (/^[.\s]*\(0\)/.test(after)) continue;
      }
      boundaries.push(index + 1);
    }
    boundaries.push(text.length);
    return [boundaries.filter(index => index <= target).at(-1), boundaries.find(index => index > target)];
  }

  // Repair sentence-boundary punctuation in the extracted display text only.
  // Answer words and the PDF corpus remain untouched.
  function sentenceTemplate(section, question) {
    let text = section.article || question.german || question.text || "";
    const repairs = {
      1: [
        [/analysieren\.\s*,/g, "analysieren,"],
        [/artikulieren\.\s*(?=\[13\]____)/g, "artikulieren, "],
        [/schreiben würde\s+Aber/g, "schreiben würde. Aber"],
      ],
      2: [
        [/(\[4\]____)\s+(?=Wir wollen)/g, "$1. "],
        [/(\[9\]____)\s+(?=Rauchen verändert)/g, "$1. "],
      ],
      5: [[/Uhrenwerbung\s+Während/g, "Uhrenwerbung. Während"]],
      6: [
        [/(\[12\]____)\s+(?=Dennoch)/g, "$1. "],
        [/(\[19\]____)\s+(?=Wenn)/g, "$1. "],
      ],
      7: [
        [/(\[5\]____)\s+(?=In Deutschland)/g, "$1. "],
        [/Standard\s+(?=\[14\]____)/g, "Standard. "],
        [/wurden\.\s*kam Ende/g, "wurden, kam Ende"],
        [/(\[22\]____)\s+(?=Neben dem)/g, "$1. "],
      ],
      8: [
        [/meine\.\s*Studiengang/g, "meine Studiengang"],
        [/studiert\s+Sie hat/g, "studiert. Sie hat"],
        [/Zukunftsplanung\.“ erklärt Julia Protze\.\s*(\[14\]____) an der Philologischen Fakultät Franziska/g,
          "Zukunftsplanung“, erklärt Julia Protze, $1 an der Philologischen Fakultät. Franziska"],
        [/bekommen\.\s*„berichtet/g, "bekommen“, berichtet"],
      ],
      9: [
        [/hanebüchen»Kokolores/g, "hanebüchen. »Kokolores"],
        [/verbinde,,Schlingel/g, "verbinde. „Schlingel"],
        [/Gründe\.\s*Warum/g, "Gründe, warum"],
      ],
      10: [
        [/(\[4\]____),\s*Die Sache/g, "$1. Die Sache"],
        [/Haken\s+Brauchte/g, "Haken: Brauchte"],
        [/(\[5\]____)\s+(?=Um dieses)/g, "$1. "],
        [/(\[7\]____)\s+(?=Natural-)/g, "$1: "],
        [/(\[11\]____)\s+(?=Im Lauf)/g, "$1. "],
        [/(\[12\]____)\s+(?=Als)/g, "$1. "],
        [/(\[20\]____)\s+(?=Möglicherweise)/g, "$1. "],
      ],
      11: [[/Zdqimmer\s+Jeder/g, "Jeder"], [/(\[1\]____)\s+(?=Er fängt)/g, "$1: "]],
      16: [[/(\[12\]____)\s+(?=Die)/g, "$1. "]],
      17: [
        [/(\[19\]____)\s+(?=Die jüngere)/g, "$1. "],
        [/(\[24\]____)\s+(?=Sie wird)/g, "$1. "],
      ],
    };
    for (const [pattern, replacement] of repairs[section.teil] || []) text = text.replace(pattern, replacement);
    return text;
  }

  function buildSentence(section, question) {
    const token = `[${question.number}]____`;
    const template = sentenceTemplate(section, question);
    if (!template.includes(token)) return null;
    const sentinel = "\uFFF0";
    const answers = new Map((section.questions || []).map(item => [String(item.number), item.answerText || ""]));
    const prepared = template.replace(/\[(\d+)\]____/g, (marker, number) =>
      marker === token ? sentinel : ` ${answers.get(number) || marker} `
    );
    const target = prepared.indexOf(sentinel);
    const [start, end] = sentenceBounds(prepared, target);
    const before = tidyGerman(prepared.slice(start, target));
    const after = tidyGerman(prepared.slice(target + sentinel.length, end));
    const answer = String(question.answerText || "").trim();
    return { before, answer, after, sentence: tidyGerman([before, answer, after].filter(Boolean).join(" ")) };
  }

  // The source sometimes numbers additional German words as separate local
  // cards. These anchors align them with the Chinese paragraph's own numbers.
  const translationNumbers = {
    2: [1, 2, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22],
    5: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21],
    6: [1, 2, 3, 4, 5, 6, 6, 7, 8, 9, 10, 11, 12, 13, 14, 14, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25],
    7: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 12, 14, 15, 16, 17, 17, 18, 19, 20, 21],
    8: [1, 2, 2, 3, 4, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 16, 17, 17, 17, 18, 18, 18, 19, 20],
    10: [1, 2, 3, 3, 4, 5, 6, 7, [8, 9], [8, 9], 10, 11, 12, 13, 14, 15, 16, 17, 18, 18],
    11: [1, 2, 3, 4, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21],
    16: [25, 26, 27, 28, 29, 29, 30, 31, 32, 32, 33, 34, 35, 36, 37, 37, 38, 39, 40, 41, 42, 43],
    17: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 22, 23, 24, 25, 26],
  };

  function chineseSentences(value) {
    return (String(value || "").match(/[^。！？]+[。！？][”」』"]?|[^。！？]+$/gu) || []).map(text => text.trim());
  }

  function cleanChinese(value) {
    return String(value || "")
      .replace(/[（(]\s*\d+\s*[）)]/g, "")
      .replace(/(?<=[\u3400-\u9fff])\s+(?=[\u3400-\u9fff])/gu, "")
      .replace(/\s+([，。！？；：、])/g, "$1")
      .trim();
  }

  function sentenceChinese(section, question) {
    const mapping = translationNumbers[String(section.teil)];
    const anchor = mapping ? mapping[Number(question.number) - 1] : Number(question.number);
    if (String(section.teil) === "14" && Number(question.number) === 46) {
      return cleanChinese(chineseSentences(question.chinese).find(text => text.includes("现在，人们应该彻底消除")));
    }
    const translatedNumber = String(section.teil) === "13" && Number(question.number) === 33 ? 32 : anchor;
    const markers = (Array.isArray(translatedNumber) ? translatedNumber : [translatedNumber])
      .map(number => new RegExp(`[（(]\\s*${number}\\s*[）)]`));
    const matches = chineseSentences(question.chinese).filter(text => markers.some(marker => marker.test(text)));
    return matches.length ? cleanChinese(matches.join("")) : "";
  }

  function buildReviewRows(section) {
    return (section.questions || []).map(question => {
      const sentence = buildSentence(section, question);
      return {
        number: String(question.number),
        ...(sentence || { before: "", answer: question.answerText || question.answer || "", after: "", sentence: "" }),
        chinese: sentence ? sentenceChinese(section, question) : "",
        sourceMissing: !sentence,
        sourceNote: String(section.teil) === "21" && Number(question.number) === 38
          ? "当前语料此处原句有缺文，保留现有片段与原文译句。" : "",
      };
    }).sort((a, b) => a.number.localeCompare(b.number, "en", { numeric: true }));
  }

  function buildRoundQueue(sections, practiceQuestions) {
    return sections.flatMap(section => {
      const practice = Array.isArray(practiceQuestions)
        ? practiceQuestions.filter(question => String(question.teil) === String(section.teil))
        : section.mode === "corpus-card"
          ? section.questions || []
          : (section.questions || []).length ? [{ ...section, sectionMode: "baustein-article" }] : [];
      if (!practice.length) return [];
      return [{
        id: `baustein-memory-${section.teil}`,
        level: "baustein",
        teil: section.teil,
        teilTitle: section.title,
        sectionMode: "baustein-memory",
        reviewRows: buildReviewRows(section),
        addedIn: section.addedIn,
        updatedIn: section.updatedIn,
      }, ...practice.map(question => ({ ...question }))];
    });
  }

  const api = { buildReviewRows, buildRoundQueue, buildSentence, sentenceChinese };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.BausteinStudy = api;
})(typeof window !== "undefined" ? window : globalThis);
