// Authored practice material, separate from the PDF corpus and its importer.
// Each paragraph has two distractors; all verified PDF items remain correct targets.
(function (root) {
  const templates = {
    zahlen: "Belegt {autor} eine These mit statistischen Untersuchungsergebnissen?",
    definition: "Erläutert {autor} die genaue Bedeutung eines Fachbegriffs?",
    experte: "Stützt {autor} die eigene Argumentation auf das Urteil einer Fachperson?",
    erlebnis: "Schildert {autor} ein selbst erlebtes Ereignis?",
    prognose: "Sagt {autor} eine zukünftige Entwicklung voraus?",
    rat: "Gibt {autor} den Lesern einen konkreten praktischen Rat?",
    bewunderung: "Drückt {autor} Bewunderung für das Verhalten anderer aus?",
    humor: "Will {autor} die Leser mit einer humorvollen Schilderung unterhalten?",
    appell: "Fordert {autor} die Leser zu einer konkreten Handlung auf?",
    selbstkritik: "Gesteht {autor} einen eigenen Fehler ein?",
    entschuldigung: "Entschuldigt sich {autor} für das eigene Verhalten?",
    zweifel: "Bezweifelt {autor} die Zuverlässigkeit einer wissenschaftlichen Studie?",
    anleitung: "Erklärt {autor} Schritt für Schritt die Durchführung eines Verfahrens?",
    verbot: "Fordert {autor} ein gesetzliches Verbot der beschriebenen Praxis?",
    entwarnung: "Erklärt {autor} ein zuvor geschildertes Risiko für unbegründet?",
    gegenposition: "Widerlegt {autor} die Aussage eines zuvor zitierten Experten?",
  };

  // A–E refer to the source paragraphs, not to the displayed answer positions.
  const pairs = {
    1: { A: ["zahlen", "rat"], B: ["erlebnis", "prognose"], C: ["definition", "appell"], E: ["zahlen", "verbot"] },
    2: { A: ["zahlen", "rat"], B: ["erlebnis", "prognose"], C: ["anleitung", "bewunderung"], D: ["appell", "zweifel"], E: ["zahlen", "verbot"] },
    3: { B: ["zahlen", "anleitung"], C: ["erlebnis", "rat"], D: ["erlebnis", "humor"], E: ["erlebnis", "verbot"] },
    4: { B: ["experte", "definition"], D: ["zahlen", "experte"], E: ["zahlen", "entschuldigung"] },
    5: { A: ["prognose", "rat"], B: ["erlebnis", "anleitung"], C: ["zahlen", "definition"], D: ["verbot", "entschuldigung"], E: ["entwarnung", "anleitung"] },
    6: { A: ["zahlen", "experte"], B: ["definition", "experte"], D: ["prognose", "anleitung"], E: ["verbot", "entschuldigung"] },
    7: { B: ["zahlen", "definition"], D: ["selbstkritik", "verbot"], E: ["erlebnis", "gegenposition"] },
    8: { B: ["erlebnis", "verbot"], C: ["anleitung", "selbstkritik"], D: ["erlebnis", "appell"], E: ["zahlen", "anleitung"] },
    9: { A: ["experte", "anleitung"], B: ["zahlen", "definition"], C: ["anleitung", "selbstkritik"], D: ["erlebnis", "prognose"], E: ["verbot", "entschuldigung"] },
    10: { A: ["zahlen", "verbot"], B: ["anleitung", "entschuldigung"], C: ["zahlen", "definition"], D: ["erlebnis", "anleitung"], E: ["definition", "selbstkritik"] },
    11: { A: ["erlebnis", "anleitung"], B: ["zahlen", "prognose"], C: ["selbstkritik", "verbot"], D: ["zahlen", "prognose"], E: ["zahlen", "definition"] },
    12: { A: ["definition", "zahlen"], B: ["erlebnis", "anleitung"], C: ["bewunderung", "anleitung"], D: ["zahlen", "verbot"], E: ["erlebnis", "anleitung"] },
    13: { B: ["zahlen", "entschuldigung"], C: ["erlebnis", "anleitung"], D: ["erlebnis", "verbot"], E: ["zahlen", "anleitung"] },
    14: { A: ["zahlen", "definition"], B: ["zahlen", "anleitung"], C: ["zahlen", "entschuldigung"], D: ["erlebnis", "verbot"], E: ["zahlen", "anleitung"] },
    15: { A: ["zahlen", "selbstkritik"], B: ["erlebnis", "anleitung"], C: ["selbstkritik", "verbot"], D: ["entwarnung", "anleitung"], E: ["zahlen", "verbot"] },
    16: { A: ["zahlen", "anleitung"], B: ["zahlen", "selbstkritik"], C: ["definition", "entschuldigung"], E: ["zahlen", "verbot"] },
    17: { A: ["prognose", "anleitung"], B: ["zahlen", "entschuldigung"], D: ["erlebnis", "anleitung"], E: ["zahlen", "verbot"] },
    18: { B: ["zahlen", "definition"], C: ["erlebnis", "entwarnung"], D: ["verbot", "anleitung"], E: ["zahlen", "verbot"] },
    19: { A: ["zahlen", "anleitung"], B: ["erlebnis", "anleitung"], C: ["selbstkritik", "verbot"], D: ["anleitung", "entwarnung"], E: ["erlebnis", "verbot"] },
    20: { A: ["zahlen", "experte"], B: ["zahlen", "definition"], C: ["selbstkritik", "anleitung"], D: ["selbstkritik", "entwarnung"], E: ["zahlen", "verbot"] },
    21: { A: ["erlebnis", "anleitung"], B: ["zahlen", "definition"], C: ["verbot", "selbstkritik"], D: ["erlebnis", "humor"], E: ["zahlen", "anleitung"] },
    22: { A: ["zahlen", "anleitung"], B: ["prognose", "verbot"], C: ["zahlen", "anleitung"], D: ["erlebnis", "entwarnung"], E: ["zahlen", "verbot"] },
    23: { B: ["zahlen", "verbot"], C: ["erlebnis", "anleitung"], D: ["zahlen", "definition"], E: ["zahlen", "entschuldigung"] },
    24: { A: ["zahlen", "anleitung"], B: ["experte", "definition"], C: ["zahlen", "entschuldigung"], D: ["erlebnis", "entwarnung"], E: ["zahlen", "definition"] },
    25: { A: ["prognose", "verbot"], B: ["erlebnis", "anleitung"], C: ["selbstkritik", "gegenposition"], D: ["zahlen", "anleitung"], E: ["zahlen", "definition"] },
    26: { A: ["erlebnis", "anleitung"], B: ["selbstkritik", "anleitung"], C: ["erlebnis", "rat"], D: ["selbstkritik", "verbot"], E: ["erlebnis", "anleitung"] },
  };

  const femaleAuthors = [3, 4, 6, 9, 12, 14, 16, 17, 19, 21, 22, 25];
  const paragraphs = Object.fromEntries(Object.entries(pairs).map(([teil, entries]) => [teil,
    Object.fromEntries(Object.entries(entries).map(([paragraph, keys]) => [paragraph,
      keys.map(key => templates[key].replace("{autor}", femaleAuthors.includes(Number(teil)) ? "die Autorin" : "der Autor")),
    ])),
  ]));
  const data = { source: "authored-lv2-practice", paragraphs };
  if (typeof module === "object" && module.exports) module.exports = data;
  else root.LV2_DISTRACTORS = data;
})(typeof window !== "undefined" ? window : globalThis);
