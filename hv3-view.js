(function (root) {
  function node(tag, className = "", text = "") {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = text;
    return element;
  }
  function button(text, action, active = false) {
    const element = node("button", "ghost-button" + (active ? " is-selected" : ""), text);
    element.type = "button";
    element.addEventListener("click", action);
    return element;
  }
  function heading(german, chinese, translated = true) {
    const element = node("h3", "hv3-heading");
    const original = node("span", "", german);
    original.lang = "de";
    element.append(original);
    if (translated && chinese) {
      const translation = node("span", "hv3-heading-chinese", chinese);
      translation.lang = "zh-CN";
      element.append(translation);
    }
    return element;
  }
  function prompt(q, filled = false) {
    const element = node("div", "hv3-prompt");
    if (q.before) element.append(node("span", "", q.before + " "));
    element.append(node(filled ? "mark" : "strong", filled ? "hv3-answer" : "hv3-blank", filled ? q.answerText || "未提供" : `[${q.number}] ______`));
    if (q.after) element.append(node("span", "", " " + q.after));
    element.lang = "de";
    return element;
  }
  function note(q) {
    const element = node("div", "hv3-notes");
    if (!q.practiceEligible) element.append(node("p", "hv3-warning", "仅原文参考 · 不进入练习、不计分"));
    if (q.sourceNote) element.append(node("p", "", q.sourceNote));
    element.append(node("small", "", `PDF 第 ${q.sourcePages.join("、")} 页`));
    return element;
  }
  function reviewRow(q) {
    const tr = node("tr", q.practiceEligible ? "" : "is-reference");
    const label = node("th", "", String(q.number));
    label.scope = "row";
    const context = node("td");
    context.append(prompt(q));
    const answer = node("td");
    answer.append(node("mark", "hv3-answer", q.answerText || "原文未提供明确填法"));
    const chinese = node("td", "hv3-chinese", q.chinese);
    chinese.lang = "zh-CN";
    if (q.sourceNote || !q.practiceEligible) chinese.append(note(q));
    tr.append(label, context, answer, chinese);
    return tr;
  }
  function outline(session, host) {
    host.append(node("p", "hv3-explanation", "按原题顺序查看提纲、填法与中文。中文为依据原文整理的练习译文；存疑项保留参考，不计分。"));
    let currentHeading = null, table;
    for (const q of session.rows) {
      if (q.heading !== currentHeading) {
        currentHeading = q.heading;
        host.append(heading(q.heading, q.headingChinese));
        table = node("table", "hv3-preview-table");
        const head = node("thead"), line = node("tr");
        for (const title of ["题号", "德语题面", "参考填法", "中文"]) {
          const th = node("th", "", title); th.scope = "col"; line.append(th);
        }
        head.append(line); table.append(head, node("tbody")); host.append(table);
      }
      table.lastElementChild.append(reviewRow(q));
    }
    const details = node("details", "hv3-source");
    details.append(node("summary", "", "查看这一版本的 PDF 原文提取内容"), node("pre", "", session.batch.sourceOutline || ""));
    host.append(details);
  }
  function card(session, host, actions) {
    const q = Hv3Quiz.current(session), revealed = session.phase !== "practice";
    host.append(node("p", "hv3-counter", `第 ${session.index + 1} / ${session.questions.length} 项 · 原题 ${q.number}`));
    host.append(heading(q.heading, q.headingChinese, revealed), prompt(q, revealed));
    if (!revealed) host.append(node("p", "hv3-explanation", "先回忆这个位置应填的关键词或短语，再查看答案。"));
    else {
      host.append(node("p", "hv3-chinese", q.chinese), note(q));
      const controls = node("div", "hv3-rating");
      const remember = button("1 · 记得", () => actions.rate(true)), miss = button("2 · 不记得", () => actions.rate(false));
      remember.disabled = miss.disabled = session.phase === "feedback";
      controls.append(remember, miss); host.append(controls);
      if (session.phase === "feedback") host.append(node("p", "hv3-feedback", session.judgements[q.id] ? "✓ 已记住" : "已加入下一轮复习"));
    }
  }
  function writing(session, host, actions) {
    const checking = session.phase === "checking";
    host.append(node("p", "hv3-explanation", checking
      ? "原文填法一致的项目已自动确认，空白项记为需复习。其他表达不会直接判错：请对照答案，逐项确认意思是否相同。"
      : "按讲座提纲填写关键词或短语。全部写好后整篇提交；提交前可修改，答案与中文暂时隐藏。"));
    let currentHeading = null;
    for (const q of session.questions) {
      if (currentHeading !== q.heading) { currentHeading = q.heading; host.append(heading(q.heading, q.headingChinese, checking)); }
      const row = node("section", "hv3-writing-row");
      row.append(node("strong", "hv3-counter", `题 ${q.number}`), prompt(q));
      if (!checking) {
        const label = node("label", "hv3-input-label", `填写第 ${q.number} 项`);
        const input = node("textarea", "hv3-input");
        input.rows = 2; input.value = session.drafts[q.id] || ""; input.lang = "de";
        input.autocomplete = "off"; input.spellcheck = false;
        input.addEventListener("input", () => actions.draft(q.id, input.value));
        label.append(input); row.append(label);
      } else {
        row.append(node("p", "hv3-your-answer", "你的填写：" + (session.drafts[q.id] || "（未填写）")), prompt(q, true), node("p", "hv3-chinese", q.chinese));
        const decision = session.judgements[q.id];
        row.append(node("p", "hv3-feedback", decision === null ? "待你确认" : decision ? "✓ 已确认正确" : "需复习"));
        const controls = node("div", "hv3-rating");
        const same = button("意思相同，算正确", () => actions.decide(q.id, true), decision === true);
        same.disabled = !String(session.drafts[q.id] || "").trim();
        controls.append(same, button("还需复习", () => actions.decide(q.id, false), decision === false));
        row.append(controls, note(q));
      }
      host.append(row);
    }
  }
  function results(session, host) {
    host.append(node("p", "hv3-score", `本篇 ${session.result.correct} / ${session.result.total} 项已掌握`));
    for (const { question: q, correct, selected } of session.result.rows) {
      const row = node("section", "hv3-writing-row " + (correct ? "is-correct" : "is-wrong"));
      row.append(heading(`题 ${q.number} · ${q.heading}`, q.headingChinese), node("p", "hv3-feedback", (correct ? "✓ " : "✗ ") + selected), prompt(q, true), node("p", "hv3-chinese", q.chinese), note(q));
      host.append(row);
    }
  }
  function render(session, host, actions) {
    host.replaceChildren();
    if (session.phase === "memory") outline(session, host);
    else if (session.phase === "result") results(session, host);
    else if (session.mode === "writing") writing(session, host, actions);
    else card(session, host, actions);
  }
  root.Hv3View = { render };
})(typeof window !== "undefined" ? window : globalThis);
