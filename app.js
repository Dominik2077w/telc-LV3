const datasets = {
  lv2: {
    label: "LV2",
    title: "LV2 段落卡片 Trainer",
    source: window.LV2_QUESTIONS || [],
    promptLabel: "Abschnitt",
    answerLabel: "对应题项",
    reviewGermanLabel: "段落大意",
    reviewChineseLabel: "段落首句",
    idleText: "选择 LV2 后，按段落 A-E 背第一句、段意和题项。",
  },
  lv3: {
    label: "LV3",
    title: "LV3 Trainer",
    source: window.LV3_QUESTIONS || [],
    promptLabel: "Deutsch",
    answerLabel: "Antwort",
    reviewGermanLabel: "Deutsch",
    reviewChineseLabel: "中文",
    idleText: "选择 LV3 后，按 Richtig / Falsch / Nicht im Text 练习。",
  },
};

let data = [];

const state = {
  level: null,
  selectedTeils: new Set(),
  sessionSource: [],
  queue: [],
  mistakes: [],
  current: null,
  currentIndex: 0,
  round: 0,
  answeredInRound: 0,
  roundMistakes: 0,
  complete: false,
};

const els = {
  levelGate: document.querySelector("#levelGate"),
  levelButtons: [...document.querySelectorAll("[data-level-choice]")],
  levelSwitchButtons: [...document.querySelectorAll("[data-level-switch]")],
  appTitle: document.querySelector("#appTitle"),
  appEyebrow: document.querySelector("#appEyebrow"),
  teilList: document.querySelector("#teilList"),
  toggleAllButton: document.querySelector("#toggleAllButton"),
  teilOrder: document.querySelector("#teilOrder"),
  questionOrder: document.querySelector("#questionOrder"),
  roundMode: document.querySelector("#roundMode"),
  startButton: document.querySelector("#startButton"),
  sessionMode: document.querySelector("#sessionMode"),
  sessionTitle: document.querySelector("#sessionTitle"),
  roundNumber: document.querySelector("#roundNumber"),
  progressText: document.querySelector("#progressText"),
  mistakeText: document.querySelector("#mistakeText"),
  teilBadge: document.querySelector("#teilBadge"),
  questionBadge: document.querySelector("#questionBadge"),
  promptLabel: document.querySelector("#promptLabel"),
  germanQuestion: document.querySelector("#germanQuestion"),
  paragraphPanel: document.querySelector("#paragraphPanel"),
  answerGrid: document.querySelector("#answerGrid"),
  frontFace: document.querySelector("#frontFace"),
  backFace: document.querySelector("#backFace"),
  resultLine: document.querySelector("#resultLine"),
  correctAnswerLabel: document.querySelector("#correctAnswerLabel"),
  correctAnswer: document.querySelector("#correctAnswer"),
  reviewGermanLabel: document.querySelector("#reviewGermanLabel"),
  reviewGerman: document.querySelector("#reviewGerman"),
  reviewChineseLabel: document.querySelector("#reviewChineseLabel"),
  reviewChinese: document.querySelector("#reviewChinese"),
  missButton: document.querySelector("#missButton"),
  nextButton: document.querySelector("#nextButton"),
  roundStrip: document.querySelector("#roundStrip"),
};

const answerShortcutKeys = {
  ArrowLeft: 0,
  ArrowUp: 1,
  ArrowDown: 1,
  ArrowRight: 2,
  1: 0,
  2: 1,
  3: 2,
  4: 3,
  5: 4,
  a: 0,
  b: 1,
  c: 2,
  d: 3,
  e: 4,
  A: 0,
  B: 1,
  C: 2,
  D: 3,
  E: 4,
};

bindEvents();
selectLevel("lv3", { keepGate: true });
renderIdle();
registerServiceWorker();

function selectLevel(level, options = {}) {
  state.level = level;
  data = normalizeSections(level, datasets[level].source);
  state.selectedTeils = new Set(data.filter((section) => section.questions.length).map((section) => section.teil));
  state.sessionSource = [];
  state.queue = [];
  state.mistakes = [];
  state.current = null;
  state.currentIndex = 0;
  state.round = 0;
  state.answeredInRound = 0;
  state.roundMistakes = 0;
  state.complete = false;

  renderLevelChrome();
  renderTeilList();
  renderIdle();

  if (!options.keepGate) {
    els.levelGate.classList.add("hidden");
  }
}

function normalizeSections(level, sections) {
  return sections.map((section) => {
    return {
      ...section,
      level,
      questions: section.questions.map((question, index) => {
        const split = splitLanguages(question.text || question.raw || "");
        const german = question.german || split.german || question.text || question.raw || "";
        const chinese = question.chinese || split.chinese || "暂无中文释义";
        return {
          ...question,
          id: `${level}-${section.teil}-${question.number}-${index}`,
          level,
          teil: section.teil,
          teilTitle: section.title,
          sectionMode: section.mode || "judgement",
          german,
          chinese,
        };
      }),
    };
  });
}

