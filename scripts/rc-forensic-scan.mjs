import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const roots = ["src/screens", "src/components", "src/navigation"];
const forbiddenRuntimePatterns = [
  { pattern: /SAMPLE_(LINES|DOCS)/, label: "mock sample commerce data" },
  { pattern: /ORDER_VALUE\s*=\s*\d/, label: "hardcoded order value" },
  { pattern: /SUBMISSION_BACKEND_READY\s*=\s*false/, label: "artificial registration block" },
];

const allowedPlaceholderContexts = [
  "placeholderTextColor",
  "placeholder=",
  "Product image unavailable",
  "styles.placeholder",
  "placeholderText",
];

function walk(path, files = []) {
  for (const entry of readdirSync(path)) {
    const absolute = join(path, entry);
    if (statSync(absolute).isDirectory()) walk(absolute, files);
    else if (/\.(tsx|ts)$/.test(entry)) files.push(absolute);
  }
  return files;
}

const findings = [];

for (const root of roots) {
  for (const file of walk(root)) {
    const source = readFileSync(file, "utf8");
    const lines = source.split("\n");
    lines.forEach((line, index) => {
      if (line.trim().startsWith("//")) return;
      for (const { pattern, label } of forbiddenRuntimePatterns) {
        if (pattern.test(line)) {
          findings.push({ file: relative(".", file), line: index + 1, label, text: line.trim() });
        }
      }
      if (/\b(TODO|FIXME)\b/.test(line) && !line.includes("@ts-")) {
        findings.push({ file: relative(".", file), line: index + 1, label: "TODO/FIXME", text: line.trim() });
      }
      if (/\b(mock|dummy)\b/i.test(line) && !allowedPlaceholderContexts.some((ctx) => line.includes(ctx))) {
        findings.push({ file: relative(".", file), line: index + 1, label: "mock/dummy keyword", text: line.trim() });
      }
    });
  }
}

if (findings.length) {
  console.error("RC forensic scan findings:\n" + findings.map((f) => `- ${f.file}:${f.line} [${f.label}] ${f.text}`).join("\n"));
  process.exit(1);
}

console.log("RC forensic scan passed: no accidental runtime placeholders detected.");
