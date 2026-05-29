"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export type LaunchKind = "product-launch" | "feature-launch";

type Step = {
  id: string;
  title: string;
  description: string;
  outputs: string[];
};

function Pill({ title }: { title: string }) {
  return (
    <div className="inline-flex items-center gap-3 hs-card px-4 py-3 shadow-card">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-dark text-white shadow-card">
        <span className="text-[12px] font-bold">AI</span>
      </div>
      <div className="min-w-0">
        <div className="truncate text-[13px] font-semibold text-text">{title}</div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-text3">
          <span className="inline-flex h-2.5 w-2.5 items-center justify-center">
            <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-border border-t-primary" />
          </span>
          <span className="truncate">Running across sources</span>
        </div>
      </div>
    </div>
  );
}

export function LaunchPlaybookDetailClient({ environmentId, kind }: { environmentId: string; kind: LaunchKind }) {
  const [running, setRunning] = useState(false);
  const [lastRunId, setLastRunId] = useState<string | null>(null);
  const [recentRuns, setRecentRuns] = useState<
    { id: string; status: string; kind: string; created_at: string }[]
  >([]);

  const meta = useMemo(() => {
    return kind === "feature-launch"
      ? {
          title: "Feature Launch",
          subtitle: "Execute feature rollouts with focused coordination and impact."
        }
      : {
          title: "Product Launch",
          subtitle: "Plan and execute product launches with clarity and alignment."
        };
  }, [kind]);

  const steps = useMemo<Step[]>(
    () => [
      {
        id: "insights",
        title: "Generate launch insights",
        description: "Run agentic research workflows across customer, competitor, and market signals.",
        outputs: ["Customer themes + buying triggers", "Competitor moves + narrative control", "Market signals + growth drivers"]
      },
      {
        id: "narrative",
        title: "Draft narrative",
        description: "Turn insights into a story: problem, differentiated value, proof, and positioning.",
        outputs: ["Launch narrative", "Positioning guide update", "Message map draft"]
      },
      {
        id: "gtm",
        title: "Build GTM plan",
        description: "Create a channel plan, checklist, timeline, and measurement plan tied to outcomes.",
        outputs: ["Channel plan + timeline", "Asset checklist", "Success metrics + tracking"]
      },
      {
        id: "enablement",
        title: "Generate sales enablement",
        description: "Generate ready-to-use enablement materials for sales and CS teams.",
        outputs: ["Battlecard + objections", "Email + call scripts", "Deck outline + talk track"]
      }
    ],
    []
  );

  async function runAgents() {
    setRunning(true);
    try {
      const res = await fetch("/api/agent-workflows/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ environmentId, kind })
      });
      const json = (await res.json()) as { runId?: string };
      setLastRunId(json.runId ?? null);
    } catch {
      setLastRunId(null);
    } finally {
      setRunning(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    const supabase = createSupabaseBrowserClient();
    (async () => {
      const { data } = await supabase
        .from("launch_playbook_runs")
        .select("id,status,kind,created_at")
        .eq("environment_id", environmentId)
        .order("created_at", { ascending: false })
        .limit(8);
      if (cancelled) return;
      setRecentRuns((data ?? []) as any);
    })();
    return () => {
      cancelled = true;
    };
  }, [environmentId, lastRunId]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-text3">
            <Link href="/dashboard/launch-playbook" className="hover:text-text">
              Launch Playbook
            </Link>
            <span>/</span>
            <span className="text-text2">{meta.title}</span>
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text" style={{ fontFamily: "var(--font-heading)" }}>
            {meta.title}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-text2">{meta.subtitle}</p>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text2">
            This playbook runs with <span className="font-medium text-text">agent workers</span> powered by{" "}
            <span className="font-medium text-text">Anthropic Claude Sonnet</span>. Outputs are saved into your Artifact Library.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/artifacts"
            className="inline-flex items-center justify-center hs-card2 px-4 py-2 text-[13px] font-medium text-text transition hover:bg-surface3"
          >
            Artifact Library
          </Link>
          <Link
            href={`/dashboard/launch-playbook/${kind}/final`}
            className="inline-flex items-center justify-center hs-card2 px-4 py-2 text-[13px] font-medium text-text transition hover:bg-surface3"
          >
            Final pack
          </Link>
          <button
            type="button"
            onClick={runAgents}
            disabled={running}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-[13px] font-semibold text-white shadow-lg shadow-focus transition hover:bg-primary-dark disabled:opacity-60"
          >
            {running ? "Running agents…" : "Run agents"}
          </button>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-bg/50 p-6">
        <div className="flex flex-col items-center">
          <Pill title="Agentic Launch Workflow" />

          <div className="mt-8 grid w-full gap-3 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, idx) => (
              <div key={s.id} className="relative">
                <div className="hs-card p-4 shadow-card">
                  <div className="flex items-center justify-between gap-3">
                    <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary-light font-mono text-[12px] font-semibold text-primary-dark">
                      {String(idx + 1).padStart(2, "0")}
                    </div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text3">Step</div>
                  </div>
                  <div className="mt-3 text-[15px] font-semibold text-text" style={{ fontFamily: "var(--font-heading)" }}>
                    {s.title}
                  </div>
                  <div className="mt-1 text-sm leading-relaxed text-text2">{s.description}</div>
                  <div className="mt-3 space-y-2">
                    {s.outputs.map((o) => (
                      <div key={o} className="flex items-center gap-2 hs-card2 px-3 py-2 text-sm text-text2">
                        <span className="text-[var(--color-teal)]">✓</span>
                        <span className="truncate">{o}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {idx < steps.length - 1 ? (
                  <svg
                    className="pointer-events-none absolute -right-3 top-1/2 hidden h-6 w-6 -translate-y-1/2 text-border lg:block"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden
                  >
                    <path d="M5 12h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M13 7l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      {lastRunId ? (
        <div className="mt-6 hs-card p-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(0,191,165,0.12)] text-[var(--color-teal)]">✓</span>
            <div>
              <div className="text-[13px] font-semibold text-heading">Agents queued</div>
              <div className="mt-0.5 text-[12px] text-text2">
                The workflow is running in the background. Artifacts will appear in the <Link href="/dashboard/artifacts" className="text-link hover:underline">Artifact Library</Link> once ready.
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-6 hs-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[13px] font-semibold text-text">Recent runs</div>
          <Link href="/dashboard/artifacts" className="text-[13px] font-medium text-link hover:underline">
            View artifacts
          </Link>
        </div>
        <div className="mt-4 space-y-2">
          {recentRuns.length === 0 ? (
            <div className="hs-card2 p-4 text-sm text-text2">
              No runs yet. Click <span className="font-medium text-text">Run agents</span> to generate your first artifact set.
            </div>
          ) : (
            recentRuns.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 hs-card2 p-4">
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold text-text">{r.kind}</div>
                  <div className="mt-0.5 text-xs text-text3">{new Date(r.created_at).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs ${
                      r.status === "completed"
                        ? "border-[rgba(0,191,165,0.35)] bg-[rgba(0,191,165,0.10)] text-[var(--color-teal)]"
                        : r.status === "failed"
                          ? "border-[rgba(242,84,91,0.35)] bg-[rgba(242,84,91,0.10)] text-[var(--color-error)]"
                          : "border-border bg-surface text-text2"
                    }`}
                  >
                    {r.status}
                  </span>
                  <span className="font-mono text-xs text-text2">{r.id.slice(0, 8)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}