function splitLanguages(text) {
  const normalized = String(text).replace(/\s+/g, " ").trim();
  const firstCjk = normalized.search(/[\u3400-\u9fff]/);
  if (firstCjk === -1) return { german: normalized, chinese: "" };
  return {
    german: normalized.slice(0, firstCjk).trim(),
    chinese: normalized.slice(firstCjk).trim(),
  };
}

function bindEvents() {
  for (const button of els.levelButtons) {
    button.addEventListener("click", () => selectLevel(button.dataset.levelChoice));
  }

  for (const button of els.levelSwitchButtons) {
    button.addEventListener("click", () => selectLevel(button.dataset.levelSwitch));
  }

  els.toggleAllButton.addEventListener("click", () => {
    const selectable = data.filter((section) => section.questions.length).map((section) => section.teil);
    if (state.selectedTeils.size === selectable.length) {
      state.selectedTeils.clear();
    } else {
      state.selectedTeils = new Set(selectable);
    }
    renderTeilList();
  });

  els.startButton.addEventListener("click", startSession);
  els.nextButton.addEventListener("click", nextQuestion);
  els.missButton.addEventListener("click", markFlashcardMissed);
  document.addEventListener("keydown", handleKeyboardNavigation);
}

function renderLevelChrome() {
  const config = datasets[state.level];
  document.title = `telc ${config.label} Trainer`;
  els.appEyebrow.textContent = "telc C1 Hochschule";
  els.appTitle.textContent = config.title;
  els.promptLabel.textContent = config.promptLabel;
  els.correctAnswerLabel.textContent = config.answerLabel;
  els.reviewGermanLabel.textContent = config.reviewGermanLabel;
  els.reviewChineseLabel.textContent = config.reviewChineseLabel;

  for (const button of els.levelSwitchButtons) {
    button.classList.toggle("active", button.dataset.levelSwitch === state.level);
  }
}

function renderTeilList() {
  els.teilList.innerHTML = "";
  for (const section of data) {
    const label = document.createElement("label");
    label.className = "teil-item";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = state.selectedTeils.has(section.teil);
    input.disabled = section.questions.length === 0;
    input.addEventListener("change", () => {
      if (input.checked) state.selectedTeils.add(section.teil);
      else state.selectedTeils.delete(section.teil);
    });

    const name = document.createElement("span");
    name.className = "teil-name";
    name.innerHTML = `<strong>Teil ${section.teil}</strong><span>${escapeHtml(section.title)}</span>`;

    const count = document.createElement("span");
    count.className = "count-pill";
    count.textContent = section.questions.length || "待定";

    label.append(input, name, count);
    els.teilList.append(label);
  }
}

function startSession() {
  const chosen = data.filter((section) => state.selectedTeils.has(section.teil) && section.questions.length);
  if (!chosen.length) {
    els.roundStrip.textContent = "请选择至少一个有题目的 Teil。";
    return;
  }

  const teilOrdered = applyOrder(chosen, els.teilOrder.value);
  state.sessionSource = teilOrdered.flatMap((section) => {
    const questions = applyOrder(section.questions, els.questionOrder.value);
    return questions.map((question) => ({ ...question }));
  });

  state.round = 1;
  state.complete = false;
  startRound(state.sessionSource);
}

function startRound(source) {
  state.queue = source.map((question) => ({ ...question }));
  state.mistakes = [];
  state.currentIndex = 0;
  state.answeredInRound = 0;
  state.roundMistakes = 0;
  state.current = null;
  nextQuestion();
}

function nextQuestion() {
  if (state.complete) return;

  if (state.currentIndex >= state.queue.length) {
    finishRound();
    return;
  }

  state.current = state.queue[state.currentIndex];
  state.currentIndex += 1;
  showFront(state.current);
  updateStats();
}

function finishRound() {
  if (els.roundMode.value === "mistakes" && state.mistakes.length) {
    const count = state.mistakes.length;
    state.round += 1;
    els.roundStrip.textContent = `本轮错 ${count} 题，下一轮只重复错题。`;
    startRound(applyOrder(state.mistakes, els.questionOrder.value));
    return;
  }

  state.complete = true;
  els.sessionMode.textContent = "完成";
  els.sessionTitle.textContent = "这一组已经全部结束";
  els.teilBadge.textContent = "Fertig";
  els.questionBadge.textContent = "0";
  els.germanQuestion.textContent =
    els.roundMode.value === "mistakes" ? "Alle Fragen sind richtig beantwortet." : "Runde abgeschlossen.";
  els.paragraphPanel.innerHTML = "";
  els.paragraphPanel.classList.add("hidden");
  els.answerGrid.innerHTML = "";
  els.missButton.classList.add("hidden");
  els.nextButton.textContent = "下一题";
  els.frontFace.classList.remove("hidden");
  els.backFace.classList.add("hidden");
  els.roundStrip.textContent =
    els.roundMode.value === "mistakes" ? "错题轮回完成，当前选择的题都做对了。" : "单轮练习完成。";
  updateStats();
}

