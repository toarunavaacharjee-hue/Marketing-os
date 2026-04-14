/**
 * Map legacy dark-theme Tailwind arbitrary colors to AIMW semantic tokens under src/app/dashboard.
 * Run: node scripts/replace-dashboard-legacy-colors.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "src", "app", "dashboard");

/** @type {Array<[RegExp, string]>} */
const REPLACEMENTS = [
  [/text-\[#f0f0f8\]/g, "text-heading"],
  [/text-\[#9090b0\]/g, "text-text2"],
  [/text-\[#5c6278\]/g, "text-text3"],
  [/text-\[#c4b8ff\]/g, "text-primary"],
  [/text-\[#fafafc\]/g, "text-heading"],
  [/text-\[#0a0a0c\]/g, "text-heading"],
  [/text-\[#e8e6ff\]/g, "text-heading"],
  [/text-red-200/g, "text-red"],
  [/bg-\[#141420\]\/60/g, "bg-surface2"],
  [/bg-\[#141420\]/g, "bg-surface"],
  [/border-\[#2a2e3f\]/g, "border-border"],
  [/border-\[#7c6cff\]/g, "border-primary"],
  [/bg-\[#1e1e2e\]/g, "bg-primary-light"],
  [/bg-\[#7c6cff\]/g, "bg-primary"],
  [/bg-\[#b8ff6c\]/g, "bg-amber"],
  [/hover:bg-\[#c8ff7c\]/g, "hover:bg-amber-hover"],
  [/hover:bg-\[#8b7cff\]/g, "hover:bg-primary-dark"],
  [/hover:bg-\[#5b52ee\]/g, "hover:bg-primary-dark"],
  [/bg-\[#7c6cff\]\/20/g, "bg-primary-light"],
  [/bg-\[#7c6cff\]\/10/g, "bg-primary/10"],
  [/bg-\[#7c6cff\]\/15/g, "bg-primary/15"],
  [/border-\[#7c6cff\]\/40/g, "border-primary/40"],
  [/border-\[#7c6cff\]\/35/g, "border-primary/35"],
  [/border-\[#7c6cff\]\/25/g, "border-primary/25"],
  [/from-\[#7c6cff\]/g, "from-primary"],
  [/to-\[#5a4fd4\]/g, "to-primary-dark"],
  [/ring-\[#7c6cff\]/g, "ring-primary"],
  [/bg-black\/20/g, "bg-surface2"],
  [/bg-black\/30/g, "bg-surface3"],
  [/hover:bg-white\/5/g, "hover:bg-surface2"],
  [/hover:border-\[#3a3e4f\]/g, "hover:border-primary/30"],
  [/rounded-2xl border border-dashed border-\[#2a2e3f\]/g, "rounded-lg border border-dashed border-border"]
];

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name);
    if (name.isDirectory()) walk(p, out);
    else if (name.name.endsWith(".tsx")) out.push(p);
  }
  return out;
}

let changed = 0;
for (const file of walk(root)) {
  let s = fs.readFileSync(file, "utf8");
  const orig = s;
  for (const [re, to] of REPLACEMENTS) {
    s = s.replace(re, to);
  }
  if (s !== orig) {
    fs.writeFileSync(file, s, "utf8");
    changed++;
    console.log("updated:", path.relative(path.join(__dirname, ".."), file));
  }
}
console.log("files changed:", changed);

/** Pass 2: remaining one-offs */
const PASS2 = [
  [/text-\[#7c6cff\]/g, "text-primary"],
  [/text-\[#707090\]/g, "text-text3"],
  [/text-\[#b8ff6c\]/g, "text-teal"],
  [/border-\[#b8ff6c\]\/40/g, "border-teal/40"],
  [/border-\[#b8ff6c\]\/30/g, "border-teal/30"],
  [/ring-\[#b8ff6c\]\/40/g, "ring-teal/40"],
  [/hover:text-\[#ddd6ff\]/g, "hover:text-primary-dark"],
  [/hover:bg-\[#6c63ff\]/g, "hover:bg-primary-dark"],
  [/hover:text-\[#a39cff\]/g, "hover:text-primary-dark"],
  [/bg-\[#08080c\]/g, "bg-page"],
  [/ring-\[#2a2e3f\]/g, "ring-border"],
  [/text-\[#2a2e3f\]/g, "text-text3"],
  [/accent-\[#7c6cff\]/g, "accent-[var(--color-primary)]"]
];

let changed2 = 0;
for (const file of walk(root)) {
  let s = fs.readFileSync(file, "utf8");
  const orig = s;
  for (const [re, to] of PASS2) {
    s = s.replace(re, to);
  }
  if (s !== orig) {
    fs.writeFileSync(file, s, "utf8");
    changed2++;
    console.log("pass2:", path.relative(path.join(__dirname, ".."), file));
  }
}
console.log("pass2 files changed:", changed2);
