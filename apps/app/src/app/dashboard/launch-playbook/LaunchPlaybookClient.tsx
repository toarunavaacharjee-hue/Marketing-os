"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { ModuleShell } from "@/app/dashboard/_components/ModuleShell";

const LAUNCH_TYPES = [
  {
    kind: "product-launch" as const,
    label: "Product Launch",
    description:
      "Full launch workflow for a new product or major release. Reads your ICP, positioning, and market research to generate a complete artifact set.",
    outputs: ["Positioning guide", "Message map", "GTM plan + timeline", "Sales enablement pack"],
    color: "bg-primary",
    letter: "P"
  },
  {
    kind: "feature-launch" as const,
    label: "Feature Launch",
    description:
      "Focused workflow for rolling out a feature update. Generates a targeted narrative and enablement materials tied to your segment context.",
    outputs: ["Feature positioning guide", "Segment-specific message map", "Channel plan + asset list", "Battlecard + call scripts"],
    color: "bg-[#2563eb]",
    letter: "F"
  }
];

type RecentRun = {
  id: string;
  kind: string;
  status: string;
  created_at: string;
  input_json: { launchName?: string; tier?: string } | null;
};

function statusBadge(status: string) {
  if (status === "completed")
    return (
      <span className="rounded-full border border-[rgba(0,191,165,0.3)] bg-[rgba(0,191,165,0.08)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--color-teal)]">
        Completed
      </span>
    );
  if (status === "failed")
    return (
      <span className="rounded-full border border-[rgba(242,84,91,0.3)] bg-[rgba(242,84,91,0.08)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--color-error)]">
        Failed
      </span>
    );
  if (status === "running")
    return (
      <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-700">
        Running
      </span>
    );
  return (
    <span className="rounded-full border border-border bg-surface2 px-2.5 py-0.5 text-[11px] font-medium text-text3">
      {status}
    </span>
  );
}

