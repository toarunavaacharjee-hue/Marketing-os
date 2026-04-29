import React from "react";

function Pill({
  title,
  subtitle
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="inline-flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-card">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-dark text-white shadow-card">
        <span className="text-[12px] font-bold">AI</span>
      </div>
      <div className="min-w-0">
        <div className="truncate text-[13px] font-semibold text-text">{title}</div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-text3">
          <span className="inline-flex h-2.5 w-2.5 items-center justify-center">
            <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-border border-t-primary" />
          </span>
          <span className="truncate">{subtitle}</span>
        </div>
      </div>
    </div>
  );
}

function SmallNode({
  label,
  accentClass
}: {
  label: string;
  accentClass: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface2 px-4 py-3 shadow-sm">
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${accentClass} text-white shadow-sm`}>
        <span className="text-[12px] font-bold">{label.slice(0, 1).toUpperCase()}</span>
      </div>
      <div className="min-w-0">
        <div className="truncate text-[13px] font-semibold text-text">{label}</div>
        <div className="mt-0.5 text-xs text-text3">Research</div>
      </div>
    </div>
  );
}

export function AgentFlowShowcase() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Diagram 1: sources -> agent -> three research outputs */}
      <div className="saas-card relative overflow-hidden p-6 sm:p-7">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text3">AI agents</div>
        <h3 className="mt-2 text-xl font-semibold tracking-tight text-text" style={{ fontFamily: "var(--font-heading)" }}>
          Agentic research workflows
        </h3>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-text2">
          Background agent workers gather and structure signals across sources, then deliver reusable outputs that stay connected to your workspace context.
        </p>

        <div className="mt-6 rounded-2xl border border-border bg-bg/60 p-5">
          <div className="flex flex-wrap items-center justify-center gap-4">
            {["CRM", "Calls", "Reviews", "Reports", "News", "Websites"].map((s) => (
              <div key={s} className="text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-surface shadow-sm">
                  <span className="text-[11px] font-semibold text-text2">{s.slice(0, 1)}</span>
                </div>
                <div className="mt-2 text-[11px] font-medium text-text3">{s}</div>
              </div>
            ))}
          </div>

          <div className="relative mt-5 flex flex-col items-center">
            <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
              <path d="M50% 10 L50% 28" stroke="var(--border)" strokeWidth="2" opacity="0.9" />
              <path d="M12% 30 C30% 40, 40% 44, 50% 46" stroke="var(--border)" strokeWidth="2" opacity="0.6" fill="none" />
              <path d="M88% 30 C70% 40, 60% 44, 50% 46" stroke="var(--border)" strokeWidth="2" opacity="0.6" fill="none" />
              <path d="M50% 46 L50% 62" stroke="var(--border)" strokeWidth="2" opacity="0.9" />
              <path d="M20% 70 C30% 70, 36% 70, 46% 70" stroke="var(--border)" strokeWidth="2" opacity="0.6" fill="none" />
              <path d="M80% 70 C70% 70, 64% 70, 54% 70" stroke="var(--border)" strokeWidth="2" opacity="0.6" fill="none" />
            </svg>

            <div className="mt-2">
              <Pill title="Agentic Research Workflow" subtitle="Running across sources" />
            </div>

            <div className="mt-10 grid w-full gap-3 md:grid-cols-3">
              <SmallNode label="Customer" accentClass="bg-[#6d5cff]" />
              <SmallNode label="Competitor" accentClass="bg-[#00bfa5]" />
              <SmallNode label="Market" accentClass="bg-[#ff8f00]" />
            </div>
          </div>
        </div>

        <div className="mt-4 text-xs text-text3">
          Powered by <span className="font-medium text-text2">Anthropic Claude (Sonnet)</span> and governed by agent-worker guardrails.
        </div>
      </div>

      {/* Diagram 2: frameworks -> artifacts */}
      <div className="saas-card relative overflow-hidden p-6 sm:p-7">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text3">Outputs</div>
        <h3 className="mt-2 text-xl font-semibold tracking-tight text-text" style={{ fontFamily: "var(--font-heading)" }}>
          From frameworks to reusable artifacts
        </h3>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-text2">
          Agents generate structured artifacts your team can reuse across launches, channels, and enablement — not one-off responses.
        </p>

        <div className="mt-6 rounded-2xl border border-border bg-bg/60 p-5">
          <div className="relative flex flex-col items-center">
            <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
              <path d="M50% 12 L50% 30" stroke="var(--border)" strokeWidth="2" opacity="0.9" />
              <path d="M50% 30 C35% 40, 30% 44, 26% 54" stroke="var(--border)" strokeWidth="2" opacity="0.6" fill="none" />
              <path d="M50% 30 C65% 40, 70% 44, 74% 54" stroke="var(--border)" strokeWidth="2" opacity="0.6" fill="none" />
              <path d="M26% 54 C28% 72, 40% 78, 50% 84" stroke="var(--border)" strokeWidth="2" opacity="0.5" fill="none" />
              <path d="M74% 54 C72% 72, 60% 78, 50% 84" stroke="var(--border)" strokeWidth="2" opacity="0.5" fill="none" />
            </svg>

            <Pill title="Workbench Frameworks" subtitle="Running across sources" />

            <div className="mt-10 grid w-full gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-surface2 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-[13px] font-semibold text-text">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#6d5cff] text-white">A</span>
                  Core artifact
                </div>
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text2">
                  <span className="text-[#00bfa5]">✓</span> Positioning Guide
                </div>
              </div>
              <div className="rounded-xl border border-border bg-surface2 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-[13px] font-semibold text-text">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#00bfa5] text-white">A</span>
                  Core artifact
                </div>
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text2">
                  <span className="text-[#00bfa5]">✓</span> Message Map
                </div>
              </div>
            </div>

            <div className="mt-6 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text2">
              Result: a shared artifact library your team can execute from.
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <div className="rounded-full border border-border bg-surface2 px-3 py-1 text-xs text-text2">
            Uses Claude Sonnet via Anthropic API
          </div>
          <div className="rounded-full border border-border bg-surface2 px-3 py-1 text-xs text-text2">
            Runs asynchronously with agent workers
          </div>
        </div>
      </div>
    </div>
  );
}
