const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

class ElementStub {
  constructor(editable = false) {
    this.editable = editable;
    this.textContent = "";
    this.value = "";
    const classes = new Set();
    this.classList = {
      add: name => classes.add(name),
      remove: name => classes.delete(name),
      contains: name => classes.has(name),
    };
  }
  closest(selector) {
    return this.editable && selector.includes("input") ? this : null;
  }
  querySelectorAll() { return []; }
  setAttribute() {}
}

function loadApp() {
  const elements = new Map();
  const context = vm.createContext({
    BausteinStudy: require("../baustein-study.js"),
    Element: ElementStub,
    window: { matchMedia: () => ({ matches: false }) },
    document: {
      querySelector(selector) {
        if (!elements.has(selector)) elements.set(selector, new ElementStub());
        return elements.get(selector);
      },
      querySelectorAll: () => [],
    },
    advances: 0,
  });
  const source = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  // Load the actual keyboard and card actions without starting the browser UI.
  vm.runInContext(source.replace(/^bindEvents\(\);[\s\S]*?^syncMobileLayout\(\);/m, ""), context);
  const backActions = {
    children: [elements.get("#missButton"), elements.get("#nextButton")],
    insertBefore(button, reference) {
      this.children.splice(this.children.indexOf(button), 1);
      this.children.splice(this.children.indexOf(reference), 0, button);
    },
  };
  for (const button of backActions.children) button.parentElement = backActions;
  vm.runInContext(`
    state.level = "baustein";
    state.current = { number: 1, sectionMode: "corpus-card", answerText: "gezogen" };
    els.levelGate.classList.add("hidden");
    els.backFace.classList.add("hidden");
    els.roundMode.value = "mistakes";
    globalThis.realUpdateStats = updateStats;
    updateStats = () => {};
    scrollMobilePracticeTop = () => {};
    nextQuestion = () => {
      advances += 1;
      els.backFace.classList.add("hidden");
      els.frontFace.classList.remove("hidden");
      state.current = { ...state.current, number: state.current.number + 1 };
    };
  `, context);
  function press(key, overrides = {}) {
    let prevented = false;
    context.handleKeyboardNavigation({
      key, target: new ElementStub(), repeat: false,
      preventDefault() { prevented = true; }, ...overrides,
    });
    return prevented;
  }
  return { context, press, read: expression => vm.runInContext(expression, context) };
}

test("Baustein 1 reveals, then 2 records a miss and advances exactly once", () => {
  const app = loadApp();
  assert.equal(app.press("1"), true);
  assert.equal(app.read("state.answeredInRound"), 1);
  assert.equal(app.read("state.roundMistakes"), 0);
  assert.equal(app.context.advances, 0);
  assert.equal(app.press("2"), true);
  assert.equal(app.read("state.roundMistakes"), 1);
  assert.equal(app.read("state.mistakes[0].number"), 1);
  assert.equal(app.context.advances, 1);
});

test("Baustein 1 remembers a revealed card; number-pad keys work too", () => {
  const app = loadApp();
  assert.equal(app.press("2"), false);
  assert.equal(app.context.advances, 0);
  assert.equal(app.press("1", { code: "Numpad1" }), true);
  assert.equal(app.read("els.nextButton.parentElement.children[0] === els.nextButton"), true);
  assert.equal(app.read("els.nextButton.textContent"), "1 · 记得，下一张");
  assert.equal(app.read("els.missButton.textContent"), "2 · 不记得，下一张");
  assert.equal(app.press("1", { code: "Numpad1" }), true);
  assert.equal(app.read("state.roundMistakes"), 0);
  assert.equal(app.read("state.mistakes.length"), 0);
  assert.equal(app.context.advances, 1);
});

test("held keys, typing, composition and browser shortcuts do not reveal or rate cards", () => {
  const app = loadApp();
  for (const overrides of [
    { repeat: true }, { target: new ElementStub(true) },
    { isComposing: true }, { ctrlKey: true }, { metaKey: true }, { altKey: true },
  ]) {
    assert.equal(app.press("1", overrides), false);
  }
  assert.equal(app.read("state.answeredInRound"), 0);
  app.press("1");
  assert.equal(app.press("2", { repeat: true }), false);
  assert.equal(app.press("1", { ctrlKey: true }), false);
  assert.equal(app.context.advances, 0);
  assert.equal(app.read("state.roundMistakes"), 0);
});

test("existing arrow shortcuts still work and Baustein number keys stay scoped to Baustein", () => {
  const app = loadApp();
  app.press("ArrowRight");
  assert.equal(app.read("state.answeredInRound"), 1);
  app.press("ArrowLeft");
  assert.equal(app.read("state.roundMistakes"), 1);
  assert.equal(app.context.advances, 1);
  app.read('state.level = "lv2"');
  assert.equal(app.press("1"), false);
  assert.equal(app.read("state.answeredInRound"), 1);
  app.press("ArrowRight");
  assert.equal(app.read("els.nextButton.parentElement.children[0] === els.missButton"), true);
});

test("Baustein article mode retains 1–4 option selection", () => {
  const app = loadApp();
  app.read(`
    state.current.sectionMode = "baustein-article";
    getCurrentBausteinRow = () => ({
      classList: { contains: () => false },
      querySelectorAll: () => ["a", "b", "c", "d"],
    });
    selectBausteinOption = (row, option) => { globalThis.selected = option; };
  `);
  assert.equal(app.press("3"), true);
  assert.equal(app.context.selected, "c");
});

test("Baustein preview starts on 1 or Enter without counting as an answered card", () => {
  for (const key of ["1", "Enter"]) {
    const app = loadApp();
    app.read('state.current.sectionMode = "baustein-memory"');
    const buttonTarget = new ElementStub();
    buttonTarget.closest = selector => selector === "button" ? buttonTarget : null;
    assert.equal(app.press(key, { target: buttonTarget }), true);
    assert.equal(app.context.advances, 1);
    assert.equal(app.read("state.answeredInRound"), 0);
    assert.equal(app.read("state.roundMistakes"), 0);
  }
});

test("Baustein mistake loop reinserts the full preview and excludes it from progress", () => {
  const app = loadApp();
  app.context.testSections = [{
    teil: 1, title: "Test", mode: "corpus-card", article: "Er [1]____. Sie [2]____.",
    questions: [
      { number: 1, answerText: "liest", chinese: "他（1）读书。" },
      { number: 2, answerText: "schreibt", chinese: "她（2）写字。" },
    ],
  }];
  app.read(`
    data = normalizeSections("baustein", testSections);
    state.sessionSource = BausteinStudy.buildRoundQueue(data);
    state.mistakes = [data[0].questions[1]];
    state.round = 1;
    nextQuestion = () => {};
    finishRound();
    realUpdateStats();
  `);
  assert.equal(app.read("state.round"), 2);
  assert.equal(app.read("state.queue.length"), 2);
  assert.equal(app.read("state.queue[0].sectionMode"), "baustein-memory");
  assert.equal(app.read("state.queue[0].reviewRows.length"), 2);
  assert.equal(app.read("state.queue[1].number"), 2);
  assert.equal(app.read("els.progressText.textContent"), "0/1");
});
