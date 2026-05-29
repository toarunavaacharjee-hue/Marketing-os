"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ModuleShell } from "@/app/dashboard/_components/ModuleShell";

const LAUNCH_TYPES = [
  {
    kind: "product-launch" as const,
    label: "Product Launch",
    description: "Full launch workflow: market insights, positioning, GTM plan, and sales enablement for a new product.",
    outputs: ["Positioning guide", "Launch narrative + message map", "GTM checklist + timeline", "Sales enablement pack"],
    color: "bg-primary",
    letter: "P"
  },
  {
    kind: "feature-launch" as const,
    label: "Feature Launch",
    description: "Focused workflow for rolling out a feature: customer context, release narrative, channel plan, and rep materials.",
    outputs: ["Customer themes + buying triggers", "Release narrative", "Channel plan + asset checklist", "Battlecard + call scripts"],
    color: "bg-[#2563eb]",
    letter: "F"
  }
];

export function LaunchPlaybookClient({ environmentId }: { environmentId: string }) {
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement | null>(null);

  void environmentId;

  return (
    <ModuleShell
      title="Launch Playbook"
      subtitle="Choose a launch type to run an AI workflow that generates your positioning guide, narrative, GTM plan, and sales enablement pack — all saved to your Artifact Library."
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
            {pickerOpen ? (
              <div
                role="menu"
                aria-label="Choose launch type"
                className="absolute right-0 top-[calc(100%+8px)] w-[260px] overflow-hidden hs-card text-text shadow-dropdown z-10"
              >
                {LAUNCH_TYPES.map((t, i) => (
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
                    <span className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${t.color} text-xs font-bold text-white`}>
                      {t.letter}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-heading">{t.label}</span>
                      <span className="mt-0.5 block text-xs text-text2">{t.description.split(".")[0]}.</span>
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </>
      }
    >
      {/* How it works */}
      <div className="hs-card p-6">
        <div className="text-[13px] font-semibold uppercase tracking-wide text-text3">How it works</div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {[
            { n: "01", label: "Pick a launch type", detail: "Product launch or feature launch — each runs a different workflow." },
            { n: "02", label: "Run the AI workflow", detail: "Click Run agents. The AI researches, writes, and structures the outputs." },
            { n: "03", label: "Review the artifacts", detail: "Outputs are saved to Artifact Library — positioning guide, narrative, GTM plan, enablement pack." },
            { n: "04", label: "Use across modules", detail: "Copy to Campaigns, GTM Planner, Battlecards, or share with your team." }
          ].map((s) => (
            <div key={s.n} className="hs-card2 p-4">
              <div className="text-[11px] font-bold text-text3">{s.n}</div>
              <div className="mt-1.5 text-[13px] font-semibold text-heading">{s.label}</div>
              <div className="mt-1 text-[12px] leading-relaxed text-text2">{s.detail}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Launch types */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {LAUNCH_TYPES.map((t) => (
          <Link
            key={t.kind}
            href={`/dashboard/launch-playbook/${t.kind}`}
            className="hs-card hs-card-hover group overflow-hidden"
          >
            <div className="flex items-center gap-4 border-b border-border bg-surface2 px-5 py-4">
              <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${t.color} text-sm font-bold text-white`}>
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
              <div className="mt-4 text-[12px] font-semibold text-primary">
                Open workflow →
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Relationship to Artifact Library */}
      <div className="hs-card mt-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <div className="text-[14px] font-semibold text-heading">Where do outputs go?</div>
            <div className="mt-1.5 text-[13px] leading-relaxed text-text2">
              Every artifact generated by a playbook run — positioning guides, message maps, GTM plans, and sales packs — is saved to your <strong className="text-text">Artifact Library</strong>. From there you can review, copy, or link them to other modules like Campaigns or Battlecards.
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
