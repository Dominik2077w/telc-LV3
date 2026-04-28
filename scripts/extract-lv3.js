const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const sourcePath = path.join(root, "MinerU_markdown_202604272326351_83e110a2.md");
const outDir = path.join(root, "data");
const docsDir = path.join(root, "docs");

const manualQuestionFixes = {
  "1:14": {
    german: "Deutsche Unternehmen können ihren Bedarf an technischen und naturwissenschaftlichen Fachkräften nicht decken.",
    chinese: "德国企业无法满足对技术和自然科学专业人才的需求。",
  },
  "2:13:0": {
    german: "Konsumenten nehmen Verpackungen als gegeben hin.",
    chinese: "消费者把包装视为理所当然。",
  },
  "2:13:1": {
    german: "Konsumenten machen sich weniger Gedanken über Verpackungen.",
    chinese: "消费者很少会去思考包装的问题。",
  },
  "2:14": {
    german: "Der Umsatz der deutschen Verpackungsindustrie ist bei Papier- und Pappverpackungen am höchsten.",
    chinese: "德国包装行业的营业额在纸和纸板包装领域最高。",
  },
  "2:15": {
    german: "Die Konkurrenz aus Niedriglohnländern bescherte der Verpackungsindustrie milliardenschwere Einbußen.",
    chinese: "来自低工资国家的竞争给包装行业带来了数十亿的损失。",
  },
  "2:16": {
    german: "Verpackungen dienen ursprünglich dem Schutz vor Verschmutzung.",
    chinese: "包装最初的用途是防止污染。",
  },
  "2:17:0": {
    german: "Am Anfang sollen Verpackungen es ermöglichen, dass Waren gut befördert werden konnten.",
    chinese: "起初，包装应当能使货物得到良好运输。",
  },
  "2:17:1": {
    german: "Verbraucherverbände warnen vor Mineralöl in Verpackungen.",
    chinese: "消费者协会警告包装中含有矿物油。",
  },
  "2:17:2": {
    german: "Verbraucherverbände lassen regelmäßig den Mineralölgehalt in Verpackungen untersuchen.",
    chinese: "消费者协会定期让人检测包装中的矿物油含量。",
  },
  "2:18:0": {
    german: "Die Verpackungsindustrie muss in Zukunft die Forschung in den Mittelpunkt stellen.",
    chinese: "包装行业今后必须把研究置于核心位置。",
  },
  "2:18:1": {
    german: "Die neu entwickelten ökologischen Materialien schnitten bei Verbraucherumfragen nicht gut ab.",
    chinese: "新开发的环保材料在消费者调查中表现不佳。",
  },
  "2:19": {
    german: "Immer mehr Forscher versuchen, als Alternative zu Plastik Biokunststoffe zu entwickeln.",
    chinese: "越来越多的研究人员试图把生物塑料作为塑料的替代品来开发。",
  },
  "2:20:0": {
    german: "Innovative Lebensmittelverpackungen werden die Angabe des Mindesthaltbarkeitsdatums überflüssig machen.",
    chinese: "创新的食品包装将使标注最低保质期变得不再必要。",
  },
  "2:20:1": {
    german: "Innovative Lebensmittelverpackungen werden künftig Auskunft darüber geben, ob ein Produkt schon verdorben ist.",
    chinese: "创新的食品包装今后将能告知某产品是否已经变质。",
  },
  "2:21": {
    german: "Um für die Konsumenten attraktiv zu sein, sprechen Verpackungen schon heute alle fünf Sinne an.",
    chinese: "为了对消费者有吸引力，包装在今天就已经能调动五种感官。",
  },
  "2:22:0": {
    german: "Verbraucherinformationen brauchen in Zukunft fast doppelt so viel Platz auf der Verpackung.",
    chinese: "将来包装上的消费信息几乎需要两倍的空间。",
  },
  "2:22:1": {
    german: "Verpackungen bieten in Zukunft zweimal so viel Platz für Konsumenteninformationen.",
    chinese: "将来包装会为消费信息提供两倍的空间。",
  },
  "2:23:0": {
    german: "Die Unternehmen müssen sich an kurzfristigen Bedarf anpassen.",
    chinese: "企业必须适应短期需求。",
  },
  "2:23:1": {
    german: "Die Unternehmen der Verpackungsindustrie müssen ihre Produktion besser an den kurzfristigen Bedarf anpassen.",
    chinese: "包装行业的企业必须把生产更好地调整到短期需求上。",
  },
  "2:24": {
    german: "Zukunftsperspektiven für die Verpackungsindustrie.",
    chinese: "包装行业的未来前景。",
  },
  "3:16": {
    german: "Die Mitarbeiter der Mensa rechnen selbst aus, wie viel sie von jedem Lebensmittel bestellen müssen.",
  },
  "8:17": {
    german: "Die Reisenden mussten sich alle mit bescheidenen Übernachtungsmöglichkeiten zufriedengeben.",
  },
  "10:18": {
    german: "Schäfer und Schafe sind heute auch als Film- und Comicfiguren beliebt.",
  },
  "12:15": {
    german: "Einige der Inseln, die Vögeln Lebensraum bieten, dürfen nicht von Besuchern betreten werden.",
  },
  "12:18": {
    german: "Offiziell heißt es, dass die künstliche Insel die Hauptinsel entlasten sollte.",
  },
};

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function normalizeAnswer(value) {
  if (!value) return null;
  const upper = value.toUpperCase();
  if (upper === "×") return "X";
  return upper;
}

