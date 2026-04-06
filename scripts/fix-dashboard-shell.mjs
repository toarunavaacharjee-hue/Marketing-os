import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const p = path.join(__dirname, "../src/app/dashboard/DashboardShell.tsx");
let s = fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n");

const old = `  const [anthropicKey, setAnthropicKey] = useState("");
  useEffect(() => {
    const v =
      typeof window !== "undefined"
        ? window.localStorage.getItem(ANTHROPIC_KEY_STORAGE)
        : null;
    if (v) setAnthropicKey(v);
  }, []);

  const keyEntered = anthropicKey.trim().startsWith("sk-ant-");
  const [aiStatus, setAiStatus] = useState<
    "idle" | "checking" | "connected" | "error"
  >("idle");
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function ping() {
      if (!keyEntered) {
        setAiStatus("idle");
        setAiError(null);
        return;
      }

      setAiStatus("checking");
      setAiError(null);

      try {
        const res = await fetch("/api/ai/ping", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-anthropic-key": anthropicKey.trim()
          }
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (cancelled) return;

        if (!res.ok || !data.ok) {
          setAiStatus("error");
          setAiError(data.error ?? "Could not connect.");
          return;
        }

        setAiStatus("connected");
      } catch (e) {
        if (cancelled) return;
        setAiStatus("error");
        setAiError(e instanceof Error ? e.message : "Could not connect.");
      }
    }

    const t = window.setTimeout(ping, 600);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [keyEntered, anthropicKey]);`;

const neu = `  const [workspaceKeyConfigured, setWorkspaceKeyConfigured] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/settings/workspace-ai-key");
        const data = (await res.json()) as { configured?: boolean };
        if (!cancelled) setWorkspaceKeyConfigured(Boolean(data.configured));
      } catch {
        if (!cancelled) setWorkspaceKeyConfigured(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedCompanyId]);

  const [aiStatus, setAiStatus] = useState<
    "idle" | "checking" | "connected" | "error"
  >("idle");
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function ping() {
      if (!workspaceKeyConfigured) {
        setAiStatus("idle");
        setAiError(null);
        return;
      }

      setAiStatus("checking");
      setAiError(null);

      try {
        const res = await fetch("/api/ai/ping", {
          method: "POST",
          headers: {
            "content-type": "application/json"
          }
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (cancelled) return;

        if (!res.ok || !data.ok) {
          setAiStatus("error");
          setAiError(data.error ?? "Could not connect.");
          return;
        }

        setAiStatus("connected");
      } catch (e) {
        if (cancelled) return;
        setAiStatus("error");
        setAiError(e instanceof Error ? e.message : "Could not connect.");
      }
    }

    const t = window.setTimeout(ping, 600);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [workspaceKeyConfigured]);`;

if (!s.includes(old.slice(0, 80))) {
  console.error("first block not found");
  process.exit(1);
}
s = s.replace(old, neu);

const i0 = s.indexOf(`<details className="group rounded-xl border border-border bg-surface2 px-3 py-2">`);
const i1 = s.indexOf(`</details>`, i0);
if (i0 < 0 || i1 < 0) {
  console.error("details block not found");
  process.exit(1);
}
const before = s.slice(0, i0);
const after = s.slice(i1 + `</details>`.length);
const neuDetails = `<details className="group rounded-xl border border-border bg-surface2 px-3 py-2">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[11px] font-semibold text-text2 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2">
                <span
                  className={\`h-2 w-2 rounded-full \${workspaceKeyConfigured ? "bg-green" : "bg-white/20"}\`}
                  aria-hidden
                />
                Workspace AI
              </span>
              <span className="text-text3 transition group-open:rotate-90">›</span>
            </summary>

            <div className="mt-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[10px] font-semibold uppercase tracking-[0.5px] text-text3">
                  Anthropic (this workspace)
                </div>
                <div
                  className={\`rounded-full px-2 py-0.5 text-[10px] font-semibold \${
                    workspaceKeyConfigured
                      ? "bg-[rgba(52,211,153,0.15)] text-green"
                      : "bg-[rgba(251,191,36,0.15)] text-yellow"
                  }\`}
                >
                  {workspaceKeyConfigured ? "CONFIGURED" : "NOT SET"}
                </div>
              </div>
              {workspaceKeyConfigured ? (
                <div className="mt-2 text-[11px] text-text2">
                  {aiStatus === "checking" ? (
                    <span>Checking connection…</span>
                  ) : aiStatus === "connected" ? (
                    <span className="text-green">Connected</span>
                  ) : aiStatus === "error" ? (
                    <span className="text-red">
                      Not connected{aiError ? \` — \${aiError}\` : ""}
                    </span>
                  ) : null}
                </div>
              ) : (
                <div className="mt-2 text-[11px] text-text2">
                  An owner or admin can add the workspace key under Settings → AI integration.
                </div>
              )}
              <Link
                href="/dashboard/settings"
                onClick={onNavigate}
                className="mt-2 inline-block text-[11px] font-semibold text-accent2 hover:underline"
              >
                Open Settings
              </Link>
            </div>
          </details>`;

s = before + neuDetails + after;

fs.writeFileSync(p, s.replace(/\n/g, "\r\n"));
console.log("ok");
