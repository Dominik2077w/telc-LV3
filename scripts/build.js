const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
const files = [
  "index.html",
  "styles.css",
  "app.js",
  "lv1-quiz.js",
  "lv1-translations.js",
  "data/lv1_questions.js",
  "baustein-study.js",
  "baustein-quiz.js",
  "baustein-explanations.js",
  "baustein-grammar.js",
  "hv2-quiz.js",
  "hv1-order.js",
  "hv1-quiz.js",
  "service-worker.js",
  "manifest.webmanifest",
  "data/lv2_questions.js",
  "data/lv3_questions.js",
  "data/hv1_questions.js",
  "data/hv2_questions.js",
  "data/writing_questions.js",
  "data/baustein_questions.js",
  "data/speaking_questions.js",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-192.svg",
  "icons/icon-512.svg",
];
function copyFile(relativePath) {
  const from = path.join(root, relativePath);
  const to = path.join(dist, relativePath);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

function copyHv1Audio() {
  const source = path.join(root, "data", "audio", "hv1");
  if (!fs.existsSync(source)) return 0;
  const files = fs.readdirSync(source, { withFileTypes: true });
  let copied = 0;
  for (const entry of files) {
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".mp3")) continue;
    const relativePath = path.join("data", "audio", "hv1", entry.name);
    copyFile(relativePath);
    copied += 1;
  }
  return copied;
}

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

for (const file of files) copyFile(file);
const audioFiles = copyHv1Audio();
fs.writeFileSync(path.join(dist, ".nojekyll"), "");

console.log(`Built ${files.length} app files and ${audioFiles} compressed HV1 audio files into ${dist}`);
