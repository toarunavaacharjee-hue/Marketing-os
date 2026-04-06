import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const files = [
  "src/app/dashboard/copilot/page.tsx",
  "src/app/dashboard/settings/product/ProductProfileClient.tsx",
  "src/app/onboarding/page.tsx",
  "src/app/dashboard/work/AllWorkClient.tsx",
  "src/app/dashboard/positioning-studio/PositioningStudioClient.tsx",
  "src/app/dashboard/messaging-artifacts/MessagingArtifactsClient.tsx",
  "src/app/dashboard/icp-segmentation/IcpSegmentationClient.tsx",
  "src/app/dashboard/battlecards/page.tsx",
  "src/app/dashboard/_components/InsightWorkbench.tsx",
  "src/app/dashboard/_components/CreationWorkbench.tsx",
  "src/app/dashboard/market-research/MarketResearchClient.tsx"
];

function strip(s) {
  let o = s.replace(/\r\n/g, "\n");

  o = o.replace(
    /const ANTHROPIC_KEY_STORAGE = ["']marketing_os_anthropic_api_key["'];\n\n?/g,
    ""
  );

  // Remove key read blocks before fetch (multiline flexible)
  o = o.replace(
    /\n\s*const key\d* = \(typeof window[^;]+;\n/g,
    "\n"
  );
  o = o.replace(
    /\n\s*const key = \(window\.localStorage\.getItem\([^)]+\)[^;]+;\n/g,
    "\n"
  );
  o = o.replace(
    /\n\s*const key = \(typeof window[\s\S]*?;\n/g,
    "\n"
  );
  o = o.replace(
    /\n\s*const key2 = \(window\.localStorage\.getItem\([^)]+\)[^;]+;\n/g,
    "\n"
  );
  o = o.replace(
    /\n\s*const storedKey = useMemo\(\(\) => \{[\s\S]*?\}, \[\]\);\n\n?/g,
    "\n"
  );

  o = o.replace(
    /\s*\.\.\.\(key\d* \? \{ "x-anthropic-key": key\d* \} : \{\}\)/g,
    ""
  );
  o = o.replace(/\s*\.\.\.\(key \? \{ "x-anthropic-key": key \} : \{\}\)/g, "");
  o = o.replace(
    /\s*\.\.\.\(storedKey \? \{ "x-anthropic-key": storedKey \} : \{\}\)/g,
    ""
  );

  o = o.replace(/headers:\s*key \? \{ "x-anthropic-key": key \} : \{\}/g, 'headers: { "content-type": "application/json" }');
  o = o.replace(
    /headers:\s*key \? \{ "x-anthropic-key": key \} : \{\},/g,
    'headers: { "content-type": "application/json" },'
  );

  return o;
}

for (const rel of files) {
  const fp = path.join(root, rel);
  if (!fs.existsSync(fp)) {
    console.error("missing", rel);
    process.exit(1);
  }
  const orig = fs.readFileSync(fp, "utf8");
  let next = strip(orig);
  if (next.includes("x-anthropic-key") || next.includes("marketing_os_anthropic")) {
    console.error("still has anthropic header refs:", rel);
    process.exit(1);
  }
  fs.writeFileSync(fp, next.replace(/\n/g, orig.includes("\r\n") ? "\r\n" : "\n"));
  console.log("ok", rel);
}
