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
    this.dataset = {};
    this.children = [];
    this.listeners = {};
    const classes = new Set();
    this.classList = {
      add: name => classes.add(name),
      remove: name => classes.delete(name),
      contains: name => classes.has(name),
      toggle(name, force) {
        const add = force === undefined ? !classes.has(name) : force;
        if (add) classes.add(name);
        else classes.delete(name);
      },
    };
  }
  closest(selector) {
    return this.editable && selector.includes("input") ? this : null;
  }
  set textContent(value) { this.text = value; this.children = []; }
  get textContent() { return this.text + this.children.map(child => child.textContent).join(""); }
  set innerHTML(value) { this.textContent = value; }
  querySelectorAll(selector) {
    return this.children.flatMap(child => [
      ...(selector === ".answer-button" && child.className === "answer-button" ? [child] : []),
      ...(child.querySelectorAll ? child.querySelectorAll(selector) : []),
    ]);
  }
  setAttribute() {}
  addEventListener(name, callback) { this.listeners[name] = callback; }
  click() { if (!this.disabled) this.listeners.click?.(); }
  focus() {}
  append(...children) { this.children.push(...children); }
  appendChild(child) { this.append(child); }
}

function loadApp() {
  const elements = new Map();
  const context = vm.createContext({
    BausteinStudy: require("../baustein-study.js"),
    BausteinQuiz: require("../baustein-quiz.js"),
    BausteinGrammar: require("../baustein-grammar.js"),
    Lv1Quiz: require("../lv1-quiz.js"),
    Lv1Translations: require("../lv1-translations.js"),
    Element: ElementStub,
    window: { matchMedia: () => ({ matches: false }), scrollTo() {} },
    document: {
      querySelector(selector) {
        if (!elements.has(selector)) elements.set(selector, new ElementStub());
        return elements.get(selector);
      },
      querySelectorAll: () => [],
      createElement: () => new ElementStub(),
      createTextNode: textContent => ({ textContent }),
      getElementById: () => null,
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

test("Baustein article mode uses the 4/5/1/2 keypad layout", () => {
  const app = loadApp();
  app.read(`
    state.current.sectionMode = "baustein-article";
    getCurrentBausteinRow = () => ({
      classList: { contains: () => false },
      querySelectorAll: () => ["a", "b", "c", "d"],
    });
    selectBausteinOption = (row, option) => { globalThis.selected = option; };
  `);
  assert.equal(app.press("1"), true);
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

test("Baustein choice shows the gap and Chinese, then fills the sentence and records a wrong selection", () => {
  const app = loadApp();
  app.context.exampleSections = [{
    teil: 1, title: "Test", mode: "corpus-card", article: "Er [1]____. Danach geht er.",
    questions: [{ number: 1, answerText: "liest", chinese: "他（1）读书。然后他离开。" }],
  }];
  app.read(`
    state.current = BausteinStudy.buildRoundQueue(normalizeSections("baustein", exampleSections))[1];
    showFront(state.current);
  `);
  assert.equal(app.read("els.germanQuestion.textContent"), "Er [1]____.");
  assert.equal(app.read("els.paragraphPanel.classList.contains('hidden')"), false);
  assert.equal(app.read("els.paragraphPanel.children[0].textContent"), "他读书。");
  assert.equal(app.read("els.answerGrid.children.length"), 4);
  // This fixture deliberately substitutes a non-corpus sentence; grammar is
  // checked with real source gaps in the feedback integration test below.
  app.read("renderBausteinExplanation = () => {}; answerQuestion(state.current.options.find(option => option.value !== state.current.answer).value)");
  assert.equal(app.read("els.correctAnswer.textContent"), "liest");
  assert.equal(app.read("els.reviewGerman.textContent"), "Er liest.");
  assert.ok(app.read("els.reviewChinese.textContent").startsWith("他读书。"));
  assert.equal(app.read("state.roundMistakes"), 1);
  assert.equal(app.read("state.mistakes[0].german"), "Er [1]____.");
  assert.equal(app.read("state.mistakes[0].reviewGerman"), "Er liest.");
});

test("Baustein preview and both card faces highlight the same Chinese phrase and current German answer", () => {
  const app = loadApp();
  const corpus = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "data", "baustein_questions.js"), "utf8"), corpus);
  app.context.highlightSection = JSON.parse(JSON.stringify(corpus.window.BAUSTEIN_QUESTIONS[0]));
  app.read(`
    globalThis.marked = element => element.children
      .flatMap(child => child.className === "baustein-review-answer" ? [child.textContent] : child.children ? marked(child) : []);
    globalThis.highlightQueue = BausteinStudy.buildRoundQueue(normalizeSections("baustein", [highlightSection]));
    renderHv2MemoryView(highlightQueue[0]);
  `);
  assert.equal(app.read("marked(els.sortList.children[0].children[0]).join('|')"), "gezogen|采取了");
  app.read("state.current = highlightQueue[1]; showFront(state.current)");
  assert.equal(app.read("marked(els.germanQuestion).join('|')"), "[1]____");
  assert.equal(app.read("marked(els.paragraphPanel).join('|')"), "采取了");
  const frontChinese = app.read("els.paragraphPanel.textContent");
  app.read("answerQuestion(state.current.answer)");
  assert.equal(app.read("marked(els.reviewGerman).join('|')"), "gezogen");
  assert.equal(app.read("marked(els.reviewChinese).join('|')"), "采取了");
  assert.ok(app.read("els.reviewChinese.textContent").startsWith(frontChinese));
  // Re-rendering another card must remove the previous card's marks.
  app.read("state.current = highlightQueue[2]; showFront(state.current)");
  assert.equal(app.read("marked(els.paragraphPanel).join('|')"), "列入教学安排");
  app.read("answerQuestion(state.current.answer)");
  assert.equal(app.read("marked(els.reviewGerman).join('|')"), "vorgesehen");
  assert.equal(app.read("marked(els.reviewChinese).join('|')"), "列入教学安排");
});

test("Baustein 4/5/1/2 and numpad keys select the matching grid option, score once, and Enter advances", () => {
  const source = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "data", "baustein_questions.js"), "utf8"), source);
  for (const index of [0, 1, 2, 3]) {
    const app = loadApp();
    app.context.choiceSource = JSON.parse(JSON.stringify(source.window.BAUSTEIN_QUESTIONS[0]));
    app.read("state.current = BausteinStudy.buildRoundQueue(normalizeSections('baustein', [choiceSource]))[1]; showFront(state.current)");
    assert.equal(app.read("isFlashcard(state.current)"), false);
    const isCorrect = app.read(`state.current.options[${index}].value === state.current.answer`);
    const key = ["4", "5", "1", "2"][index];
    assert.ok(app.read(`state.current.options[${index}].label`).startsWith(key + " · "));
    app.read("globalThis.originalAnswerQuestion = answerQuestion; answerQuestion = choice => { globalThis.selectedChoice = choice; originalAnswerQuestion(choice); }");
    assert.equal(app.press(key, { code: `Numpad${key}` }), true);
    assert.equal(app.context.selectedChoice, "ABCD"[index]);
    assert.equal(app.read("state.answeredInRound"), 1);
    assert.equal(app.read("state.roundMistakes"), isCorrect ? 0 : 1);
    assert.equal(app.read("els.backFace.classList.contains('hidden')"), false);
    assert.equal(app.read("els.correctAnswer.textContent"), "gezogen");
    assert.equal(app.read("els.missButton.classList.contains('hidden')"), true);
    assert.match(app.read("els.reviewChinese.textContent"), /动词搭配/);
    app.press("2");
    assert.equal(app.context.advances, 0);
    app.read("answerQuestion(state.current.answer)");
    assert.equal(app.read("state.answeredInRound"), 1);
    assert.equal(app.read("state.roundMistakes"), isCorrect ? 0 : 1);
    assert.equal(app.press("Enter"), true);
    assert.equal(app.context.advances, 1);
  }
});

