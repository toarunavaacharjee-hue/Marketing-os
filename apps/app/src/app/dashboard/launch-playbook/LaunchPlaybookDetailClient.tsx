"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export type LaunchKind = "product-launch" | "feature-launch";

type BriefForm = {
  launchName: string;
  launchDescription: string;
  launchDate: string;
  tier: string;
  segmentId: string;
  competitiveContext: string;
  messageConstraints: string;
};

type DbSegment = { id: string; name: string; pnf_score: number };

type ArtifactRef = { id: string; artifact_type: string; title: string; status: string };

type Phase = "brief" | "running" | "done" | "error";

const TIERS = [
  {
    value: "Tier 1",
    label: "Tier 1 — Full campaign",
    description: "PR, events, paid media, full sales push, complete enablement"
  },
  {
    value: "Tier 2",
    label: "Tier 2 — Focused launch",
    description: "Blog, email, social, sales enablement materials"
  },
  {
    value: "Tier 3",
    label: "Tier 3 — Soft launch",
    description: "Internal update, changelog entry, limited external comms"
  }
];

const ARTIFACT_TYPES = [
  {
    type: "positioning_guide",
    label: "Positioning Guide",
    detail: "Positioning statement, differentiators, proof points, objection responses"
  },
  {
    type: "message_map",
    label: "Message Map",
    detail: "Core message, value pillars, copy blocks, headlines, CTAs"
  },
  {
    type: "launch_brief",
    label: "Launch Brief",
    detail: "GTM plan, timeline, channel plan, asset checklist, success metrics"
  },
  {
    type: "sales_enablement",
    label: "Sales Enablement Pack",
    detail: "Talk track, discovery questions, email templates, battlecard"
  }
];

const STEPS = [
  { id: "insights", title: "Read context", detail: "Market signals, ICP pain points, competitive landscape" },
  { id: "positioning", title: "Build positioning", detail: "Statement, differentiators, proof, objections" },
  { id: "messaging", title: "Draft messages", detail: "Core message, value pillars, headlines, CTAs" },
  { id: "gtm", title: "GTM plan + enablement", detail: "Timeline, channels, talk track, email templates" }
];

function HealthPill({ ok, label, link }: { ok: boolean; label: string; link: string }) {
  return (
    <Link
      href={link}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition hover:opacity-80 ${
        ok
          ? "border-[rgba(0,191,165,0.3)] bg-[rgba(0,191,165,0.08)] text-[var(--color-teal)]"
          : "border-amber-200 bg-amber-50 text-amber-700"
      }`}
    >
      <span>{ok ? "✓" : "!"}</span>
      {label}
      {!ok && <span className="text-amber-500">→ add</span>}
    </Link>
  );
}

function ArtifactTypeIcon({ type }: { type: string }) {
  const colors: Record<string, string> = {
    positioning_guide: "bg-primary",
    message_map: "bg-[var(--color-teal)]",
    launch_brief: "bg-[#2563eb]",
    sales_enablement: "bg-[var(--color-amber)]"
  };
  const letters: Record<string, string> = {
    positioning_guide: "P",
    message_map: "M",
    launch_brief: "L",
    sales_enablement: "S"
  };
  return (
    <span
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white ${colors[type] ?? "bg-primary"}`}
    >
      {letters[type] ?? "A"}
    </span>
  );
}