function extractAnswer(text) {
  const answerMatches = [
    /\(([RFXABC])\)/i,
    /\(([ABC])\.\)/i,
    /（([RFXABC])）/i,
    /\b(Richtig)\b/i,
    /\\times/i,
    /\b([RFXABC])\s*$/i,
    /[（(]\s*[×x]\s*[）)]?/i,
    /[。\.、]\s*[×x]\s*$/i,
  ];

  for (const pattern of answerMatches) {
    const match = text.match(pattern);
    if (!match) continue;
    if (match[1] && match[1].toLowerCase() === "richtig") return "R";
    if (match[1]) return normalizeAnswer(match[1]);
    return "X";
  }

  return null;
}

function cleanQuestionText(text) {
  return text
    .replace(/\(([RFXABC])\)/gi, "")
    .replace(/（([RFXABC])）/gi, "")
    .replace(/\bRichtig\b/gi, "")
    .replace(/[（(]\s*[×x]\s*[）)]?/gi, "")
    .replace(/\$?\(?\\times\)?\$?/gi, "")
    .replace(/\s+[RFXABC]\s*$/i, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim();
}

function cjkCount(text) {
  return (text.match(/[\u3400-\u9fff]/g) || []).length;
}

function latinCount(text) {
  return (text.match(/[A-Za-zÄÖÜäöüß]/g) || []).length;
}

function isLikelyTranslationLine(line) {
  const match = line.match(/^\s*#?\s*(?:第)?(?:1[3-9]|2[0-4])\s*[\-.,，]?\s*(.+?)\s*$/);
  if (!match) return false;
  const body = match[1];
  const germanSignal = /\b(der|die|das|und|ist|sind|hat|haben|kann|können|wurde|werden|mit|für|von|zu|in|auf|nicht|keine|als|ein|eine|einer|einen)\b/i.test(body);
  const startsAsChinese = /^[^A-Za-zÄÖÜäöüß]*[\u3400-\u9fff]/.test(body);
  const firstCjk = body.search(/[\u3400-\u9fff]/);
  if (firstCjk >= 0 && firstCjk < 25 && !germanSignal) return true;
  if ((startsAsChinese || cjkCount(body) > latinCount(body) * 0.6) && !germanSignal) return true;
  return cjkCount(body) > latinCount(body);
}

function startsWithQuestion(line) {
  if (isLikelyTranslationLine(line)) return false;
  return /^\s*#?\s*(1[3-9]|2[0-4])\s*[\-.,，]?\s+/.test(line) || /^\s*#?\s*(1[3-9]|2[0-4])\s*[\-.,，]/.test(line);
}

function parseQuestionLine(line) {
  const match = line.match(/^\s*#?\s*(1[3-9]|2[0-4])\s*[\-.,，]?\s*(.+?)\s*$/);
  if (!match) return null;
  const number = Number(match[1]);
  const raw = match[2].trim();
  let answer = extractAnswer(raw);
  if (!answer && number === 24) {
    const titleChoice = raw.match(/^\s*([ABC])\s*[-.]/i);
    if (titleChoice) answer = normalizeAnswer(titleChoice[1]);
  }
  const text = cleanQuestionText(raw);
  return { number, text, answer, raw };
}

function splitQuestionSegments(line) {
  const normalized = line.replace(/\s+(?=(1[3-9]|2[0-4])\s*[\-,，])/g, "\n");
  return normalized.split("\n").map((part) => part.trim()).filter(Boolean);
}

function parseSections(raw) {
  const lines = raw.split(/\r?\n/);
  const lv3Headings = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => line.startsWith("# LV3"));
  const start = lv3Headings.length ? lv3Headings[lv3Headings.length - 1].index : -1;
  const end = lines.findIndex((line, index) => index > start && line.startsWith("# Baustein"));

  if (start === -1 || end === -1) {
    throw new Error("Could not locate the LV3 section boundaries.");
  }

  const lv3Lines = lines.slice(start, end);
  const sections = [];
  let current = null;

  function flush() {
    if (current) sections.push(current);
  }

  for (const line of lv3Lines) {
    const heading = line.match(/^\s*#?\s*(?:新更)?\s*Teil\s*([0-9]+)\s*:?\s*(.+?)\s*$/i);
    const pending = line.match(/^\s*Teil\s*17\s+(.+?)\s*$/i);
    const match = heading || pending;
    if (match) {
      flush();
      current = {
        teil: Number(match[1] || 17),
        title: (match[2] || "").trim(),
        sourceText: [],
        questions: [],
        rawLines: [],
      };
      continue;
    }

    if (!current) continue;
    current.rawLines.push(line);
  }

  flush();

  for (const section of sections) {
    const questions = [];
    let seenQuestion = false;
    let allowQuestionStart = false;

    for (const line of section.rawLines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const prefixedQuestion = trimmed.match(/^\s*([RFXABC])\s+((?:1[3-9]|2[0-4])\s*[\-,，].+)$/i);
      if (prefixedQuestion && questions.length) {
        const last = questions[questions.length - 1];
        if (!last.answer) last.answer = normalizeAnswer(prefixedQuestion[1]);
        const parsed = parseQuestionLine(prefixedQuestion[2]);
        if (parsed) {
          seenQuestion = true;
          questions.push(parsed);
        }
        continue;
      }

      if (startsWithQuestion(trimmed)) {
        for (const segment of splitQuestionSegments(trimmed)) {
          if (!startsWithQuestion(segment)) continue;
          const parsed = parseQuestionLine(segment);
          if (!parsed) continue;
          if (!seenQuestion && !allowQuestionStart && !parsed.answer) {
            section.sourceText.push(trimmed);
            continue;
          }
          seenQuestion = true;
          questions.push(parsed);
        }
        continue;
      }

      if (!seenQuestion) {
        section.sourceText.push(trimmed);
        if (/Welche der Aussagen/i.test(trimmed)) allowQuestionStart = true;
        continue;
      }

      const last = questions[questions.length - 1];
      if (last && !last.answer) {
        const translationNumber = trimmed.match(/^\s*(?:第)?(1[3-9]|2[0-4])\s*[\-.,，]?/);
        if (translationNumber && Number(translationNumber[1]) !== last.number) continue;
        const answer = extractAnswer(trimmed);
        if (answer) last.answer = answer;
      }
    }

    section.sourceText = section.sourceText.join("\n\n").trim();
    section.questions = questions;
    applyManualQuestionFixes(section);
    delete section.rawLines;
  }

  return {
    extractedAt: new Date().toISOString(),
    sourceFile: sourcePath,
    raw: lv3Lines.join("\n").trim(),
    sections,
  };
}

function applyManualQuestionFixes(section) {
  const seenNumbers = new Map();

  for (const question of section.questions) {
    const occurrence = seenNumbers.get(question.number) || 0;
    seenNumbers.set(question.number, occurrence + 1);

    const specificKey = `${section.teil}:${question.number}:${occurrence}`;
    const generalKey = `${section.teil}:${question.number}`;
    const fix = manualQuestionFixes[specificKey] || manualQuestionFixes[generalKey];
    if (!fix) continue;

    if (fix.german && fix.chinese) {
      question.text = `${fix.german} ${fix.chinese}`;
    } else if (fix.german) {
      const chinese = question.text.match(/[\u3400-\u9fff].*$/)?.[0] || "";
      question.text = `${fix.german}${chinese ? ` ${chinese}` : ""}`;
    }

    question.corrected = true;
  }
}

function buildAnalysis(data) {
  const totalQuestions = data.sections.reduce((sum, section) => sum + section.questions.length, 0);
  const answerCounts = data.sections.reduce((counts, section) => {
    for (const question of section.questions) {
      const key = question.answer || "未标注";
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, {});

  const sectionRows = data.sections
    .map((section) => {
      const answers = section.questions
        .map((question) => `${question.number}:${question.answer || "?"}`)
        .join(" ");
      return `| ${section.teil} | ${section.title} | ${section.questions.length} | ${answers} |`;
    })
    .join("\n");

  return `# LV3 题型分析

## 提取结果

- 来源文件：\`${path.basename(data.sourceFile)}\`
- 正文范围：从 \`# LV3(最后一题是三选一选择题)\` 到 \`# Baustein\`
- 提取到 ${data.sections.length} 个 Teil，${totalQuestions} 条题目记录。
- 答案分布：${Object.entries(answerCounts)
    .map(([answer, count]) => `${answer}=${count}`)
    .join("，")}

## 题型结构

LV3 主要是阅读理解判断题：

- 每个 Teil 通常对应一篇文章或一个主题。
- 第 13 到 23 题是判断类题目，答案常见为 \`R\`、\`F\`、\`X\`。
- \`R\` 表示 richtig/正确，\`F\` 表示 falsch/错误，\`X\` 表示 nicht im Text/文中未提及。
- 第 24 题通常是三选一标题/主旨题，答案为 \`A\`、\`B\`、\`C\`；部分 OCR 文本没有标出答案，需要人工补齐。
- 资料提醒考试会改同义替换，也会添加或删去 \`nicht\`、\`ohne\` 等否定词，所以练习软件应重点训练“原句判断 + 否定敏感度”。

## 软件数据建议

- 数据层：以 \`data/lv3_questions.json\` 为初始题库，每个 Teil 存标题、原文、题目、答案。
- 练习模式：按 Teil 练习、乱序练习、错题复习、只练 \`X\` 题、只练否定题。
- 交互模式：每题提供 \`R/F/X\` 三按钮；第 24 题提供 \`A/B/C\` 三按钮。
- 复盘模式：答完后显示德文题干、中文翻译/OCR 附近内容、正确答案、错题原因标签。
- 风险点：OCR 中有拼写错误、重复题、个别答案缺失，正式导入前需要人工校对一轮。

## Teil 清单

| Teil | 标题 | 提取题数 | 答案序列 |
| --- | --- | ---: | --- |
${sectionRows}
`;
}

ensureDir(outDir);
ensureDir(docsDir);

const raw = fs.readFileSync(sourcePath, "utf8");
const data = parseSections(raw);

fs.writeFileSync(path.join(outDir, "lv3_raw.md"), data.raw + "\n");
fs.writeFileSync(path.join(outDir, "lv3_questions.json"), JSON.stringify(data.sections, null, 2) + "\n");
fs.writeFileSync(
  path.join(outDir, "lv3_questions.js"),
  `window.LV3_QUESTIONS = ${JSON.stringify(data.sections, null, 2)};\n`
);
fs.writeFileSync(path.join(docsDir, "lv3_analysis.md"), buildAnalysis(data) + "\n");

console.log(`Extracted ${data.sections.length} LV3 sections.`);
console.log(`Wrote ${path.join(outDir, "lv3_raw.md")}`);
console.log(`Wrote ${path.join(outDir, "lv3_questions.json")}`);
console.log(`Wrote ${path.join(outDir, "lv3_questions.js")}`);
console.log(`Wrote ${path.join(docsDir, "lv3_analysis.md")}`);