test("Baustein choices ignore repeated keys, composition, editing and unknown choices", () => {
  const app = loadApp();
  app.context.choiceSource = {
    teil: 1, mode: "corpus-card", article: "Er [1]____.",
    questions: [{ number: 1, answerText: "liest", chinese: "他（1）读书。" }],
  };
  app.read("state.current = BausteinStudy.buildRoundQueue(normalizeSections('baustein', [choiceSource]))[1]; showFront(state.current)");
  for (const overrides of [{ repeat: true }, { isComposing: true }, { target: new ElementStub(true) }, { ctrlKey: true }]) {
    assert.equal(app.press("1", overrides), false);
  }
  assert.equal(app.press("3"), false);
  assert.equal(app.press("6"), false);
  app.read("answerQuestion('X')");
  assert.equal(app.read("state.answeredInRound"), 0);
});

test("Baustein feedback adds the gap rationale and expandable tables, clears them on the next card, and leaves table keyboard controls alone", () => {
  const app = loadApp();
  const source = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "data", "baustein_questions.js"), "utf8"), source);
  app.context.grammarSource = JSON.parse(JSON.stringify(source.window.BAUSTEIN_QUESTIONS[0]));
  app.read("globalThis.cards = BausteinStudy.buildRoundQueue(normalizeSections('baustein', [grammarSource])); state.current = cards[1]; showFront(state.current)");
  assert.equal(app.read("els.bausteinExplanation.classList.contains('hidden')"), true);
  app.read("answerQuestion(state.current.answer)");
  assert.equal(app.read("els.bausteinExplanation.classList.contains('hidden')"), false);
  assert.match(app.read("els.bausteinExplanation.textContent"), /Konsequenzen ziehen/);
  assert.match(app.read("els.bausteinExplanation.textContent"), /六时态/);
  assert.match(app.read("els.bausteinExplanation.textContent"), /ist gezogen worden/);
  const target = new ElementStub();
  target.closest = selector => selector === "#bausteinExplanation" ? target : null;
  assert.equal(app.press("Enter", { target }), false);
  assert.equal(app.context.advances, 0);
  app.read("state.current = cards[2]; showFront(state.current)");
  assert.equal(app.read("els.bausteinExplanation.classList.contains('hidden')"), true);
  assert.equal(app.read("els.bausteinExplanation.textContent"), "");
});

