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
  lv2v2: {
    label: "LV2-版本2",
    title: "LV2-版本2 信号词配对",
    source: window.LV2_V2_QUESTIONS || [],
    promptLabel: "Signal-Satz",
    answerLabel: "Abschnitt",
    reviewGermanLabel: "对应问句",
    reviewChineseLabel: "中文解释",
    idleText: "选择 LV2-版本2 后，把德语原句拖到对应德语信号词。",
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
  hv1: {
    label: "HV1",
    title: "HV1 Hörverstehen Trainer",
    source: window.HV1_QUESTIONS || [],
    promptLabel: "Hörtext",
    answerLabel: "Leitsatz",
    reviewGermanLabel: "Transkript",
    reviewChineseLabel: "中文",
    idleText: "选择 HV1 后，听音频选出对应 Leitsatz。",
  },
  hv2: {
    label: "HV2",
    title: "HV2 Hörverstehen 选择 Trainer",
    source: window.HV2_QUESTIONS || [],
    promptLabel: "题面",
    answerLabel: "正确选项",
    reviewGermanLabel: "正确补全",
    reviewChineseLabel: "中文",
    idleText: "选择 HV2 后，读德语题面，并在 A/B/C 中选择正确补全。",
  },
  writing: {
    label: "作文专题",
    title: "作文专题 Trainer",
    source: window.WRITING_QUESTIONS || [],
    promptLabel: "Deutsch",
    answerLabel: "Deutsch",
    reviewGermanLabel: "Deutsch",
    reviewChineseLabel: "中文",
    idleText: "选择作文专题后，正面背德语主题，背面看德语和中文意思。",
  },
  baustein: {
    label: "Baustein",
    title: "Baustein 完形填空 Trainer",
    source: window.BAUSTEIN_QUESTIONS || [],
    promptLabel: "Artikel",
    answerLabel: "答案",
    reviewGermanLabel: "解析",
    reviewChineseLabel: "说明",
    idleText: "选择 Baustein 后，按完整文章逐空选择 a/b/c/d，最后统一核对答案。",
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
  usedAnswers: {},
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
  questionCard: document.querySelector("#questionCard"),
  paragraphPanel: document.querySelector("#paragraphPanel"),
  audioPanel: document.querySelector("#audioPanel"),
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
  lv2Mode: document.querySelector("#lv2Mode"),
  lv2ModeLabel: document.querySelector("#lv2ModeLabel"),
  lv2GlobalDisplay: document.querySelector("#lv2GlobalDisplay"),
  lv2GlobalDisplayLabel: document.querySelector("#lv2GlobalDisplayLabel"),
  hv1Mode: document.querySelector("#hv1Mode"),
  hv1ModeLabel: document.querySelector("#hv1ModeLabel"),
  sortModeView: document.querySelector("#sortModeView"),
  sortList: document.querySelector("#sortList"),
  sortTeilBadge: document.querySelector("#sortTeilBadge"),
  sortInfo: document.querySelector("#sortInfo"),
  sortShuffleButton: document.querySelector("#sortShuffleButton"),
  sortSubmitButton: document.querySelector("#sortSubmitButton"),
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
  6: 5,
  7: 6,
  8: 7,
  a: 0,
  b: 1,
  c: 2,
  d: 3,
  e: 4,
  f: 5,
  g: 6,
  h: 7,
  A: 0,
  B: 1,
  C: 2,
  D: 3,
  E: 4,
  F: 5,
  G: 6,
  H: 7,
};

bindEvents();
selectLevel("lv3", { keepGate: true });
renderIdle();
unregisterServiceWorker();

function selectLevel(level, options = {}) {
  stopSortAudio();
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
        const mode = level === "hv1" ? "hv1-match" : (section.mode || "judgement");
        return {
          ...question,
          id: `${level}-${section.teil}-${question.number}-${index}`,
          level,
          teil: section.teil,
          teilTitle: section.title,
          sectionMode: mode,
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
  els.missButton.addEventListener("click", () => markFlashcardMissed({ advance: true }));
  els.lv2Mode.addEventListener("change", renderLevelChrome);
  els.lv2GlobalDisplay.addEventListener("change", () => {
    if (state.current?.sectionMode === "lv2-global-sort" && !state.complete) {
      els.sortInfo.textContent = getLv2GlobalInstruction();
      renderLv2GlobalSortList();
      bindLv2GlobalSortEvents();
    }
  });
  els.sortSubmitButton.addEventListener("click", submitSort);
  els.sortShuffleButton.addEventListener("click", shuffleSort);
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

  els.lv2ModeLabel.classList.toggle("hidden", state.level !== "lv2");
  els.lv2GlobalDisplayLabel.classList.toggle(
    "hidden",
    state.level !== "lv2" || els.lv2Mode.value !== "global-sort"
  );
  els.hv1ModeLabel.classList.toggle("hidden", state.level !== "hv1");
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

  if ((state.level === "lv2" && els.lv2Mode.value === "global-sort") || state.level === "lv2v2") {
    state.sessionSource = teilOrdered.map(buildLv2GlobalSortBatch);
  } else if (state.level === "baustein") {
    state.sessionSource = teilOrdered.map((section) => ({ ...section, sectionMode: "baustein-article" }));
  } else if (state.level === "hv1" && els.hv1Mode.value === "sort") {
    state.sessionSource = teilOrdered.map(function (section) {
      var questions = applyOrder(section.questions, "sequential").map(function (q) {
        return { ...q };
      });
      return {
        id: "hv1-sort-" + section.teil,
        level: "hv1",
        teil: section.teil,
        teilTitle: section.title,
        sectionMode: "hv1-sort",
        questions: questions,
        german: section.title,
        chinese: "",
      };
    });
  } else {
    state.sessionSource = teilOrdered.flatMap((section) => {
      const questions = applyOrder(section.questions, els.questionOrder.value);
      return questions.map((question) => ({ ...question }));
    });
  }

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
  state.usedAnswers = {};
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
  els.germanQuestion.classList.remove("field-question");
  els.germanQuestion.classList.remove("baustein-title");
  els.paragraphPanel.innerHTML = "";
  els.paragraphPanel.classList.remove("baustein-panel");
  els.paragraphPanel.classList.add("hidden");
  els.answerGrid.innerHTML = "";
  els.missButton.classList.add("hidden");
  els.nextButton.textContent = "下一题";
  els.frontFace.classList.remove("hidden");
  els.backFace.classList.add("hidden");
  els.questionCard.classList.remove("hidden");
  els.sortModeView.classList.add("hidden");
  stopSortAudio();
  els.roundStrip.textContent =
    els.roundMode.value === "mistakes" ? "错题轮回完成，当前选择的题都做对了。" : "单轮练习完成。";
  updateStats();
}

function showFront(question) {
  if (question.sectionMode === "baustein-article") {
    renderBausteinArticle(question);
    updateStats();
    return;
  }

  if (question.sectionMode === "lv2-global-sort") {
    els.sessionMode.textContent = `${datasets[question.level || state.level]?.label || "LV2"} · 全局排序`;
    els.sessionTitle.textContent = "Teil " + question.teil + ": " + question.teilTitle;
    els.teilBadge.textContent = "Teil " + question.teil;
    els.questionBadge.textContent = "全局排序";
    els.questionCard.classList.add("hidden");
    els.audioPanel.classList.add("hidden");
    els.sortModeView.classList.remove("hidden");
    renderLv2GlobalSortView(question);
    updateStats();
    return;
  }

  if (question.sectionMode === "hv1-sort") {
    els.sessionMode.textContent = "HV1 · 排序匹配";
    els.sessionTitle.textContent = "Teil " + question.teil + ": " + question.teilTitle;
    els.teilBadge.textContent = "Teil " + question.teil;
    els.questionBadge.textContent = "排序";
    els.questionCard.classList.add("hidden");
    els.audioPanel.classList.add("hidden");
    els.sortModeView.classList.remove("hidden");
    renderSortView(question);
    updateStats();
    return;
  }

  els.questionCard.classList.remove("hidden");
  els.sortModeView.classList.add("hidden");
  els.frontFace.classList.remove("hidden");
  els.backFace.classList.add("hidden");
  els.sessionMode.textContent = `${datasets[state.level].label} · ${
    els.teilOrder.value === "random" ? "Teil 随机" : "Teil 顺序"
  } · ${els.questionOrder.value === "random" ? "题目随机" : "题目顺序"}`;
  els.sessionTitle.textContent = `Teil ${question.teil}: ${question.teilTitle}`;
  els.teilBadge.textContent = `Teil ${question.teil} · ${question.teilTitle}`;
  els.questionBadge.textContent =
    question.sectionMode === "hv1-match"
      ? `Sprecher ${question.number}`
      : `Frage ${question.number}`;
  els.germanQuestion.textContent =
    question.frontFields
      ? formatFields(question.frontFields)
      : question.sectionMode === "hv1-match"
      ? `Sprecher ${question.number} — Welcher Leitsatz passt?`
      : question.sectionMode === "paragraph-card"
      ? `${question.paragraph || question.number}. ${question.firstSentence || question.german}`
      : question.german;
  els.germanQuestion.classList.remove("baustein-title");
  els.germanQuestion.classList.toggle("field-question", Boolean(question.frontFields));
  els.answerGrid.innerHTML = "";
  els.roundStrip.textContent = `Runde ${state.round}`;

  renderParagraphPanel(question);
  renderAudioPlayer(question);

  if (isFlashcard(question)) {
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
    if (choice.disabled) {
      button.disabled = true;
      button.title = "已使用";
    }
    button.addEventListener("click", () => answerQuestion(choice.value));
    els.answerGrid.append(button);
  }
}

function renderParagraphPanel(question) {
  els.paragraphPanel.innerHTML = "";
  els.paragraphPanel.classList.remove("baustein-panel");

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

function renderBausteinArticle(section) {
  els.questionCard.classList.remove("hidden");
  els.sortModeView.classList.add("hidden");
  els.audioPanel.classList.add("hidden");
  els.frontFace.classList.remove("hidden");
  els.backFace.classList.add("hidden");
  els.sessionMode.textContent = "Baustein · 完整文章";
  els.sessionTitle.textContent = `Teil ${section.teil}: ${section.title}`;
  els.teilBadge.textContent = `Teil ${section.teil}`;
  els.questionBadge.textContent = `${section.questions.length} Lücken`;
  els.promptLabel.textContent = "Artikel";
  els.germanQuestion.textContent = section.title;
  els.germanQuestion.classList.add("baustein-title");
  els.paragraphPanel.classList.remove("hidden");
  els.paragraphPanel.classList.add("baustein-panel");
  els.paragraphPanel.innerHTML = "";
  els.answerGrid.innerHTML = "";
  els.answerGrid.dataset.count = "1";
  els.roundStrip.textContent = "先逐空选择 a/b/c/d，全部选完后统一核对。";

  const article = document.createElement("div");
  article.className = "baustein-article";
  article.innerHTML = formatBausteinArticle(section.article || "");
  els.paragraphPanel.append(article);

  const floatingPanel = document.createElement("aside");
  floatingPanel.className = "baustein-floating-panel";
  floatingPanel.setAttribute("aria-live", "polite");
  els.paragraphPanel.append(floatingPanel);

  const optionList = document.createElement("div");
  optionList.className = "baustein-options";
  for (const question of section.questions) {
    optionList.append(createBausteinQuestionNode(question));
  }
  els.paragraphPanel.append(optionList);

  const actions = document.createElement("div");
  actions.className = "baustein-actions";

  const result = document.createElement("div");
  result.className = "baustein-result";
  result.setAttribute("aria-live", "polite");

  const submit = document.createElement("button");
  submit.type = "button";
  submit.className = "primary-button";
  submit.textContent = "统一核对答案";
  submit.addEventListener("click", () => submitBausteinArticle(section));

  actions.append(submit, result);
  els.answerGrid.append(actions);
  setBausteinFocus(0);
}

function createBausteinQuestionNode(question) {
  const row = document.createElement("section");
  row.className = "baustein-question";
  row.dataset.number = question.number;
  row.dataset.answer = question.answer;
  row.addEventListener("click", () => setBausteinFocus(getBausteinRowIndex(row)));

  const header = document.createElement("div");
  header.className = "baustein-question-head";
  header.innerHTML = `<strong>${escapeHtml(question.number)}</strong><span></span>`;
  row.append(header);

  const options = document.createElement("div");
  options.className = "baustein-option-grid";
  for (const option of question.options || []) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "baustein-option";
    button.dataset.choice = option.value;
    button.textContent = option.label;
    button.title = option.shortcut || option.value;
    button.addEventListener("click", () => selectBausteinOption(row, button));
    options.append(button);
  }
  row.append(options);
  return row;
}

function selectBausteinOption(row, button) {
  if (row.classList.contains("checked")) return;
  for (const option of row.querySelectorAll(".baustein-option")) {
    option.classList.toggle("selected", option === button);
  }
  row.dataset.selected = button.dataset.choice;
  updateBausteinBlank(row);
  setBausteinFocus(getBausteinRowIndex(row) + 1, { preferUnanswered: true });
}

function setBausteinFocus(index, options = {}) {
  const rows = getBausteinRows();
  if (!rows.length) return;

  let nextIndex = Math.max(0, Math.min(index, rows.length - 1));
  if (options.preferUnanswered) {
    const unansweredIndex = rows.findIndex((row, rowIndex) => rowIndex >= nextIndex && !row.dataset.selected);
    nextIndex = unansweredIndex === -1 ? rows.length - 1 : unansweredIndex;
  }

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    rows[rowIndex].classList.toggle("current", rowIndex === nextIndex);
  }

  for (const blank of els.paragraphPanel.querySelectorAll(".baustein-blank")) {
    blank.classList.toggle("current", Number(blank.dataset.number) === Number(rows[nextIndex].dataset.number));
  }

  renderBausteinFloatingPanel(rows[nextIndex], nextIndex, rows.length);
}

function renderBausteinFloatingPanel(row, index, total) {
  const panel = els.paragraphPanel.querySelector(".baustein-floating-panel");
  if (!panel || !row) return;

  const number = row.dataset.number;
  const selected = row.dataset.selected || "";
  const optionButtons = [...row.querySelectorAll(".baustein-option")];
  const optionHtml = optionButtons
    .map((button, optionIndex) => {
      const choice = button.dataset.choice || "";
      const classes = ["baustein-float-option"];
      if (choice === selected) classes.push("selected");
      return (
        '<button type="button" class="' +
        classes.join(" ") +
        '" data-choice="' +
        escapeHtml(choice) +
        '"><kbd>' +
        (optionIndex + 1) +
        "</kbd><span>" +
        escapeHtml(button.textContent || "") +
        "</span></button>"
      );
    })
    .join("");

  panel.innerHTML =
    '<div class="baustein-float-head"><span>当前空格</span><strong>' +
    escapeHtml(number) +
    '</strong><em>' +
    (index + 1) +
    " / " +
    total +
    '</em></div><div class="baustein-float-options">' +
    optionHtml +
    '</div><p>按 1 / 2 / 3 / 4 选择，Delete 或 Backspace 退回上一个空。</p>';

  for (const button of panel.querySelectorAll(".baustein-float-option")) {
    button.addEventListener("click", () => {
      const sourceButton = row.querySelector(`.baustein-option[data-choice="${cssEscape(button.dataset.choice)}"]`);
      if (sourceButton) selectBausteinOption(row, sourceButton);
    });
  }
}

function handleBausteinKeyboard(event) {
  if (!state.current || state.current.sectionMode !== "baustein-article") return false;
  if (!els.backFace.classList.contains("hidden")) return false;

  if (["1", "2", "3", "4"].includes(event.key)) {
    const row = getCurrentBausteinRow();
    if (!row || row.classList.contains("checked")) return true;
    const option = row.querySelectorAll(".baustein-option")[Number(event.key) - 1];
    if (option) {
      event.preventDefault();
      selectBausteinOption(row, option);
    }
    return true;
  }

  if (event.key === "Backspace" || event.key === "Delete") {
    event.preventDefault();
    stepBackBausteinSelection();
    return true;
  }

  return false;
}

function stepBackBausteinSelection() {
  const rows = getBausteinRows();
  if (!rows.length) return;

  const currentIndex = Math.max(0, getBausteinRowIndex(getCurrentBausteinRow()));
  const currentRow = rows[currentIndex];
  const targetIndex = currentRow?.dataset.selected || currentIndex === 0 ? currentIndex : currentIndex - 1;
  const targetRow = rows[targetIndex];
  if (!targetRow || targetRow.classList.contains("checked")) return;

  clearBausteinSelection(targetRow);
  setBausteinFocus(targetIndex);
}

function clearBausteinSelection(row) {
  delete row.dataset.selected;
  for (const option of row.querySelectorAll(".baustein-option")) {
    option.classList.remove("selected");
  }
  updateBausteinBlank(row);
}

function updateBausteinBlank(row) {
  const blank = els.paragraphPanel.querySelector(
    `.baustein-blank[data-number="${cssEscape(row.dataset.number)}"]`
  );
  if (!blank) return;

  const selected = row.dataset.selected || "";
  const selectedOption = selected ? row.querySelector(`.baustein-option[data-choice="${cssEscape(selected)}"]`) : null;
  blank.classList.toggle("answered", Boolean(selected));
  blank.classList.remove("correct", "wrong");
  blank.textContent = selected
    ? `${row.dataset.number} ${selectedOption?.textContent || selected.toLowerCase()}`
    : `${row.dataset.number} ___`;
  blank.title = selectedOption ? selectedOption.textContent || "" : "";
}

function updateBausteinBlankAfterSubmit(row, question, isCorrect) {
  const blank = els.paragraphPanel.querySelector(
    `.baustein-blank[data-number="${cssEscape(row.dataset.number)}"]`
  );
  if (!blank) return;

  const answer = row.dataset.answer || "";
  const correctOption = answer ? row.querySelector(`.baustein-option[data-choice="${cssEscape(answer)}"]`) : null;
  const answerText = correctOption?.textContent || question?.answerText || answer;
  blank.classList.remove("current");
  blank.classList.add("answered");
  blank.classList.toggle("correct", isCorrect);
  blank.classList.toggle("wrong", !isCorrect);
  blank.textContent = `${row.dataset.number} ${answerText}`;
  blank.title = isCorrect ? "Richtig" : `已覆盖为正确答案：${answerText}`;
}

function getBausteinRows() {
  return [...els.paragraphPanel.querySelectorAll(".baustein-question")];
}

function getCurrentBausteinRow() {
  return els.paragraphPanel.querySelector(".baustein-question.current") || getBausteinRows()[0] || null;
}

function getBausteinRowIndex(row) {
  return getBausteinRows().indexOf(row);
}

function submitBausteinArticle(section) {
  const rows = [...els.paragraphPanel.querySelectorAll(".baustein-question")];
  let correctCount = 0;
  let unansweredCount = 0;

  for (const row of rows) {
    const selected = row.dataset.selected || "";
    const answer = row.dataset.answer || "";
    const isCorrect = selected === answer;
    if (!selected) unansweredCount += 1;
    if (isCorrect) correctCount += 1;

    row.classList.add("checked");
    row.classList.toggle("correct", isCorrect);
    row.classList.toggle("wrong", !isCorrect);
    const question = section.questions.find((item) => String(item.number) === row.dataset.number);
    const status = row.querySelector(".baustein-question-head span");
    status.textContent = isCorrect
      ? "Richtig"
      : `答案 ${answer}${question?.answerText ? " · " + question.answerText : ""}`;

    for (const option of row.querySelectorAll(".baustein-option")) {
      option.disabled = true;
      option.classList.toggle("correct-answer", option.dataset.choice === answer);
      option.classList.toggle("wrong-answer", option.dataset.choice === selected && !isCorrect);
    }
    updateBausteinBlankAfterSubmit(row, question, isCorrect);

    if (question?.knowledgePoint) {
      const note = document.createElement("p");
      note.className = "baustein-note";
      note.textContent = question.knowledgePoint;
      row.append(note);
    }
  }

  state.answeredInRound += 1;
  const hasMistake = correctCount !== rows.length;
  if (hasMistake) {
    state.roundMistakes += 1;
    state.mistakes.push(section);
  }

  const result = els.answerGrid.querySelector(".baustein-result");
  result.textContent =
    unansweredCount > 0
      ? `已核对：${correctCount}/${rows.length} 正确，${unansweredCount} 个空未选择。`
      : `已核对：${correctCount}/${rows.length} 正确。`;
  result.classList.toggle("wrong", hasMistake);

  const submit = els.answerGrid.querySelector(".baustein-actions .primary-button");
  const nextButton = submit.cloneNode(true);
  nextButton.textContent = state.currentIndex >= state.queue.length ? "完成本轮" : "下一篇";
  nextButton.addEventListener("click", nextQuestion);
  submit.replaceWith(nextButton);
  els.roundStrip.textContent =
    els.roundMode.value === "mistakes" ? "有错的文章会进入下一轮。" : "当前是单轮练习。";
  updateStats();
}

function renderAudioPlayer(question) {
  var oldPlayer = document.getElementById("audioPlayer");
  if (oldPlayer) {
    oldPlayer.pause();
    oldPlayer.removeAttribute("src");
    oldPlayer.load();
  }
  els.audioPanel.innerHTML = "";

  if (question.sectionMode !== "hv1-match") {
    els.audioPanel.classList.add("hidden");
    return;
  }

  if (question.audio) {
    els.audioPanel.classList.remove("hidden");
    els.audioPanel.className = "audio-panel";
    els.audioPanel.innerHTML =
      '<audio controls preload="auto" id="audioPlayer"><source src="' +
      escapeHtml(question.audio) +
      '" type="audio/wav"></audio>';
  } else {
    els.audioPanel.classList.remove("hidden");
    els.audioPanel.className = "audio-panel no-audio";
    els.audioPanel.innerHTML =
      '<p class="no-audio-notice">Dieser Teil hat keine Audiodatei. Lies die Leitsätze und ordne zu.</p>';
  }
}

function revealFlashcard() {
  const question = state.current;
  state.answeredInRound += 1;

  els.frontFace.classList.add("hidden");
  els.backFace.classList.remove("hidden");
  setBackReviewLayout(question);
  els.resultLine.className = "result-line neutral";
  els.resultLine.textContent = `Abschnitt ${question.paragraph || question.number}`;
  if (question.sectionMode === "writing-card") {
    els.resultLine.textContent = `Thema ${question.teil}${question.number}`;
    els.reviewGerman.textContent = question.german || "-";
    els.reviewChinese.textContent = question.chinese || "暂无中文释义";
  } else {
    els.correctAnswer.textContent = question.backFields ? formatFields(question.backFields) : formatLv2Items(question);
    els.reviewGerman.textContent = question.firstSentence || question.summary || "暂无段落首句";
    els.reviewChinese.textContent = question.chinese || question.summary || question.german;
  }
  els.missButton.classList.remove("hidden");
  els.missButton.textContent = "不记得，下一张";
  els.nextButton.textContent = "记得，下一张";
  els.roundStrip.textContent =
    els.roundMode.value === "mistakes"
      ? "快捷键：← 不记得，→ 记得。不熟的段落会进入下一轮。"
      : "快捷键：← 不记得，→ 记得。";
  updateStats();
}

function handleKeyboardNavigation(event) {
  if (event.repeat || state.complete) return;
  if (isEditableTarget(event.target)) return;
  if (!state.current || state.complete) return;

  if (handleBausteinKeyboard(event)) return;

  if (state.current.sectionMode === "hv1-sort") {
    if (event.key === "Enter" && !sortState.submitted) {
      event.preventDefault();
      submitSort();
    }
    return;
  }

  if (state.current.sectionMode === "lv2-global-sort") {
    if (event.key === "Enter" && !lv2GlobalSortState.submitted) {
      event.preventDefault();
      submitLv2GlobalSort();
    }
    return;
  }

  if (els.backFace.classList.contains("hidden")) {
    if (isFlashcard(state.current)) {
      if (!["ArrowRight", "Enter", " "].includes(event.key)) return;
      if (isNativeButtonKey(event)) return;
      event.preventDefault();
      revealFlashcard();
      return;
    }

    handleAnswerShortcut(event);
    return;
  }

  if (isFlashcard(state.current)) {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "ArrowLeft") {
      markFlashcardMissed({ advance: true });
      return;
    }
    nextQuestion();
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
  if (!button || button.disabled) return;

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
  if (isKnown && question.sectionMode === "hv1-match") {
    if (!state.usedAnswers[question.teil]) state.usedAnswers[question.teil] = new Set();
    state.usedAnswers[question.teil].add(correct);
  }
  if (isKnown && !isCorrect) {
    state.roundMistakes += 1;
    state.mistakes.push(question);
  }

  els.frontFace.classList.add("hidden");
  els.backFace.classList.remove("hidden");
  setBackReviewLayout(question);
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

  els.correctAnswer.textContent =
    question.sectionMode === "hv1-match"
      ? getHv1AnswerText(question)
      : question.sectionMode === "hv2-choice"
      ? getHv2AnswerText(question)
      : correct || "未标注";
  els.reviewGerman.textContent =
    question.sectionMode === "hv1-match" ? (question.text || question.german) : getReviewGerman(question);
  els.reviewChinese.textContent = getReviewChinese(question);
  els.missButton.classList.add("hidden");
  els.nextButton.textContent = "下一题";
  els.roundStrip.textContent =
    els.roundMode.value === "mistakes" ? "答错的题会进入下一轮。" : "当前是单轮练习。";
  updateStats();
}

function markFlashcardMissed(options = {}) {
  if (!state.current) return;
  state.roundMistakes += 1;
  state.mistakes.push(state.current);
  els.missButton.classList.add("hidden");
  els.resultLine.className = "result-line wrong";
  els.resultLine.textContent = `已加入错题 · Abschnitt ${state.current.paragraph || state.current.number}`;
  els.roundStrip.textContent = "这一段会进入下一轮。";
  updateStats();
  if (options.advance) nextQuestion();
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

function getHv2AnswerText(question) {
  const correctOption = question.options?.find((option) => option.value === question.answer);
  return correctOption?.label || question.completion || question.answer || "未标注";
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
  els.germanQuestion.classList.remove("field-question");
  els.germanQuestion.classList.remove("baustein-title");
  els.paragraphPanel.innerHTML = "";
  els.paragraphPanel.classList.remove("baustein-panel");
  els.paragraphPanel.classList.add("hidden");
  els.answerGrid.innerHTML = "";
  els.missButton.classList.add("hidden");
  resetBackReviewLayout();
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

  if (question.sectionMode === "hv1-match") {
    return getHv1Choices(question);
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

function getHv1AnswerText(question) {
  return question.leitsatz || question.answer || "-";
}

function getHv1Choices(question) {
  var teilQuestions = state.sessionSource.filter(function (q) { return q.teil === question.teil; });
  var labels = "ABCDEFGH";
  var used = state.usedAnswers[question.teil] || new Set();
  var choices = teilQuestions.map(function (q, i) {
    var label = q.leitsatz;
    var answerValue = q.answer;
    return {
      value: answerValue,
      label: label,
      shortcut: labels[i] + " / " + (i + 1),
      disabled: used.has(answerValue),
    };
  });
  return applyOrder(choices, "random");
}

// ---- LV2 Global Sort Mode ----

var lv2GlobalSortState = {
  batch: null,
  paragraphs: [],
  options: [],
  matches: {},
  correctedMatches: {},
  selectedOption: null,
  drag: null,
  suppressClick: false,
  submitted: false,
  resizeBound: false,
};

function buildLv2GlobalSortBatch(section) {
  var paragraphs = section.questions.map(function (question) {
    var isLv2SignalQuestion = question.source === "lv2-signal-question-xlsx";
    var paragraph = {
      id: question.id,
      label: question.paragraph || question.number,
      german: question.firstSentence || question.german,
      chinese: isLv2SignalQuestion
        ? question.signalwortZh || question.chinese || question.summary || "暂无信号词中文"
        : question.chinese || question.summary || "暂无中文释义",
      frage: question.frage || question.summary || "",
      signalwort: question.signalwort || "",
      signalwortZh: question.signalwortZh || "",
      sentence: question.sentence || question.firstSentence || question.german || "",
      sentenceZh: question.sentenceZh || question.chinese || "",
    };
    if (section.level === "lv2v2" || state.level === "lv2v2") {
      paragraph.german = question.signalwort || question.german;
      paragraph.chinese = question.signalwortZh || question.chinese || "暂无信号词中文";
    }
    return paragraph;
  });
  var options = [];

  for (var i = 0; i < section.questions.length; i++) {
    var question = section.questions[i];
    var items = question.items || [];
    for (var j = 0; j < items.length; j++) {
      var item = items[j];
      var german = splitLanguages(item.text || "").german || item.text || "";
      var optionChinese =
        question.source === "lv2-signal-question-xlsx"
          ? question.sentenceZh || question.chinese || item.chinese || item.hint || ""
          : item.chinese || item.hint || item.signalwortZh || "";
      options.push({
        id: question.id + "-item-" + j,
        paragraphId: question.id,
        paragraphLabel: question.paragraph || question.number,
        number: item.number || "",
        text: german,
        german: item.german || german,
        chinese: optionChinese,
        hint: item.hint || item.signalwortZh || item.chinese || "",
        signalwort: item.signalwort || question.signalwort || "",
        signalwortZh: item.signalwortZh || question.signalwortZh || "",
      });
    }
  }

  return {
    id: (section.level || state.level || "lv2") + "-global-sort-" + section.teil,
    level: section.level || state.level || "lv2",
    teil: section.teil,
    teilTitle: section.title,
    sectionMode: "lv2-global-sort",
    paragraphs: paragraphs,
    options: options,
    german: section.title,
    chinese: "",
  };
}

function renderLv2GlobalSortView(batch) {
  lv2GlobalSortState.batch = batch;
  lv2GlobalSortState.paragraphs = batch.paragraphs.map(function (paragraph) { return { ...paragraph }; });
  lv2GlobalSortState.options = shuffledLv2GlobalOptions(batch.options);
  lv2GlobalSortState.matches = {};
  lv2GlobalSortState.correctedMatches = {};
  lv2GlobalSortState.selectedOption = null;
  lv2GlobalSortState.drag = null;
  lv2GlobalSortState.suppressClick = false;
  lv2GlobalSortState.submitted = false;

  els.sortTeilBadge.textContent = "Teil " + batch.teil + " · " + batch.teilTitle;
  els.sortInfo.textContent = getLv2GlobalInstruction();
  els.sortSubmitButton.textContent = "提交";
  els.sortSubmitButton.disabled = false;
  els.sortSubmitButton.onclick = null;

  renderLv2GlobalSortList();
  bindLv2GlobalSortEvents();
}

function getLv2GlobalInstruction() {
  if (lv2GlobalSortState.batch?.level === "lv2v2") {
    return "把右侧德语原句拖到左侧对应的德语信号词。左侧同时显示对应问句。";
  }
  return "把右侧题项拖到左侧对应关键句。当前左右两侧显示：" + (els.lv2GlobalDisplay.value === "german" ? "德语" : "中文") + "。";
}

function renderLv2GlobalSortList() {
  els.sortList.innerHTML = "";
  var board = document.createElement("div");
  board.className =
    "sort-connect-board lv2-global-board" +
    (lv2GlobalSortState.batch?.level === "lv2v2" ? " lv2-v2-board" : "");
  board.innerHTML =
    '<svg class="sort-lines" aria-hidden="true"></svg>' +
    '<div class="sort-column lv2-paragraphs" aria-label="段落"></div>' +
    '<div class="sort-column lv2-options" aria-label="题项"></div>';
  els.sortList.appendChild(board);

  var paragraphColumn = board.querySelector(".lv2-paragraphs");
  var optionColumn = board.querySelector(".lv2-options");

  for (var i = 0; i < lv2GlobalSortState.paragraphs.length; i++) {
    paragraphColumn.appendChild(createLv2ParagraphNode(lv2GlobalSortState.paragraphs[i]));
  }

  for (var j = 0; j < lv2GlobalSortState.options.length; j++) {
    optionColumn.appendChild(createLv2OptionNode(lv2GlobalSortState.options[j], j));
  }

  drawLv2GlobalSortLines();
}

function bindLv2GlobalSortEvents() {
  var optionNodes = els.sortList.querySelectorAll(".lv2-option-node");
  var paragraphNodes = els.sortList.querySelectorAll(".lv2-paragraph-node");

  for (var i = 0; i < optionNodes.length; i++) {
    optionNodes[i].addEventListener("click", onLv2OptionNodeClick);
    optionNodes[i].addEventListener("pointerdown", onLv2GlobalDragStart);
  }

  for (var j = 0; j < paragraphNodes.length; j++) {
    paragraphNodes[j].addEventListener("click", onLv2ParagraphNodeClick);
  }

  if (!lv2GlobalSortState.resizeBound) {
    window.addEventListener("resize", drawLv2GlobalSortLines);
    lv2GlobalSortState.resizeBound = true;
  }
}

function createLv2ParagraphNode(paragraph) {
  var button = document.createElement("button");
  button.type = "button";
  button.className = "sort-node lv2-paragraph-node";
  button.dataset.paragraphId = paragraph.id;
  button.disabled = lv2GlobalSortState.submitted;
  if (lv2GlobalSortState.submitted && isLv2CorrectedParagraph(paragraph.id)) button.classList.add("corrected");
  if (lv2GlobalSortState.batch?.level === "lv2v2") {
    button.innerHTML =
      '<span class="lv2-paragraph-label">Signalwort · Abschnitt ' +
      escapeHtml(paragraph.label) +
      '</span><strong class="lv2-signal-word">' +
      escapeHtml(paragraph.german || paragraph.signalwort || "") +
      '</strong><span class="lv2-signal-question">' +
      escapeHtml(paragraph.frage || "") +
      "</span>";
    return button;
  }
  var content = els.lv2GlobalDisplay.value === "german" ? paragraph.german : paragraph.chinese;
  button.innerHTML =
    '<span class="lv2-paragraph-label">Abschnitt ' +
    escapeHtml(paragraph.label) +
    "</span><span>" +
    escapeHtml(content) +
    "</span>";
  return button;
}

function createLv2OptionNode(option, index) {
  var button = document.createElement("button");
  button.type = "button";
  button.className = "sort-node lv2-option-node";
  button.dataset.optionIndex = String(index);
  button.disabled = lv2GlobalSortState.submitted;
  if (lv2GlobalSortState.selectedOption === index) button.classList.add("selected");
  if (lv2GlobalSortState.matches[index]) button.classList.add("matched");
  if (lv2GlobalSortState.submitted) {
    button.classList.add(isLv2GlobalMatchCorrect(index) ? "correct" : "corrected");
  }
  if (lv2GlobalSortState.batch?.level === "lv2v2") {
    button.innerHTML =
      '<span class="lv2-option-number">Originalsatz · Abschnitt ' +
      escapeHtml(option.number || "?") +
      '</span><span class="lv2-option-text">' +
      escapeHtml(option.text) +
      "</span>";
    return button;
  }
  button.innerHTML =
    '<span class="lv2-option-number">' +
    escapeHtml(option.number || "?") +
    '</span><span class="lv2-option-text">' +
    escapeHtml(getLv2OptionDisplayText(option)) +
    "</span>";
  return button;
}

function getLv2OptionDisplayText(option) {
  if (els.lv2GlobalDisplay.value === "chinese") {
    return option.chinese || option.hint || option.text || "";
  }
  return option.german || option.text || "";
}

function onLv2OptionNodeClick(e) {
  if (lv2GlobalSortState.submitted) return;
  if (lv2GlobalSortState.suppressClick) {
    lv2GlobalSortState.suppressClick = false;
    return;
  }
  if (lv2GlobalSortState.drag && lv2GlobalSortState.drag.moved) return;
  lv2GlobalSortState.selectedOption = Number(e.currentTarget.dataset.optionIndex);
  renderLv2GlobalSortList();
  bindLv2GlobalSortEvents();
}

function onLv2ParagraphNodeClick(e) {
  if (lv2GlobalSortState.submitted) return;
  if (lv2GlobalSortState.selectedOption === null) {
    els.sortInfo.textContent = "请先选择右侧一个题项。";
    return;
  }
  lv2GlobalSortState.matches[lv2GlobalSortState.selectedOption] = e.currentTarget.dataset.paragraphId;
  lv2GlobalSortState.selectedOption = nextUnmatchedLv2OptionIndex();
  els.sortInfo.textContent = "连线已设置。";
  renderLv2GlobalSortList();
  bindLv2GlobalSortEvents();
}

function onLv2GlobalDragStart(e) {
  if (lv2GlobalSortState.submitted) return;
  if (e.button !== 0 && e.pointerType !== "touch") return;

  var node = e.currentTarget;
  lv2GlobalSortState.drag = {
    optionIndex: Number(node.dataset.optionIndex),
    pointerId: e.pointerId,
    x: e.clientX,
    y: e.clientY,
    moved: false,
  };
  lv2GlobalSortState.selectedOption = lv2GlobalSortState.drag.optionIndex;
  node.classList.add("dragging");
  node.setPointerCapture(e.pointerId);
  window.addEventListener("pointermove", onLv2GlobalDragMove);
  window.addEventListener("pointerup", onLv2GlobalDragEnd);
  window.addEventListener("pointercancel", onLv2GlobalDragCancel);
  drawLv2GlobalSortLines();
  e.preventDefault();
}

function onLv2GlobalDragMove(e) {
  if (!lv2GlobalSortState.drag || e.pointerId !== lv2GlobalSortState.drag.pointerId) return;
  lv2GlobalSortState.drag.x = e.clientX;
  lv2GlobalSortState.drag.y = e.clientY;
  lv2GlobalSortState.drag.moved = true;
  highlightLv2GlobalDropTarget(e.clientX, e.clientY);
  drawLv2GlobalSortLines();
}

function onLv2GlobalDragEnd(e) {
  if (!lv2GlobalSortState.drag || e.pointerId !== lv2GlobalSortState.drag.pointerId) return;
  var target = getLv2GlobalDropTarget(e.clientX, e.clientY);
  if (target) {
    lv2GlobalSortState.matches[lv2GlobalSortState.drag.optionIndex] = target.dataset.paragraphId;
    lv2GlobalSortState.selectedOption = nextUnmatchedLv2OptionIndex();
    els.sortInfo.textContent = "连线已设置。";
  } else if (lv2GlobalSortState.drag.moved) {
    els.sortInfo.textContent = "把右侧题项拖到左侧段落上。";
  }
  lv2GlobalSortState.suppressClick = lv2GlobalSortState.drag.moved;
  finishLv2GlobalDrag();
  renderLv2GlobalSortList();
  bindLv2GlobalSortEvents();
}

function onLv2GlobalDragCancel(e) {
  if (!lv2GlobalSortState.drag || e.pointerId !== lv2GlobalSortState.drag.pointerId) return;
  finishLv2GlobalDrag();
  renderLv2GlobalSortList();
  bindLv2GlobalSortEvents();
}

function finishLv2GlobalDrag() {
  window.removeEventListener("pointermove", onLv2GlobalDragMove);
  window.removeEventListener("pointerup", onLv2GlobalDragEnd);
  window.removeEventListener("pointercancel", onLv2GlobalDragCancel);
  var dragging = els.sortList.querySelector(".lv2-option-node.dragging");
  if (dragging && lv2GlobalSortState.drag) {
    try {
      dragging.releasePointerCapture(lv2GlobalSortState.drag.pointerId);
    } catch (error) {
      // Pointer capture may already be gone if the pointer was cancelled.
    }
    dragging.classList.remove("dragging");
  }
  clearLv2GlobalDropHighlight();
  lv2GlobalSortState.drag = null;
}

function getLv2GlobalDropTarget(x, y) {
  var target = document.elementFromPoint(x, y);
  return target ? target.closest(".lv2-paragraph-node") : null;
}

function highlightLv2GlobalDropTarget(x, y) {
  clearLv2GlobalDropHighlight();
  var target = getLv2GlobalDropTarget(x, y);
  if (target) target.classList.add("drop-target");
}

function clearLv2GlobalDropHighlight() {
  var highlighted = els.sortList.querySelectorAll(".lv2-paragraph-node.drop-target");
  for (var i = 0; i < highlighted.length; i++) {
    highlighted[i].classList.remove("drop-target");
  }
}

function nextUnmatchedLv2OptionIndex() {
  for (var i = 0; i < lv2GlobalSortState.options.length; i++) {
    if (!lv2GlobalSortState.matches[i]) return i;
  }
  return null;
}

function isLv2GlobalMatchCorrect(index) {
  var option = lv2GlobalSortState.options[index];
  return Boolean(option && lv2GlobalSortState.matches[index] === option.paragraphId);
}

function isLv2CorrectedParagraph(paragraphId) {
  for (var key in lv2GlobalSortState.correctedMatches) {
    if (lv2GlobalSortState.correctedMatches[key] === paragraphId) return true;
  }
  return false;
}

function drawLv2GlobalSortLines() {
  var board = els.sortList.querySelector(".lv2-global-board");
  if (!board) return;
  var svg = board.querySelector(".sort-lines");
  if (!svg) return;
  var boardRect = board.getBoundingClientRect();
  svg.setAttribute("viewBox", "0 0 " + boardRect.width + " " + boardRect.height);
  svg.innerHTML = "";

  var displayMatches = getLv2GlobalDisplayMatches();
  for (var key in displayMatches) {
    drawLv2GlobalLine(board, svg, boardRect, Number(key), displayMatches[key], getLv2GlobalLineClass(Number(key)));
  }

  if (lv2GlobalSortState.drag) {
    var option = board.querySelector('[data-option-index="' + lv2GlobalSortState.drag.optionIndex + '"]');
    if (option) {
      var optionRect = option.getBoundingClientRect();
      var startX = optionRect.left - boardRect.left;
      var startY = optionRect.top + optionRect.height / 2 - boardRect.top;
      var endX = lv2GlobalSortState.drag.x - boardRect.left;
      var endY = lv2GlobalSortState.drag.y - boardRect.top;
      appendSortPath(svg, startX, startY, endX, endY, "preview");
    }
  }
}

function drawLv2GlobalLine(board, svg, boardRect, optionIndex, paragraphId, lineClass) {
  var option = board.querySelector('[data-option-index="' + optionIndex + '"]');
  var paragraph = board.querySelector('[data-paragraph-id="' + cssEscape(paragraphId) + '"]');
  if (!option || !paragraph) return;

  var optionRect = option.getBoundingClientRect();
  var paragraphRect = paragraph.getBoundingClientRect();
  var startX = optionRect.left - boardRect.left;
  var startY = optionRect.top + optionRect.height / 2 - boardRect.top;
  var endX = paragraphRect.right - boardRect.left;
  var endY = paragraphRect.top + paragraphRect.height / 2 - boardRect.top;
  appendSortPath(svg, startX, startY, endX, endY, lineClass);
}

function appendSortPath(svg, startX, startY, endX, endY, lineClass) {
  var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M " + startX + " " + startY + " L " + endX + " " + endY);
  path.setAttribute("class", "sort-line " + lineClass);
  svg.appendChild(path);
}

function getLv2GlobalDisplayMatches() {
  if (!lv2GlobalSortState.submitted) return lv2GlobalSortState.matches;
  return { ...lv2GlobalSortState.matches, ...lv2GlobalSortState.correctedMatches };
}

function getLv2GlobalLineClass(index) {
  if (!lv2GlobalSortState.submitted) return "";
  return lv2GlobalSortState.correctedMatches[index] ? "corrected" : "correct";
}

function submitLv2GlobalSort() {
  if (lv2GlobalSortState.submitted) return;

  var correct = 0;
  var total = lv2GlobalSortState.options.length;
  lv2GlobalSortState.correctedMatches = {};

  for (var i = 0; i < total; i++) {
    if (isLv2GlobalMatchCorrect(i)) {
      correct++;
    } else {
      lv2GlobalSortState.correctedMatches[i] = lv2GlobalSortState.options[i].paragraphId;
    }
  }

  lv2GlobalSortState.submitted = true;
  renderLv2GlobalSortList();
  bindLv2GlobalSortEvents();
  drawLv2GlobalSortLines();

  var scoreClass = correct === total ? "perfect" : "partial";
  var scoreText = correct === total ? "全部正确！" : correct + " / " + total + " 正确";
  els.sortInfo.innerHTML =
    '<span class="sort-score ' + scoreClass + '">' + scoreText + "</span>" +
    (correct === total ? "" : '<span class="sort-correction-note">红色为已更正的正确连线。</span>') +
    (lv2GlobalSortState.batch?.level === "lv2v2" && correct < total ? renderLv2V2Corrections() : "");

  if (correct < total) {
    state.roundMistakes += total - correct;
    state.mistakes.push(state.current);
  }

  state.answeredInRound += 1;
  els.sortSubmitButton.textContent = "下一 Teil";
  els.sortSubmitButton.disabled = false;
  els.sortSubmitButton.onclick = nextQuestion;

  updateStats();
}

function renderLv2V2Corrections() {
  var items = [];
  for (var key in lv2GlobalSortState.correctedMatches) {
    var optionIndex = Number(key);
    var option = lv2GlobalSortState.options[optionIndex];
    var paragraph = findLv2GlobalParagraph(lv2GlobalSortState.correctedMatches[key]);
    if (!option || !paragraph) continue;
    items.push(
      '<article class="lv2-v2-correction-card">' +
        '<div><span>信号词</span><strong>' + escapeHtml(paragraph.german || option.signalwort || "") + '</strong><p>' + escapeHtml(paragraph.chinese || option.signalwortZh || "暂无信号词中文") + '</p></div>' +
        '<div><span>原句</span><strong>' + escapeHtml(option.text || paragraph.sentence || "") + '</strong><p>' + escapeHtml(option.chinese || paragraph.sentenceZh || "暂无原句中文") + '</p></div>' +
        (paragraph.frage ? '<p class="lv2-v2-correction-question">' + escapeHtml(paragraph.frage) + '</p>' : "") +
      '</article>'
    );
  }
  if (!items.length) return "";
  return '<div class="lv2-v2-corrections"><h3>正确配对</h3>' + items.join("") + "</div>";
}

function findLv2GlobalParagraph(paragraphId) {
  for (var i = 0; i < lv2GlobalSortState.paragraphs.length; i++) {
    if (lv2GlobalSortState.paragraphs[i].id === paragraphId) return lv2GlobalSortState.paragraphs[i];
  }
  return null;
}

function shuffleLv2GlobalSort() {
  if (lv2GlobalSortState.submitted) return;
  lv2GlobalSortState.options = shuffledLv2GlobalOptions(lv2GlobalSortState.options);
  lv2GlobalSortState.matches = {};
  lv2GlobalSortState.correctedMatches = {};
  lv2GlobalSortState.selectedOption = null;
  lv2GlobalSortState.drag = null;
  lv2GlobalSortState.suppressClick = false;
  els.sortInfo.textContent = "已重新打乱右侧题项。";
  renderLv2GlobalSortList();
  bindLv2GlobalSortEvents();
}

function shuffledLv2GlobalOptions(options) {
  var shuffled = options.map(function (option) { return { ...option }; });
  for (var i = shuffled.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = tmp;
  }
  if (isLv2GlobalOptionOrderOriginal(shuffled, options) && shuffled.length > 1) {
    var first = shuffled.shift();
    shuffled.push(first);
  }
  return shuffled;
}

function isLv2GlobalOptionOrderOriginal(shuffled, original) {
  if (shuffled.length !== original.length) return false;
  for (var i = 0; i < shuffled.length; i++) {
    if (shuffled[i].id !== original[i].id) return false;
  }
  return shuffled.length > 0;
}

// ---- HV1 Sort Mode ----

var sortState = {
  questions: [],
  speakers: [],
  matches: {},
  correctedMatches: {},
  selectedSpeaker: null,
  drag: null,
  suppressClick: false,
  submitted: false,
  currentAudio: null,
  resizeBound: false,
};

function renderSortView(batch) {
  sortState.questions = shuffledSortQuestions(batch.questions);
  sortState.speakers = batch.questions.map(function (q) { return { ...q }; }).sort(compareHv1Speakers);
  sortState.matches = {};
  sortState.correctedMatches = {};
  sortState.selectedSpeaker = null;
  sortState.drag = null;
  sortState.suppressClick = false;
  sortState.submitted = false;

  els.sortTeilBadge.textContent = "Teil " + batch.teil + " · " + batch.teilTitle;
  els.sortInfo.textContent = "Ziehe links einen Sprecher auf den passenden Leitsatz.";
  els.sortSubmitButton.textContent = "提交";
  els.sortSubmitButton.disabled = false;
  els.sortSubmitButton.onclick = null;

  renderSortList();
  bindSortEvents();
}

function renderSortList() {
  els.sortList.innerHTML = "";
  var board = document.createElement("div");
  board.className = "sort-connect-board";
  board.innerHTML =
    '<svg class="sort-lines" aria-hidden="true"></svg>' +
    '<div class="sort-column sort-speakers" aria-label="Sprecher"></div>' +
    '<div class="sort-column sort-leitsaetze" aria-label="Leitsätze"></div>';
  els.sortList.appendChild(board);

  var speakerColumn = board.querySelector(".sort-speakers");
  var leitsatzColumn = board.querySelector(".sort-leitsaetze");

  for (var i = 0; i < sortState.speakers.length; i++) {
    speakerColumn.appendChild(createSpeakerNode(sortState.speakers[i], i));
  }

  for (var j = 0; j < sortState.questions.length; j++) {
    leitsatzColumn.appendChild(createLeitsatzNode(sortState.questions[j]));
  }

  drawSortLines();
}

function bindSortEvents() {
  var speakerNodes = els.sortList.querySelectorAll(".sort-speaker-node");
  var leitsatzNodes = els.sortList.querySelectorAll(".sort-leitsatz-node");
  var audioButtons = els.sortList.querySelectorAll(".sort-audio-btn");

  for (var i = 0; i < speakerNodes.length; i++) {
    speakerNodes[i].addEventListener("click", onSpeakerNodeClick);
    speakerNodes[i].addEventListener("pointerdown", onSortDragStart);
  }
  for (var j = 0; j < leitsatzNodes.length; j++) {
    leitsatzNodes[j].addEventListener("click", onLeitsatzNodeClick);
  }
  for (var k = 0; k < audioButtons.length; k++) {
    audioButtons[k].addEventListener("click", onSortAudioClick);
  }

  if (!sortState.resizeBound) {
    window.addEventListener("resize", drawSortLines);
    sortState.resizeBound = true;
  }
}

function createSpeakerNode(q, index) {
  var button = document.createElement("button");
  button.type = "button";
  button.className = "sort-node sort-speaker-node";
  button.dataset.speakerIndex = String(index);
  button.disabled = sortState.submitted;
  if (sortState.selectedSpeaker === index) button.classList.add("selected");
  if (sortState.matches[index]) button.classList.add("matched");
  if (sortState.submitted) {
    button.classList.add(isSortMatchCorrect(index) ? "correct" : "corrected");
  }
  button.innerHTML =
    '<span class="sort-speaker-label">Sprecher ' +
    escapeHtml(q.number) +
    "</span>" +
    (q.audio
      ? '<span class="sort-audio-btn" role="button" tabindex="0" data-audio="' +
        escapeHtml(q.audio) +
        '" title="Sprecher ' +
        escapeHtml(q.number) +
        '">&#9654;</span>'
      : '<span class="sort-audio-btn" style="visibility:hidden"></span>');
  return button;
}

function createLeitsatzNode(q) {
  var button = document.createElement("button");
  button.type = "button";
  button.className = "sort-node sort-leitsatz-node";
  button.dataset.questionId = q.id;
  button.disabled = sortState.submitted;
  if (isLeitsatzMatched(q.id)) button.classList.add("matched");
  if (sortState.submitted) {
    button.classList.add(isLeitsatzCorrect(q.id) ? "correct" : isLeitsatzCorrected(q.id) ? "corrected" : "neutral");
  }
  button.textContent = q.leitsatz;
  return button;
}

function onSpeakerNodeClick(e) {
  if (sortState.submitted) return;
  if (sortState.suppressClick) {
    sortState.suppressClick = false;
    return;
  }
  if (sortState.drag && sortState.drag.moved) return;
  var node = e.currentTarget;
  sortState.selectedSpeaker = Number(node.dataset.speakerIndex);
  renderSortList();
  bindSortEvents();
}

function onLeitsatzNodeClick(e) {
  if (sortState.submitted) return;
  if (sortState.selectedSpeaker === null) {
    els.sortInfo.textContent = "Bitte zuerst links einen Sprecher auswählen.";
    return;
  }
  var questionId = e.currentTarget.dataset.questionId;
  removeExistingSortMatch(questionId);
  sortState.matches[sortState.selectedSpeaker] = questionId;
  sortState.selectedSpeaker = nextUnmatchedSpeakerIndex();
  els.sortInfo.textContent = "Verbindung gesetzt.";
  renderSortList();
  bindSortEvents();
}

function onSortDragStart(e) {
  if (sortState.submitted) return;
  if (e.button !== 0 && e.pointerType !== "touch") return;
  if (e.target.closest(".sort-audio-btn")) return;

  var node = e.currentTarget;
  sortState.drag = {
    speakerIndex: Number(node.dataset.speakerIndex),
    pointerId: e.pointerId,
    x: e.clientX,
    y: e.clientY,
    moved: false,
  };
  sortState.selectedSpeaker = sortState.drag.speakerIndex;
  node.classList.add("dragging");
  node.setPointerCapture(e.pointerId);
  window.addEventListener("pointermove", onSortDragMove);
  window.addEventListener("pointerup", onSortDragEnd);
  window.addEventListener("pointercancel", onSortDragCancel);
  drawSortLines();
  e.preventDefault();
}

function onSortDragMove(e) {
  if (!sortState.drag || e.pointerId !== sortState.drag.pointerId) return;
  sortState.drag.x = e.clientX;
  sortState.drag.y = e.clientY;
  sortState.drag.moved = true;
  highlightSortDropTarget(e.clientX, e.clientY);
  drawSortLines();
}

function onSortDragEnd(e) {
  if (!sortState.drag || e.pointerId !== sortState.drag.pointerId) return;
  var target = getSortDropTarget(e.clientX, e.clientY);
  if (target) {
    var questionId = target.dataset.questionId;
    removeExistingSortMatch(questionId);
    sortState.matches[sortState.drag.speakerIndex] = questionId;
    sortState.selectedSpeaker = nextUnmatchedSpeakerIndex();
    els.sortInfo.textContent = "Verbindung gesetzt.";
  } else if (sortState.drag.moved) {
    els.sortInfo.textContent = "Auf einen Leitsatz ziehen und dort loslassen.";
  }
  sortState.suppressClick = sortState.drag.moved;
  finishSortDrag();
  renderSortList();
  bindSortEvents();
}

function onSortDragCancel(e) {
  if (!sortState.drag || e.pointerId !== sortState.drag.pointerId) return;
  finishSortDrag();
  renderSortList();
  bindSortEvents();
}

function finishSortDrag() {
  window.removeEventListener("pointermove", onSortDragMove);
  window.removeEventListener("pointerup", onSortDragEnd);
  window.removeEventListener("pointercancel", onSortDragCancel);
  var dragging = els.sortList.querySelector(".sort-speaker-node.dragging");
  if (dragging && sortState.drag) {
    try {
      dragging.releasePointerCapture(sortState.drag.pointerId);
    } catch (error) {
      // Pointer capture may already be gone if the pointer was cancelled.
    }
    dragging.classList.remove("dragging");
  }
  clearSortDropHighlight();
  sortState.drag = null;
}

function getSortDropTarget(x, y) {
  var target = document.elementFromPoint(x, y);
  return target ? target.closest(".sort-leitsatz-node") : null;
}

function highlightSortDropTarget(x, y) {
  clearSortDropHighlight();
  var target = getSortDropTarget(x, y);
  if (target) target.classList.add("drop-target");
}

function clearSortDropHighlight() {
  var highlighted = els.sortList.querySelectorAll(".sort-leitsatz-node.drop-target");
  for (var i = 0; i < highlighted.length; i++) {
    highlighted[i].classList.remove("drop-target");
  }
}

function removeExistingSortMatch(questionId) {
  for (var key in sortState.matches) {
    if (sortState.matches[key] === questionId) delete sortState.matches[key];
  }
}

function nextUnmatchedSpeakerIndex() {
  for (var i = 0; i < sortState.speakers.length; i++) {
    if (!sortState.matches[i]) return i;
  }
  return null;
}

function isLeitsatzMatched(questionId) {
  for (var key in sortState.matches) {
    if (sortState.matches[key] === questionId) return true;
  }
  return false;
}

function isSortMatchCorrect(index) {
  var question = findSortQuestion(sortState.matches[index]);
  return Boolean(question && question.answer === expectedAnswerForSpeaker(index));
}

function isLeitsatzCorrect(questionId) {
  var question = findSortQuestion(questionId);
  if (!question) return false;
  for (var key in sortState.matches) {
    if (sortState.matches[key] === questionId) return question.answer === expectedAnswerForSpeaker(Number(key));
  }
  return false;
}

function isLeitsatzCorrected(questionId) {
  for (var key in sortState.correctedMatches) {
    if (sortState.correctedMatches[key] === questionId) return true;
  }
  return false;
}

function expectedAnswerForSpeaker(index) {
  return sortState.speakers[index] ? sortState.speakers[index].answer : "";
}

function findSortQuestion(questionId) {
  for (var i = 0; i < sortState.questions.length; i++) {
    if (sortState.questions[i].id === questionId) return sortState.questions[i];
  }
  return null;
}

function findCorrectSortQuestionForSpeaker(index) {
  var answer = expectedAnswerForSpeaker(index);
  for (var i = 0; i < sortState.questions.length; i++) {
    if (sortState.questions[i].answer === answer) return sortState.questions[i];
  }
  return null;
}

function drawSortLines() {
  var board = els.sortList.querySelector(".sort-connect-board");
  if (!board) return;
  var svg = board.querySelector(".sort-lines");
  if (!svg) return;
  var boardRect = board.getBoundingClientRect();
  svg.setAttribute("viewBox", "0 0 " + boardRect.width + " " + boardRect.height);
  svg.innerHTML = "";

  var displayMatches = getSortDisplayMatches();
  for (var key in displayMatches) {
    var speaker = board.querySelector('[data-speaker-index="' + key + '"]');
    var leitsatz = board.querySelector('[data-question-id="' + cssEscape(displayMatches[key]) + '"]');
    if (!speaker || !leitsatz) continue;

    var speakerRect = speaker.getBoundingClientRect();
    var leitsatzRect = leitsatz.getBoundingClientRect();
    var x1 = speakerRect.right - boardRect.left;
    var y1 = speakerRect.top + speakerRect.height / 2 - boardRect.top;
    var x2 = leitsatzRect.left - boardRect.left;
    var y2 = leitsatzRect.top + leitsatzRect.height / 2 - boardRect.top;
    var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M " + x1 + " " + y1 + " L " + x2 + " " + y2);
    path.setAttribute("class", "sort-line " + getSortLineClass(Number(key)));
    svg.appendChild(path);
  }

  if (sortState.drag) {
    var dragSpeaker = board.querySelector('[data-speaker-index="' + sortState.drag.speakerIndex + '"]');
    if (dragSpeaker) {
      var dragRect = dragSpeaker.getBoundingClientRect();
      var startX = dragRect.right - boardRect.left;
      var startY = dragRect.top + dragRect.height / 2 - boardRect.top;
      var endX = sortState.drag.x - boardRect.left;
      var endY = sortState.drag.y - boardRect.top;
      var dragPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
      dragPath.setAttribute("d", "M " + startX + " " + startY + " L " + endX + " " + endY);
      dragPath.setAttribute("class", "sort-line preview");
      svg.appendChild(dragPath);
    }
  }
}

function getSortDisplayMatches() {
  if (!sortState.submitted) return sortState.matches;
  return { ...sortState.matches, ...sortState.correctedMatches };
}

function getSortLineClass(index) {
  if (!sortState.submitted) return "";
  return sortState.correctedMatches[index] ? "corrected" : "correct";
}

function moveSortItem(btn, direction) {
  if (sortState.submitted) return;
  var li = btn.closest(".sort-item");
  var index = parseInt(li.dataset.index, 10);
  var newIndex = index + direction;
  if (newIndex < 0 || newIndex >= sortState.questions.length) return;

  var moved = sortState.questions.splice(index, 1)[0];
  sortState.questions.splice(newIndex, 0, moved);
  renderSortList();
  bindSortEvents();
}

// ---- Drag and Drop ----

var dragIndex = -1;

function onDragStart(e) {
  if (sortState.submitted) { e.preventDefault(); return; }
  dragIndex = parseInt(this.dataset.index, 10);
  this.classList.add("dragging");
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", String(dragIndex));
}

function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  this.classList.add("drag-over");
}

function onDragLeave() {
  this.classList.remove("drag-over");
}

function onDrop(e) {
  e.preventDefault();
  this.classList.remove("drag-over");
  var from = dragIndex;
  var to = parseInt(this.dataset.index, 10);
  if (from === to || from < 0) return;

  var moved = sortState.questions.splice(from, 1)[0];
  sortState.questions.splice(to, 0, moved);
  renderSortList();
  bindSortEvents();
  dragIndex = -1;
}

function onDragEnd() {
  this.classList.remove("dragging");
  dragIndex = -1;
  var allItems = els.sortList.querySelectorAll(".sort-item");
  for (var i = 0; i < allItems.length; i++) {
    allItems[i].classList.remove("drag-over");
  }
}

// ---- Sort Audio ----

function onSortAudioClick(e) {
  e.stopPropagation();
  var btn = e.currentTarget;
  var audioSrc = btn.dataset.audio;

  if (sortState.currentAudio && sortState.currentAudio.src === audioSrc) {
    if (sortState.currentAudio.paused) {
      sortState.currentAudio.play();
    } else {
      sortState.currentAudio.pause();
    }
    return;
  }

  if (sortState.currentAudio) {
    sortState.currentAudio.pause();
    var prevBtn = els.sortList.querySelector(".sort-audio-btn.playing");
    if (prevBtn) prevBtn.classList.remove("playing");
  }

  var audio = new Audio(audioSrc);
  audio.preload = "auto";
  sortState.currentAudio = audio;
  btn.classList.add("playing");

  audio.onended = function () {
    btn.classList.remove("playing");
    sortState.currentAudio = null;
  };

  audio.play().catch(function () {
    btn.classList.remove("playing");
    sortState.currentAudio = null;
  });
}

// ---- Sort Submission ----

function submitSort() {
  if (state.current?.sectionMode === "lv2-global-sort") {
    submitLv2GlobalSort();
    return;
  }

  if (sortState.submitted) return;

  var correct = 0;
  var total = sortState.speakers.length;
  sortState.correctedMatches = {};

  for (var i = 0; i < total; i++) {
    if (isSortMatchCorrect(i)) {
      correct++;
    } else {
      var correctQuestion = findCorrectSortQuestionForSpeaker(i);
      if (correctQuestion) sortState.correctedMatches[i] = correctQuestion.id;
    }
  }

  sortState.submitted = true;
  renderSortList();
  bindSortEvents();
  drawSortLines();

  var scoreClass = correct === total ? "perfect" : "partial";
  var scoreText = correct === total ? "全部正确！" : correct + " / " + total + " 正确";
  els.sortInfo.innerHTML =
    '<span class="sort-score ' + scoreClass + '">' + scoreText + "</span>" +
    (correct === total ? "" : '<span class="sort-correction-note">红色为已改正的正确连线。</span>');

  if (correct < total) {
    state.roundMistakes += total - correct;
    state.mistakes.push(state.current);
  }

  state.answeredInRound += 1;
  els.sortSubmitButton.textContent = "下一 Teil";
  els.sortSubmitButton.disabled = false;
  els.sortSubmitButton.onclick = function () {
    stopSortAudio();
    nextQuestion();
  };

  updateStats();
}

function stopSortAudio() {
  if (sortState && sortState.currentAudio) {
    sortState.currentAudio.pause();
    sortState.currentAudio = null;
  }
}

function shuffleSort() {
  if (state.current?.sectionMode === "lv2-global-sort") {
    shuffleLv2GlobalSort();
    return;
  }

  if (sortState.submitted) return;
  sortState.questions = shuffledSortQuestions(sortState.questions);
  sortState.matches = {};
  sortState.correctedMatches = {};
  sortState.selectedSpeaker = null;
  sortState.drag = null;
  sortState.suppressClick = false;
  els.sortInfo.textContent = "已重新打乱 Leitsätze。拖拽 Sprecher 到对应 Leitsatz。";
  renderSortList();
  bindSortEvents();
}

function shuffledSortQuestions(questions) {
  var shuffled = questions.map(function (q) { return { ...q }; });
  for (var i = shuffled.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = tmp;
  }
  if (isSortOrderCorrect(shuffled) && shuffled.length > 1) {
    var first = shuffled.shift();
    shuffled.push(first);
  }
  return shuffled;
}

function isSortOrderCorrect(questions) {
  for (var i = 0; i < questions.length; i++) {
    if (questions[i].answer !== String.fromCharCode(65 + i)) return false;
  }
  return questions.length > 0;
}

function compareHv1Speakers(a, b) {
  return String(a.answer).localeCompare(String(b.answer));
}

function cssEscape(value) {
  if (typeof CSS !== "undefined" && CSS.escape) return CSS.escape(value);
  return String(value).replace(/["\\]/g, "\\$&");
}

function formatLv2Items(question) {
  if (!question.items?.length) return "资料未明确给出对应题项";
  return question.items
    .map((item) => `${item.number ? `${item.number}. ` : ""}${item.text}`)
    .join("\n");
}

function formatFields(fields) {
  return fields
    .filter((field) => field.value)
    .map((field) => `${field.label}: ${field.value}`)
    .join("\n");
}

function formatBausteinArticle(article) {
  const html = escapeHtml(article)
    .replace(/\[(\d+)\]____/g, '<span class="baustein-blank" data-number="$1">$1 ___</span>')
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br>");
  return `<p>${html}</p>`;
}

function isFlashcard(question) {
  return question.sectionMode === "paragraph-card" || question.sectionMode === "lv2-v2-card" || question.sectionMode === "writing-card";
}

function setBackReviewLayout(question) {
  const answerBlock = els.correctAnswer.closest("div");
  if (!answerBlock) return;

  if (question.sectionMode === "writing-card") {
    answerBlock.classList.add("hidden");
    els.correctAnswer.textContent = "";
    return;
  }

  answerBlock.classList.remove("hidden");
}

function resetBackReviewLayout() {
  const answerBlock = els.correctAnswer.closest("div");
  if (answerBlock) answerBlock.classList.remove("hidden");
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

function unregisterServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
  });
}