export function LaunchPlaybookDetailClient({
  environmentId,
  kind
}: {
  environmentId: string;
  kind: LaunchKind;
}) {
  const [phase, setPhase] = useState<Phase>("brief");
  const [brief, setBrief] = useState<BriefForm>({
    launchName: "",
    launchDescription: "",
    launchDate: "",
    tier: "Tier 2",
    segmentId: "",
    competitiveContext: "",
    messageConstraints: ""
  });
  const [segments, setSegments] = useState<DbSegment[]>([]);
  const [strategyHealth, setStrategyHealth] = useState({ hasSegments: false, hasPositioning: false });
  const [artifacts, setArtifacts] = useState<ArtifactRef[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [showOptional, setShowOptional] = useState(false);

  const title = kind === "feature-launch" ? "Feature Launch" : "Product Launch";
  const isValid = brief.launchName.trim().length > 0 && brief.launchDescription.trim().length > 0;

  useEffect(() => {
    let cancelled = false;
    const supabase = createSupabaseBrowserClient();
    (async () => {
      const [{ data: segs }, { data: canvasRow }] = await Promise.all([
        supabase
          .from("segments")
          .select("id,name,pnf_score")
          .eq("environment_id", environmentId)
          .order("pnf_score", { ascending: false })
          .limit(20),
        supabase
          .from("module_settings")
          .select("value_json")
          .eq("environment_id", environmentId)
          .eq("module", "positioning_studio")
          .eq("key", "canvas")
          .maybeSingle()
      ]);
      if (cancelled) return;
      const loadedSegs = (segs ?? []) as DbSegment[];
      setSegments(loadedSegs);
      const hasPositioning = !!((canvasRow?.value_json as any)?.doc?.category);
      setStrategyHealth({ hasSegments: loadedSegs.length > 0, hasPositioning });
      if (loadedSegs.length > 0) {
        setBrief((b) => (b.segmentId ? b : { ...b, segmentId: loadedSegs[0].id }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [environmentId]);

  async function runAgents() {
    if (!isValid) return;
    setPhase("running");
    setErrorMessage("");
    try {
      const res = await fetch("/api/agent-workflows/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, inputs: brief })
      });
      const json = (await res.json()) as { ok: boolean; runId?: string; error?: string; code?: string };
      if (!json.ok) {
        setErrorMessage(
          json.code === "UPGRADE_REQUIRED"
            ? "You've reached your monthly AI run limit. Upgrade your plan for unlimited runs."
            : (json.error ?? "Something went wrong. Please try again.")
        );
        setPhase("error");
        return;
      }
      if (json.runId) {
        const statusRes = await fetch(`/api/agent-workflows/status/${json.runId}`);
        const statusJson = (await statusRes.json()) as { ok: boolean; artifacts?: ArtifactRef[] };
        if (statusJson.ok) setArtifacts(statusJson.artifacts ?? []);
      }
      setPhase("done");
    } catch {
      setErrorMessage("Network error. Check your connection and try again.");
      setPhase("error");
    }
  }

  // ── Running state ─────────────────────────────────────────────────────────
  if (phase === "running") {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center gap-2 text-xs text-text3">
          <Link href="/dashboard/launch-playbook" className="hover:text-text">
            Launch Playbook
          </Link>
          <span>/</span>
          <span className="text-text2">{title}</span>
        </div>

        <div className="mt-6 hs-card p-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-light">
            <span className="h-6 w-6 animate-spin rounded-full border-[3px] border-border border-t-primary" />
          </div>
          <div className="text-[15px] font-semibold text-heading">
            Agents running for &ldquo;{brief.launchName}&rdquo;
          </div>
          <div className="mt-1 text-[13px] text-text2">
            Generating positioning, messaging, GTM plan, and sales enablement from your strategy context&hellip;
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.id} className="hs-card p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-bold text-text3">STEP {String(i + 1).padStart(2, "0")}</span>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-border border-t-primary" />
              </div>
              <div className="text-[13px] font-semibold text-heading">{s.title}</div>
              <div className="mt-0.5 text-[11px] leading-relaxed text-text3">{s.detail}</div>
            </div>
          ))}
        </div>

        <p className="mt-4 text-center text-[12px] text-text3">
          This typically takes 20&ndash;40 seconds. Don&rsquo;t navigate away.
        </p>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (phase === "error") {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center gap-2 text-xs text-text3">
          <Link href="/dashboard/launch-playbook" className="hover:text-text">
            Launch Playbook
          </Link>
          <span>/</span>
          <span className="text-text2">{title}</span>
        </div>
        <div className="mt-6 hs-card p-6">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[rgba(242,84,91,0.1)] text-[var(--color-error)]">
              !
            </span>
            <div>
              <div className="text-[14px] font-semibold text-heading">Run failed</div>
              <div className="mt-1 text-[13px] text-text2">{errorMessage}</div>
            </div>
          </div>
          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={() => {
                setPhase("brief");
                setErrorMessage("");
              }}
              className="hs-btn hs-btn-primary"
            >
              Try again
            </button>
            <Link href="/dashboard/launch-playbook" className="hs-btn hs-btn-secondary">
              Back to playbooks
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Done state ────────────────────────────────────────────────────────────
  if (phase === "done") {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center gap-2 text-xs text-text3">
          <Link href="/dashboard/launch-playbook" className="hover:text-text">
            Launch Playbook
          </Link>
          <span>/</span>
          <span className="text-text2">{title}</span>
        </div>

        <div className="mt-6 hs-card p-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[rgba(0,191,165,0.12)] text-lg text-[var(--color-teal)]">
              ✓
            </span>
            <div>
              <div className="text-[14px] font-semibold text-heading">
                4 artifacts ready for &ldquo;{brief.launchName}&rdquo;
              </div>
              <div className="mt-0.5 text-[12px] text-text2">
                Saved to your Artifact Library. Review, edit, and share them with your team.
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(artifacts.length > 0 ? artifacts : ARTIFACT_TYPES.map((a) => ({ id: "", ...a, status: "ready" }))).map(
            (a, i) => {
              const typeInfo = ARTIFACT_TYPES.find((t) => t.type === a.artifact_type) ?? ARTIFACT_TYPES[i];
              const card = (
                <div className="flex items-start gap-3 p-4">
                  <ArtifactTypeIcon type={a.artifact_type} />
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-heading group-hover:text-primary">
                      {a.title || typeInfo?.label}
                    </div>
                    <div className="mt-0.5 text-[11px] text-text3">{typeInfo?.detail}</div>
                  </div>
                </div>
              );
              return a.id ? (
                <Link
                  key={a.id}
                  href={`/dashboard/artifacts/${a.id}`}
                  className="hs-card hs-card-hover group overflow-hidden"
                >
                  {card}
                </Link>
              ) : (
                <div key={i} className="hs-card overflow-hidden opacity-70">
                  {card}
                </div>
              );
            }
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              setPhase("brief");
              setArtifacts([]);
              setBrief((b) => ({ ...b, launchName: "", launchDescription: "" }));
            }}
            className="text-[13px] text-text2 hover:text-text"
          >
            ← Run another launch
          </button>
          <div className="flex gap-2">
            <Link href={`/dashboard/gtm-planner`} className="hs-btn hs-btn-secondary">
              Open GTM Planner
            </Link>
            <Link href="/dashboard/artifacts" className="hs-btn hs-btn-primary">
              Artifact Library →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Brief form (default) ──────────────────────────────────────────────────
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center gap-2 text-xs text-text3">
        <Link href="/dashboard/launch-playbook" className="hover:text-text">
          Launch Playbook
        </Link>
        <span>/</span>
        <span className="text-text2">{title}</span>
      </div>

      <h1
        className="mt-3 text-2xl font-semibold tracking-tight text-heading"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {title} brief
      </h1>
      <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-text2">
        Tell the AI agents what you&rsquo;re launching. The more context you give, the more specific the artifacts —
        especially if your ICP and positioning are already filled in.
      </p>

      {/* Strategy health indicators */}
      <div className="mt-4 flex flex-wrap gap-2">
        <HealthPill ok={strategyHealth.hasSegments} label="ICP segments" link="/dashboard/icp-segmentation" />
        <HealthPill
          ok={strategyHealth.hasPositioning}
          label="Positioning canvas"
          link="/dashboard/positioning-studio"
        />
      </div>

      {/* Form */}
      <div className="mt-5 hs-card p-6">
        <div className="space-y-5">
          {/* Launch name */}
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-heading">
              Launch name <span className="text-[var(--color-error)]">*</span>
            </label>
            <input
              type="text"
              value={brief.launchName}
              onChange={(e) => setBrief((b) => ({ ...b, launchName: e.target.value }))}
              placeholder="e.g. Enterprise SSO, Mobile App v3, Q3 EMEA Expansion"
              className="w-full rounded-lg border border-input-border bg-page px-3 py-2.5 text-sm text-text placeholder:text-text3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* What you're launching */}
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-heading">
              What are you launching? <span className="text-[var(--color-error)]">*</span>
            </label>
            <textarea
              rows={3}
              value={brief.launchDescription}
              onChange={(e) => setBrief((b) => ({ ...b, launchDescription: e.target.value }))}
              placeholder="Describe what this launch is — what it does, what problem it solves, what's new about it. Be specific."
              className="w-full resize-none rounded-lg border border-input-border bg-page px-3 py-2.5 text-sm text-text placeholder:text-text3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Date + Tier */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-heading">Target launch date</label>
              <input
                type="date"
                value={brief.launchDate}
                onChange={(e) => setBrief((b) => ({ ...b, launchDate: e.target.value }))}
                className="w-full rounded-lg border border-input-border bg-page px-3 py-2.5 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <p className="mt-1 text-[11px] text-text3">Used to build a real dated GTM timeline</p>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-heading">Launch tier</label>
              <select
                value={brief.tier}
                onChange={(e) => setBrief((b) => ({ ...b, tier: e.target.value }))}
                className="w-full rounded-lg border border-input-border bg-page px-3 py-2.5 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {TIERS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-text3">
                {TIERS.find((t) => t.value === brief.tier)?.description}
              </p>
            </div>
          </div>

          {/* Primary segment */}
          {segments.length > 0 && (
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-heading">Primary ICP segment</label>
              <select
                value={brief.segmentId}
                onChange={(e) => setBrief((b) => ({ ...b, segmentId: e.target.value }))}
                className="w-full rounded-lg border border-input-border bg-page px-3 py-2.5 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {segments.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (PNF {s.pnf_score})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-text3">
                The segment this launch narrative is optimised for
              </p>
            </div>
          )}

          {/* Optional fields toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowOptional((v) => !v)}
              className="text-[12px] font-medium text-link hover:underline"
            >
              {showOptional ? "Hide" : "Add"} optional context (competitive + message constraints)
            </button>

            {showOptional && (
              <div className="mt-4 space-y-4 rounded-xl border border-border bg-surface2 p-4">
                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold text-heading">
                    Competitive context
                  </label>
                  <textarea
                    rows={2}
                    value={brief.competitiveContext}
                    onChange={(e) => setBrief((b) => ({ ...b, competitiveContext: e.target.value }))}
                    placeholder="e.g. Entering a market where Competitor X dominates. We win on ease of use and price for mid-market."
                    className="w-full resize-none rounded-lg border border-input-border bg-page px-3 py-2.5 text-sm text-text placeholder:text-text3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold text-heading">
                    Message constraints
                  </label>
                  <textarea
                    rows={2}
                    value={brief.messageConstraints}
                    onChange={(e) => setBrief((b) => ({ ...b, messageConstraints: e.target.value }))}
                    placeholder="e.g. Must lead with compliance angle. Avoid using the word 'disruption'. Keep messaging below C-suite jargon."
                    className="w-full resize-none rounded-lg border border-input-border bg-page px-3 py-2.5 text-sm text-text placeholder:text-text3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* What gets generated */}
      <div className="mt-4 hs-card p-5">
        <div className="mb-3 text-[13px] font-semibold text-heading">What gets generated</div>
        <div className="grid gap-2 sm:grid-cols-2">
          {ARTIFACT_TYPES.map((a) => (
            <div key={a.type} className="flex items-start gap-2.5 hs-card2 rounded-xl p-3">
              <ArtifactTypeIcon type={a.type} />
              <div>
                <div className="text-[12px] font-semibold text-heading">{a.label}</div>
                <div className="mt-0.5 text-[11px] leading-relaxed text-text3">{a.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-4">
        <Link href="/dashboard/launch-playbook" className="text-[13px] text-text2 hover:text-text">
          ← Back
        </Link>
        <button
          type="button"
          onClick={runAgents}
          disabled={!isValid}
          className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-[13px] font-semibold text-white shadow-lg transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-40"
        >
          Run launch agents →
        </button>
      </div>
    </div>
  );
}
