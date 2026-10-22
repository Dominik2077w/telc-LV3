const datasets = {
  lv2: {
    label: "LV2",
    title: "LV2 段落卡片 Trainer",
    source: window.LV2_QUESTIONS || [],
    promptLabel: "Abschnitt",
    answerLabel: "对应题项",
    reviewGermanLabel: "段落原文",
    reviewChineseLabel: "原文中文",
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
  hv1: {
    label: "HV1",
    title: "HV1 Hörverstehen Trainer",
    source: window.HV1_QUESTIONS || [],
    promptLabel: "Hörtext",
    answerLabel: "Leitsatz",
    reviewGermanLabel: "Transkript",
    reviewChineseLabel: "中文",
    idleText: "选择 HV1 后，先记住 8 项正确顺序，准备好后逐题听音选择。",
  },
  hv2: {
    label: "HV2",
    title: "HV2 三选一 Trainer",
    source: window.HV2_QUESTIONS || [],
    promptLabel: "题面",
    answerLabel: "正确选项",
    reviewGermanLabel: "正确补全",
    reviewChineseLabel: "中文",
    idleText: "选择 HV2 后，从三个补全选项中选择与题干匹配的一项。",
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
  speaking: {
    label: "口语",
    title: "口语题目 Trainer",
    source: window.SPEAKING_QUESTIONS || [],
    promptLabel: "Deutsch",
    answerLabel: "索引",
    reviewGermanLabel: "Deutsch",
    reviewChineseLabel: "中文",
    idleText: "选择口语后，正面看德语题目，背面看德语题目和中文理解。",
  },
  baustein: {
    label: "Baustein",
    title: "Baustein 完形填空 Trainer",
    source: window.BAUSTEIN_QUESTIONS || [],
    promptLabel: "Artikel",
    answerLabel: "答案",
    reviewGermanLabel: "解析",
    reviewChineseLabel: "说明",
    idleText: "选择 Baustein 后，每篇先看全部答案句与中文，再逐空复习并核对答案。",
  },
};

let data = [];
const mobileLayout = window.matchMedia("(max-width: 850px)");
const compactMatching = window.matchMedia("(max-width: 850px)");
let mobileMenuOpen = false;
let levelChosen = false;
let overlayReturnFocus = null;

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
  appShell: document.querySelector("#appShell"),
  levelGate: document.querySelector("#levelGate"),
  sidebarToggle: document.querySelector("#sidebarToggle"),
  sidebar: document.querySelector("#practiceSettings"),
  practice: document.querySelector("#practice"),
  mobileBar: document.querySelector(".mobile-bar"),
  mobileModules: document.querySelector("#mobileModules"),
  mobileLevelLabel: document.querySelector("#mobileLevelLabel"),
  mobileSettings: document.querySelector("#mobileSettings"),
  mobileCloseSettings: document.querySelector("#mobileCloseSettings"),
  mobileBackdrop: document.querySelector("#mobileBackdrop"),
  closeLevelGate: document.querySelector("#closeLevelGate"),
  sortInstruction: document.querySelector("#sortInstruction"),
  levelButtons: [...document.querySelectorAll("[data-level-choice]")],
  levelSwitchButtons: [...document.querySelectorAll("[data-level-switch]")],
  appTitle: document.querySelector("#appTitle"),
  appEyebrow: document.querySelector("#appEyebrow"),
  teilList: document.querySelector("#teilList"),
  toggleAllButton: document.querySelector("#toggleAllButton"),
  newOnly: document.querySelector("#newOnly"),
  corpusUpdateBadge: document.querySelector("#corpusUpdateBadge"),
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
restoreSidebarState();
selectLevel("lv3", { keepGate: true });
renderIdle();
unregisterServiceWorker();
syncMobileLayout();

function selectLevel(level, options = {}) {
  stopSortAudio();
  state.level = level;
  data = normalizeSections(level, datasets[level].source);
  state.selectedTeils = new Set(getPracticeSections().filter((section) => section.questions.length).map((section) => section.teil));
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
    levelChosen = true;
    els.levelGate.classList.add("hidden");
    syncMobileLayout();
    if (mobileLayout.matches) setMobileMenuOpen(true);
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
        const mode = section.mode || (level === "hv1" ? "hv1-match" : "judgement");
        return {
          ...question,
          id: `${level}-${section.teil}-${question.number}-${index}`,
          level,
          teil: section.teil,
          teilTitle: section.title,
          sectionMode: mode,
          orderKnown: section.orderKnown,
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
  els.mobileSettings.addEventListener("click", () => setMobileMenuOpen(true));
  els.mobileCloseSettings.addEventListener("click", () => setMobileMenuOpen(false));
  els.mobileBackdrop.addEventListener("click", () => setMobileMenuOpen(false));
  els.mobileModules.addEventListener("click", openLevelGate);
  els.closeLevelGate.addEventListener("click", closeLevelGate);
  document.addEventListener("keydown", handleOverlayKeyboard, true);
  mobileLayout.addEventListener("change", syncMobileLayout);
  compactMatching.addEventListener("change", refreshMatchingLayout);
  els.newOnly.addEventListener("change", () => {
    state.selectedTeils = new Set(getPracticeSections().filter((section) => section.questions.length).map((section) => section.teil));
    renderTeilList();
  });
  els.sidebarToggle.addEventListener("click", toggleSidebar);

  for (const button of els.levelButtons) {
    button.addEventListener("click", () => selectLevel(button.dataset.levelChoice));
  }

  for (const button of els.levelSwitchButtons) {
    button.addEventListener("click", () => selectLevel(button.dataset.levelSwitch));
  }

  els.toggleAllButton.addEventListener("click", () => {
    const selectable = getPracticeSections().filter((section) => section.questions.length).map((section) => section.teil);
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
  els.hv1Mode.addEventListener("change", () => { renderLevelChrome(); renderTeilList(); });
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

function setMobileMenuOpen(open) {
  if (open && mobileLayout.matches) overlayReturnFocus = document.activeElement;
  mobileMenuOpen = open && mobileLayout.matches;
  syncMobileLayout();
  if (mobileMenuOpen) els.mobileCloseSettings.focus();
  else if (mobileLayout.matches) els.mobileSettings.focus({ preventScroll: true });
}

function syncMobileLayout() {
  if (!mobileLayout.matches) mobileMenuOpen = false;
  const gateOpen = !els.levelGate.classList.contains("hidden");
  els.appShell.classList.toggle("mobile-settings-open", mobileMenuOpen);
  els.mobileBackdrop.classList.toggle("hidden", !mobileMenuOpen);
  els.mobileSettings.setAttribute("aria-expanded", String(mobileMenuOpen));
  els.appShell.inert = gateOpen;
  els.sidebar.inert = mobileLayout.matches && !mobileMenuOpen;
  els.practice.inert = mobileMenuOpen;
  els.mobileBar.inert = mobileMenuOpen;
  document.body.classList.toggle("overlay-open", gateOpen || mobileMenuOpen);
  if (mobileMenuOpen) {
    els.sidebar.setAttribute("role", "dialog");
    els.sidebar.setAttribute("aria-modal", "true");
    els.sidebar.setAttribute("aria-labelledby", "appTitle");
  } else {
    els.sidebar.removeAttribute("role");
    els.sidebar.removeAttribute("aria-modal");
    els.sidebar.removeAttribute("aria-labelledby");
  }
}

function openLevelGate() {
  setMobileMenuOpen(false);
  overlayReturnFocus = els.mobileModules;
  els.closeLevelGate.classList.toggle("hidden", !levelChosen);
  els.levelGate.classList.remove("hidden");
  syncMobileLayout();
  els.levelButtons[0].focus();
}

function closeLevelGate() {
  if (!levelChosen) return;
  els.levelGate.classList.add("hidden");
  syncMobileLayout();
  if (overlayReturnFocus?.isConnected) overlayReturnFocus.focus({ preventScroll: true });
}

function handleOverlayKeyboard(event) {
  const gateOpen = !els.levelGate.classList.contains("hidden");
  if (!gateOpen && !mobileMenuOpen) return;
  if (event.key === "Escape") {
    event.preventDefault();
    if (gateOpen) closeLevelGate();
    else setMobileMenuOpen(false);
    return;
  }
  if (event.key !== "Tab") return;
  const dialog = gateOpen ? els.levelGate : els.sidebar;
  const focusable = [...dialog.querySelectorAll('button, input, select, [href], [tabindex="0"]')]
    .filter((element) => !element.disabled && element.getClientRects().length);
  const first = focusable[0], last = focusable[focusable.length - 1];
  if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
    event.preventDefault();
    first?.focus();
  }
}

function scrollMobilePracticeTop() {
  if (!mobileLayout.matches) return;
  window.scrollTo({ top: 0, behavior: "instant" });
}

function refreshMatchingLayout() {
  if (state.current?.sectionMode === "lv2-global-sort" && !state.complete) {
    els.sortInstruction.textContent = getLv2GlobalInstruction();
    renderLv2GlobalSortList();
    bindLv2GlobalSortEvents();
  }
}

function restoreSidebarState() {
  const collapsed = localStorage.getItem("telc-sidebar-collapsed") === "true";
  setSidebarCollapsed(collapsed);
}

function toggleSidebar() {
  setSidebarCollapsed(!els.appShell.classList.contains("sidebar-collapsed"));
}

function setSidebarCollapsed(collapsed) {
  els.appShell.classList.toggle("sidebar-collapsed", collapsed);
  els.sidebarToggle.textContent = collapsed ? "展开" : "收起";
  els.sidebarToggle.setAttribute("aria-expanded", String(!collapsed));
  localStorage.setItem("telc-sidebar-collapsed", String(collapsed));
}

function renderLevelChrome() {
  const config = datasets[state.level];
  document.title = `telc ${config.label} Trainer`;
  els.appEyebrow.textContent = "telc C1 Hochschule";
  els.appTitle.textContent = config.title;
  els.mobileLevelLabel.textContent = config.label;
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
  document.querySelector("#questionOrderLabel").classList.toggle("hidden", state.level === "hv1" && els.hv1Mode.value === "listen");
}

function getPracticeSections() {
  const sections = state.level === "hv2" ? Hv2Quiz.buildSections(data) : data;
  if (!els.newOnly.checked) return sections;
  return sections.map((section) => ({ ...section, questions: section.questions.filter((question) => question.addedIn === "2026.9") }))
    .filter((section) => section.questions.length);
}

function renderTeilList() {
  els.teilList.innerHTML = "";
  const sections = getPracticeSections();
  if (!sections.length) els.teilList.textContent = "这个模块没有 2026.9 新增题目。";
  for (const section of sections) {
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
    const reviewOnly = section.mode === "corpus-card" && !(state.level === "hv1" && els.hv1Mode.value === "listen" && Hv1Order.canPractice(section.questions));
    name.innerHTML = `<strong>Teil ${section.teil}</strong><span>${escapeHtml(section.title)}${reviewOnly ? " · 复习卡" : ""}</span>`;
    const added = section.questions.filter((question) => question.addedIn === "2026.9").length;
    if (added) {
      const badge = document.createElement("span");
      badge.className = "new-badge";
      badge.textContent = `2026.9 新增 ${added}`;
      name.append(badge);
    }

    const count = document.createElement("span");
    count.className = "count-pill";
    count.textContent = section.questions.length || "待定";

    label.append(input, name, count);
    els.teilList.append(label);
  }
}

function startSession() {
  const chosen = getPracticeSections().filter((section) => state.selectedTeils.has(section.teil) && section.questions.length);
  if (!chosen.length) {
    els.roundStrip.textContent = "请选择至少一个有题目的 Teil。";
    els.startButton.textContent = "请先选择题组";
    return;
  }
  els.startButton.textContent = "开始练习";
  stopSortAudio();
  if (mobileLayout.matches) setMobileMenuOpen(false);

  const teilOrdered = applyOrder(chosen, els.teilOrder.value);

  if (state.level === "hv2") {
    const orderedSections = teilOrdered.map((section) => ({
      ...section,
      questions: applyOrder(section.questions, els.questionOrder.value),
    }));
    state.sessionSource = Hv2Quiz.buildRoundQueue(orderedSections);
  } else if ((state.level === "lv2" && els.lv2Mode.value === "global-sort") || state.level === "lv2v2") {
    state.sessionSource = teilOrdered.map(buildLv2GlobalSortBatch);
  } else if (state.level === "baustein") {
    state.sessionSource = BausteinStudy.buildRoundQueue(teilOrdered.map(section => ({
      ...section,
      questions: applyOrder(section.questions, els.questionOrder.value),
    })));
  } else if (state.level === "hv1" && els.hv1Mode.value === "listen") {
    state.sessionSource = teilOrdered.flatMap(function (section) {
      if (!Hv1Order.canPractice(section.questions)) {
        return applyOrder(section.questions, els.questionOrder.value).map((question) => ({ ...question }));
      }
      var questions = applyOrder(section.questions, "sequential").map(function (q) {
        return { ...q };
      });
      return [{
        id: "hv1-audio-" + section.teil,
        level: "hv1",
        teil: section.teil,
        teilTitle: section.title,
        sectionMode: "hv1-audio-quiz",
        addedIn: section.addedIn,
        updatedIn: section.updatedIn,
        questions: questions,
        german: section.title,
        chinese: "",
      }];
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

function buildHv2MistakeQueue(mistakes) {
  const memoryOrder = state.sessionSource
    .filter((question) => question.sectionMode === "hv2-memory")
    .map((question) => String(question.teil));
  const sectionsByTeil = new Map(getPracticeSections().map((section) => [String(section.teil), section]));
  const sections = memoryOrder.map((teil) => sectionsByTeil.get(teil)).filter(Boolean);
  return Hv2Quiz.buildRoundQueue(sections, applyOrder(mistakes, els.questionOrder.value));
}

function buildBausteinMistakeQueue(mistakes) {
  const sectionsByTeil = new Map(getPracticeSections().map(section => [String(section.teil), section]));
  const sections = state.sessionSource
    .filter(question => question.sectionMode === "baustein-memory")
    .map(question => sectionsByTeil.get(String(question.teil)))
    .filter(Boolean);
  return BausteinStudy.buildRoundQueue(sections, applyOrder(mistakes, els.questionOrder.value));
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
  if (state.current.sectionMode !== "baustein-article") scrollMobilePracticeTop();
}

function finishRound() {
  if (els.roundMode.value === "mistakes" && state.mistakes.length) {
    const count = countMistakeQuestions(state.mistakes);
    state.round += 1;
    els.roundStrip.textContent = ["hv2", "baustein"].includes(state.level)
      ? `本轮错 ${count} 题，下一轮先复习对应 Teil，再重复错题。`
      : `本轮错 ${count} 题，下一轮只重复错题。`;
    if (state.level === "hv2") {
      startRound(buildHv2MistakeQueue(state.mistakes));
      return;
    }
    if (state.level === "baustein") {
      startRound(buildBausteinMistakeQueue(state.mistakes));
      return;
    }
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
  const config = datasets[state.level];
  els.promptLabel.textContent = config.promptLabel;
  els.corpusUpdateBadge.classList.add("hidden");
  stopSortAudio();
  els.roundStrip.textContent =
    els.roundMode.value === "mistakes" ? "错题轮回完成，当前选择的题都做对了。" : "单轮练习完成。";
  updateStats();
  scrollMobilePracticeTop();
}

function showFront(question) {
  if (question.sectionMode === "hv2-choice") Hv2Quiz.prepareQuestion(question);
  const edition = question.addedIn || question.updatedIn;
  els.corpusUpdateBadge.textContent = edition ? `${edition} ${question.addedIn ? "新增" : "修订"}` : "";
  els.corpusUpdateBadge.classList.toggle("hidden", !edition);
  if (question.sectionMode === "baustein-article") {
    renderBausteinArticle(question);
    updateStats();
    return;
  }

  if (["hv2-memory", "baustein-memory"].includes(question.sectionMode)) {
    els.sessionMode.textContent = question.sectionMode === "baustein-memory"
      ? "Baustein · 先看答案句与中文" : "HV2 · 先看完整句与中文";
    els.sessionTitle.textContent = "Teil " + question.teil + ": " + question.teilTitle;
    els.teilBadge.textContent = "Teil " + question.teil;
    els.questionBadge.textContent = "本篇预习";
    els.questionCard.classList.add("hidden");
    els.audioPanel.classList.add("hidden");
    els.sortModeView.classList.remove("hidden");
    renderHv2MemoryView(question);
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

  if (question.sectionMode === "hv1-audio-quiz") {
    els.sessionMode.textContent = "HV1 · 先记忆，再听音选择";
    els.sessionTitle.textContent = "Teil " + question.teil + ": " + question.teilTitle;
    els.teilBadge.textContent = "Teil " + question.teil;
    els.questionBadge.textContent = "听力训练";
    els.questionCard.classList.add("hidden");
    els.audioPanel.classList.add("hidden");
    els.sortModeView.classList.remove("hidden");
    renderHv1AudioQuiz(question);
    updateStats();
    return;
  }

  if (question.sectionMode === "hv1-sort") {
    els.sessionMode.textContent = "HV1 · 先记忆，再排序";
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
  const config = datasets[state.level];
  els.promptLabel.textContent = question.sectionMode === "hv2-choice"
    ? "选择正确补全" : question.sectionMode === "corpus-card" ? "复习卡" : config.promptLabel;
  els.correctAnswerLabel.textContent = question.level === "hv1" && question.orderKnown === false
    ? "原文陈述" : question.sectionMode === "hv2-choice" ? "正确补全" : question.sectionMode === "corpus-card" ? "原文答案" : config.answerLabel;
  els.reviewGermanLabel.textContent = question.sectionMode === "corpus-card" ? "原文" : config.reviewGermanLabel;
  els.reviewChineseLabel.textContent = question.sectionMode === "corpus-card" ? "中文 / 说明" : config.reviewChineseLabel;
  if (question.bausteinStudy) {
    els.promptLabel.textContent = "德语填空句";
    els.correctAnswerLabel.textContent = "本空答案";
    els.reviewGermanLabel.textContent = "完整句";
    els.reviewChineseLabel.textContent = "中文译句";
  }
  els.sessionMode.textContent = `${datasets[state.level].label} · ${
    els.teilOrder.value === "random" ? "Teil 随机" : "Teil 顺序"
  } · ${els.questionOrder.value === "random" ? "题目随机" : "题目顺序"}`;
  els.sessionTitle.textContent =
    question.sectionMode === "speaking-card"
      ? `${question.teilLabel || question.teilTitle}: ${question.number}`
      : question.sectionMode === "baustein-grammar-card"
      ? `${question.cardType || question.teilTitle}: ${question.cardKey || question.number}`
      : `Teil ${question.teil}: ${question.teilTitle}`;
  els.teilBadge.textContent =
    question.sectionMode === "speaking-card"
      ? question.teilLabel || `Teil ${question.teil}`
      : question.sectionMode === "baustein-grammar-card"
      ? question.cardType || question.teilTitle
      : `Teil ${question.teil} · ${question.teilTitle}`;
  els.questionBadge.textContent =
    question.sectionMode === "hv1-match"
      ? `Sprecher ${question.number}`
      : question.sectionMode === "speaking-card"
      ? `编号 ${question.number}`
      : question.sectionMode === "baustein-grammar-card"
      ? `卡片 ${question.number}`
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
  els.answerGrid.classList.remove("is-short");
  els.roundStrip.textContent = `Runde ${state.round}`;
  els.answerGrid.classList.toggle("hv2-choices", question.sectionMode === "hv2-choice");
  if (question.sectionMode === "hv2-choice") {
    els.sessionMode.textContent += " · 三选一";
    els.roundStrip.textContent += " · 三个选项均以省略开头的片段呈现";
  }

  renderParagraphPanel(question);
  renderAudioPlayer(question);

  if (isFlashcard(question)) {
    els.questionBadge.textContent =
      question.sectionMode === "writing-card"
        ? `Thema ${question.teil}${question.number}`
        : question.sectionMode === "speaking-card"
        ? `编号 ${question.number}`
        : question.sectionMode === "baustein-grammar-card"
        ? `卡片 ${question.number}`
        : question.sectionMode === "corpus-card"
        ? `Frage ${question.number}`
        : `Abschnitt ${question.paragraph || question.number}`;
    els.answerGrid.dataset.count = "1";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "answer-button";
    button.textContent = state.level === "baustein" ? "1 · 看背面" : "看背面";
    if (state.level === "baustein") {
      button.setAttribute("aria-keyshortcuts", "1");
      els.roundStrip.textContent += " · 数字键 1 看答案";
    }
    button.addEventListener("click", revealFlashcard);
    els.answerGrid.append(button);
    return;
  }

  const choices = getChoices(question);
  els.answerGrid.classList.toggle("is-short", choices.length <= 5 && choices.every((choice) => choice.label.length <= 18));
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
  els.paragraphPanel.classList.remove("is-reviewed");
  els.paragraphPanel.classList.remove("baustein-panel");

  if (question.bausteinStudy) {
    els.paragraphPanel.classList.remove("hidden");
    const translation = document.createElement("p");
    translation.className = "baustein-card-chinese";
    translation.lang = "zh-CN";
    translation.setAttribute("aria-label", "完整中文翻译");
    translation.textContent = question.chinese;
    els.paragraphPanel.append(translation);
    if (question.sourceNote) {
      const note = document.createElement("p");
      note.className = "baustein-review-note";
      note.textContent = question.sourceNote;
      els.paragraphPanel.append(note);
    }
    return;
  }

  if (question.sectionMode === "hv2-choice") {
    els.paragraphPanel.classList.remove("hidden");
    const note = document.createElement("p");
    note.className = "hv2-source-note";
    note.textContent = "请选择本题的正确补全。三个选项均省略句子开头；干扰项为另行编写的无关片段，并非 PDF 原题选项。";
    els.paragraphPanel.append(note);
    return;
  }

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
  els.paragraphPanel.classList.remove("is-reviewed");
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
  article.lang = "de";
  article.innerHTML = formatBausteinArticle(section.article || "");
  article.addEventListener("click", (event) => {
    const blank = event.target.closest(".baustein-blank");
    if (!blank || els.paragraphPanel.classList.contains("is-reviewed")) return;
    const rowIndex = getBausteinRows().findIndex((row) => row.dataset.number === blank.dataset.number);
    setBausteinFocus(rowIndex);
    const panel = els.paragraphPanel.querySelector(".baustein-floating-panel");
    panel?.classList.remove("is-collapsed");
    const toggle = panel?.querySelector('[data-action="toggle-panel"]');
    if (toggle) {
      toggle.textContent = "收起选项";
      toggle.setAttribute("aria-expanded", "true");
    }
  });
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
  row.addEventListener("click", (event) => {
    if (!event.target.closest(".baustein-option")) setBausteinFocus(getBausteinRowIndex(row));
  });

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
  if (els.paragraphPanel.classList.contains("is-reviewed")) return;
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
  if (mobileLayout.matches) {
    const blank = els.paragraphPanel.querySelector(".baustein-blank.current");
    blank?.scrollIntoView({ block: "center", behavior: "instant" });
  }
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
    '</em><button type="button" class="ghost-button baustein-panel-toggle" data-action="toggle-panel" aria-expanded="' +
    !panel.classList.contains("is-collapsed") + '">' + (panel.classList.contains("is-collapsed") ? "展开选项" : "收起选项") +
    '</button></div><div class="baustein-float-options">' +
    optionHtml +
    '</div><div class="baustein-float-actions">' +
    '<button type="button" class="baustein-float-action" data-action="back">回退</button>' +
    '<button type="button" class="baustein-float-action primary" data-action="next">下一个</button>' +
    '<button type="button" class="baustein-float-action primary" data-action="submit">核对整篇</button>' +
    '</div><p>点击选项直接选择；Enter 或“下一个”推进，Delete / Backspace 或“回退”退回。</p>';

  for (const button of panel.querySelectorAll(".baustein-float-option")) {
    button.addEventListener("click", () => {
      const sourceButton = row.querySelector(`.baustein-option[data-choice="${cssEscape(button.dataset.choice)}"]`);
      if (sourceButton) selectBausteinOption(row, sourceButton);
    });
  }

  const backButton = panel.querySelector('[data-action="back"]');
  const nextButton = panel.querySelector('[data-action="next"]');
  if (backButton) backButton.addEventListener("click", stepBackBausteinSelection);
  if (nextButton) nextButton.addEventListener("click", moveBausteinFocusForward);
  panel.querySelector('[data-action="submit"]').addEventListener("click", () => submitBausteinArticle(state.current));
  panel.querySelector('[data-action="toggle-panel"]').addEventListener("click", (event) => {
    const collapsed = panel.classList.toggle("is-collapsed");
    event.currentTarget.textContent = collapsed ? "展开选项" : "收起选项";
    event.currentTarget.setAttribute("aria-expanded", String(!collapsed));
  });
}

function handleBausteinKeyboard(event) {
  if (!state.current) return false;
  if (state.level === "baustein" && isFlashcard(state.current)) {
    const showingFront = els.backFace.classList.contains("hidden");
    if (showingFront && event.key === "1") {
      event.preventDefault();
      revealFlashcard();
      return true;
    }
    if (!showingFront && ["1", "2"].includes(event.key)) {
      event.preventDefault();
      if (event.key === "2") markFlashcardMissed({ advance: true });
      else nextQuestion();
      return true;
    }
    return false;
  }
  if (state.current.sectionMode !== "baustein-article") return false;
  if (els.paragraphPanel.classList.contains("is-reviewed") || isNativeButtonKey(event)) return false;
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

  if (event.key === "Enter") {
    event.preventDefault();
    moveBausteinFocusForward();
    return true;
  }

  return false;
}

function moveBausteinFocusForward() {
  const rows = getBausteinRows();
  if (!rows.length) return;

  const currentIndex = Math.max(0, getBausteinRowIndex(getCurrentBausteinRow()));
  const nextUnansweredIndex = rows.findIndex((row, rowIndex) => rowIndex > currentIndex && !row.dataset.selected);
  const nextIndex = nextUnansweredIndex === -1 ? Math.min(currentIndex + 1, rows.length - 1) : nextUnansweredIndex;
  setBausteinFocus(nextIndex);
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
  blank.disabled = true;
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
  if (els.paragraphPanel.classList.contains("is-reviewed")) return;
  els.paragraphPanel.classList.add("is-reviewed");
  els.paragraphPanel.querySelector(".baustein-floating-panel")?.remove();
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
  if (mobileLayout.matches) els.answerGrid.scrollIntoView({ block: "center", behavior: "instant" });
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
  els.resultLine.textContent =
    question.sectionMode === "speaking-card"
      ? `${question.teilLabel || question.teilTitle} · ${question.number}`
      : `Abschnitt ${question.paragraph || question.number}`;
  if (question.sectionMode === "writing-card") {
    els.resultLine.textContent = `Thema ${question.teil}${question.number}`;
    els.reviewGerman.textContent = [question.german, question.positions].filter(Boolean).join("\n\n") || "-";
    els.reviewChinese.textContent = question.chinese || "暂无中文释义";
  } else if (question.sectionMode === "corpus-card") {
    els.resultLine.textContent = `Teil ${question.teil} · Frage ${question.number} · 复习卡`;
    els.correctAnswer.textContent = question.answerText || "原文未标注答案";
    els.reviewGerman.textContent = question.reviewGerman || question.german;
    els.reviewChinese.textContent = [question.chinese, question.sourceNote].filter(Boolean).join("\n\n");
  } else if (question.sectionMode === "speaking-card") {
    els.reviewGerman.textContent = question.german || "-";
    els.reviewChinese.textContent = question.chinese || "暂无中文理解";
  } else if (question.sectionMode === "baustein-grammar-card") {
    els.resultLine.textContent = `${question.cardType || question.teilTitle} · ${question.number}`;
    els.correctAnswer.textContent = question.answerText || "-";
    els.reviewGerman.textContent = question.extra
      ? `${question.extraLabel || "补充"}: ${question.extra}`
      : "暂无补充";
    els.reviewChinese.textContent = question.cardKey
      ? `${question.cardType || question.teilTitle} · ${question.cardKey}`
      : `${question.cardType || question.teilTitle} · ${question.number}`;
  } else {
    els.correctAnswer.textContent = question.backFields ? formatFields(question.backFields) : formatLv2Items(question);
    els.reviewGerman.textContent = question.passage || question.firstSentence || question.summary || "暂无段落首句";
    els.reviewChinese.textContent = [question.chinese || question.summary || question.german, question.sourceNote].filter(Boolean).join("\n\n");
  }
  els.missButton.classList.remove("hidden");
  els.missButton.textContent = "不记得，下一张";
  els.nextButton.textContent = "记得，下一张";
  if (state.level === "baustein") {
    els.missButton.textContent = "2 · 不记得，下一张";
    els.nextButton.textContent = "1 · 记得，下一张";
  }
  const backActions = els.nextButton.parentElement;
  if (state.level === "baustein") backActions.insertBefore(els.nextButton, els.missButton);
  else backActions.insertBefore(els.missButton, els.nextButton);
  els.missButton.setAttribute("aria-keyshortcuts", state.level === "baustein" ? "2 ArrowLeft" : "ArrowLeft");
  els.nextButton.setAttribute("aria-keyshortcuts", state.level === "baustein" ? "1 ArrowRight" : "ArrowRight");
  els.roundStrip.textContent =
    els.roundMode.value === "mistakes"
      ? question.sectionMode === "baustein-grammar-card"
        ? "快捷键：← 不记得，→ 记得。不熟的卡片会进入下一轮。"
        : question.sectionMode === "corpus-card"
        ? "快捷键：← 不记得，→ 记得。不熟的复习卡会进入下一轮。"
        : "快捷键：← 不记得，→ 记得。不熟的段落会进入下一轮。"
      : "快捷键：← 不记得，→ 记得。";
  if (state.level === "baustein") {
    els.roundStrip.textContent = "数字键：1 记得，2 不记得；也可用 ← / →。" +
      (els.roundMode.value === "mistakes" ? "不熟的卡片会进入下一轮。" : "");
  }
  updateStats();
  scrollMobilePracticeTop();
}

function handleKeyboardNavigation(event) {
  if (mobileMenuOpen || !els.levelGate.classList.contains("hidden")) return;
  if (event.repeat || event.isComposing || event.ctrlKey || event.metaKey || event.altKey || state.complete) return;
  if (isEditableTarget(event.target)) return;
  if (!state.current || state.complete) return;

  if (handleBausteinKeyboard(event)) return;

  if (state.current.sectionMode === "hv1-audio-quiz") {
    const session = hv1AudioState.session;
    if (session?.phase === "practice" && !session.answered && /^[1-8]$/.test(event.key)) {
      const button = els.sortList.querySelectorAll(".hv1-quiz-option")[Number(event.key) - 1];
      if (button) {
        event.preventDefault();
        button.click();
      }
      return;
    }
    if (["memory", "result"].includes(session?.phase) || session?.answered) {
      if (event.key === "Enter" && !isNativeButtonKey(event)) {
        event.preventDefault();
        submitHv1AudioStep();
      }
    }
    return;
  }

  if (state.current.sectionMode === "hv1-sort") {
    if (event.key === "Enter" && !isNativeButtonKey(event)) {
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

  if (["hv2-memory", "baustein-memory"].includes(state.current.sectionMode)) {
    if (state.current.sectionMode === "baustein-memory"
      ? ["1", "Enter"].includes(event.key)
      : event.key === "Enter" && !isNativeButtonKey(event)) {
      event.preventDefault();
      submitSort();
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
  scrollMobilePracticeTop();
}

function markFlashcardMissed(options = {}) {
  if (!state.current) return;
  state.roundMistakes += 1;
  state.mistakes.push(state.current);
  els.missButton.classList.add("hidden");
  els.resultLine.className = "result-line wrong";
  els.resultLine.textContent =
    state.current.sectionMode === "speaking-card"
      ? `已加入错题 · ${state.current.teilLabel || state.current.teilTitle} · ${state.current.number}`
      : state.current.sectionMode === "baustein-grammar-card"
      ? `已加入错题 · ${state.current.cardType || state.current.teilTitle} · ${state.current.number}`
      : `已加入错题 · Abschnitt ${state.current.paragraph || state.current.number}`;
  els.roundStrip.textContent =
    state.current.sectionMode === "speaking-card"
      ? "这张口语卡会进入下一轮。"
      : state.current.sectionMode === "corpus-card"
      ? "这张复习卡会进入下一轮。"
      : state.current.sectionMode === "baustein-grammar-card"
      ? "这张语法卡会进入下一轮。"
      : "这一段会进入下一轮。";
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
  if (question.sectionMode === "hv2-choice") {
    return [question.chinese, question.sourceNote,
      "正确补全来自 PDF；另外两个选项是独立编写的无关片段，不由正确答案改写或否定，也不是 PDF 原题选项。",
    ].filter(Boolean).join("\n\n");
  }
  if (question.sectionMode === "paragraph-match") {
    return question.summary || question.chinese;
  }
  return [question.chinese, question.answerEvidence, question.sourceNote].filter(Boolean).join("\n\n");
}

function getHv2AnswerText(question) {
  const correctOption = question.options?.find((option) => option.value === question.answer);
  return correctOption?.label || question.completion || question.answer || "未标注";
}

function updateStats() {
  els.roundNumber.textContent = state.round;
  const totalQuestions = state.queue.reduce((total, question) => {
    if (["hv2-memory", "baustein-memory"].includes(question.sectionMode)) return total;
    if (question.sectionMode === "hv1-audio-quiz") {
      return total + (question.reviewQuestions || question.questions || []).length;
    }
    return total + 1;
  }, 0);
  els.progressText.textContent = totalQuestions
    ? `${Math.min(state.answeredInRound, totalQuestions)}/${totalQuestions}`
    : "0/0";
  els.mistakeText.textContent = state.roundMistakes;
}

function countMistakeQuestions(mistakes) {
  return mistakes.reduce((total, question) => {
    if (question.sectionMode === "hv1-audio-quiz") {
      return total + (question.reviewQuestions || []).length;
    }
    return total + 1;
  }, 0);
}

function renderIdle() {
  const config = datasets[state.level];
  els.corpusUpdateBadge.classList.add("hidden");
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
  els.answerGrid.classList.remove("hv2-choices");
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
      if (item.unverified) continue;
      var german = splitLanguages(item.text || "").german || item.text || "";
      var optionChinese =
        question.source === "lv2-signal-question-xlsx"
          ? question.sentenceZh || question.chinese || item.chinese || item.hint || ""
          : item.chinese || item.hint || item.signalwortZh || item.text || "";
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
    addedIn: section.addedIn,
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

function renderHv2MemoryView(memory) {
  const isBaustein = memory.sectionMode === "baustein-memory";
  els.sortModeView.classList.remove("hv1-order-mode", "hv1-audio-mode", "lv2-memory-mode");
  els.sortModeView.classList.add("hv2-memory-mode");
  els.sortShuffleButton.classList.add("hidden");
  els.sortSubmitButton.textContent = "我看完了，开始本篇练习";
  els.sortSubmitButton.disabled = false;
  els.sortSubmitButton.onclick = null;
  els.sortTeilBadge.textContent = "Teil " + memory.teil + " · " + memory.teilTitle;
  els.sortInstruction.textContent = isBaustein
    ? "按空格顺序查看填好答案的那一句和对应中文；高亮部分是本空答案。看完后开始本篇练习。"
    : "下面按题号展示题干补全后的完整句子和中文翻译；看完后进入本篇三选一。";
  els.sortInfo.textContent = "本篇 " + (memory.reviewRows || []).length + " 道题 · 按原题顺序" +
    (isBaustein ? " · 按 1 / Enter 开始练习" : "");
  els.sortList.classList.remove("hv1-order-list");
  els.sortList.innerHTML = "";

  const list = document.createElement("ol");
  list.className = "hv2-review-list";
  list.setAttribute("aria-label", "按题号排列的完整句子与中文翻译");
  (memory.reviewRows || []).forEach(function (item) {
    const row = document.createElement("li");
    row.className = "hv2-review-row";

    const number = document.createElement("span");
    number.className = "hv2-review-number";
    number.textContent = item.number || "—";

    const body = document.createElement("div");
    body.className = "hv2-review-body";

    const german = document.createElement("p");
    german.className = "hv2-review-german";
    german.lang = "de";
    if (isBaustein) {
      const answer = document.createElement("mark");
      answer.className = "baustein-review-answer";
      answer.textContent = item.answer;
      german.append(document.createTextNode(item.before ? item.before + " " : item.sourceMissing ? "答案：" : ""), answer);
      if (item.after) german.append(document.createTextNode((/^[,.;:!?]/.test(item.after) ? "" : " ") + item.after));
    } else {
      german.textContent = item.sentence || "原文未提供完整句子";
    }

    const chinese = document.createElement("p");
    chinese.className = "hv2-review-chinese";
    chinese.textContent = item.sourceMissing
      ? "原文只有答案字母，未提供填空句子和中文翻译。" : item.chinese || "语料暂未提供中文翻译";

    body.append(german, chinese);
    if (item.sourceNote) {
      const note = document.createElement("p");
      note.className = "baustein-review-note";
      note.textContent = item.sourceNote;
      body.append(note);
    }
    row.append(number, body);
    list.appendChild(row);
  });
  els.sortList.appendChild(list);
  window.scrollTo({ top: 0, behavior: "instant" });
}

function renderLv2GlobalSortView(batch) {
  els.sortModeView.classList.remove("hv1-order-mode", "hv1-audio-mode", "hv2-memory-mode");
  els.sortShuffleButton.classList.remove("hidden");
  els.sortShuffleButton.textContent = "随机打乱";
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
  els.sortInfo.textContent = compactMatching.matches ? "已配对 0 / " + lv2GlobalSortState.options.length : getLv2GlobalInstruction();
  els.sortInstruction.textContent = getLv2GlobalInstruction();
  els.sortSubmitButton.textContent = "提交";
  els.sortSubmitButton.disabled = false;
  els.sortSubmitButton.onclick = null;

  renderLv2GlobalSortList();
  bindLv2GlobalSortEvents();
}

function getLv2GlobalInstruction() {
  if (compactMatching.matches) return "先查看段落 / 信号词，再逐题点选对应段落，无需拖拽。";
  if (lv2GlobalSortState.batch?.level === "lv2v2") {
    return "把右侧德语原句拖到左侧对应的德语信号词。左侧同时显示对应问句。";
  }
  return "把右侧题项拖到左侧对应关键句。当前左右两侧显示：" + (els.lv2GlobalDisplay.value === "german" ? "德语" : "中文") + "。";
}

function renderLv2GlobalSortList() {
  els.sortList.classList.remove("hv1-order-list");
  els.sortList.innerHTML = "";
  if (compactMatching.matches) {
    renderMobileLv2Matching();
    return;
  }
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

// Native selects keep matching usable while scrolling with one finger on phones.
function createMobileMatchCard(title, text, choices, value, submitted, correct, feedback, onChange) {
  const card = document.createElement("article");
  card.className = "mobile-match-card";
  card.classList.toggle("matched", Boolean(value));
  if (submitted) card.classList.add(correct ? "correct" : "incorrect");
  const heading = document.createElement("div");
  heading.className = "mobile-match-head";
  heading.textContent = title;
  card.append(heading);
  if (text) {
    const content = document.createElement("p");
    content.textContent = text;
    card.append(content);
  }
  const label = document.createElement("label");
  label.append(document.createTextNode(submitted ? "正确配对" : "选择对应项"));
  const select = document.createElement("select");
  select.setAttribute("aria-label", title + "：选择对应项");
  select.append(new Option("请选择…", ""));
  for (const choice of choices) select.append(new Option(choice.label, choice.id));
  select.value = value || "";
  select.disabled = submitted;
  select.addEventListener("change", function () {
    onChange(select.value);
    card.classList.toggle("matched", Boolean(select.value));
    const preview = card.querySelector(".mobile-match-selection");
    if (preview) preview.textContent = select.value ? select.selectedOptions[0].textContent : "";
  });
  label.append(select);
  card.append(label);
  if (!submitted && choices.some(choice => choice.label.length > 30)) {
    const preview = document.createElement("p");
    preview.className = "mobile-match-selection";
    preview.setAttribute("aria-live", "polite");
    preview.textContent = value ? select.selectedOptions[0]?.textContent || "" : "";
    card.append(preview);
  }
  if (submitted) {
    const result = document.createElement("p");
    result.className = "mobile-match-feedback";
    result.textContent = (correct ? "✓ 回答正确\n" : "✗ ") + feedback;
    card.append(result);
  }
  return card;
}

function renderMobileLv2Matching() {
  const list = document.createElement("div");
  list.className = "mobile-match-list";
  const reference = document.createElement("details");
  reference.className = "mobile-reference";
  const summary = document.createElement("summary");
  summary.textContent = "查看全部段落 / 信号词（" + lv2GlobalSortState.paragraphs.length + "）";
  reference.append(summary);
  const isV2 = lv2GlobalSortState.batch?.level === "lv2v2";
  for (const paragraph of lv2GlobalSortState.paragraphs) {
    const content = document.createElement("div");
    content.className = "sort-node";
    content.textContent = "Abschnitt " + paragraph.label + " · " +
      (isV2 ? (paragraph.german || paragraph.signalwort || "") + "\n" + (paragraph.frage || "") :
        (els.lv2GlobalDisplay.value === "german" ? paragraph.german : paragraph.chinese));
    reference.append(content);
  }
  list.append(reference);
  const choices = lv2GlobalSortState.paragraphs.map(function (paragraph) {
    const repeatedLabel = lv2GlobalSortState.paragraphs.some(p => p.id !== paragraph.id && p.label === paragraph.label);
    return { id: paragraph.id, label: "Abschnitt " + paragraph.label +
      (isV2 || repeatedLabel ? " · " + (paragraph.german || paragraph.signalwort) : "") };
  });
  const displayMatches = getLv2GlobalDisplayMatches();
  lv2GlobalSortState.options.forEach(function (option, index) {
    const original = findLv2GlobalParagraph(lv2GlobalSortState.matches[index]);
    const correct = findLv2GlobalParagraph(option.paragraphId);
    const feedback = (original ? "你选择了 " + choices.find(c => c.id === original.id).label : "未作答") +
      "；正确为 Abschnitt " + (correct?.label || "?") + "。\n" +
      (correct ? (isV2 ? correct.german + "\n" + correct.chinese + "\n" + correct.frage :
        (els.lv2GlobalDisplay.value === "german" ? correct.german : correct.chinese)) : "");
    list.append(createMobileMatchCard("题项 " + (index + 1), isV2 ? option.text : getLv2OptionDisplayText(option),
      choices, displayMatches[index], lv2GlobalSortState.submitted, isLv2GlobalMatchCorrect(index), feedback,
      function (value) {
        if (value) lv2GlobalSortState.matches[index] = value;
        else delete lv2GlobalSortState.matches[index];
        els.sortInfo.textContent = "已配对 " + Object.keys(lv2GlobalSortState.matches).length + " / " + lv2GlobalSortState.options.length;
      }));
  });
  els.sortList.append(list);
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
    (correct === total ? "" : '<span class="sort-correction-note">' + (compactMatching.matches ? "已在各题下显示正确配对。" : "红色为已更正的正确连线。") + '</span>') +
    (!compactMatching.matches && lv2GlobalSortState.batch?.level === "lv2v2" && correct < total ? renderLv2V2Corrections() : "");

  if (correct < total) {
    state.roundMistakes += total - correct;
    state.mistakes.push(state.current);
  }

  state.answeredInRound += 1;
  els.sortSubmitButton.textContent = "下一 Teil";
  els.sortSubmitButton.disabled = false;
  els.sortSubmitButton.onclick = nextQuestion;

  updateStats();
  scrollMobilePracticeTop();
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
  els.sortInfo.textContent = compactMatching.matches ? "已重新打乱，请重新点选配对。" : "已重新打乱右侧题项。";
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

// ---- HV1: memorize the answer order, then listen and choose each statement. ----

var hv1AudioState = { session: null };

function renderHv1AudioQuiz(batch) {
  stopSortAudio();
  els.sortModeView.classList.remove("hv1-order-mode", "hv2-memory-mode");
  els.sortModeView.classList.add("hv1-audio-mode");
  hv1AudioState.session = Hv1AudioQuiz.createSession(batch);
  renderHv1AudioQuizView();
}

function renderHv1AudioQuizView() {
  const session = hv1AudioState.session;
  if (!session) return;
  els.sortList.innerHTML = "";
  els.sortList.classList.remove("hv1-order-list");
  els.sortSubmitButton.onclick = null;
  els.sortSubmitButton.disabled = false;
  els.sortShuffleButton.classList.add("hidden");
  els.sortInfo.setAttribute("role", "status");

  if (session.phase === "memory") {
    els.sessionMode.textContent = "HV1 · 先记忆";
    els.questionBadge.textContent = "正确顺序";
    els.sortInstruction.textContent = "先按 Sprecher 1 到 8 的顺序记住这八条陈述。准备好后，逐题听音选择。";
    els.sortInfo.textContent = "PDF 正确顺序 · " + session.questions.length + " 项";
    const ordered = session.questions.map(function (question) {
      return {
        id: "hv1-memory-" + question.number,
        text: question.leitsatz || question.answerText || question.sourceGerman,
        chinese: question.chinese,
        note: question.studyNote,
      };
    });
    els.sortList.append(createHv1OrderList(ordered, { translation: true }));
    els.sortSubmitButton.textContent = "准备好了，开始听力练习";
    els.roundStrip.textContent = session.activeQuestions.length < session.questions.length
      ? "记忆阶段不会计分。本轮会重做 " + session.activeQuestions.length + " 道错题。"
      : "记忆阶段不会计分。开始后按 Sprecher 1–8 逐题播放音频，点选后立即显示正误。";
    return;
  }

  if (session.phase === "practice") {
    renderHv1AudioQuestion(session);
    return;
  }

  const total = session.activeQuestions.length;
  const correct = total - session.missed.length;
  els.sessionMode.textContent = "HV1 · Teil 结果";
  els.questionBadge.textContent = "本 Teil 完成";
  els.sortInstruction.textContent = "本轮 " + total + " 道听力题已完成。你可以再对照 PDF 给出的完整正确顺序。";
  els.sortInfo.textContent = "本轮 " + correct + " / " + total + " 题答对";
  const heading = document.createElement("h3");
  heading.textContent = "Sprecher 1–8 正确顺序";
  const ordered = session.questions.map(function (question) {
    return {
      id: "hv1-result-" + question.number,
      text: question.leitsatz || question.answerText || question.sourceGerman,
      chinese: question.chinese,
      note: question.studyNote,
    };
  });
  els.sortList.append(heading, createHv1OrderList(ordered, { translation: true }));
  const review = Hv1AudioQuiz.reviewBatch(session);
  if (review) state.mistakes.push(review);
  els.sortSubmitButton.textContent = state.currentIndex >= state.queue.length ? "完成本轮" : "下一 Teil";
  els.roundStrip.textContent = session.missed.length
    ? "答错的 Sprecher 会在错题轮回中再次播放。"
    : "这一 Teil 全部答对。继续下一 Teil。";
}

function renderHv1AudioQuestion(session) {
  const question = Hv1AudioQuiz.currentQuestion(session);
  if (!question) {
    session.phase = "result";
    renderHv1AudioQuizView();
    return;
  }

  els.sessionMode.textContent = "HV1 · 听音选陈述";
  els.questionBadge.textContent = "Sprecher " + question.number;
  els.sortInstruction.textContent = "听完这段音频，从八条陈述中选择与这位 Sprecher 对应的一条。点选后立即反馈；已选过的陈述会在后续题目中禁用。";
  els.sortInfo.textContent = "第 " + (session.questionIndex + 1) + " / " + session.activeQuestions.length + " 题";

  const card = document.createElement("section");
  card.className = "hv1-listen-question";
  const title = document.createElement("h3");
  title.textContent = "Sprecher " + question.number;
  card.append(title);

  if (question.sourceTranscript) {
    const transcript = document.createElement("details");
    transcript.className = "hv1-transcript";
    transcript.open = true;
    const summary = document.createElement("summary");
    summary.textContent = "PDF 中的听力原文";
    const text = document.createElement("p");
    text.lang = "de";
    text.textContent = question.sourceTranscript;
    transcript.append(summary, text);
    card.append(transcript);
  } else {
    const note = document.createElement("p");
    note.className = "hv1-no-transcript";
    note.textContent = "PDF 未附这位 Sprecher 的完整听力原文；音频朗读本题对应的 PDF 陈述。";
    card.append(note);
  }

  if (question.audio) {
    const player = document.createElement("audio");
    player.controls = true;
    player.preload = "metadata";
    player.src = question.audio;
    player.setAttribute("aria-label", "Sprecher " + question.number + " 合成音频和播放进度");
    card.append(player);
    if (session.autoPlay) {
      session.autoPlay = false;
      player.play().catch(() => {
        const hint = document.createElement("p");
        hint.className = "hv1-play-hint";
        hint.textContent = "浏览器未自动播放，请点播放按钮。";
        card.append(hint);
      });
    }
  } else {
    const note = document.createElement("p");
    note.className = "no-audio-notice";
    note.textContent = "这项暂时没有合成音频。";
    card.append(note);
  }

  const choiceTitle = document.createElement("h3");
  choiceTitle.className = "hv1-choice-heading";
  choiceTitle.textContent = "选择对应的 Leitsatz";
  const choices = document.createElement("div");
  choices.className = "hv1-quiz-choices";
  choices.setAttribute("aria-label", "八条待选陈述");
  const options = shuffledHv1AudioOptions(session.questions);
  const correctNumber = String(question.number);

  options.forEach(function (option, index) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "hv1-quiz-option";
    button.dataset.optionNumber = String(option.number);
    const alreadyUsed = Hv1AudioQuiz.isOptionUsed(session, option.number);
    button.disabled = session.answered || alreadyUsed;
    if (alreadyUsed && !session.answered) {
      button.classList.add("is-used");
      button.title = "这条陈述已经选过，不能再次选择";
    }
    const position = document.createElement("span");
    position.className = "hv1-option-position";
    position.textContent = String(index + 1);
    const text = document.createElement("span");
    text.className = "hv1-option-text";
    text.lang = "de";
    text.textContent = option.leitsatz || option.answerText || option.sourceGerman;
    button.append(position, text);
    if (session.answered) {
      if (String(option.number) === correctNumber) button.classList.add("is-correct");
      if (String(option.number) === String(session.selected)) button.classList.add("is-selected");
      if (String(option.number) === String(session.selected) && String(option.number) !== correctNumber) {
        button.classList.add("is-wrong");
      }
    } else if (!alreadyUsed) {
      button.addEventListener("click", () => chooseHv1AudioOption(option));
    }
    choices.append(button);
  });
  card.append(choiceTitle, choices);

  if (session.answered) {
    const feedback = document.createElement("div");
    const wasCorrect = String(session.selected) === correctNumber;
    feedback.className = "hv1-answer-feedback " + (wasCorrect ? "is-correct" : "is-wrong");
    feedback.setAttribute("role", "status");
    const line = document.createElement("strong");
    line.textContent = wasCorrect ? "✓ 回答正确" : "✗ 回答错误";
    const answer = document.createElement("p");
    answer.lang = "de";
    answer.textContent = "正确答案：" + (question.leitsatz || question.answerText || question.sourceGerman);
    feedback.append(line, answer);
    if (question.chinese) {
      const translation = document.createElement("p");
      translation.textContent = question.chinese;
      feedback.append(translation);
    }
    card.append(feedback);
  }

  els.sortList.append(card);
  if (session.answered) {
    els.sortSubmitButton.textContent = session.questionIndex + 1 >= session.activeQuestions.length
      ? "完成本 Teil"
      : "下一位 Sprecher";
    els.roundStrip.textContent = "已显示正误和正确答案；本次选择的陈述会在后续题目中禁用。继续后播放下一位 Sprecher。";
  } else {
    els.sortSubmitButton.textContent = "先选择一条陈述";
    els.sortSubmitButton.disabled = true;
    els.roundStrip.textContent = "音频可拖动进度条反复收听；选项按题目随机排列。";
  }
}

function shuffledHv1AudioOptions(questions) {
  return Hv1AudioQuiz.shuffledOptions(questions);
}

function chooseHv1AudioOption(option) {
  const session = hv1AudioState.session;
  if (!session || session.phase !== "practice" || session.answered) return;
  const result = Hv1AudioQuiz.choose(session, option.number);
  if (!result) return;
  state.answeredInRound += 1;
  if (!result.correct) {
    state.roundMistakes += 1;
  }
  els.sortList.querySelector("audio")?.pause();
  renderHv1AudioQuizView();
  updateStats();
}

function submitHv1AudioStep() {
  const session = hv1AudioState.session;
  if (!session) return;
  if (session.phase === "memory") {
    Hv1AudioQuiz.begin(session);
    renderHv1AudioQuizView();
    window.scrollTo({ top: 0, behavior: "instant" });
    return;
  }
  if (session.phase === "practice" && session.answered) {
    Hv1AudioQuiz.advance(session);
    renderHv1AudioQuizView();
    updateStats();
    window.scrollTo({ top: 0, behavior: "instant" });
    return;
  }
  if (session.phase === "result") nextQuestion();
}

// Legacy order model stays available for existing corpus utilities.

var sortState = { session: null, drag: null };

function renderSortView(batch) {
  stopSortAudio();
  els.sortModeView.classList.remove("hv1-audio-mode", "hv2-memory-mode");
  els.sortModeView.classList.add("hv1-order-mode");
  sortState.session = Hv1Order.createSession(batch.questions);
  els.sortTeilBadge.textContent = "Teil " + batch.teil + " · " + batch.teilTitle;
  els.sortSubmitButton.onclick = null;
  renderSortList();
  window.scrollTo({ top: 0, behavior: "instant" });
}

function createHv1OrderList(items, options = {}) {
  const list = document.createElement("ol");
  list.className = "hv1-statements";
  list.setAttribute("aria-label", options.editable ? "拖动排序的选项" : options.label || "正确顺序");
  items.forEach(function (item, index) {
    const row = document.createElement("li");
    row.className = "hv1-statement";
    row.dataset.itemId = item.id;
    const rank = document.createElement("span");
    rank.className = "hv1-position";
    rank.textContent = String(index + 1);
    row.append(rank);
    const body = document.createElement("div");
    body.className = "hv1-statement-body";
    const text = document.createElement("p");
    text.lang = "de";
    text.textContent = item.text;
    body.append(text);
    if (options.translation && item.chinese) {
      const translation = document.createElement("p");
      translation.className = "hv1-order-translation";
      translation.textContent = item.chinese;
      body.append(translation);
    }
    if (item.note) {
      const note = document.createElement("p");
      note.className = "hv1-source-note";
      note.textContent = item.note;
      body.append(note);
    }
    if (options.feedback) {
      row.classList.add(item.correct ? "correct" : "incorrect");
      const feedback = document.createElement("p");
      feedback.className = "hv1-position-feedback";
      feedback.textContent = item.correct ? "✓ 位置正确" : "✗ 你排在第 " + item.position + " 位；应在第 " + item.expectedPosition + " 位";
      body.append(feedback);
    }
    row.append(body);
    if (options.editable) {
      const controls = document.createElement("div");
      controls.className = "hv1-move-controls";
      for (const [direction, label] of [[-1, "上移"], [1, "下移"]]) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = direction < 0 ? "↑" : "↓";
        button.dataset.move = String(direction);
        button.disabled = index + direction < 0 || index + direction >= items.length;
        button.setAttribute("aria-label", "第 " + (index + 1) + " 项" + label);
        button.addEventListener("click", () => moveHv1Item(item.id, direction));
        controls.append(button);
      }
      const handle = document.createElement("button");
      handle.type = "button";
      handle.className = "hv1-drag-handle";
      handle.textContent = "⠿";
      handle.setAttribute("aria-label", "拖动第 " + (index + 1) + " 项排序");
      handle.title = "拖动排序，也可用上下方向键";
      handle.addEventListener("pointerdown", beginHv1Drag);
      handle.addEventListener("keydown", function (event) {
        if (!["ArrowUp", "ArrowDown"].includes(event.key)) return;
        event.preventDefault();
        event.stopPropagation();
        moveHv1Item(item.id, event.key === "ArrowUp" ? -1 : 1);
      });
      controls.append(handle);
      row.append(controls);
    }
    list.append(row);
  });
  return list;
}

function renderSortList() {
  const session = sortState.session;
  if (!session) return;
  els.sortList.innerHTML = "";
  els.sortList.classList.add("hv1-order-list");
  els.sortInfo.setAttribute("role", "status");
  els.sortSubmitButton.onclick = null;
  els.sortSubmitButton.disabled = false;
  els.sortShuffleButton.classList.toggle("hidden", session.phase !== "practice");
  els.sortShuffleButton.textContent = "重新打乱";
  if (session.phase === "memory") {
    els.sessionMode.textContent = "HV1 · 先记忆";
    els.sortInstruction.textContent = "先按从上到下的正确顺序记一遍。准备好后，再开始排序。";
    els.sortInfo.textContent = "正确顺序 · 共 " + session.correct.length + " 项";
    els.sortList.append(createHv1OrderList(session.correct));
    els.sortSubmitButton.textContent = "准备好了，开始排序";
    els.roundStrip.textContent = "记忆阶段不会计分；点击准备好了后才会打乱选项。";
  } else if (session.phase === "practice") {
    els.sessionMode.textContent = "HV1 · 拖动排序";
    els.sortInstruction.textContent = "将全部 8 项从上到下排回正确顺序。拖动右侧手柄，上下移动；也可以点箭头微调。";
    els.sortInfo.textContent = "8 项已打乱 · 排好后一次提交";
    els.sortList.append(createHv1OrderList(session.order, { editable: true }));
    els.sortSubmitButton.textContent = "提交排序";
    els.roundStrip.textContent = "拖住 ⠿ 调整顺序，靠近屏幕边缘会自动滚动。选项文字区域可以正常滑动阅读。";
  } else {
    els.sessionMode.textContent = "HV1 · 排序结果";
    els.sortInstruction.textContent = "先看你排的顺序和逐项反馈，再对照下面的完整正确顺序。";
    els.sortInfo.textContent = session.result.correct + " / " + session.result.total + " 项位置正确";
    const heading = document.createElement("h3");
    heading.textContent = "你的排序";
    els.sortList.append(heading, createHv1OrderList(session.result.rows, { feedback: true, label: "你的排序和逐项结果" }));
    const correctHeading = document.createElement("h3");
    correctHeading.textContent = "完整正确顺序";
    els.sortList.append(correctHeading, createHv1OrderList(session.correct));
    els.sortSubmitButton.textContent = state.currentIndex >= state.queue.length ? "完成本轮" : "下一 Teil";
    els.roundStrip.textContent = els.roundMode.value === "mistakes" ? "排错的 Teil 会进入下一轮，重新记忆并排序。" : "当前是单轮练习。";
  }
}

function moveHv1Item(id, direction) {
  const session = sortState.session;
  const from = session.order.findIndex(item => item.id === id);
  if (!Hv1Order.move(session, from, from + direction)) return;
  renderSortList();
  const handle = els.sortList.querySelector('[data-item-id="' + cssEscape(id) + '"] .hv1-drag-handle');
  handle?.focus({ preventScroll: true });
  els.sortInfo.textContent = "已移到第 " + (from + direction + 1) + " 位";
}

function beginHv1Drag(event) {
  if (sortState.session?.phase !== "practice" || !event.isPrimary || event.button !== 0) return;
  event.preventDefault();
  const handle = event.currentTarget;
  const row = handle.closest(".hv1-statement");
  sortState.drag = { id: row.dataset.itemId, row, handle, pointerId: event.pointerId, y: event.clientY, frame: null };
  row.classList.add("is-dragging");
  handle.setPointerCapture(event.pointerId);
  document.body.classList.add("hv1-is-dragging");
  window.addEventListener("pointermove", moveHv1Drag, { passive: false });
  window.addEventListener("pointerup", finishHv1Drag);
  window.addEventListener("pointercancel", finishHv1Drag);
  window.addEventListener("blur", finishHv1Drag);
  sortState.drag.frame = requestAnimationFrame(scrollHv1Drag);
}

function positionHv1Drag() {
  const drag = sortState.drag;
  if (!drag) return;
  const list = drag.row.parentElement;
  const others = [...list.children].filter(row => row !== drag.row);
  let to = others.findIndex(row => drag.y < row.getBoundingClientRect().top + row.getBoundingClientRect().height / 2);
  if (to < 0) to = others.length;
  const from = sortState.session.order.findIndex(item => item.id === drag.id);
  if (!Hv1Order.move(sortState.session, from, to)) return;
  list.insertBefore(drag.row, others[to] || null);
  // Moving a captured element in the DOM can release capture on mobile browsers.
  try { drag.handle.setPointerCapture(drag.pointerId); } catch (_) { /* Pointer may already be up. */ }
  [...list.children].forEach(function (row, index) {
    row.querySelector(".hv1-position").textContent = String(index + 1);
    row.querySelector(".hv1-drag-handle").setAttribute("aria-label", "拖动第 " + (index + 1) + " 项排序");
    row.querySelectorAll("[data-move]").forEach(function (button) {
      const direction = Number(button.dataset.move);
      button.disabled = index + direction < 0 || index + direction >= list.children.length;
      button.setAttribute("aria-label", "第 " + (index + 1) + " 项" + (direction < 0 ? "上移" : "下移"));
    });
  });
}

function moveHv1Drag(event) {
  if (!sortState.drag || event.pointerId !== sortState.drag.pointerId) return;
  event.preventDefault();
  sortState.drag.y = event.clientY;
  positionHv1Drag();
}

function scrollHv1Drag() {
  const drag = sortState.drag;
  if (!drag) return;
  const topEdge = mobileLayout.matches ? 110 : 60;
  const bottomEdge = window.innerHeight - 100;
  const delta = drag.y < topEdge ? -Math.min(16, (topEdge - drag.y) / 4) :
    drag.y > bottomEdge ? Math.min(16, (drag.y - bottomEdge) / 4) : 0;
  if (delta) {
    window.scrollBy(0, delta);
    positionHv1Drag();
  }
  drag.frame = requestAnimationFrame(scrollHv1Drag);
}

function finishHv1Drag(event) {
  const drag = sortState?.drag;
  if (!drag || (event?.pointerId !== undefined && event.pointerId !== drag.pointerId)) return;
  cancelAnimationFrame(drag.frame);
  drag.row.classList.remove("is-dragging");
  document.body.classList.remove("hv1-is-dragging");
  window.removeEventListener("pointermove", moveHv1Drag);
  window.removeEventListener("pointerup", finishHv1Drag);
  window.removeEventListener("pointercancel", finishHv1Drag);
  window.removeEventListener("blur", finishHv1Drag);
  try { drag.handle.releasePointerCapture(drag.pointerId); } catch (_) { /* Capture may have ended. */ }
  sortState.drag = null;
  els.sortInfo.textContent = "已移到第 " + (sortState.session.order.findIndex(item => item.id === drag.id) + 1) + " 位";
}

function submitSort() {
  if (["hv2-memory", "baustein-memory"].includes(state.current?.sectionMode)) return nextQuestion();
  if (state.current?.sectionMode === "lv2-global-sort") return submitLv2GlobalSort();
  if (state.current?.sectionMode === "hv1-audio-quiz") return submitHv1AudioStep();
  const session = sortState?.session;
  if (state.current?.sectionMode !== "hv1-sort" || !session) return;
  finishHv1Drag();
  if (session.phase === "memory") {
    Hv1Order.begin(session);
  } else if (session.phase === "practice") {
    const result = Hv1Order.submit(session);
    if (!session.scored) {
      session.scored = true;
      state.answeredInRound++;
      state.roundMistakes += result.total - result.correct;
      if (result.correct < result.total) state.mistakes.push(state.current);
      updateStats();
    }
  } else {
    nextQuestion();
    return;
  }
  renderSortList();
  window.scrollTo({ top: 0, behavior: "instant" });
}

function stopSortAudio() {
  finishHv1Drag();
  els.audioPanel.querySelector("audio")?.pause();
  els.sortList.querySelector("audio")?.pause();
}

function shuffleSort() {
  if (state.current?.sectionMode === "lv2-global-sort") return shuffleLv2GlobalSort();
  const session = sortState?.session;
  if (!session || session.phase !== "practice") return;
  finishHv1Drag();
  session.order = Hv1Order.shuffled(session.correct);
  renderSortList();
  els.sortInfo.textContent = "已重新打乱全部 8 项";
}

function cssEscape(value) {
  if (typeof CSS !== "undefined" && CSS.escape) return CSS.escape(value);
  return String(value).replace(/["\\]/g, "\\$&");
}

function formatLv2Items(question) {
  if (!question.items?.length) return "资料未明确给出对应题项";
  return question.items
    .map((item) => `${item.number ? `${item.number}. ` : ""}${item.text}${item.unverified ? "（原文标注存疑，未参与配对评分）" : ""}`)
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
    .replace(/\[(\d+)\]____/g, '<button type="button" class="baustein-blank" data-number="$1" aria-label="空格 $1">$1 ___</button>')
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br>");
  return `<p>${html}</p>`;
}

function isFlashcard(question) {
  return (
    question.sectionMode === "paragraph-card" ||
    question.sectionMode === "lv2-v2-card" ||
    question.sectionMode === "writing-card" ||
    question.sectionMode === "speaking-card" ||
    question.sectionMode === "corpus-card" ||
    question.sectionMode === "baustein-grammar-card"
  );
}

function setBackReviewLayout(question) {
  const answerBlock = els.correctAnswer.closest("div");
  if (!answerBlock) return;

  if (question.sectionMode === "writing-card" || question.sectionMode === "speaking-card") {
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
