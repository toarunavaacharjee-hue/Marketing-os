import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function patch(rel, fn) {
  const fp = path.join(__dirname, "..", rel);
  let s = fs.readFileSync(fp, "utf8").replace(/\r\n/g, "\n");
  s = fn(s);
  fs.writeFileSync(fp, s.replace(/\n/g, "\r\n"));
  console.log("ok", rel);
}

patch("src/app/dashboard/copilot/page.tsx", (s) =>
  s.replace(
    `    try {\n      const key =\n        typeof window !== "undefined"\n          ? (window.localStorage.getItem(ANTHROPIC_KEY_STORAGE) ?? "").trim()\n          : "";\n\n      const res = await fetch`,
    `    try {\n      const res = await fetch`
  )
);

patch("src/app/dashboard/_components/InsightWorkbench.tsx", (s) =>
  s
    .replace(
      /\n    const key = \(window\.localStorage\.getItem\("marketing_os_anthropic_api_key"\) \?\? ""\)\.trim\(\);\n/g,
      "\n"
    )
    .replace(
      /headers:\s*key \? \{ "x-anthropic-key": key \} : \{\}/g,
      'headers: { "content-type": "application/json" }'
    )
    .replace(/\s*\.\.\.\(key \? \{ "x-anthropic-key": key \} : \{\}\)/g, "")
);

patch("src/app/dashboard/_components/CreationWorkbench.tsx", (s) =>
  s
    .replace(
      /\n    const key = \(window\.localStorage\.getItem\("marketing_os_anthropic_api_key"\) \?\? ""\)\.trim\(\);\n/g,
      "\n"
    )
    .replace(/\s*\.\.\.\(key \? \{ "x-anthropic-key": key \} : \{\}\)/g, "")
);
