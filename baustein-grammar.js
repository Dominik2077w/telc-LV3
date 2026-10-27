(function (root, factory) {
  const api = factory(typeof module === "object" && module.exports ? require("./baustein-explanations.js") : root.BausteinExplanations);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.BausteinGrammar = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (authored) {
  // Teaching material is separate from the unchanged PDF answer corpus.
  const references = {
    verbs: { label: "Duden · 动词变位", url: "https://www.duden.de/konjugation" },
    adjectives: { label: "IDS grammis · 形容词变格", url: "https://grammis.ids-mannheim.de/progr%40mm/4067" },
    cases: { label: "IDS grammis · 宾语与支配", url: "https://grammis.ids-mannheim.de/sgt/2279" },
    modal: { label: "IDS grammis · 替代不定式", url: "https://grammis.ids-mannheim.de/systematische-grammatik/1615" },
    moods: { label: "IDS grammis · 陈述式与虚拟式", url: "https://grammis.ids-mannheim.de/systematische-grammatik/310" },
  };
  const persons = ["ich", "du", "er / sie / es", "wir", "ihr", "sie / Sie"];
  const split = text => text.split("|");
  const verbs = {};
  const auxiliary = {
    haben: { present: split("habe|hast|hat|haben|habt|haben"), past: split("hatte|hattest|hatte|hatten|hattet|hatten"),
      k1: split("habe|habest|habe|haben|habet|haben"), k2: split("hätte|hättest|hätte|hätten|hättet|hätten") },
    sein: { present: split("bin|bist|ist|sind|seid|sind"), past: split("war|warst|war|waren|wart|waren"),
      k1: split("sei|seiest|sei|seien|seiet|seien"), k2: split("wäre|wärest|wäre|wären|wäret|wären") },
    werden: { present: split("werde|wirst|wird|werden|werdet|werden"), past: split("wurde|wurdest|wurde|wurden|wurdet|wurden"),
      k1: split("werde|werdest|werde|werden|werdet|werden"), k2: split("würde|würdest|würde|würden|würdet|würden") },
  };
  function subjunctive(stem) {
    const base = stem.endsWith("e") ? stem.slice(0, -1) : stem;
    return ["e", "est", "e", "en", "et", "en"].map(ending => base + ending);
  }
  function regular(infinitive, noGe = false) {
    const stem = infinitive.endsWith("en") ? infinitive.slice(0, -2) : infinitive.slice(0, -1);
    const el = infinitive.endsWith("eln"), er = infinitive.endsWith("ern");
    const epenthesis = /[dt]$/.test(stem) || /[^aeiouäöürlh][mn]$/.test(stem);
    const singularE = el ? stem.slice(0, -2) + "le" : stem + "e";
    const present = [singularE, stem + (epenthesis ? "est" : /[sßxz]$/.test(stem) ? "t" : "st"),
      stem + (epenthesis ? "et" : "t"), infinitive, stem + (epenthesis ? "et" : "t"), infinitive];
    const pastStem = stem + (epenthesis ? "ete" : "te");
    const past = ["", "st", "", "n", "t", "n"].map(ending => pastStem + ending);
    const k1 = el || er ? [singularE, present[1], singularE, infinitive, present[4], infinitive] : subjunctive(stem);
    return { infinitive, present, past, k1, k2: [...past],
      participle: (noGe || /^(be|emp|ent|er|ge|miss|ver|zer)/.test(infinitive) || infinitive.endsWith("ieren") ? "" : "ge") + stem + (epenthesis ? "et" : "t"),
      auxiliary: "haben", imperative: [el ? singularE : stem + (epenthesis ? "e" : ""), present[4], infinitive + " Sie"],
      zu: "zu " + infinitive, participle1: infinitive + "d" };
  }
  function strong(infinitive, third, pastStem, participle, k2Stem, imperative, aux = "haben") {
    const verb = regular(infinitive);
    verb.present[1] = third.endsWith("t") ? third.slice(0, -1) + (/[sßxz]$/.test(third.slice(0, -1)) ? "t" : "st") : third + "st";
    if (/[dt]$/.test(infinitive.slice(0, -2)) && !third.endsWith("et")) verb.present[1] = third + "st";
    // t/d stems retain -est (finden/bieten/schneiden); a changed vowel does not add -e- (halten).
    if (third === verb.present[2]) verb.present[1] = regular(infinitive).present[1];
    verb.present[2] = third;
    verb.past = [pastStem, pastStem + (/[dt]$/.test(pastStem) ? "est" : /[sßxz]$/.test(pastStem) ? "est" : "st"), pastStem,
      pastStem + "en", pastStem + (/[dt]$/.test(pastStem) ? "et" : "t"), pastStem + "en"];
    verb.k2 = subjunctive(k2Stem);
    verb.participle = participle;
    verb.auxiliary = aux;
    verb.imperative = [imperative, verb.present[4], infinitive + " Sie"];
    return verb;
  }
  const strongRows = `
ziehen|zieht|zog|gezogen|zög|zieh
sehen|sieht|sah|gesehen|säh|sieh
fahren|fährt|fuhr|gefahren|führ|fahr
finden|findet|fand|gefunden|fänd|finde
sprechen|spricht|sprach|gesprochen|spräch|sprich
lassen|lässt|ließ|gelassen|ließ|lass
stehen|steht|stand|gestanden|stünd|steh
treffen|trifft|traf|getroffen|träf|triff
schneiden|schneidet|schnitt|geschnitten|schnitt|schneide
geben|gibt|gab|gegeben|gäb|gib
schlagen|schlägt|schlug|geschlagen|schlüg|schlag
nehmen|nimmt|nahm|genommen|nähm|nimm
halten|hält|hielt|gehalten|hielt|halt
rufen|ruft|rief|gerufen|rief|ruf
bieten|bietet|bot|geboten|böt|biete
preisen|preist|pries|gepriesen|pries|preise
kommen|kommt|kam|gekommen|käm|komm|sein
bringen|bringt|brachte|gebracht|brächt|bring
scheiden|scheidet|schied|geschieden|schied|scheide
liegen|liegt|lag|gelegen|läg|lieg
fließen|fließt|floss|geflossen|flöss|fließ|sein
weisen|weist|wies|gewiesen|wies|weise
beginnen|beginnt|begann|begonnen|begänn|beginne
hängen|hängt|hing|gehangen|hing|häng
`;
  for (const row of strongRows.trim().split("\n")) {
    const args = split(row); verbs[args[0]] = strong(...args);
  }
  verbs.bringen.past = split("brachte|brachtest|brachte|brachten|brachtet|brachten");
  // Weak/transitive hängen is distinct from strong/intransitive hängen.
  verbs.hängenWeak = regular("hängen");
  for (const infinitive of split("schwanken|argumentieren|setzen|publizieren|fassen|rauchen|leiten|verfolgen|schenken|ignorieren|erschweren|stellen|produzieren|machen|speichern|ticken|fordern|führen|lauten|verschaffen|erobern|bestimmen|erreichen|bescheren|beeinflussen|fegen|fragen|sammeln|schütteln|betonen|beleuchten|implizieren|tätigen|praktizieren|vereinfachen|akzeptieren|festigen|brauchen|fördern|entwickeln|respektieren|gestalten|schlüpfen|verbreiten|ergattern|prägen|bemängeln|speisen|deuten|überliefern|verdanken|etablieren|erforschen|analysieren|räumen|bestätigen|behandeln|veröffentlichen|bilden|existieren|bedauern|verankern|besagen|wandeln|überzeugen|ändern|üben|schönen|stammen|katalogisieren|beteiligen|disziplinieren|zerstören|gefährden")) {
    verbs[infinitive] = regular(infinitive, infinitive === "überliefern");
  }
  for (const name of ["haben", "sein", "werden"]) {
    verbs[name] = { ...regular(name), ...auxiliary[name], auxiliary: name === "haben" ? "haben" : "sein",
      participle: { haben: "gehabt", sein: "gewesen", werden: "geworden" }[name],
      imperative: { haben: ["hab", "habt", "haben Sie"], sein: ["sei", "seid", "seien Sie"], werden: ["werde", "werdet", "werden Sie"] }[name] };
  }
  verbs.sein.participle1 = "seiend";
  verbs.schaden = regular("schaden");
  verbs.schlüpfen.auxiliary = "sein";
  for (const [inf, present, past, participle, k2] of [
    ["müssen", "muss|musst|muss|müssen|müsst|müssen", "musste", "gemusst", "müsst"],
    ["können", "kann|kannst|kann|können|könnt|können", "konnte", "gekonnt", "könnt"],
    ["dürfen", "darf|darfst|darf|dürfen|dürft|dürfen", "durfte", "gedurft", "dürft"],
    ["sollen", "soll|sollst|soll|sollen|sollt|sollen", "sollte", "gesollt", "sollt"],
    ["mögen", "mag|magst|mag|mögen|mögt|mögen", "mochte", "gemocht", "möcht"],
  ]) {
    verbs[inf] = { ...regular(inf), present: split(present), past: ["", "st", "", "n", "t", "n"].map(e => past + e),
      participle, k2: subjunctive(k2), imperative: ["—（情态动词一般不用命令式）"], modal: true };
  }
  function prefixed(infinitive, prefix, baseName, separable, aux = "haben") {
    const base = verbs[baseName];
    const finite = forms => forms.map(form => separable ? `${form} ${prefix}` : prefix + form);
    const verb = { ...base, infinitive, present: finite(base.present), past: finite(base.past),
      k1: finite(base.k1), k2: finite(base.k2), auxiliary: aux,
      participle: prefix + (separable ? base.participle : base.participle.replace(/^ge/, "")),
      imperative: [separable ? base.imperative[0] + " " + prefix : prefix + base.imperative[0],
        separable ? base.present[4] + " " + prefix : prefix + base.present[4],
        separable ? base.infinitive + " Sie " + prefix : infinitive + " Sie"],
      zu: separable ? prefix + "zu" + base.infinitive : "zu " + infinitive,
      participle1: infinitive + "d", prefix: separable ? prefix : "", base: baseName };
    verbs[infinitive] = verb;
  }
  const prefixes = `
vorsehen|vor|sehen|1
erfahren|er|fahren|0
herausfinden|heraus|finden|1
einsetzen|ein|setzen|1
entsprechen|ent|sprechen|0
ablassen|ab|lassen|1
zusammenfassen|zusammen|fassen|1
aufhören|auf|hören|1
verstehen|ver|stehen|0
abschneiden|ab|schneiden|1
hervorbringen|hervor|bringen|1
darstellen|dar|stellen|1
darlegen|dar|legen|1
weitergeben|weiter|geben|1
enthalten|ent|halten|0
zurechtkommen|zurecht|kommen|1|sein
abrufen|ab|rufen|1
ergeben|er|geben|0
anführen|an|führen|1
anpreisen|an|preisen|1
aushängen|aus|hängenWeak|1
anbieten|an|bieten|1
entstehen|ent|stehen|0|sein
unterscheiden|unter|scheiden|0
hinwegfegen|hinweg|fegen|1
zusammenführen|zusammen|führen|1
überholen|über|holen|0
zusammenstellen|zusammen|stellen|1
unterliegen|unter|liegen|0
aufschlagen|auf|schlagen|1
ausgestalten|aus|gestalten|1
hindeuten|hin|deuten|1
voraushaben|voraus|haben|1
erweisen|er|weisen|0
darbieten|dar|bieten|1
entgegenkommen|entgegen|kommen|1|sein
zurückgreifen|zurück|greifen|1
abwandeln|ab|wandeln|1
abhängen|ab|hängen|1
festhalten|fest|halten|1
bestehen|be|stehen|0
aufführen|auf|führen|1
zurückführen|zurück|führen|1
herumsprechen|herum|sprechen|1
ausprobieren|aus|probieren|1
abschauen|ab|schauen|1
verändern|ver|ändern|0
abhalten|ab|halten|1
`;
  verbs.hören = regular("hören"); verbs.legen = regular("legen"); verbs.holen = regular("holen");
  verbs.probieren = regular("probieren"); verbs.schauen = regular("schauen");
  verbs.greifen = strong("greifen", "greift", "griff", "gegriffen", "griff", "greif");
  for (const row of prefixes.trim().split("\n")) {
    const [inf, prefix, base, sep, aux] = split(row); prefixed(inf, prefix, base, sep === "1", aux);
  }

  function verbTables(name) {
    const verb = verbs[name];
    if (!verb) throw new Error("Missing verb paradigm: " + name);
    const aux = auxiliary[verb.auxiliary], werden = auxiliary.werden;
    const indicative = persons.map((person, i) => [person, verb.present[i], verb.past[i],
      `${aux.present[i]} ${verb.participle}`, `${aux.past[i]} ${verb.participle}`,
      `${werden.present[i]} ${verb.infinitive}`, `${werden.present[i]} ${verb.participle} ${verb.auxiliary}`]);
    const k1 = persons.map((person, i) => [person, verb.k1[i], `${aux.k1[i]} ${verb.participle}`,
      `${werden.k1[i]} ${verb.infinitive}`, `${werden.k1[i]} ${verb.participle} ${verb.auxiliary}`]);
    const k2 = persons.map((person, i) => [person, verb.k2[i], `${aux.k2[i]} ${verb.participle}`,
      `${werden.k2[i]} ${verb.infinitive}`, `${werden.k2[i]} ${verb.participle} ${verb.auxiliary}`]);
    const tables = [
      { title: `${name} · 陈述式（六时态 × 六个人称）`, headers: ["人称", "现在时", "过去时", "完成时", "过去完成时", "将来时 I", "将来完成时 II"], rows: indicative },
      { title: `${name} · 第一虚拟式 Konjunktiv I`, headers: ["人称", "现在", "过去 / 完成", "将来 I", "将来 II"], rows: k1 },
      { title: `${name} · 第二虚拟式 Konjunktiv II`, headers: ["人称", "非过去 / 单纯式", "过去 / 复合式", "würde + 不定式", "würde + 完成不定式"], rows: k2 },
      { title: `${name} · 不定式、分词与命令式`, headers: ["形式", "写法"], rows: [
        ["原形 Infinitiv", name], ["带 zu 不定式", verb.zu], ["第一分词 Partizip I", verb.participle1],
        ["第二分词 Partizip II", verb.participle], ["完成时助动词", verb.auxiliary],
        ...verb.imperative.map((form, i) => [["du 命令式", "ihr 命令式", "Sie 礼貌命令式"][i], form]),
      ] },
    ];
    if (verb.modal) tables.push({ title: "情态动词：有另一个不定式时用 Ersatzinfinitiv", headers: ["结构", "例句"], rows: [
      ["现在时", "Er muss lernen."], ["完成时", "Er hat lernen müssen."], ["过去虚拟式", "Er hätte lernen müssen."],
      ["只有情态动词本身，没有受支配的不定式", "Das hat er gekonnt.（这种用法才使用第二分词）"],
    ] });
    return tables;
  }

  function passiveVerbTables(name) {
    const verb = verbs[name], sein = auxiliary.sein, werden = auxiliary.werden;
    return [
      { title: `${name} · 过程被动（六时态 × 六个人称）`, headers: ["人称", "现在时", "过去时", "完成时", "过去完成时", "将来 I", "将来 II"],
        rows: persons.map((person, i) => [person, `${werden.present[i]} ${verb.participle}`, `${werden.past[i]} ${verb.participle}`,
          `${sein.present[i]} ${verb.participle} worden`, `${sein.past[i]} ${verb.participle} worden`,
          `${werden.present[i]} ${verb.participle} werden`, `${werden.present[i]} ${verb.participle} worden sein`]) },
      { title: `${name} · 被动的第一虚拟式`, headers: ["人称", "现在", "过去 / 完成", "将来 I", "将来 II"],
        rows: persons.map((person, i) => [person, `${werden.k1[i]} ${verb.participle}`, `${sein.k1[i]} ${verb.participle} worden`,
          `${werden.k1[i]} ${verb.participle} werden`, `${werden.k1[i]} ${verb.participle} worden sein`]) },
      { title: `${name} · 被动的第二虚拟式`, headers: ["人称", "非过去", "过去", "würde 被动式", "würde 完成被动式"],
        rows: persons.map((person, i) => [person, `${werden.k2[i]} ${verb.participle}`, `${sein.k2[i]} ${verb.participle} worden`,
          `${werden.k2[i]} ${verb.participle} werden`, `${werden.k2[i]} ${verb.participle} worden sein`]) },
    ];
  }

  const caseHeaders = ["格", "阳性", "中性", "阴性", "复数"];
  const caseNames = ["Nominativ 一格", "Akkusativ 四格", "Dativ 三格", "Genitiv 二格"];
  const endingTable = (title, values) => ({ title, headers: caseHeaders,
    rows: values.map((values, i) => [caseNames[i], ...split(values)]) });
  const adjectiveTables = [
    endingTable("强变化：无冠词时的形容词词尾", ["-er|-es|-e|-e", "-en|-es|-e|-e", "-em|-em|-er|-en", "-en|-en|-er|-er"]),
    endingTable("弱变化：der / die / das 等之后", ["-e|-e|-e|-en", "-en|-e|-e|-en", "-en|-en|-en|-en", "-en|-en|-en|-en"]),
    endingTable("混合变化：ein / kein / mein 等之后", ["-er|-es|-e|-en", "-en|-es|-e|-en", "-en|-en|-en|-en", "-en|-en|-en|-en"]),
  ];
  const articleTables = [
    endingTable("定冠词的四格变化：先确定名词性、数与句法格", ["der|das|die|die", "den|das|die|die", "dem|dem|der|den", "des|des|der|der"]),
    endingTable("不定冠词：复数使用 keine 示范（ein 无复数）", ["ein|ein|eine|keine", "einen|ein|eine|keine", "einem|einem|einer|keinen", "eines|eines|einer|keiner"]),
    { title: "人称、反身与关系代词", headers: ["人称 / 数", "主格", "宾格", "与格", "反身（宾格 / 与格）"], rows: [
      ["第一人称单数", "ich", "mich", "mir", "mich / mir"], ["第二人称单数", "du", "dich", "dir", "dich / dir"],
      ["第三人称单数", "er / sie / es", "ihn / sie / es", "ihm / ihr / ihm", "sich / sich"],
      ["第一人称复数", "wir", "uns", "uns", "uns / uns"], ["第二人称复数", "ihr", "euch", "euch", "euch / euch"],
      ["第三人称复数 / 尊称", "sie / Sie", "sie / Sie", "ihnen / Ihnen", "sich / sich"],
      ["关系代词例外：与格复数", "—", "—", "denen", "—"], ["关系代词属格", "dessen（阳 / 中）", "deren（阴 / 复）", "—", "—"],
    ] },
  ];
  const prepositionTable = { title: "介词与格：空间双向介词和固定搭配分开判断", headers: ["类别", "介词 / 用法", "示例"], rows: [
    ["固定三格", "aus, bei, mit, nach, seit, von, zu, gegenüber", "mit einem Freund; zum = zu dem; zur = zu der"],
    ["固定四格", "durch, für, gegen, ohne, um", "für einen Freund; gegen Bezahlung"],
    ["常见二格", "angesichts, aufgrund, während, trotz", "angesichts dieser Lage; während eines Diktats"],
    ["空间双向：位置 / 目的地", "an, auf, hinter, in, neben, über, unter, vor, zwischen", "im Haus（在哪里）；ins Haus（到哪里）"],
    ["固定搭配优先", "warnen vor + D.; führen zu + D.; Zugriff auf + A.", "不能把空间 wo / wohin 规则套到所有介词宾语上"],
    ["后置介词", "einer Studie zufolge（Dativ）", "据一项研究；zufolge 通常后置，前置时也可支配 Genitiv"],
    ["时间词 bis", "bis morgen；bis zu + D.; bis in + A.", "有后续介词时，格由后续介词决定"],
  ] };
  const connectionTable = { title: "连接词、关联副词与语序", headers: ["类别", "例子", "语序 / 作用"], rows: [
    ["并列连接词", "und, aber, denn, sondern, oder", "连接主句；不占主句第一位。sondern 常承接 nicht / kein"],
    ["从属连接词", "dass, weil, wenn, obwohl, wohingegen", "一般将限定动词放在从句末尾"],
    ["关联副词", "deshalb, dennoch, schließlich, dagegen, damit", "占句法位置；放句首时限定动词仍在第二位"],
    ["目的不定式", "um ... zu", "通常两部分动作主体相同；可分动词把 zu 放在前缀之后"],
    ["比较 / 身份", "so ... wie；anders / mehr ... als；als Grundlage", "比较词或表身份的 als 不像普通介词一样独立支配固定格"],
    ["代副词", "davon, daran, dazu, daraus", "da(r) + 介词指事物 / 内容；指人常用介词 + 代词"],
  ] };
  const passiveTable = { title: "主动、过程被动与状态被动", headers: ["形式", "结构", "例句"], rows: [
    ["过程被动 · 现在", "werden 的现在时 + Partizip II", "Die Regeln werden erklärt."],
    ["过程被动 · 过去", "werden 的过去时 + Partizip II", "Die Regeln wurden erklärt."],
    ["过程被动 · 完成", "sein + Partizip II + worden", "Die Regeln sind erklärt worden.（不是 geworden）"],
    ["过程被动 · 过去完成", "war / waren + Partizip II + worden", "Die Regeln waren erklärt worden."],
    ["过程被动 · 将来", "werden + Partizip II + werden", "Die Regeln werden erklärt werden."],
    ["情态动词 + 被动", "Modalverb + Partizip II + werden", "Die Regeln müssen erklärt werden."],
    ["状态被动", "sein + Partizip II", "Die Tür ist geöffnet.（强调已经形成的状态）"],
  ] };

  // Per-gap explanations and lexical links are loaded below.
  const { reasons, verbLinks, nounLinks } = authored;
  const passiveGaps = new Set("1:1|1:2|2:4|5:4|5:14|6:13|7:9|7:15|7:19|7:22|8:1|8:9|9:10|10:12|11:11|11:22|12:32|13:38|14:46|17:9|17:11|17:15|20:30".split("|"));
  function nounTable(noun) {
    const { gender, singular, genitive, plural } = noun;
    const articles = gender === "m" ? ["der", "den", "dem", "des"] : gender === "n" ? ["das", "das", "dem", "des"] : ["die", "die", "der", "der"];
    const dativePlural = plural === "—" || /[ns]$/.test(plural) ? plural : plural + "n";
    return { title: `${articles[0]} ${singular} · 名词单复数四格`, headers: ["格", "单数", "复数"], rows: caseNames.map((name, i) => [name,
      `${articles[i]} ${i === 3 ? genitive : singular}`,
      plural === "—" ? "—（此义通常不用复数）" : `${["die", "die", "den", "der"][i]} ${i === 2 ? dativePlural : plural}`]) };
  }
  function explain(question) {
    const key = `${question.teil}:${question.number}`;
    const reason = reasons[key];
    if (!reason) throw new Error("Missing Baustein explanation: " + key);
    const tables = [], rules = [];
    const names = verbLinks[key] || verbLinks[question.correctText] || [];
    for (const name of names) tables.push(...verbTables(name));
    if (passiveGaps.has(key)) tables.push(...passiveVerbTables(names[0]));
    const noun = nounLinks[question.correctText];
    if (noun) {
      tables.push(nounTable(noun), articleTables[0]);
      rules.push("名词先记性别和复数，再由介词 / 动词 / 句法关系确定格。阳性和中性名词属格通常加 -(e)s；与格复数一般再加 -n，但原复数已以 -n / -s 结尾时不重复加。");
    }
    if (question.correctText === "Studierenden") {
      tables.push(...adjectiveTables, { title: "Studierende · 分词名词化（定冠词后）", headers: ["格", "男性单数", "女性单数", "复数"], rows: [
        ["N", "der Studierende", "die Studierende", "die Studierenden"], ["A", "den Studierenden", "die Studierende", "die Studierenden"],
        ["D", "dem Studierenden", "der Studierenden", "den Studierenden"], ["G", "des Studierenden", "der Studierenden", "der Studierenden"],
      ] });
      rules.push("Studierende 是分词名词化，保留形容词词尾规律：无冠词复数是 Studierende，有定冠词是 die Studierenden；不能当成所有场合都带 -n 的普通名词。");
    }
    if (names.length) rules.push("先找主语和限定动词，再判断人称、时态、语态与语气。表格列的是该词的完整主动变位；可分前缀在主句的限定形式中放句末，在从句中与动词合写。带 sich 的结构还需按人称补反身代词。");
    if (names.some(name => name === "unterliegen")) rules.push("本句 unterliegen 表‘受某规律支配’，完成时用 haben；表‘比赛败给某人’时则用 sein。下面的表按当前词义选择助动词。");
    if (passiveGaps.has(key)) rules.push("本题涉及被动 / 结果状态，下面还可展开这个动词的过程被动六时态及虚拟式。过程被动完成时用 worden；动词 werden 表‘变成’的完成时才用 geworden。");
    if (question.quizFocus === "形容词词尾") {
      tables.push(...adjectiveTables);
      rules.push("先确定名词性别、单复数、格，再看冠词是否已经标出格。定语形容词要变词尾；表语和状语用法通常不变。混合变化表的复数适用于 kein- / 所有格词，不存在 ein 的复数。");
    } else if (question.quizFocus === "代词、冠词与格变化") {
      tables.push(...articleTables, ...adjectiveTables);
      rules.push("冠词 / 代词要与所指名词的性、数配合，格由它在当前分句中的作用决定。所有格词词干取决于所属者，词尾取决于被修饰名词；关系代词的格由关系从句决定。");
    } else if (question.quizFocus === "介词与介词搭配") tables.push(prepositionTable, articleTables[0]);
    else if (["连接词与副词", "固定搭配与短语"].includes(question.quizFocus)) tables.push(connectionTable, prepositionTable);
    else if (question.quizFocus === "形容词与副词辨析") {
      tables.push(...adjectiveTables);
      rules.push("这里先辨句义和用法：作表语 / 状语通常不用词尾；放在名词前作定语时，才按下面的三种变化表加词尾。程度副词、语气词不能机械地按形容词变格。");
    }
    if (question.quizFocus === "动词形式与语态" || /\b(?:wurde[n]?|werden|worden)\b/.test(question.reviewGerman) ||
      names.some(name => verbs[name].participle === question.correctText) && /\b(?:ist|sind|war|waren|sei|seien)\b/.test(question.reviewGerman)) tables.push(passiveTable);
    if (names.some(name => verbs[name].modal)) rules.push("情态动词后通常接不带 zu 的动词原形；带另一不定式构成完成时，须注意替代不定式（如 hat lernen müssen），不能直接套用单独用法的 gemusst。");
    if (names.length) rules.push("第一虚拟式主要用于转述；与陈述式同形时常改用第二虚拟式。第二虚拟式单纯式有些较书面，日常常用 würde + 原形。命令式是否自然还取决于词义，不是所有抽象状态都适合命令。");
    return { why: reason.why || reason, sourceIssue: reason.issue || "", tables, rules,
      references: [...new Set([...(names.length ? ["verbs", "moods"] : []),
        ...(question.quizFocus.includes("词尾") || question.quizFocus.includes("格变化") ? ["adjectives"] : []),
        ...(names.some(name => verbs[name].modal) ? ["modal"] : []), "cases"])].map(id => references[id]) };
  }

  return { explain, verbTables, verbs, reasons, verbLinks, nounLinks };
});
