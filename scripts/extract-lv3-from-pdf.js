const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const sourcePath = path.join(root, "data", "pdf_text.txt");
const outDir = path.join(root, "data");
const docsDir = path.join(root, "docs");

function cjkCount(text) {
  return (text.match(/[\u3400-\u9fff]/g) || []).length;
}

function normalizeWhitespace(text) {
  return String(text)
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .replace(/([(\[])\s+/g, "$1")
    .replace(/\s+([)\]])/g, "$1")
    .trim();
}

function normalizeAnswer(value) {
  if (!value) return null;
  const upper = value.toUpperCase();
  if (upper === "×" || upper === "–" || upper === "-") return "X";
  return upper;
}

function extractAnswer(text, number) {
  const patterns = [
    /\(([RFXABC])\)/i,
    /\(\s*([RFXABC])\s*\)/i,
    /（\s*([RFXABC])\s*）/i,
    /\b([RFX])\s*$/i,
    /[（(]\s*[×x–-]\s*[）)]?/,
    /×\s*$/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    if (match[1]) return normalizeAnswer(match[1]);
    return "X";
  }

  if (number === 24) {
    const choice = text.match(/^\s*([ABC])\s*[-–.]/i);
    if (choice) return normalizeAnswer(choice[1]);
    const trailingChoice = text.match(/(?:^|\s|[.。])([ABC])\s*$/i);
    if (trailingChoice) return normalizeAnswer(trailingChoice[1]);
  }

  return null;
}

function removeAnswerMarkers(text) {
  return text
    .replace(/\(\s*[RFXABC]\s*\)/gi, "")
    .replace(/（\s*[RFXABC]\s*）/gi, "")
    .replace(/[（(]\s*[×x–-]\s*[）)]?/g, "")
    .replace(/\s+[RFXABC]\s*$/i, "")
    .replace(/\s*[×x]\s*$/i, "");
}

function splitLanguages(text) {
  const normalized = normalizeWhitespace(removeAnswerMarkers(text));
  const firstCjk = normalized.search(/[\u3400-\u9fff]/);
  if (firstCjk < 0) return { german: normalized, chinese: "" };
  return {
    german: normalized.slice(0, firstCjk).trim(),
    chinese: normalized.slice(firstCjk).trim(),
  };
}

function normalizeTranslationLine(line) {
  const stripped = line.trim().replace(/^(?:第)?(1[3-9]|2[0-4])\s*[-.,，]?\s*/, "");
  const firstCjk = stripped.search(/[\u3400-\u9fff]/);
  if (firstCjk < 0) return stripped;
  return stripped.slice(firstCjk).trim();
}

function isPageNoise(line) {
  const trimmed = line.trim();
  return (
    !trimmed ||
    trimmed === "Ten chicken butts" ||
    trimmed.includes("xhs: 逢考必过德语") ||
    trimmed === "十个鸡屁股" ||
    /^\d{1,3}$/.test(trimmed) ||
    /^\f/.test(trimmed)
  );
}

function isSectionTranslationTitle(line) {
  return /^\s*第\s*\d+\s*部分/.test(line.trim());
}

function isHeading(line) {
  return line.match(/^\s*(?:新更\s*)?Teil\s*([0-9]+)\s*:?\s*(.*?)\s*$/i);
}

function isBaustein(line) {
  return /^\s*Baustein\b/i.test(line);
}

function isQuestionStart(line) {
  const trimmed = line.trim();
  if (isTranslationLine(trimmed)) return false;
  if (/^(?:第)?(?:1[3-9]|2[0-4])\s*[-.,，]\s*[\u3400-\u9fff]/.test(trimmed)) return false;
  return /^(1[3-9]|2[0-4])\s*[-.,，]?\s+/.test(trimmed) || /^(1[3-9]|2[0-4])\s*[-.,，]/.test(trimmed);
}

function isTranslationLine(line) {
  const match = line.trim().match(/^(?:第)?(1[3-9]|2[0-4])\s*[-.,，]?\s*(.+)$/);
  if (!match) return false;
  const body = match[2];
  const firstCjk = body.search(/[\u3400-\u9fff]/);
  if (firstCjk < 0) return false;
  const answerMatch = body.match(/\(\s*[RFXABC]\s*\)|（\s*[RFXABC]\s*）|×/i);
  const answerIndex = answerMatch ? answerMatch.index : -1;
  return answerIndex < 0 || firstCjk < answerIndex;
}

