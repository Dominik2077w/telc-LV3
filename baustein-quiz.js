(function (root) {
  // Authored against the corpus gaps. These are practice distractors, not PDF
  // exam options. Keep them separate from the imported source and translations.
  const groups = {
    "介词与介词搭配": `
zum|vom|beim|im
auf|bei|für|über
gegen|ohne|bei|durch
nach|aus|bei|für
zu|bei|von|für
im|am|zum|vom
von|für|an|über
mit|durch|ohne|gegen
aus|bei|an|für
In|An|Auf|Bei
über|unter|neben|durch
vor|hinter|neben|zwischen
in|auf|bei|an
bei|aus|nach|gegen
für|mit|von|nach
zur|von der|bei der|mit der
um|für|an|bei
hinter|vor|unter|neben
angesichts|trotz|statt|einschließlich
zufolge|entgegen|gegenüber|zuliebe
zu einem|an einem|aus einem|mit einem
Schon im|Schon am|Schon zum|Schon vom
Bis|Seit|Ab|Während
vor mehr als|seit mehr als|für mehr als|nach mehr als
in denen|an denen|auf denen|mit denen
`,
    "代词、冠词与格变化": `
des|der|dem|den
die|der|dem|den
das|der|dem|den
diese|dieser|dieses|diesem
jene|jener|jenes|jenem
deren|denen|dessen|derer
wir|uns|unser|unsere
sie|ihnen|ihrer|ihrem
sich|ihm|ihnen|einander
man sich|man ihm|einen sich|einem sich
seines|seinem|seinen|seiner
voller|vollem|vollen|volles
keine|keinen|keinem|keiner
eines Diktats|einem Diktat|einen Diktat|ein Diktat
die Resultate|der Resultate|den Resultaten|das Resultat
dreier amerikanischer|drei amerikanischen|dreien amerikanischer|dreier amerikanischen
das zuvor geübte|das zuvor geübten|dem zuvor geübte|des zuvor geübtem
anderen als der gewählten|andere als der gewählten|anderen als die gewählte|anderem als dem gewählten
der erste|der ersten|den erste|dem erster
der Faktor|den Faktor|dem Faktor|des Faktors
einigen der|einige der|einigem der|einiges der
ihr Wissen|ihrem Wissen|ihres Wissens|ihren Wissen
der Hörsäle|den Hörsälen|die Hörsäle|dem Hörsaal
das Wesen|dem Wesen|des Wesens|den Wesen
die meisten|die meiste|den meisten|der meisten
alle möglichen Sinneseindrücke|allen möglichen Sinneseindrücken|alle mögliche Sinneseindrücke|aller möglichen Sinneseindrücke
einen dringenden Handlungsbedarf|ein dringender Handlungsbedarf|einem dringenden Handlungsbedarf|eines dringenden Handlungsbedarfs
mit anderen|mit andere|mit anderem|mit anderer
wenigen Jahrzehnten|wenige Jahrzehnten|weniger Jahrzehnten|wenigem Jahrzehnten
`,
    "形容词词尾": `
gesundheitsgefährdenden|gesundheitsgefährdende|gesundheitsgefährdender|gesundheitsgefährdendem
bahnbrechenden|bahnbrechende|bahnbrechender|bahnbrechendem
geschönten|geschönte|geschönter|geschöntem
zerstörerische|zerstörerischen|zerstörerischer|zerstörerischem
warmen|warme|warmer|warmem
begehrteren|begehrtere|begehrterer|begehrterem
systemischer|systemischen|systemischem|systemisches
interessante|interessanten|interessanter|interessantem
beteiligten|beteiligte|beteiligter|beteiligtem
stammende|stammenden|stammender|stammendem
Bestimmte|Bestimmten|Bestimmter|Bestimmtem
jeweiligen|jeweilige|jeweiliger|jeweiligem
angeborenen|angeborene|angeborener|angeborenem
unkomplizierte|unkomplizierten|unkomplizierter|unkompliziertem
diszipliniertes|disziplinierte|disziplinierten|diszipliniertem
festen|feste|fester|festem
aufstrebenden|aufstrebende|aufstrebender|aufstrebendem
spektakuläre|spektakulären|spektakulärer|spektakulärem
raffinierte|raffinierten|raffinierter|raffiniertem
spitzen|spitze|spitzer|spitzem
unterschiedlichsten|unterschiedlichste|unterschiedlichster|unterschiedlichstem
verfügbare|verfügbaren|verfügbarer|verfügbarem
auditiven|auditive|auditiver|auditivem
bereits katalogisierte|bereits katalogisierten|bereits katalogisierter|bereits katalogisiertem
auf der Hand liegenden|auf der Hand liegende|auf der Hand liegender|auf der Hand liegendem
genauer|genaue|genauen|genauem
`,
    "形容词与副词辨析": `
streng|locker|beliebig|zufällig
unbedenklich|bedenklich|unbequem|unbeständig
knapp|reichlich|dauerhaft|überflüssig
unbegrenzt|begrenzt|unregelmäßig|unverbindlich
ausreichend|unzureichend|vorübergehend|gleichzeitig
theoretisch|praktisch|historisch|geografisch
allgegenwärtig|ortsgebunden|vorübergehend|einseitig
zeitgleich|zeitversetzt|rechtzeitig|vorzeitig
vielfältig|einseitig|eintönig|gleichförmig
simpel|kompliziert|umständlich|aufwendig
diskriminierend|ausgleichend|fördernd|ermutigend
wesentlich|nebensächlich|beiläufig|zufällig
gefühlsmäßig|zahlenmäßig|flächenmäßig|altersmäßig
skeptisch|zuversichtlich|begeistert|gleichgültig
üblich|ungewöhnlich|selten|neuartig
offensichtlich|vermutlich|irrtümlich|ausnahmsweise
horizontal|vertikal|diagonal|kreisförmig
kostengünstig|kostenintensiv|zeitaufwendig|platzsparend
zweitrangig|vorrangig|gleichrangig|unersetzlich
didaktisch|technisch|organisatorisch|wissenschaftlich
`,
    "连接词与副词": `
um zu|ohne zu|statt zu|anstatt zu
durchaus|keineswegs|allenfalls|kaum
eben nicht|erst dann|immer noch|nur deshalb
Schließlich|Anfangs|Stattdessen|Andernfalls
wohingegen|weshalb|obwohl|sobald
wie|warum|wann|wohin
keineswegs|durchaus|jedenfalls|zumindest
davon|dafür|darin|damit
zurück|voran|hinauf|heraus
fortlaufend|einmalig|rückwirkend|gelegentlich
daraus|dagegen|dazwischen|dorthin
also|dennoch|hingegen|inzwischen
herum|hinauf|hinein|heraus
dazu|darin|davon|dagegen
ziemlich|kaum|unzureichend|annähernd
sogar|hingegen|stattdessen|jedoch
denn|obwohl|damit|falls
ohnehin|erstmals|vergeblich|inzwischen
schon|erst|noch|wieder
dass|ob|weil|wenn
Ohnehin|Andernfalls|Stattdessen|Inzwischen
damit|dagegen|dazwischen|dorthin
voneinander|miteinander|zueinander|aufeinander
kaum über|weit unter|genau zwischen|knapp neben
kaum|ständig|überwiegend|erneut
weiter|zurück|heraus|hinüber
mehr und mehr|hin und wieder|hin und her|auf keinen Fall
anders|erneut|zugleich|deshalb
danach|dagegen|damit|darin
fünfmal|fünffach|fünftens|fünfjährig
ruhig|eilig|unruhig|laut
doch|obwohl|falls|damit
insbesondere|keineswegs|stattdessen|andernfalls
besonders|selten|überhaupt nicht|zufällig
genau|ungefähr|beinahe|höchstens
Wer|Wen|Wem|Wessen
wie wir sie|wie uns sie|wie wir ihr|wie unser sie
letztlich|anfänglich|vorläufig|zwischenzeitlich
darin|darauf|daraus|dagegen
daran|darin|daraus|dagegen
genauso|anders|weniger|keineswegs
wenn|obwohl|damit|sodass
auch immer|noch nie|erst später|nicht mehr
hinein|hinaus|herunter|hinüber
vor allem|auf keinen Fall|nur selten|stattdessen
eher|weniger|niemals|ausschließlich
nahezu|keineswegs|gelegentlich|stellenweise
Dafür|Dagegen|Dazwischen|Dorthin
sehr|kaum|selten|wenig
so gar nicht mal|so gut wie immer|so gut wie nie|in jedem Fall
recht|kaum|unzureichend|übermäßig
sondern|aber|obwohl|denn
wiederum|erstmals|keineswegs|allenfalls
Doch|Weil|Falls|Damit
als|wie|ob|wenn
`,
    "动词形式与语态": `
werden|wird|worden|werdend
sei|seien|seist|seiet
könne|können|könnest|könnet
habe|haben|habest|habet
bestehe|bestehen|bestehest|bestehet
schade|schaden|schadest|schadet
ziehe|ziehen|ziehest|ziehet
wurde|wurden|worden|wurdest
seien|sei|seist|seiet
lässt|lassen|lasst|ließest
dürfte|dürften|dürftest|dürftet
Wurde|Wurden|Worden|Wurdest
mussten|musste|musstest|musstet
musste|mussten|musstest|musstet
werde|werden|werdest|werdet
mag|mögen|magst|mögt
sollte|sollten|solltest|solltet
durfte|durften|durftest|durftet
aufgehört hätten|aufgehört hättet|aufgehört wären|aufgehört würdet
getroffen hätten|getroffen hättet|getroffen wären|getroffen würdet
gebraucht hätten / geraucht hätten|geraucht wären|geraucht hättet|geraucht würdet
aufgeführt waren|aufgeführt war|aufgeführt warst|aufgeführt wart
`,
    "动词搭配与词义": `
gezogen|getan|gestellt|gelegt
vorgesehen|vorgelesen|vorgefunden|vorgefallen
schwankte|verharrte|stagnierte|stockte
erfahren / erhalten|erteilen|erklären|erzeugen
argumentieren|diskutieren|demonstrieren|kommentieren
herauszufinden|herauszunehmen|herauszugeben|herauszuhalten
richtig einsetzen müssen|richtig einsetzen muss|richtig eingesetzt müssen|richtig einzusetzen müssen
entspricht|entsprechen|entsprichst|entsprecht
abzulassen|zuzulassen|einzulassen|auszulassen
publiziert / veröffentlicht|verschwiegen|widerrufen|zurückgezogen
kurz zusammenfassen / zusammenfassen|kurz zusammenfallen|kurz zusammenlaufen|kurz zusammenkommen
zu verstehen|zu stehen|zu bestehen|zu gestehen
leiten|leiden|leihen|leisten
ließen|ließ|ließest|ließt
erfuhren|erfanden|erhoben|erwogen
schnitten|schnitt|schnittest|schnittet
verfolgten|verfügten|verließen|verfehlten
schenkten|gaben|stellten|brachten
ignorieren|registrieren|korrigieren|sortieren
erschweren|erleichtern|beenden|verhindern
hervorbringt|hervorgeht|hervorkommt|hervortritt
dar|her|vor|hin
produzieren|reduzieren|konsumieren|transportieren
machen|geben|setzen|stellen
weitergeben|weitergehen|weiterkommen|weiterleben
lässt sich|lassen sich|lasst sich|lassen uns
speichert|speichern|speicherst|speicherten
enthalten|erhalten|behalten|verhalten
schlägt|stellt|setzt|legt
nehmen|geben|stellen|setzen
zurechtkommen|zurückkommen|herauskommen|ankommen
tickt|stockt|klingelt|läutet
abzurufen|anzurufen|aufzurufen|zuzurufen
ergaben|ergab|ergabst|ergabt
fordern|fördern|formen|forschen
führen|fuhren|fühlen|feiern
sehen|sahen|siehst|seht
lautet|läutet|leitet|lädt
priesen|prüften|pressten|prägten
ausgehängt|ausgehändigt|ausgehandelt|ausgehalten
anboten|anbaten|antraten|anfingen
verschaffte|verschob|verschwand|verschlief
eroberte|eröffnete|erörterte|erwartete
entsteht|besteht|versteht|gesteht
ziehen|machen|geben|stellen
bestimmt|bestätigt|bestellt|bestückt
erreicht|errichtet|erleichtert|ersetzt
unterscheidet|entscheidet|scheidet|vermeidet
bescherte|bescherten|beschertest|beschertet
unterscheiden zu können|unterscheiden können|unterscheidet zu können|unterschieden zu können
beeinflussen|beeinflusst|beeinflusste|beeinflussend
hinwegfegten|hinwegfegt|hinwegfegst|hinweggefegt
gebracht|genommen|gelegt|gesetzt
gefragt|gesagt|geklagt|gewagt
gemacht|getan|gegeben|gestellt
gesammelt / erworben|verloren|vernachlässigt|vergessen
Zusammengeführt|Zusammengefasst|Zusammengerechnet|Zusammengestoßen
schütteln|schütten|schieben|schöpfen
überholt|überhört|überlebt|überlegt
betont|betönt|bedeutet|benötigt
zusammengestellt|zusammengefallen|zusammengebrochen|zusammengestoßen
beleuchtet|belüftet|beliefert|berechnet
implizieren|implodieren|importieren|improvisieren
unterliegt|unterlegt|unterbricht|unterstellt
tätigten|tilgten|tauschten|testeten
praktizierten|prognostizierten|präsentierten|protokollierten
floss|flog|flocht|floh
vereinfachen|erschweren|verzögern|verteuern
akzeptierten|absolvierten|aktivierten|archivierten
aufgeschlagen|ausgeschlagen|vorgeschlagen|nachgeschlagen
zurechtzukommen|zurechtkommen|zu zurechtkommen|zurecht zu kommen
gefestigt|befestigt|beseitigt|gefertigt
braucht|brauchen|brauchst|brauchtet
fördert|fordert|formt|forscht
entwickelt|entwickeln|entwickelst|entwickelnd
respektiert|reduziert|registriert|reserviert
gestaltet|gestalten|gestaltest|gestaltend
schlüpfen|schleppen|schlürfen|schluchzen
verbreiten|verbreitet|verbreitete|verbreitend
ergattern|erraten|ergründen|ergänzen
geprägt|geprüft|gepresst|gepriesen
gehalten|gehoben|geholt|geheilt
bemängeln|begrenzen|bemessen|bemalen
speist|speisen|speistest|speisend
deutet|läutet|leitet|hütet
überliefert|überleben|überhören|übertreiben
verdanken|verdenken|bedanken|andenken
etablierte|erprobte|erledigte|erklärte
erforscht|erfordert|erfährt|erfragt
vorausheben|hervorheben|anheben|aufheben
analysieren|aktualisieren|automatisieren|autorisieren
geräumt|gebaut|gemacht|gestellt
erwiesen|erwähnt|erwartet|erwogen
bestätigt|bestimmt|bestellt|bestückt
behandelt|gehandelt|verhandelt|abgehandelt
veröffentlichte|veröffentlichend|veröffentlichten|veröffentliche
bilden|binden|bitten|bieten
sah|saß|sang|sank
existierten|existierte|existiertest|existiertet
gehalten / abgehalten|gehoben|geholt|geheilt
gefördert|gefordert|geformt|geforscht
dargeboten|dargestellt|dargelegt|darübergelegt
entgegenkommt / entgegengeht|entgegenkommen|entgegenkommst|entgegengekommen
bedauern|bedauert|bedauerte|bedauernd
lassen|lässt|lasst|gelassen
beginnt|beginnen|beginnst|beginnend
verankert|verändert|verbreitet|vergrößert
besagen|besetzen|besuchen|besorgen
zurückgreifen|zurückgehen|zurückkommen|zurückbleiben
wandeln|wandern|wenden|winden
hängt|hängen|hängst|hängend
liest|lesen|lese|lest
schreibt|schreiben|schreibst|schreibend
`,
    "名词词义与词形": `
Abbild|Abschnitt|Abstand|Absatz
Substanzen|Substanz|Substanzgruppe|Substanzwert
Strategien|Statistiken|Strukturen|Stationen
Dosen|Dose|Dosierung|Dosis
Effekt|Affekt|Defekt|Reflex
Vorläufer|Nachfolger|Mitläufer|Verfolger
Verbreitung|Vorbereitung|Verarbeitung|Verbindung
Einzug|Auszug|Umzug|Abzug
Gegenwind|Gegenstand|Gegenwart|Gegensatz
Ressourcen|Reservate|Reservierungen|Residenzen
Folge|Ursache|Absicht|Voraussetzung
Ausprägung|Ausbildung|Ausstellung|Ausgrabung
Tierreich|Tierart|Tierhaltung|Tierschutz
Territorium|Terrarium|Terrainprofil|Testament
Auswirkungen|Auswertungen|Ausstellungen|Ausbildungen
Errungenschaft|Eigenschaft|Bekanntschaft|Verwandtschaft
Einblick|Ausblick|Rückblick|Anblick
Schritt|Schnitt|Schrift|Schicht
Mentorin|Mentoren|Mentor|Mentorinnen
Vorhaben|Vorkommen|Vorurteil|Vorbilder
Gast / Besuch|Gästen|Gastes|Gäste
Begeisterung|Belastung|Befürchtung|Besorgnis
Studierenden|Studierende|Studierender|Studierendem
Studiengängen|Studiengänge|Studiengang|Studiengangs
Ausdrücke|Abdrücke|Eindrücke|Aufdrücke
Sprachgebrauch|Sprachunterricht|Sprachprüfung|Sprachkurs
Wegfallen|Weggehen|Wegbringen|Wegsehen
Jugendsprache|Jugendalter|Jugendkultur|Jugendarbeit
Nachahmung|Nachforschung|Nachbesserung|Nachbestellung
Synonym|Antonym|Homonym|Akronym
Takt|Taktik|Täter|Tat
Schneckengehäuse|Schneckenhäusern|Schneckengehäusen|Schneckengehäuses
Ersatz|Absatz|Umsatz|Zusatz
Neuerung|Neuigkeit|Nachricht|Neuauflage
Aufprall|Aufruhr|Aufwand|Aufbruch
Zeitvertreib|Zeitverlust|Zeitpunkt|Zeitraum
Munde|Münder|Mündern|Mundes
Übertragung|Übertreibung|Überwachung|Überzeugung
Recherchieren|Recherchierens|Recherchierendes|Recherchierendem
Brückenschlag|Brückenbau|Brückenkopf|Brückengeländer
Feinschmecker|Feinschmeckern|Feinschmeckers|Feinschmeckerin
Schrei|Schritt|Schrift|Schrein
Gänge|Gängen|Gangs|Gang
Wert|Werk|Weg|Wort
Boden|Böden|Bodens|Bodenfläche
Vorsprung|Vorstand|Vortrag|Vorsatz
Gegensatz|Gegenstand|Gegenwart|Gegenwind
Durchbruch|Durchblick|Durchgang|Durchschnitt
Eigenschaften|Errungenschaften|Gemeinschaften|Verwandtschaften
Initialzündung|Zwischenlösung|Endfassung|Folgeentscheidung
Bestimmung|Abstimmung|Zustimmung|Verstimmung
Hörverhalten|Hörvermögen|Hörgerät|Hörschaden
Alterskohorte|Altersgrenze|Altersvorsorge|Altersheim
Rhythmen|Rhythmus|Rhythmik|Rhythmikers
Menge|Zahl|Höhe|Größe
Widerspruch|Widerstand|Widerhall|Widerwillen
`,
    "固定搭配与短语": `
zurecht|zurück|voran|hinaus
ernst nehmen|ernst machen|ernst geben|ernst stellen
in der Regel|in der Reihe|in der Runde|in der Richtung
unter die Leute bringen|über die Leute bringen|zwischen die Leute bringen|hinter die Leute bringen
ins Leben gerufen|ins Leben genommen|ins Leben gestellt|ins Leben gelegt
davon zu überzeugen|darauf zu überzeugen|dafür zu überzeugen|daran zu überzeugen
auf Schritt und Tritt|mit Schritt und Tritt|bei Schritt und Tritt|nach Schritt und Tritt
zur Neige|zur Nähe|zur Seite|zur Stelle
gegenseitig|gleichzeitig|einseitig|rückseitig
Aufgrund der Tatsache|Trotz der Tatsache|Anstelle der Tatsache|Ungeachtet der Tatsache
zur Verfügung gestellt|zur Verfügung genommen|zur Verfügung gemacht|zur Verfügung gelegt
in Frage|in Antwort|in Rede|in Wort
mehrmals|mehrfacher|mehrmalig|mehrmaligen
Verwendung fanden|Verwendung nahmen|Verwendung stellten|Verwendung gaben
mit der Zeit|mit dem Ort|mit der Seite|mit dem Punkt
die Rede|die Sprache|das Wort|der Satz
zugrunde|zugute|zumute|zuteil
zur Wehr setzen|zur Wehr stellen|zur Wehr legen|zur Wehr nehmen
Zugriff auf|Zugriff an|Zugriff für|Zugriff bei
rund um die Uhr|rund an die Uhr|rund auf die Uhr|rund bei die Uhr
in den kommenden Jahren / in naher Zukunft|in dem kommenden Jahren|in die kommenden Jahren|in der kommenden Jahren
Vorher / Erstens|Zweitens|Danach|Zuletzt
insbesondere / vor allem|keineswegs|stattdessen|andernfalls
im Laufe des Lebens|im Laufe dem Leben|im Laufe des Leben|in Laufe des Lebens
In der Annahme /in der Annahme|in die Annahme|an der Annahme|auf der Annahme
`,
  };

  const bank = new Map();
  Object.entries(groups).forEach(([focus, lines]) => {
    lines.trim().split("\n").forEach(line => {
      const [answer, ...distractors] = line.trim().split("|");
      if (bank.has(answer)) throw new Error(`Duplicate Baustein answer: ${answer}`);
      bank.set(answer, { focus, distractors });
    });
  });

  const preferred = {
    "In der Annahme /in der Annahme": "in der Annahme",
    "gebraucht hätten / geraucht hätten": "geraucht hätten",
    "Vorher / Erstens": "Erstens",
  };

  function acceptedAnswers(answer) {
    return [...new Set(String(answer || "").split(/\s*\/\s*/u).map(text => text.trim()).filter(Boolean))];
  }

  function isSupported(row) {
    return Boolean(row && !row.sourceMissing && !row.sourceNote);
  }

  function buildQuestion(question, row) {
    if (!isSupported(row)) return null;
    const spec = bank.get(row.answer);
    if (!spec) throw new Error(`Missing Baustein distractors for ${row.answer}`);
    const acceptedTexts = acceptedAnswers(row.answer);
    const correctText = preferred[row.answer] || acceptedTexts[0];
    const distractors = spec.distractors;
    const accepted = new Set(acceptedTexts.map(text => text.toLocaleLowerCase("de")));
    if (distractors.length !== 3 || new Set(distractors).size !== 3 ||
      distractors.some(text => !text || accepted.has(text.toLocaleLowerCase("de")))) {
      throw new Error(`Invalid Baustein distractors for ${row.answer}`);
    }
    return {
      ...question,
      sectionMode: "baustein-choice",
      correctText,
      acceptedTexts,
      distractors: [...distractors],
      quizFocus: spec.focus,
      distractorSource: "authored-grammar-practice",
    };
  }

  function prepareQuestion(question, random = Math.random) {
    question.quizAnswered = false;
    const choices = [question.correctText, ...question.distractors];
    for (let index = choices.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(random() * (index + 1));
      [choices[index], choices[swap]] = [choices[swap], choices[index]];
    }
    question.options = choices.map((text, index) => ({
      value: "ABCD"[index], text,
      label: `${[4, 5, 1, 2][index]} · ${text}`,
      shortcut: `${[4, 5, 1, 2][index]} / ${"ABCD"[index]}`,
    }));
    question.answer = "ABCD"[choices.indexOf(question.correctText)];
    return question;
  }

  const api = { acceptedAnswers, buildQuestion, isSupported, prepareQuestion };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.BausteinQuiz = api;
})(typeof window !== "undefined" ? window : globalThis);
