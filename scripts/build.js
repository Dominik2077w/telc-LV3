const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
const files = [
  "index.html",
  "styles.css",
  "app.js",
  "manifest.webmanifest",
  "service-worker.js",
  "data/lv2_questions.js",
  "data/lv3_questions.js",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-192.svg",
  "icons/icon-512.svg",
];

function copyFile(relativePath) {
  const from = path.join(root, relativePath);
  const to = path.join(dist, relativePath);
  fs.mkdirSync(path.dirname(to), { recursive: true });

  if (relativePath === "service-worker.js") {
    const content = fs
      .readFileSync(from, "utf8")
      .replace(/const CACHE_VERSION = ".+?";/, `const CACHE_VERSION = "${Date.now()}";`);
    fs.writeFileSync(to, content);
    return;
  }

  fs.copyFileSync(from, to);
}

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

for (const file of files) copyFile(file);

console.log(`Built ${files.length} files into ${dist}`);
