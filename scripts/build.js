const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
const files = [
  "index.html",
  "styles.css",
  "app.js",
  "service-worker.js",
  "manifest.webmanifest",
  "data/lv2_questions.js",
  "data/lv2_v2_questions.js",
  "data/lv3_questions.js",
  "data/hv1_questions.js",
  "data/hv2_questions.js",
  "data/writing_questions.js",
  "data/baustein_questions.js",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-192.svg",
  "icons/icon-512.svg",
];
const filesWithoutAudio = new Set(["data/hv1_questions.js"]);

function copyFile(relativePath) {
  const from = path.join(root, relativePath);
  const to = path.join(dist, relativePath);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  if (filesWithoutAudio.has(relativePath)) {
    const contents = fs
      .readFileSync(from, "utf8")
      .replace(/,\n\s*"audio":\s*"[^"]*"/g, "");
    fs.writeFileSync(to, contents);
    return;
  }
  fs.copyFileSync(from, to);
}

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

for (const file of files) copyFile(file);
fs.writeFileSync(path.join(dist, ".nojekyll"), "");

console.log(`Built ${files.length} files into ${dist} without audio assets`);
