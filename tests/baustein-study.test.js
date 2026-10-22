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
  assert.equal(queue.filter(question => question.sectionMode !== "baustein-memory").length, 456);
  let offset = 0;
  for (const section of source.filter(section => section.questions.length)) {
    const memory = queue[offset++];
    assert.equal(memory.sectionMode, "baustein-memory");
    assert.equal(memory.reviewRows.length, section.questions.length);
    assert.deepEqual(memory.reviewRows.map(row => row.number), [...memory.reviewRows.map(row => row.number)]
      .sort((a, b) => a.localeCompare(b, "en", { numeric: true })));
    assert.ok(queue.slice(offset, offset + section.questions.length).every(question => question.teil === section.teil));
    offset += section.questions.length;
  }
});

test("mistake rounds preview all answers for involved articles, then practice only missed cards", () => {
  const source = sections().slice(0, 3).map(section => ({
    ...section,
    questions: section.questions.map(question => ({ ...question, teil: section.teil, sectionMode: "corpus-card" })),
  }));
  const missed = [source[0].questions[2], source[2].questions[0]];
  const queue = Study.buildRoundQueue(source, missed);
  assert.deepEqual(queue.map(question => question.sectionMode), ["baustein-memory", "corpus-card", "baustein-memory", "corpus-card"]);
  assert.equal(queue[0].reviewRows.length, source[0].questions.length);
  assert.equal(queue[2].reviewRows.length, source[2].questions.length);
  assert.equal(queue[1].number, missed[0].number);
  assert.equal(queue[3].number, missed[1].number);
});
