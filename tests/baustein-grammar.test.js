const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const Grammar = require("../baustein-grammar.js");
const Quiz = require("../baustein-quiz.js");
const Study = require("../baustein-study.js");
const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const source = { window: {} };
vm.runInNewContext(read("data/baustein_questions.js"), source);
const questions = Study.buildRoundQueue(source.window.BAUSTEIN_QUESTIONS).filter(q => q.sectionMode === "baustein-choice");
const find = (teil, number) => questions.find(q => Number(q.teil) === teil && Number(q.number) === number);

test("all 433 source gaps have authored explanations and relevant, rectangular grammar tables without changing the corpus", () => {
  const before = JSON.stringify(source.window.BAUSTEIN_QUESTIONS);
  assert.equal(Object.keys(Grammar.reasons).length, 433);
  for (const q of questions) {
    const explanation = Grammar.explain(q);
    assert.ok(explanation.why.length > 20, `${q.teil}/${q.number}: substantive explanation`);
    assert.ok(explanation.tables.length > 0);
    for (const table of explanation.tables) {
      assert.ok(table.title && table.headers.length >= 2 && table.rows.length >= 4);
      assert.ok(table.rows.every(row => row.length === table.headers.length && row.every(cell => typeof cell === "string" && cell.length)));
    }
    if (q.quizFocus.startsWith("动词")) assert.ok(explanation.tables.some(t => t.title.includes("六时态")));
    if (q.quizFocus === "形容词词尾") assert.ok(explanation.tables.some(t => t.title.includes("混合变化")));
    if (q.quizFocus === "名词词义与词形") assert.ok(explanation.tables.some(t => /名词单复数四格|分词名词化/.test(t.title)));
  }
  assert.equal(JSON.stringify(source.window.BAUSTEIN_QUESTIONS), before);
});

test("strong, weak, mixed and prefixed verbs retain correct stems, participles, auxiliaries and six-person paradigms", () => {
  const verbs = Grammar.verbs;
  assert.deepEqual(verbs.ziehen.present, ["ziehe", "ziehst", "zieht", "ziehen", "zieht", "ziehen"]);
  assert.deepEqual(verbs.ziehen.past, ["zog", "zogst", "zog", "zogen", "zogt", "zogen"]);
  assert.equal(verbs.ziehen.k2[2], "zöge");
  assert.equal(verbs.enthalten.present[1], "enthältst");
  assert.equal(verbs.enthalten.present[4], "enthaltet");
  assert.equal(verbs.bringen.past[3], "brachten");
  assert.equal(verbs.bringen.k2[2], "brächte");
  assert.equal(verbs.vorsehen.present[2], "sieht vor");
  assert.equal(verbs.vorsehen.participle, "vorgesehen");
  assert.equal(verbs.herausfinden.zu, "herauszufinden");
  assert.equal(verbs.publizieren.participle, "publiziert");
  assert.equal(verbs.sammeln.present[0], "sammle");
  assert.equal(verbs.entwickeln.present[0], "entwickle");
  assert.equal(verbs.aushängen.participle, "ausgehängt");
  assert.equal(verbs.abhängen.participle, "abgehangen");
  assert.equal(verbs.abhängen.past[2], "hing ab");
  assert.equal(verbs.entgegenkommen.auxiliary, "sein");
  assert.equal(verbs.erfahren.auxiliary, "haben");
  assert.equal(verbs.unterliegen.auxiliary, "haben");
  assert.equal(verbs.sein.participle1, "seiend");
  for (const verb of Object.values(verbs)) for (const category of ["present", "past", "k1", "k2"]) {
    assert.equal(verb[category].length, 6);
    assert.ok(verb[category].every(form => form && !form.includes("undefined")));
  }
});