function questionNumber(line) {
  const match = line.trim().match(/^(1[3-9]|2[0-4])\s*[-.,，]?/);
  return match ? Number(match[1]) : null;
}

function splitQuestionStarts(line) {
  return line
    .replace(/\s+(?=(1[3-9]|2[0-4])\s*[-,，])/g, "\n")
    .split("\n")
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseQuestionBlock(block) {
  const first = block.lines[0] || "";
  const number = questionNumber(first);
  const strippedLines = block.lines.map((line, index) => {
    if (index === 0) return line.trim().replace(/^(1[3-9]|2[0-4])\s*[-.,，]?\s*/, "");
    const sameNumberTranslation = line.trim().match(/^(?:第)?(1[3-9]|2[0-4])\s*[-.,，]?\s*/);
    if (sameNumberTranslation && Number(sameNumberTranslation[1]) === number) {
      return line.trim().replace(/^(?:第)?(1[3-9]|2[0-4])\s*[-.,，]?\s*/, "");
    }
    return line.trim();
  });
  const raw = normalizeWhitespace(strippedLines.join(" "));
  const answer = extractAnswer(raw, number);
  const split = splitLanguages(raw);
  let german = split.german;
  if (number === 24 && answer) {
    german = german.replace(new RegExp(`(?:^|\\s|[.。])${answer}\\s*$`, "i"), "").trim();
  }

  return {
    number,
    text: [german, split.chinese].filter(Boolean).join(" "),
    german,
    chinese: split.chinese || "暂无中文释义",
    answer,
    raw,
    source: "pdf-text",
  };
}

function parseSections(text) {
  const lines = text.split(/\r?\n/);
  const lv3Indices = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => /^\s*LV3\(最后一题是三选一选择题\)/.test(line));
  const start = lv3Indices.length ? lv3Indices[lv3Indices.length - 1].index : -1;
  const end = lines.findIndex((line, index) => index > start && isBaustein(line));
  if (start < 0 || end < 0) throw new Error("Could not locate LV3 boundaries in PDF text.");

  const sectionLines = lines.slice(start, end);
  const sections = [];
  let current = null;

  function flush() {
    if (current) sections.push(current);
  }

  for (let index = 0; index < sectionLines.length; index += 1) {
    const rawLine = sectionLines[index].replace(/\f/g, "").trimEnd();
    if (isPageNoise(rawLine)) continue;
    const heading = isHeading(rawLine);
    if (heading) {
      flush();
      const teil = Number(heading[1]);
      let title = normalizeWhitespace(heading[2] || "");
      if (teil === 18 && !/Zweitstudium/i.test(title)) {
        const next = normalizeWhitespace(sectionLines[index + 1] || "");
        if (next && !isQuestionStart(next) && !isHeading(next)) title = normalizeWhitespace(`${title} ${next}`);
      }
      current = { teil, title, sourceText: [], questions: [] };
      continue;
    }

    if (current) current.sourceText.push(rawLine);
  }
  flush();

  for (const section of sections) {
    const parsed = parseQuestionsFromLines(section.sourceText, section.teil);
    section.sourceText = parsed.sourceText;
    section.questions = parsed.questions;
  }

  return {
    raw: sectionLines.join("\n").trim(),
    sections,
  };
}

