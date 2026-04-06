import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const base = __dirname;

function patch(rel, pairs) {
  const p = path.join(base, rel);
  let s = fs.readFileSync(p, "utf8");
  for (const [a, b] of pairs) {
    if (!s.includes(a)) throw new Error(`Missing in ${rel}: ${a.slice(0, 80)}`);
    s = s.split(a).join(b);
  }
  fs.writeFileSync(p, s, "utf8");
  console.log("patched", rel);
}

patch("src/lib/anthropic/resolveWorkspaceAnthropicKey.ts", [
  [
    "No Anthropic access for this workspace yet. Your operator can set ANTHROPIC_API_KEY for Starter workspaces, or a workspace admin can add a key under Settings → AI integration.",
    "No Anthropic access for this workspace yet. Your operator can set ANTHROPIC_API_KEY for Starter, Free, and Growth workspaces, or a workspace admin can add a key under Settings → AI integration."
  ],
  [
    "This workspace needs its own Anthropic API key. A workspace owner or admin can add one under Settings → AI integration (required on Growth and Enterprise).",
    "This workspace needs its own Anthropic API key. A workspace owner or admin can add one under Settings → AI integration (required on Enterprise)."
  ]
]);

patch("src/app/dashboard/settings/SettingsClient.tsx", [
  [
    `<span className="font-medium text-text">Starter and Free</span> workspaces can use{" "}
            <span className="font-medium text-text">platform AI</span> (operator{" "}
            <span className="font-mono text-xs">ANTHROPIC_API_KEY</span>) with no setup.{" "}
            <span className="font-medium text-text">Growth and Enterprise</span> must add a workspace key below.{" "}`,
    `<span className="font-medium text-text">Starter, Free, and Growth</span> workspaces can use{" "}
            <span className="font-medium text-text">platform AI</span> (operator{" "}
            <span className="font-mono text-xs">ANTHROPIC_API_KEY</span>) with no setup.{" "}
            <span className="font-medium text-text">Enterprise</span> must add a workspace key below.{" "}`
  ]
]);

patch("src/app/dashboard/DashboardShell.tsx", [
  [
    `Starter/Free may use platform AI when enabled; Growth+ need a workspace key. Open Settings → AI
                  integration.`,
    `Enterprise needs a workspace key; Starter, Free, and Growth may use platform AI when enabled. Open
                  Settings → AI integration.`
  ]
]);
