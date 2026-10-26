const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const Study = require("../baustein-study.js");

function sections() {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "data", "baustein_questions.js"), "utf8"), context);
  return JSON.parse(JSON.stringify(context.window.BAUSTEIN_QUESTIONS));
}

test("every Baustein answer appears with its target sentence and Chinese, or an explicit source gap", () => {
  const source = sections();
  const before = JSON.stringify(source);
  const rows = source.flatMap(Study.buildReviewRows);
  assert.equal(rows.length, 456);
  assert.equal(rows.filter(row => !row.sourceMissing).length, 434);
  assert.equal(rows.filter(row => row.sourceMissing).length, 22);
  for (const row of rows) {
    assert.ok(row.answer);
    if (row.sourceMissing) {
      assert.equal(row.sentence, "");
      assert.equal(row.chinese, "");
    } else {
      assert.ok(row.sentence.includes(row.answer));
      assert.ok(row.chinese);
      assert.doesNotMatch(row.sentence, /\[\d+\]____/);
      assert.doesNotMatch(row.chinese, /[（(]\d+[）)]/);
    }
  }
  assert.equal(JSON.stringify(source), before);
});

test("preview extracts just the filled sentence and matching Chinese rather than the surrounding paragraph", () => {
  const rows = Study.buildReviewRows(sections()[0]);
  assert.equal(rows[0].sentence, "In den neuen Bildungsplänen für die Grundschule wurden bereits erste Konsequenzen gezogen.");
  assert.equal(rows[0].answer, "gezogen");
  assert.equal(rows[0].chinese, "在新的小学教学计划中，已经采取了初步的相应措施。");
  assert.equal(rows[1].sentence, "Benotete Diktate sind nicht mehr vorgesehen.");
  assert.equal(rows[1].chinese, "计分的听写已经不再被列入教学安排。");
  assert.doesNotMatch(rows[0].sentence, /Benotete/);
});

test("Chinese source numbering stays aligned when local German card numbers differ or practice is shuffled", () => {
  const source = sections();
  const raucher = source.find(section => section.teil === 2);
  const rows = Study.buildReviewRows(raucher);
  assert.equal(rows[1].chinese, rows[2].chinese);
  assert.match(rows[14].chinese, /股票交易游戏/);
  assert.match(rows[19].chinese, /不理会/);
  assert.deepEqual(Study.buildReviewRows({ ...raucher, questions: [...raucher.questions].reverse() }), rows);
  const wetter = Study.buildReviewRows(source.find(section => section.teil === 7));
  assert.match(wetter[19].chinese, /规定的时间/);
  assert.doesNotMatch(wetter[19].chinese, /个人偏好/);
});

test("sentence extraction handles missing spaces, abbreviations and ordinal dates", () => {
  const section = {
    article: "Davor steht etwas.Dr. Klein stellte im 19. Jahrhundert am 3. November [1]____ vor.Danach folgt etwas.",
    questions: [{ number: 1, answerText: "eine Idee" }],
  };
  assert.equal(Study.buildSentence(section, section.questions[0]).sentence,
    "Dr. Klein stellte im 19. Jahrhundert am 3. November eine Idee vor.");
  const pflanzen = Study.buildReviewRows(sections().find(section => section.teil === 14));
  assert.match(pflanzen[0].sentence, /intelligent zu bezeichnen\?$/);
  assert.doesNotMatch(pflanzen[0].sentence, /Menschen trauen/);
});

test("each article has an ordered full preview before practice and empty articles are skipped", () => {
  const source = sections().map(section => ({
    ...section,
    questions: section.questions.map(question => ({ ...question, teil: section.teil, sectionMode: "corpus-card" })),
  }));
  const queue = Study.buildRoundQueue(source);
  assert.equal(queue.filter(question => question.sectionMode === "baustein-memory").length, 20);
  assert.equal(queue.filter(question => question.sectionMode === "baustein-choice").length, 433);
  let offset = 0;
  for (const section of source.filter(section => section.questions.length)) {
    const memory = queue[offset++];
    assert.equal(memory.sectionMode, "baustein-memory");
    assert.equal(memory.reviewRows.length, section.questions.length);
    assert.deepEqual(memory.reviewRows.map(row => row.number), [...memory.reviewRows.map(row => row.number)]
      .sort((a, b) => a.localeCompare(b, "en", { numeric: true })));
    assert.ok(queue.slice(offset, offset + memory.practiceCount).every(question => question.teil === section.teil && question.sectionMode === "baustein-choice"));
    offset += memory.practiceCount;
  }
});