function parseQuestionsFromLines(lines, teil) {
  const sourceLines = [];
  const blocks = [];
  const translations = new Map();
  let block = null;
  let questionMode = teil !== 19;
  let activeTranslationNumber = null;

  function addTranslation(line, explicitNumber) {
    const number = explicitNumber || questionNumber(line);
    if (!number) return;
    const clean = normalizeWhitespace(normalizeTranslationLine(line).replace(/（\s*[RFXABC]\s*）|\(\s*[RFXABC]\s*\)|[×x]/gi, ""));
    if (!clean) return;
    if (!translations.has(number)) translations.set(number, []);
    const list = translations.get(number);
    if (explicitNumber && list.length) list[list.length - 1] = normalizeWhitespace(`${list[list.length - 1]} ${clean}`);
    else list.push(clean);
    activeTranslationNumber = number;
  }

  function flushBlock() {
    if (block) blocks.push(block);
    block = null;
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (isPageNoise(line)) continue;
    if (isSectionTranslationTitle(line)) continue;
    if (/Welche der Aussagen/i.test(line)) {
      questionMode = true;
      sourceLines.push(line);
      continue;
    }

    const parts = isQuestionStart(line) ? splitQuestionStarts(line) : [line];

    for (const part of parts) {
      if (activeTranslationNumber && /^（?\s*[RFXABC×]\s*）?$/i.test(part)) {
        addTranslation(part, activeTranslationNumber);
        continue;
      }

      if (isTranslationLine(part)) {
        const normalizedTranslation = `${questionNumber(part)} ${normalizeTranslationLine(part)}`;
        if (block && questionNumber(block.lines[0]) === questionNumber(part) && !extractAnswer(block.lines.join(" "), questionNumber(part))) {
          block.lines.push(normalizedTranslation);
        } else {
          addTranslation(part);
        }
        continue;
      }

      if (questionMode && isQuestionStart(part)) {
        activeTranslationNumber = null;
        const number = questionNumber(part);
        const answer = extractAnswer(part, number);
        const hasCjk = cjkCount(part) > 0;
        if (!answer && hasCjk) {
          if (block && questionNumber(block.lines[0]) === number) block.lines.push(part);
          continue;
        }
        flushBlock();
        block = { lines: [part] };
        continue;
      }

      if (block) {
        if (activeTranslationNumber && cjkCount(part) > 0) {
          addTranslation(part, activeTranslationNumber);
          continue;
        }
        const translationNumber = part.match(/^(?:第)?(1[3-9]|2[0-4])\s*[-.,，]?/);
        if (translationNumber && questionNumber(block.lines[0]) !== Number(translationNumber[1])) {
          continue;
        }
        block.lines.push(part);
      } else {
        sourceLines.push(part);
      }
    }
  }
  flushBlock();

  const occurrence = new Map();
  const questions = blocks.map(parseQuestionBlock).filter((question) => question.number);
  for (const question of questions) {
    const count = occurrence.get(question.number) || 0;
    occurrence.set(question.number, count + 1);
    const chinese = translations.get(question.number)?.[count];
    if (chinese && question.chinese === "暂无中文释义") {
      question.chinese = chinese;
      question.text = `${question.german} ${question.chinese}`;
    }
  }

  return {
    sourceText: sourceLines.join("\n").trim(),
    questions,
  };
}

function buildAnalysis(sections) {
  const total = sections.reduce((sum, section) => sum + section.questions.length, 0);
  const answerCounts = {};
  for (const section of sections) {
    for (const question of section.questions) {
      const key = question.answer || "未标注";
      answerCounts[key] = (answerCounts[key] || 0) + 1;
    }
  }
  const rows = sections
    .map((section) => {
      const answers = section.questions.map((question) => `${question.number}:${question.answer || "?"}`).join(" ");
      return `| ${section.teil} | ${section.title} | ${section.questions.length} | ${answers} |`;
    })
    .join("\n");

  return `# LV3 PDF 语料库分析

## 提取结果

- 来源：PDF 可复制文字（\`pdftotext -layout\`）
- 语料文件：\`data/pdf_text.txt\`
- 提取到 ${sections.length} 个 Teil，${total} 条题目记录。
- 答案分布：${Object.entries(answerCounts)
    .map(([answer, count]) => `${answer}=${count}`)
    .join("，")}

## 题型结构

- 第 13-23 题为 \`R/F/X\` 判断题。
- 第 24 题通常为 \`A/B/C\` 主旨题。
- 正面练习优先使用 \`german\` 字段，背面使用 \`german\`、\`chinese\` 和 \`answer\`。

## Teil 清单

| Teil | 标题 | 提取题数 | 答案序列 |
| --- | --- | ---: | --- |
${rows}
`;
}

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(docsDir, { recursive: true });

const text = fs.readFileSync(sourcePath, "utf8");
const result = parseSections(text);

fs.writeFileSync(path.join(outDir, "lv3_pdf_raw.txt"), result.raw + "\n");
fs.writeFileSync(path.join(outDir, "lv3_questions.json"), JSON.stringify(result.sections, null, 2) + "\n");
fs.writeFileSync(
  path.join(outDir, "lv3_questions.js"),
  `window.LV3_QUESTIONS = ${JSON.stringify(result.sections, null, 2)};\n`
);
fs.writeFileSync(path.join(docsDir, "lv3_analysis.md"), buildAnalysis(result.sections) + "\n");

console.log(`Extracted ${result.sections.length} LV3 sections from PDF text.`);
console.log(`Wrote ${path.join(outDir, "lv3_questions.json")}`);
console.log(`Wrote ${path.join(outDir, "lv3_questions.js")}`);
