(function (root) {
  function tidyGerman(value) {
    return String(value || "").replace(/\s+/g, " ").replace(/\s+([,.;:!?])/g, "$1")
      .replace(/([,;:])(?=\p{L})/gu, "$1 ").trim();
  }

  function sentenceBounds(text, target) {
    const boundaries = [0];
    for (let index = 0; index < text.length; index += 1) {
      if (!/[.!?…]/u.test(text[index])) continue;
      if (text[index] === ".") {
        const before = text.slice(0, index + 1);
        const after = text.slice(index + 1);
        if (/(?<!\p{L})(?:Dr|Prof|bzw|ca|Nr|sog|usw|Chr|\p{L})\.$/u.test(before)) continue;
        if (/\d\.$/.test(before) && /^\s*(?:\d|Jahrhundert|Jahrtausend|Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)/u.test(after)) continue;
        if (/^[.\s]*\(0\)/.test(after)) continue;
      }
      boundaries.push(index + 1);
    }
    boundaries.push(text.length);
    return [boundaries.filter(index => index <= target).at(-1), boundaries.find(index => index > target)];
  }

  // Repair sentence-boundary punctuation in the extracted display text only.
  // Answer words and the PDF corpus remain untouched.
  function sentenceTemplate(section, question) {
    let text = section.article || question.german || question.text || "";
    const repairs = {
      1: [
        [/analysieren\.\s*,/g, "analysieren,"],
        [/artikulieren\.\s*(?=\[13\]____)/g, "artikulieren, "],
        [/schreiben würde\s+Aber/g, "schreiben würde. Aber"],
      ],
      2: [
        [/(\[4\]____)\s+(?=Wir wollen)/g, "$1. "],
        [/(\[9\]____)\s+(?=Rauchen verändert)/g, "$1. "],
      ],
      5: [[/Uhrenwerbung\s+Während/g, "Uhrenwerbung. Während"]],
      6: [
        [/(\[12\]____)\s+(?=Dennoch)/g, "$1. "],
        [/(\[19\]____)\s+(?=Wenn)/g, "$1. "],
      ],
      7: [
        [/(\[5\]____)\s+(?=In Deutschland)/g, "$1. "],
        [/Standard\s+(?=\[14\]____)/g, "Standard. "],
        [/wurden\.\s*kam Ende/g, "wurden, kam Ende"],
        [/(\[22\]____)\s+(?=Neben dem)/g, "$1. "],
      ],
      8: [
        [/meine\.\s*Studiengang/g, "meine Studiengang"],
        [/studiert\s+Sie hat/g, "studiert. Sie hat"],
        [/Zukunftsplanung\.“ erklärt Julia Protze\.\s*(\[14\]____) an der Philologischen Fakultät Franziska/g,
          "Zukunftsplanung“, erklärt Julia Protze, $1 an der Philologischen Fakultät. Franziska"],
        [/bekommen\.\s*„berichtet/g, "bekommen“, berichtet"],
      ],
      9: [
        [/hanebüchen»Kokolores/g, "hanebüchen. »Kokolores"],
        [/verbinde,,Schlingel/g, "verbinde. „Schlingel"],
        [/Gründe\.\s*Warum/g, "Gründe, warum"],
      ],
      10: [
        [/(\[4\]____),\s*Die Sache/g, "$1. Die Sache"],
        [/Haken\s+Brauchte/g, "Haken: Brauchte"],
        [/(\[5\]____)\s+(?=Um dieses)/g, "$1. "],
        [/(\[7\]____)\s+(?=Natural-)/g, "$1: "],
        [/(\[11\]____)\s+(?=Im Lauf)/g, "$1. "],
        [/(\[12\]____)\s+(?=Als)/g, "$1. "],
        [/(\[20\]____)\s+(?=Möglicherweise)/g, "$1. "],
      ],
      11: [[/Zdqimmer\s+Jeder/g, "Jeder"], [/(\[1\]____)\s+(?=Er fängt)/g, "$1: "]],
      16: [[/(\[12\]____)\s+(?=Die)/g, "$1. "]],
      17: [
        [/(\[19\]____)\s+(?=Die jüngere)/g, "$1. "],
        [/(\[24\]____)\s+(?=Sie wird)/g, "$1. "],
      ],
    };
    for (const [pattern, replacement] of repairs[section.teil] || []) text = text.replace(pattern, replacement);
    return text;
  }

  function buildSentence(section, question) {
    const token = `[${question.number}]____`;
    const template = sentenceTemplate(section, question);
    if (!template.includes(token)) return null;
    const sentinel = "\uFFF0";
    const answers = new Map((section.questions || []).map(item => [String(item.number), item.answerText || ""]));
    const prepared = template.replace(/\[(\d+)\]____/g, (marker, number) =>
      marker === token ? sentinel : ` ${answers.get(number) || marker} `
    );
    const target = prepared.indexOf(sentinel);
    const [start, end] = sentenceBounds(prepared, target);
    const before = tidyGerman(prepared.slice(start, target));
    const after = tidyGerman(prepared.slice(target + sentinel.length, end));
    const answer = String(question.answerText || "").trim();
    return { before, answer, after, sentence: tidyGerman([before, answer, after].filter(Boolean).join(" ")) };
  }

  // The source sometimes numbers additional German words as separate local
  // cards. These anchors align them with the Chinese paragraph's own numbers.
  const translationNumbers = {
    2: [1, 2, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22],
    5: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21],
    6: [1, 2, 3, 4, 5, 6, 6, 7, 8, 9, 10, 11, 12, 13, 14, 14, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25],
    7: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 12, 14, 15, 16, 17, 17, 18, 19, 20, 21],
    8: [1, 2, 2, 3, 4, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 16, 17, 17, 17, 18, 18, 18, 19, 20],
    10: [1, 2, 3, 3, 4, 5, 6, 7, [8, 9], [8, 9], 10, 11, 12, 13, 14, 15, 16, 17, 18, 18],
    11: [1, 2, 3, 4, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21],
    16: [25, 26, 27, 28, 29, 29, 30, 31, 32, 32, 33, 34, 35, 36, 37, 37, 38, 39, 40, 41, 42, 43],
    17: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 22, 23, 24, 25, 26],
  };

  function chineseSentences(value) {
    return (String(value || "").match(/[^。！？]+[。！？][”」』"]?|[^。！？]+$/gu) || []).map(text => text.trim());
  }

  function cleanChinese(value) {
    return String(value || "")
      .replace(/[（(]\s*\d+\s*[）)]/g, "")
      .replace(/(?<=[\u3400-\u9fff])\s+(?=[\u3400-\u9fff])/gu, "")
      .replace(/\s+([，。！？；：、])/g, "$1")
      .trim();
  }

  function sentenceChinese(section, question) {
    const mapping = translationNumbers[String(section.teil)];
    const anchor = mapping ? mapping[Number(question.number) - 1] : Number(question.number);
    if (String(section.teil) === "14" && Number(question.number) === 46) {
      return cleanChinese(chineseSentences(question.chinese).find(text => text.includes("现在，人们应该彻底消除")));
    }
    const translatedNumber = String(section.teil) === "13" && Number(question.number) === 33 ? 32 : anchor;
    const markers = (Array.isArray(translatedNumber) ? translatedNumber : [translatedNumber])
      .map(number => new RegExp(`[（(]\\s*${number}\\s*[）)]`));
    const matches = chineseSentences(question.chinese).filter(text => markers.some(marker => marker.test(text)));
    return matches.length ? cleanChinese(matches.join("")) : "";
  }

  // Semantic anchors in the existing translations, keyed by the local card
  // number (not the Chinese paragraph numbering). Function words sometimes
  // correspond to a phrase rather than a standalone Chinese word.
  const chineseAnswerPhrases = {
    1: "采取了|列入教学安排|波动|得不到帮助|应付|之前练习过的|传统听写|利用这些方式分析|完全|认为|听写过程中|恰恰无法|以为|映像|弄清楚|把单词正确地填进去|符合|接受校对|最后|几十年前|而在|如何|认真对待",
    2: "戒掉|结果|三位美国|发表|简要总结|绝不仅仅|影响当事人的行为|早就已经停止了|理解|完全|这样的想法|引导|作出了不同的决定|没有抽最后一支烟|让|得知|成绩|采取了|与所选择的策略不同的|理会|归因于|持续|由此|忽视|更加困难",
    3: "通常|产生|物质|严格|带来风险|根据|危害健康|产生|使我们的生活变得困难|传递下去|策略|让一只饥饿的兔子留下多么深刻的印象|那么|绕道而行|完全没有问题|储存|含有|剂量|与此相反|发出警报|相当|应该",
    4: "甚至|考虑|适应|这些人|运行|被设定在午夜状态|因为|发挥出|开创性|约为70%|表明|要求|得到完全一致的赞同|表示|反正|早在|开放式到校时间|看作|以便|考虑到|效果|一种可能的解释",
    5: "叫卖|早期雏形|传播|张贴|提供|这些媒介对于广告的传播是必不可少的|传播|付费|推动|以柏林印刷商Ernst Litfaß命名|征服|本来|占80%|创造出来|精美的|说服|第一支|进入|强烈的反对|可能|到处|还远远没有结束",
    6: "资源|有限|无限|足够|耗尽|由此|产生|理论上|无处不在|表现形式|动物界|考虑在内|决定|因素|已经达到了|达到了|互相|存在|解释道|领地|区分|造成伤害|获得利益|破坏性|影响|文化成就",
    7: "带来了|温暖|早在|同时|能够更好地区分|影响|彼此|在这些名单中|排列|几乎没有在柏林市界以外|席卷|成为|这些名称|由于|联系在一起|展开|得到了解决|人们与德国气象局协商后|创立|在一个规定的时间|更受欢迎|提供给",
    8: "被问到|那些|抛在身后|深入了解|给了我很大的勇气|获得|在“一日同行”项目的框架下|系统|联系到一起|多样|可以考虑|有趣|第一步|导师|对自己在Geben市政府公共关系部门度过的这一天|打算|有机会|作为访客|访客|满怀|热情|讲述了自己与校友 Dr. Annette Bärwi共度的一天|参与该项目|学生|认为|专业|多次",
    9: "摇头|表达|日常语言使用|简单|来源于|某些|歧视性|几乎|绝不仅仅|淘汰掉|消失|强调|青少年语言|整理|探究|模仿|同义词|传达出|与她的个人回忆联系在一起|是|继续|变化",
    10: "再简单不过|进行|采用|不使用货币|节奏|简化|接受|用作|蜗牛壳|早在6000多年前|极大地|开启|替代品|随着时间的推移|显而易见|就此|创新|越来越多|谈到|已经屈指可数",
    11: "别的选择|看起来并不像是在玩|适应|五次|让自己的勺子从儿童高脚椅上掉下来|撞击地面|消磨时间|一个人在余生中|尝试|因为孩子会处理各种事情并积累经验|巩固|需要|促进|完全可以|从别人那里学到|因为|进入另一个人的角色|在情感上|培养|儿童玩耍的权利|怀疑|尊重",
    12: "消遣|塑造|各自|进入其他角色|游戏的这些机制和原则|传播|获得|提出|广为人知|应用到|与生俱来|尤其|谁会不想参与这一趋势呢|进入|简单|通过在学习平台上完成题目|调查研究|批评|有纪律|仔细|桥梁作用|尤其",
    13: "恰好|用餐|美食家|最后的呐喊|并不能声称|常见|固定|如果|一道一道|谁|以固定价格|我们今天所熟知的|表明|流传下来|最终|归功于|不得不|正在崛起|发生了变化|重视|作为|形成",
    14: "称为有智慧的|然而|拥有|惊人|显然|甚至|土壤|研究|我们人类|还远远不是全部|胜过|分析|并不需要|优势|与动物不同|发生变化|巧妙|抵御|尖锐|各种各样|提防|彻底消除",
    16: "从中|突破|性质|背后的|直到|被证明|证实|注定|成为了|一些|这次大会|困扰着|最初的启发|测定|无论是蘑菇还是某种规律|为了建立元素分类体系|发表|组成|横向|看到了|其他位置|存在",
    17: "在几秒钟之内|以电子形式提供|低成本|对数据库的访问|同样|全天候|他们|在如此优秀的在线学习条件下|举行|次要|培养|如果|无论在何时何地|在教学法方面|配备|在未来几年里|进入|尤其|符合|自己的知识|被可视化并建立链接|阶梯教室|惋惜|无法再纠正|本质|首先|尤其",
    20: "更|听音乐的习惯|几乎|也许|开始|扎根|表明|大多数|同年龄群体|对此|重新选择|各种各样的感官信息|听觉|节奏|已经被分类过|数量|如此|在一生中|并不|矛盾|相当|改变",
    // Teil 21 / 38 has a truncated German source and a different Chinese
    // sentence. Keep its existing source note instead of inventing alignment.
    21: "通常|产生|物质|严格|带来风险|根据|危害健康|产生|使我们的生活变得困难|传递下去|策略|让一只饥饿的兔子留下多么深刻的印象|那么||完全没有问题|储存|含有|剂量|与此相反|发出警报|相当|应该",
    22: "住房市场|应对人口外流和房屋空置的问题|迫切需要采取行动|如果|对可持续且价格可负担住房的需求|传统独栋住宅|昂贵城市住宅|像|而且还|这是一种|而微型住宅则|然而|注意隐私丧失|社会孤立|导致|在实施方面|所有收入阶层的人|面临|用于住房建设|用于节能建筑|为返乡者|取决于",
  };

  function chineseAnswerRanges(section, question, chinese) {
    const phrases = chineseAnswerPhrases[section.teil];
    if (!phrases) return [];
    const firstNumber = [12, 13, 14, 20, 21, 22].includes(Number(section.teil)) ? 25 : 1;
    const phrase = phrases.split("|")[Number(question.number) - firstNumber];
    const start = phrase ? chinese.indexOf(phrase) : -1;
    return start < 0 ? [] : [{ start, end: start + phrase.length }];
  }

  function highlightParts(text, ranges = []) {
    const parts = [];
    let offset = 0;
    for (const { start, end } of ranges) {
      if (start < offset || end <= start || end > text.length) continue;
      if (start > offset) parts.push({ text: text.slice(offset, start), highlight: false });
      parts.push({ text: text.slice(start, end), highlight: true });
      offset = end;
    }
    if (offset < text.length) parts.push({ text: text.slice(offset), highlight: false });
    return parts;
  }

  function buildReviewRows(section) {
    return (section.questions || []).map(question => {
      const sentence = buildSentence(section, question);
      const chinese = sentence ? sentenceChinese(section, question) : "";
      return {
        number: String(question.number),
        ...(sentence || { before: "", answer: question.answerText || question.answer || "", after: "", sentence: "" }),
        chinese,
        chineseAnswerRanges: sentence ? chineseAnswerRanges(section, question, chinese) : [],
        sourceMissing: !sentence,
        sourceNote: String(section.teil) === "21" && Number(question.number) === 38
          ? "当前语料此处原句有缺文，保留现有片段与原文译句。" : "",
      };
    }).sort((a, b) => a.number.localeCompare(b.number, "en", { numeric: true }));
  }

  function buildRoundQueue(sections, practiceQuestions) {
    return sections.flatMap(section => {
      const practice = Array.isArray(practiceQuestions)
        ? practiceQuestions.filter(question => String(question.teil) === String(section.teil))
        : section.mode === "corpus-card"
          ? section.questions || []
          : (section.questions || []).length ? [{ ...section, sectionMode: "baustein-article" }] : [];
      if (!practice.length) return [];
      const reviewRows = buildReviewRows(section);
      const rowsByNumber = new Map(reviewRows.map(row => [row.number, row]));
      return [{
        id: `baustein-memory-${section.teil}`,
        level: "baustein",
        teil: section.teil,
        teilTitle: section.title,
        sectionMode: "baustein-memory",
        reviewRows,
        addedIn: section.addedIn,
        updatedIn: section.updatedIn,
      }, ...practice.map(question => {
        const row = rowsByNumber.get(String(question.number));
        if (!row || question.sectionMode === "baustein-article") return { ...question };
        const german = row.sourceMissing ? question.german || question.text || "原文未提供填空句子。"
          : tidyGerman([row.before, `[${row.number}]____`, row.after].filter(Boolean).join(" "));
        return {
          ...question,
          level: "baustein",
          teil: section.teil,
          teilTitle: section.title,
          sectionMode: "corpus-card",
          german,
          text: german,
          answerText: row.answer,
          reviewGerman: row.sentence || "原文未提供填空句子。",
          chinese: row.sourceMissing ? "原文只有答案字母，未提供填空句子和中文翻译。" : row.chinese,
          sourceNote: row.sourceNote,
          bausteinStudy: row,
        };
      })];
    });
  }

  const api = { buildReviewRows, buildRoundQueue, buildSentence, sentenceChinese, highlightParts };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.BausteinStudy = api;
})(typeof window !== "undefined" ? window : globalThis);