function showFront(question) {
  els.frontFace.classList.remove("hidden");
  els.backFace.classList.add("hidden");
  els.sessionMode.textContent = `${datasets[state.level].label} · ${
    els.teilOrder.value === "random" ? "Teil 随机" : "Teil 顺序"
  } · ${els.questionOrder.value === "random" ? "题目随机" : "题目顺序"}`;
  els.sessionTitle.textContent = `Teil ${question.teil}: ${question.teilTitle}`;
  els.teilBadge.textContent = `Teil ${question.teil} · ${question.teilTitle}`;
  els.questionBadge.textContent = `Frage ${question.number}`;
  els.germanQuestion.textContent =
    question.sectionMode === "paragraph-card"
      ? `${question.paragraph || question.number}. ${question.firstSentence || question.german}`
      : question.german;
  els.answerGrid.innerHTML = "";
  els.roundStrip.textContent = `Runde ${state.round}`;

  renderParagraphPanel(question);

  if (question.sectionMode === "paragraph-card") {
    els.questionBadge.textContent = `Abschnitt ${question.paragraph || question.number}`;
    els.answerGrid.dataset.count = "1";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "answer-button";
    button.textContent = "看背面";
    button.addEventListener("click", revealFlashcard);
    els.answerGrid.append(button);
    return;
  }

  const choices = getChoices(question);
  els.answerGrid.dataset.count = String(choices.length);
  for (const choice of choices) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "answer-button";
    button.dataset.choice = choice.value;
    button.title = choice.shortcut;
    button.textContent = choice.label;
    button.addEventListener("click", () => answerQuestion(choice.value));
    els.answerGrid.append(button);
  }
}

function renderParagraphPanel(question) {
  els.paragraphPanel.innerHTML = "";

  if (question.sectionMode !== "paragraph-match") {
    els.paragraphPanel.classList.add("hidden");
    return;
  }

  els.paragraphPanel.classList.remove("hidden");
  for (const paragraph of question.paragraphs) {
    const item = document.createElement("div");
    item.className = "paragraph-option";
    item.innerHTML = `<strong>${escapeHtml(paragraph.label)}</strong><span>${escapeHtml(
      paragraph.firstSentence
    )}</span><em>${escapeHtml(paragraph.summary)}</em>`;
    els.paragraphPanel.append(item);
  }
}

function revealFlashcard() {
  const question = state.current;
  state.answeredInRound += 1;

  els.frontFace.classList.add("hidden");
  els.backFace.classList.remove("hidden");
  els.resultLine.className = "result-line neutral";
  els.resultLine.textContent = `Abschnitt ${question.paragraph || question.number}`;
  els.correctAnswer.textContent = formatLv2Items(question);
  els.reviewGerman.textContent = question.summary || "暂无段落大意";
  els.reviewChinese.textContent = question.firstSentence || question.german;
  els.missButton.classList.remove("hidden");
  els.nextButton.textContent = "记得，下一张";
  els.roundStrip.textContent =
    els.roundMode.value === "mistakes" ? "不熟的段落可以点“不记得”，下一轮重复。" : "当前是单轮练习。";
  updateStats();
}

function handleKeyboardNavigation(event) {
  if (event.repeat || state.complete) return;
  if (isEditableTarget(event.target)) return;
  if (!state.current || state.complete) return;

  if (els.backFace.classList.contains("hidden")) {
    handleAnswerShortcut(event);
    return;
  }

  if (!isContinueKey(event)) return;
  if (isNativeButtonKey(event)) return;
  event.preventDefault();
  nextQuestion();
}

function handleAnswerShortcut(event) {
  if (!(event.key in answerShortcutKeys)) return;

  const buttons = [...els.answerGrid.querySelectorAll(".answer-button")];
  const button = buttons[answerShortcutKeys[event.key]];
  if (!button) return;

  event.preventDefault();
  button.click();
}

function isEditableTarget(target) {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest("input, select, textarea, [contenteditable='true']"));
}

function isContinueKey(event) {
  if (event.metaKey || event.ctrlKey || event.altKey) return false;
  return !["Shift", "Control", "Alt", "Meta", "CapsLock", "Tab", "Escape"].includes(event.key);
}

