const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const pdfPath = path.join(root, "2026全套（更新以腾讯文档为准）_前半部分_1-153页.pdf");
const outPath = path.join(root, "data", "pdf_text.txt");

fs.mkdirSync(path.dirname(outPath), { recursive: true });

const text = execFileSync("pdftotext", ["-layout", pdfPath, "-"], {
  cwd: root,
  encoding: "utf8",
  maxBuffer: 30 * 1024 * 1024,
});

fs.writeFileSync(outPath, text);
console.log(`Extracted PDF text to ${outPath}`);