test("active six tenses, both subjunctives and source-relevant passive forms use the correct auxiliaries", () => {
  const tables = Grammar.explain(find(1, 1)).tables;
  const active = tables.find(t => t.title.includes("陈述式"));
  assert.deepEqual(active.rows[2], ["er / sie / es", "zieht", "zog", "hat gezogen", "hatte gezogen", "wird ziehen", "wird gezogen haben"]);
  const passive = tables.find(t => t.title.includes("过程被动（"));
  assert.deepEqual(passive.rows[2], ["er / sie / es", "wird gezogen", "wurde gezogen", "ist gezogen worden", "war gezogen worden", "wird gezogen werden", "wird gezogen worden sein"]);
  assert.ok(tables.find(t => t.title.includes("第二虚拟式 Konjunktiv II")).rows[2].includes("hätte gezogen"));
  assert.ok(Grammar.explain(find(1, 16)).rules.some(rule => rule.includes("替代不定式")));
  assert.ok(Grammar.explain(find(17, 19)).tables.find(t => t.title.includes("陈述式")).rows[2].includes("ist entgegengekommen"));
});

test("adjective paradigms cover all four cases and genders; nouns and nominalized participles use their own declension", () => {
  const tables = Grammar.explain(find(7, 2)).tables;
  assert.deepEqual(tables.find(t => t.title.startsWith("强变化")).rows[2], ["Dativ 三格", "-em", "-em", "-er", "-en"]);
  assert.deepEqual(tables.find(t => t.title.startsWith("弱变化")).rows[0], ["Nominativ 一格", "-e", "-e", "-e", "-en"]);
  assert.deepEqual(tables.find(t => t.title.startsWith("混合变化")).rows[0], ["Nominativ 一格", "-er", "-es", "-e", "-en"]);
  assert.deepEqual(Grammar.explain(find(3, 18)).tables[0].rows[2], ["Dativ 三格", "der Dosis", "den Dosen"]);
  assert.ok(Grammar.explain(find(8, 24)).tables.some(t => t.title.includes("分词名词化")));
  assert.ok(Grammar.explain(find(8, 26)).why.includes("Studiengängen"));
});

test("source mistakes remain explicit and never become a fabricated grammatical rule or a changed answer", () => {
  const wrongEnding = find(14, 43), sourceVerb = find(14, 35);
  assert.equal(wrongEnding.correctText, "spitzen");
  assert.match(Grammar.explain(wrongEnding).sourceIssue, /spitze Stacheln/);
  assert.equal(sourceVerb.correctText, "vorausheben");
  assert.match(Grammar.explain(sourceVerb).sourceIssue, /voraushaben/);
  assert.ok(Grammar.explain(sourceVerb).tables[0].title.startsWith("voraushaben"));
  assert.match(Grammar.explain(find(16, 10)).sourceIssue, /für/);
  assert.match(Grammar.explain(find(22, 25)).sourceIssue, /主语与代词叠加/);
});

test("repeating a gap always relocates its correct answer while keypad positions stay fixed", () => {
  const q = { ...find(1, 1), teil: "shuffle-test" };
  let previous;
  const seen = new Set();
  for (let i = 0; i < 100; i += 1) {
    Quiz.prepareQuestion(q, () => ((i * 37) % 100) / 100);
    const position = q.options.findIndex(option => option.text === q.correctText);
    if (previous !== undefined) assert.notEqual(position, previous);
    previous = position; seen.add(position);
    assert.equal(new Set(q.options.map(o => o.text)).size, 4);
    assert.deepEqual(q.options.map(o => o.shortcut.split(" / ")[0]), ["4", "5", "1", "2"]);
    assert.equal(q.options[position].value, q.answer);
  }
  assert.equal(seen.size, 4);
});

test("the authored explanations and grammar engine are loaded and published before application startup", () => {
  const html = read("index.html");
  for (const file of ["baustein-explanations.js", "baustein-grammar.js"]) {
    assert.ok(html.indexOf(`src="./${file}`) < html.indexOf('src="./app.js'));
    assert.ok(read("scripts/build.js").includes(`"${file}"`));
    assert.ok(read("service-worker.js").includes(`"./${file}"`));
  }
  assert.ok(html.indexOf('src="./baustein-explanations.js') < html.indexOf('src="./baustein-grammar.js'));
});