export function LaunchPlaybookClient({ environmentId }: { environmentId: string }) {
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [recentRuns, setRecentRuns] = useState<RecentRun[]>([]);
  const pickerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createSupabaseBrowserClient();
    (async () => {
      const { data } = await supabase
        .from("launch_playbook_runs")
        .select("id,kind,status,created_at,input_json")
        .eq("environment_id", environmentId)
        .order("created_at", { ascending: false })
        .limit(6);
      if (cancelled) return;
      setRecentRuns((data ?? []) as RecentRun[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [environmentId]);

  return (
    <ModuleShell
      title="Launch Playbook"
      subtitle="Fill in a launch brief, run AI agents, and get a positioning guide, message map, GTM plan, and sales enablement pack — all saved to your Artifact Library and ready to use across modules."
      actions={
        <>
          <Link href="/dashboard/artifacts" className="hs-btn hs-btn-secondary">
            Artifact Library
          </Link>
          <div className="relative" ref={pickerRef}>
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              className="hs-btn hs-btn-primary gap-2"
              aria-haspopup="menu"
              aria-expanded={pickerOpen}
            >
              New launch <span aria-hidden>▾</span>
            </button>
            {pickerOpen && (
              <div
                role="menu"
                aria-label="Choose launch type"
                className="absolute right-0 top-[calc(100%+8px)] z-10 w-[260px] overflow-hidden hs-card text-text shadow-dropdown"
              >
                {LAUNCH_TYPES.map((t) => (
                  <button
                    key={t.kind}
                    type="button"
                    role="menuitem"
                    className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface2"
                    onClick={() => {
                      setPickerOpen(false);
                      router.push(`/dashboard/launch-playbook/${t.kind}`);
                    }}
                  >
                    <span
                      className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${t.color} text-xs font-bold text-white`}
                    >
                      {t.letter}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-heading">{t.label}</span>
                      <span className="mt-0.5 block text-xs text-text2">{t.description.split(".")[0]}.</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      }
    >
      {/* How it works */}
      <div className="hs-card p-6">
        <div className="text-[13px] font-semibold uppercase tracking-wide text-text3">How it works</div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {[
            {
              n: "01",
              label: "Fill in the brief",
              detail: "Name the launch, describe what you're launching, set the date and tier, pick your ICP segment."
            },
            {
              n: "02",
              label: "Run the agents",
              detail: "The AI reads your ICP, positioning canvas, and market research to generate 4 artifacts."
            },
            {
              n: "03",
              label: "Review the artifacts",
              detail: "Positioning guide, message map, GTM plan, and sales enablement pack — saved to Artifact Library."
            },
            {
              n: "04",
              label: "Use across modules",
              detail: "Copy narratives into Campaigns, use the GTM checklist in GTM Planner, share the battlecard with sales."
            }
          ].map((s) => (
            <div key={s.n} className="hs-card2 p-4">
              <div className="text-[11px] font-bold text-text3">{s.n}</div>
              <div className="mt-1.5 text-[13px] font-semibold text-heading">{s.label}</div>
              <div className="mt-1 text-[12px] leading-relaxed text-text2">{s.detail}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Launch type cards */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {LAUNCH_TYPES.map((t) => (
          <Link
            key={t.kind}
            href={`/dashboard/launch-playbook/${t.kind}`}
            className="hs-card hs-card-hover group overflow-hidden"
          >
            <div className="flex items-center gap-4 border-b border-border bg-surface2 px-5 py-4">
              <span
                className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${t.color} text-sm font-bold text-white`}
              >
                {t.letter}
              </span>
              <div>
                <div className="text-[15px] font-semibold text-heading group-hover:text-primary">{t.label}</div>
                <div className="mt-0.5 text-[12px] text-text2">AI workflow → 4 artifacts</div>
              </div>
            </div>
            <div className="px-5 py-4">
              <p className="text-[13px] leading-relaxed text-text2">{t.description}</p>
              <div className="mt-4 space-y-1.5">
                {t.outputs.map((o) => (
                  <div key={o} className="flex items-center gap-2 text-[12px] text-text2">
                    <span className="text-[var(--color-teal)]">✓</span>
                    <span>{o}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-[12px] font-semibold text-primary">Open brief form →</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent launches */}
      <div className="mt-4 hs-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[14px] font-semibold text-heading">Recent launches</div>
          <Link href="/dashboard/artifacts" className="text-[12px] font-medium text-link hover:underline">
            View all artifacts
          </Link>
        </div>

        {recentRuns.length === 0 ? (
          <div className="mt-4 hs-card2 rounded-xl p-4 text-[13px] text-text2">
            No launches yet. Click <span className="font-medium text-text">New launch</span> above to run your first
            workflow.
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {recentRuns.map((r) => {
              const name =
                r.input_json?.launchName ?? (r.kind === "feature-launch" ? "Feature Launch" : "Product Launch");
              const kindLabel = r.kind === "feature-launch" ? "Feature" : "Product";
              return (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 hs-card2 rounded-xl px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold text-heading">{name}</div>
                    <div className="mt-0.5 text-[11px] text-text3">
                      {kindLabel} launch · {new Date(r.created_at).toLocaleDateString()}
                      {r.input_json?.tier ? ` · ${r.input_json.tier}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusBadge(r.status)}
                    {r.status === "completed" && (
                      <Link
                        href="/dashboard/artifacts"
                        className="text-[12px] font-medium text-link hover:underline"
                      >
                        View artifacts
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Artifact Library relationship */}
      <div className="mt-4 hs-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <div className="text-[14px] font-semibold text-heading">Where do outputs go?</div>
            <div className="mt-1.5 text-[13px] leading-relaxed text-text2">
              Every artifact generated by a playbook run is saved to your{" "}
              <strong className="text-text">Artifact Library</strong>. From there you can review each artifact in
              full, share it with teammates, or copy the content into Campaigns, GTM Planner, or Battlecards.
            </div>
          </div>
          <Link href="/dashboard/artifacts" className="hs-btn hs-btn-secondary shrink-0">
            Open Artifact Library →
          </Link>
        </div>
      </div>
    </ModuleShell>
  );
}