test("mistake rounds preview all answers for involved articles, then practice only missed cards", () => {
  const source = sections().slice(0, 3).map(section => ({
    ...section,
    questions: section.questions.map(question => ({ ...question, teil: section.teil, sectionMode: "corpus-card" })),
  }));
  const missed = [source[0].questions[2], source[2].questions[0]];
  const queue = Study.buildRoundQueue(source, missed);
  assert.deepEqual(queue.map(question => question.sectionMode), ["baustein-memory", "baustein-choice", "baustein-memory", "baustein-choice"]);
  assert.equal(queue[0].reviewRows.length, source[0].questions.length);
  assert.equal(queue[2].reviewRows.length, source[2].questions.length);
  assert.equal(queue[1].number, missed[0].number);
  assert.equal(queue[3].number, missed[1].number);
});

test("choice questions use the preview sentence and translation, masking only the current answer", () => {
  const source = sections();
  const before = JSON.stringify(source);
  const queue = Study.buildRoundQueue(source);
  let sentenceCards = 0;
  for (const card of queue.filter(question => question.sectionMode === "baustein-choice")) {
    const row = card.bausteinStudy;
    assert.equal(card.sourceAnswerText, row.answer);
    assert.equal(card.answerText, card.correctText);
    sentenceCards += 1;
    assert.equal(card.reviewGerman, card.german.replace(`[${card.number}]____`, card.correctText));
    assert.equal(card.chinese, row.chinese);
    assert.equal(card.german.replace(`[${card.number}]____`, row.answer), row.sentence);
    assert.equal((card.german.match(/\[\d+\]____/g) || []).length, 1);
  }
  assert.equal(sentenceCards, 433);
  assert.equal(JSON.stringify(source), before);
  const first = queue[1];
  assert.equal(first.german, "In den neuen Bildungsplänen für die Grundschule wurden bereits erste Konsequenzen [1]____.");
  assert.equal(first.chinese, "在新的小学教学计划中，已经采取了初步的相应措施。");
  assert.doesNotMatch(first.german, /Benotete/);
  const card10 = queue.find(card => card.teil === 1 && card.number === 10);
  const card11 = queue.find(card => card.teil === 1 && card.number === 11);
  assert.match(card10.german, /\[10\]____, die Kinder könnten während eines Diktats/);
  assert.match(card11.german, /argumentieren, die Kinder könnten während \[11\]____/);
});

test("source-only letters and the truncated gap stay in preview without scored guesses", () => {
  const queue = Study.buildRoundQueue(sections());
  const letters = queue.find(item => item.sectionMode === "baustein-memory" && item.teil === 18);
  assert.equal(letters.reviewRows.length, 22);
  assert.equal(letters.practiceCount, 0);
  assert.ok(letters.reviewRows.every(row => row.practiceNote));
  const truncated = queue.find(item => item.sectionMode === "baustein-memory" && item.teil === 21);
  assert.equal(truncated.reviewRows.length, 22);
  assert.equal(truncated.practiceCount, 21);
  assert.ok(truncated.reviewRows.find(row => row.number === "38").practiceNote);
  assert.equal(queue.some(item => item.sectionMode === "baustein-choice" && item.teil === 21 && item.number === 38), false);
  assert.equal(queue.some(item => item.sectionMode === "corpus-card"), false);
});

test("Chinese highlight anchors cover every aligned sentence without changing its translation", () => {
  let highlighted = 0;
  for (const section of sections()) {
    for (const row of Study.buildReviewRows(section)) {
      const parts = Study.highlightParts(row.chinese, row.chineseAnswerRanges);
      assert.equal(parts.map(part => part.text).join(""), row.chinese);
      if (row.sourceMissing || (section.teil === 21 && row.number === "38")) {
        assert.equal(row.chineseAnswerRanges.length, 0);
      } else {
        assert.equal(row.chineseAnswerRanges.length, 1, `Teil ${section.teil}, question ${row.number}`);
        assert.ok(parts.some(part => part.highlight && part.text.length < row.chinese.length));
        highlighted += 1;
      }
    }
  }
  assert.equal(highlighted, 433);
  const rows = Study.buildReviewRows(sections()[0]);
  assert.equal(Study.highlightParts(rows[0].chinese, rows[0].chineseAnswerRanges).find(part => part.highlight).text, "采取了");
  assert.notDeepEqual(rows[9].chineseAnswerRanges, rows[10].chineseAnswerRanges);
  assert.equal(rows[9].chinese, rows[10].chinese);
});

test("highlight fragments keep repeated words outside the selected range and treat markup as plain text", () => {
  const parts = Study.highlightParts("储存在哪里：储存在<x>中。", [{ start: 0, end: 2 }]);
  assert.deepEqual(parts, [
    { text: "储存", highlight: true },
    { text: "在哪里：储存在<x>中。", highlight: false },
  ]);
});