test("LV1 numbered preview changes only the displayed correct sentence, supports list switching, and never scores memory clicks", () => {
  const app = loadApp();
  app.context.previewSource = { teil: 1, title: "Test", positionCount: 6,
    questions: Array.from({ length: 6 }, (_, i) => ({ position: i + 1, number: i + 1, german: `Richtiger Satz ${i + 1}` })) };
  app.read(`
    state.level = 'lv1';
    state.current = Lv1Quiz.buildBatch(previewSource);
    state.queue = [state.current];
    els.sortList.querySelector = () => null;
    showFront(state.current);
    lv1MemoryDisplay = 'buttons';
    renderLv1PositionQuiz();
  `);
  assert.equal(app.read("els.sortList.children[2].children.length"), 6);
  assert.match(app.read("els.sortList.children[1].textContent"), /Richtiger Satz 1/);
  app.read("els.sortList.children[2].children[4].click()");
  assert.match(app.read("els.sortList.children[1].textContent"), /第 5 空.*Richtiger Satz 5/);
  assert.ok(!app.read("els.sortList.children[1].textContent").includes("Richtiger Satz 1"));
  assert.equal(app.read("state.answeredInRound"), 0);
  assert.equal(app.read("state.roundMistakes"), 0);
  app.read("els.sortList.children[0].children[0].click()");
  assert.equal(app.read("lv1MemoryDisplay"), "list");
  assert.match(app.read("els.sortList.children[1].textContent"), /Richtiger Satz 1.*Richtiger Satz 6/);
  app.read("submitLv1PositionStep()");
  assert.equal(app.read("lv1PositionSession.phase"), "practice");
  assert.equal(app.read("state.answeredInRound"), 0);
});

test("LV1 shows the matched Chinese in list preview, numbered preview, practice, immediate feedback and final review", () => {
  const app = loadApp();
  const source = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "data", "lv1_questions.js"), "utf8"), source);
  app.context.lv1Source = JSON.parse(JSON.stringify(source.window.LV1_QUESTIONS[0]));
  app.read(`
    state.level = 'lv1';
    globalThis.lv1Sections = normalizeSections('lv1', [lv1Source]);
    state.current = Lv1Quiz.buildBatch(lv1Sections[0]);
    state.queue = [state.current];
    els.sortList.querySelector = () => null;
    showFront(state.current);
  `);
  const firstChinese = app.read("lv1Sections[0].questions[0].chinese");
  assert.ok(firstChinese.startsWith("考古学家"));
  assert.ok(app.read("els.sortList.textContent").includes(firstChinese));
  app.read("lv1MemoryDisplay = 'buttons'; renderLv1PositionQuiz(); selectLv1MemoryPosition(2)");
  assert.ok(app.read("els.sortList.children[1].textContent").includes(app.read("lv1Sections[0].questions[1].chinese")));
  app.read("submitLv1PositionStep()");
  const currentChinese = app.read("Lv1Quiz.current(lv1PositionSession).chinese");
  assert.ok(app.read("els.sortList.textContent").includes(currentChinese));
  app.read("chooseLv1Position(0)");
  assert.ok(app.read("els.sortList.textContent").includes(currentChinese));
  app.read(`
    submitLv1PositionStep();
    while (lv1PositionSession.phase === 'practice') {
      chooseLv1Position(Lv1Quiz.current(lv1PositionSession).position);
      submitLv1PositionStep();
    }
  `);
  assert.ok(app.read("els.sortList.textContent").includes(firstChinese));
  assert.ok(app.read("els.sortList.textContent").includes(currentChinese));
  assert.equal(app.read("state.roundMistakes"), 1);
});