function isNativeButtonKey(event) {
  if (!(event.target instanceof Element)) return false;
  return Boolean(event.target.closest("button")) && ["Enter", " "].includes(event.key);
}

function answerQuestion(choice) {
  const question = state.current;
  const correct = question.answer || null;
  const isKnown = Boolean(correct);
  const isCorrect = isKnown && choice === correct;

  state.answeredInRound += 1;
  if (isKnown && !isCorrect) {
    state.roundMistakes += 1;
    state.mistakes.push(question);
  }

  els.frontFace.classList.add("hidden");
  els.backFace.classList.remove("hidden");
  els.resultLine.className = "result-line";

  if (!isKnown) {
    els.resultLine.classList.add("neutral");
    els.resultLine.textContent = `已选择 ${choice}，本题答案未标注`;
  } else if (isCorrect) {
    els.resultLine.textContent = `Richtig · ${choice}`;
  } else {
    els.resultLine.classList.add("wrong");
    els.resultLine.textContent = `Falsch · 你选 ${choice}`;
  }

  els.correctAnswer.textContent = correct || "未标注";
  els.reviewGerman.textContent = getReviewGerman(question);
  els.reviewChinese.textContent = getReviewChinese(question);
  els.missButton.classList.add("hidden");
  els.nextButton.textContent = "下一题";
  els.roundStrip.textContent =
    els.roundMode.value === "mistakes" ? "答错的题会进入下一轮。" : "当前是单轮练习。";
  updateStats();
}

function markFlashcardMissed() {
  if (!state.current) return;
  state.roundMistakes += 1;
  state.mistakes.push(state.current);
  els.missButton.classList.add("hidden");
  els.resultLine.className = "result-line wrong";
  els.resultLine.textContent = `已加入错题 · Abschnitt ${state.current.paragraph || state.current.number}`;
  els.roundStrip.textContent = "这一段会进入下一轮。";
  updateStats();
}

function getReviewGerman(question) {
  if (question.sectionMode === "paragraph-match") {
    return question.firstSentence || "-";
  }
  return question.german;
}

function getReviewChinese(question) {
  if (question.sectionMode === "paragraph-match") {
    return question.summary || question.chinese;
  }
  return question.chinese;
}

function updateStats() {
  els.roundNumber.textContent = state.round;
  els.progressText.textContent = state.queue.length
    ? `${Math.min(state.answeredInRound, state.queue.length)}/${state.queue.length}`
    : "0/0";
  els.mistakeText.textContent = state.roundMistakes;
}

function renderIdle() {
  const config = datasets[state.level];
  els.sessionMode.textContent = "未开始";
  els.sessionTitle.textContent = "选择 Teil 后开始练习";
  els.teilBadge.textContent = config.label;
  els.questionBadge.textContent = "Frage";
  els.germanQuestion.textContent = config.idleText;
  els.paragraphPanel.innerHTML = "";
  els.paragraphPanel.classList.add("hidden");
  els.answerGrid.innerHTML = "";
  els.missButton.classList.add("hidden");
  els.nextButton.textContent = "下一题";
  els.frontFace.classList.remove("hidden");
  els.backFace.classList.add("hidden");
  els.roundStrip.textContent = "Bereit.";
  updateStats();
}

function getChoices(question) {
  if (question.options?.length) {
    return question.options;
  }

  if (["R", "F", "X"].includes(question.answer)) {
    return [
      { value: "R", label: "Richtig", shortcut: "← / 1" },
      { value: "F", label: "Falsch", shortcut: "↑ / ↓ / 2" },
      { value: "X", label: "Nicht im Text", shortcut: "→ / 3" },
    ];
  }

  if (question.number === 24 || ["A", "B", "C"].includes(question.answer)) {
    return [
      { value: "A", label: "A", shortcut: "← / 1" },
      { value: "B", label: "B", shortcut: "↑ / ↓ / 2" },
      { value: "C", label: "C", shortcut: "→ / 3" },
    ];
  }

  return [
    { value: "R", label: "Richtig", shortcut: "← / 1" },
    { value: "F", label: "Falsch", shortcut: "↑ / ↓ / 2" },
    { value: "X", label: "Nicht im Text", shortcut: "→ / 3" },
  ];
}

function formatLv2Items(question) {
  if (!question.items?.length) return "资料未明确给出对应题项";
  return question.items
    .map((item) => `${item.number ? `${item.number}. ` : ""}${item.text}`)
    .join("\n");
}

function applyOrder(items, mode) {
  const copy = [...items];
  if (mode !== "random") return copy;
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (!["http:", "https:"].includes(window.location.protocol)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {
      els.roundStrip.textContent = "离线缓存注册失败，但当前练习仍可使用。";
    });
  });
}
