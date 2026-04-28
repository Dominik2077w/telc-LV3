const data = (window.LV3_QUESTIONS || []).map((section) => ({
  ...section,
  questions: section.questions.map((question, index) => {
    const split = splitLanguages(question.text || question.raw || "");
    const german = question.german || split.german || question.text || question.raw || "";
    const chinese = question.chinese || split.chinese || "暂无中文释义";
    return {
      ...question,
      id: `${section.teil}-${question.number}-${index}`,
      teil: section.teil,
      teilTitle: section.title,
      german,
      chinese,
    };
  }),
}));

const state = {
  selectedTeils: new Set(data.filter((section) => section.questions.length).map((section) => section.teil)),
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
  germanQuestion: document.querySelector("#germanQuestion"),
  answerGrid: document.querySelector("#answerGrid"),
  frontFace: document.querySelector("#frontFace"),
  backFace: document.querySelector("#backFace"),
  resultLine: document.querySelector("#resultLine"),
  correctAnswer: document.querySelector("#correctAnswer"),
  reviewGerman: document.querySelector("#reviewGerman"),
  reviewChinese: document.querySelector("#reviewChinese"),
  nextButton: document.querySelector("#nextButton"),
  roundStrip: document.querySelector("#roundStrip"),
};

const answerShortcutKeys = {
  ArrowLeft: 0,
  ArrowDown: 1,
  ArrowRight: 2,
};

renderTeilList();
bindEvents();
renderIdle();
registerServiceWorker();

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
  document.addEventListener("keydown", handleKeyboardNavigation);
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
  els.answerGrid.innerHTML = "";
  els.frontFace.classList.remove("hidden");
  els.backFace.classList.add("hidden");
  els.roundStrip.textContent =
    els.roundMode.value === "mistakes" ? "错题轮回完成，当前选择的题都做对了。" : "单轮练习完成。";
  updateStats();
}

function showFront(question) {
  els.frontFace.classList.remove("hidden");
  els.backFace.classList.add("hidden");
  els.sessionMode.textContent = `${els.teilOrder.value === "random" ? "Teil 随机" : "Teil 顺序"} · ${
    els.questionOrder.value === "random" ? "题目随机" : "题目顺序"
  }`;
  els.sessionTitle.textContent = `Teil ${question.teil}: ${question.teilTitle}`;
  els.teilBadge.textContent = `Teil ${question.teil} · ${question.teilTitle}`;
  els.questionBadge.textContent = `Frage ${question.number}`;
  els.germanQuestion.textContent = question.german;
  els.answerGrid.innerHTML = "";
  els.roundStrip.textContent = `Runde ${state.round}`;

  for (const choice of getChoices(question)) {
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
  els.reviewGerman.textContent = question.german;
  els.reviewChinese.textContent = question.chinese;
  els.roundStrip.textContent =
    els.roundMode.value === "mistakes" ? "答错的题会进入下一轮。" : "当前是单轮练习。";
  updateStats();
}

function updateStats() {
  els.roundNumber.textContent = state.round;
  els.progressText.textContent = state.queue.length
    ? `${Math.min(state.answeredInRound + (els.backFace.classList.contains("hidden") ? 0 : 0), state.queue.length)}/${state.queue.length}`
    : "0/0";
  els.mistakeText.textContent = state.roundMistakes;
}

function renderIdle() {
  els.roundStrip.textContent = "Bereit.";
  els.answerGrid.innerHTML = "";
}

function getChoices(question) {
  if (["R", "F", "X"].includes(question.answer)) {
    return [
      { value: "R", label: "Richtig", shortcut: "←" },
      { value: "F", label: "Falsch", shortcut: "↓" },
      { value: "X", label: "Nicht im Text", shortcut: "→" },
    ];
  }

  if (question.number === 24 || ["A", "B", "C"].includes(question.answer)) {
    return [
      { value: "A", label: "A", shortcut: "←" },
      { value: "B", label: "B", shortcut: "↓" },
      { value: "C", label: "C", shortcut: "→" },
    ];
  }

  return [
    { value: "R", label: "Richtig", shortcut: "←" },
    { value: "F", label: "Falsch", shortcut: "↓" },
    { value: "X", label: "Nicht im Text", shortcut: "→" },
  ];
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
