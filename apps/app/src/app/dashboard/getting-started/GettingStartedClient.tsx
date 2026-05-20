"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { GTM_TEMPLATES, type GtmTemplate } from "@/lib/gtmTemplates";

// ─── types ────────────────────────────────────────────────────────────────────

type CompletionData = {
  productCategory: string;
  productIcpSummary: string;
  newsSource: string;
  competitorCount: number;
  segmentCount: number;
  hasMarketResearch: boolean;
  hasPositioningCanvas: boolean;
  hasMessagingPillars: boolean;
  hasCampaign: boolean;
  hasGtmPlan: boolean;
};

type StepDef = {
  id: string;
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
  isDone: (d: CompletionData) => boolean;
};

type GroupDef = {
  id: string;
  label: string;
  tagline: string;
  steps: StepDef[];
};

// ─── step definitions ─────────────────────────────────────────────────────────

const GROUPS: GroupDef[] = [
  {
    id: "foundation",
    label: "Foundation",
    tagline: "Core product data improves every AI output across all modules.",
    steps: [
      {
        id: "product_profile",
        title: "Complete your product profile",
        description:
          "Add your market category, ICP summary, and positioning summary — this becomes the context injected into every AI generation.",
        href: "/dashboard/settings/product",
        ctaLabel: "Product settings",
        isDone: (d) => !!(d.productCategory && d.productIcpSummary),
      },
      {
        id: "competitors",
        title: "Add at least one competitor",
        description:
          "Used by Battlecards and Market Research to anchor your differentiation story and sharpen competitive positioning.",
        href: "/dashboard/settings/product",
        ctaLabel: "Add competitor",
        isDone: (d) => d.competitorCount >= 1,
      },
      {
        id: "news_source",
        title: "Connect a news or signal source",
        description:
          "An RSS feed URL or topic keywords keeps Market Research scans fresh and surfaces timely buying signals.",
        href: "/dashboard/settings/product",
        ctaLabel: "Set up feed",
        isDone: (d) => !!(d.newsSource),
      },
    ],
  },
  {
    id: "market",
    label: "Know your market",
    tagline: "Research your competitive landscape and define exactly who you're selling to.",
    steps: [
      {
        id: "market_research",
        title: "Run your first market research scan",
        description:
          "Surface competitor gaps, buyer signals, and opportunity segments. Results feed directly into ICP Segmentation.",
        href: "/dashboard/market-research",
        ctaLabel: "Start scan",
        isDone: (d) => d.hasMarketResearch,
      },
      {
        id: "icp_segments",
        title: "Define ICP segments",
        description:
          "At least one segment powers Messaging Pillars, Content Studio, and the AI context injected across all modules.",
        href: "/dashboard/icp-segmentation",
        ctaLabel: "Open ICP Segmentation",
        isDone: (d) => d.segmentCount >= 1,
      },
    ],
  },
  {
    id: "strategy",
    label: "Build your strategy",
    tagline: "Positioning and messaging become the source of truth for every campaign, asset, and content piece.",
    steps: [
      {
        id: "positioning",
        title: "Fill in your positioning canvas",
        description:
          "Define your market category, target customer, core problem, solution, and key differentiator. Governs all AI copy.",
        href: "/dashboard/positioning-studio",
        ctaLabel: "Open Positioning Studio",
        isDone: (d) => d.hasPositioningCanvas,
      },
      {
        id: "messaging",
        title: "Generate messaging pillars",
        description:
          "Per-segment headlines, value propositions, proof points, and objection handling — the backbone of all your copy.",
        href: "/dashboard/messaging-artifacts",
        ctaLabel: "Open Messaging Pillars",
        isDone: (d) => d.hasMessagingPillars,
      },
    ],
  },
  {
    id: "execution",
    label: "Start executing",
    tagline: "With strategy in place, build your first campaign and launch plan.",
    steps: [
      {
        id: "campaign",
        title: "Create your first campaign",
        description:
          "Build a brief, define channels and assets, then link it to your GTM plan using the 'Plan launch →' button.",
        href: "/dashboard/campaigns",
        ctaLabel: "Open Campaigns",
        isDone: (d) => d.hasCampaign,
      },
      {
        id: "gtm_plan",
        title: "Build a GTM launch plan",
        description:
          "AI-generated 4-phase checklist with owner tracking. Each task row links directly to the relevant execution module.",
        href: "/dashboard/gtm-planner",
        ctaLabel: "Open GTM Planner",
        isDone: (d) => d.hasGtmPlan,
      },
    ],
  },
];

const ALL_STEPS = GROUPS.flatMap((g) => g.steps);

// ─── component ────────────────────────────────────────────────────────────────

export function GettingStartedClient({
  environmentId,
  productId,
  productName: initialName = "",
}: {
  environmentId: string;
  productId: string;
  productName?: string;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [loading, setLoading] = useState(true);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [productName, setProductName] = useState(initialName);
  const [completion, setCompletion] = useState<CompletionData | null>(null);
  const [appliedTemplates, setAppliedTemplates] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [
      productRes,
      competitorRes,
      segmentRes,
      canvasRes,
      pillarsRes,
      campaignsRes,
      gtmRes,
      mrRes,
      tmplRes,
    ] = await Promise.all([
      supabase
        .from("products")
        .select("name,category,icp_summary,news_rss_url,news_keywords")
        .eq("id", productId)
        .maybeSingle(),
      supabase
        .from("product_competitors")
        .select("id", { count: "exact", head: true })
        .eq("product_id", productId),
      supabase
        .from("segments")
        .select("id", { count: "exact", head: true })
        .eq("environment_id", environmentId),
      supabase
        .from("module_settings")
        .select("value_json")
        .eq("environment_id", environmentId)
        .eq("module", "positioning_studio")
        .eq("key", "canvas")
        .maybeSingle(),
      supabase
        .from("module_settings")
        .select("value_json")
        .eq("environment_id", environmentId)
        .eq("module", "messaging_artifacts")
        .limit(1),
      supabase
        .from("module_settings")
        .select("value_json")
        .eq("environment_id", environmentId)
        .eq("module", "campaigns")
        .eq("key", "kanban")
        .maybeSingle(),
      supabase
        .from("module_settings")
        .select("key")
        .eq("environment_id", environmentId)
        .eq("module", "gtm_planner")
        .like("key", "plan%")
        .limit(1),
      supabase
        .from("module_settings")
        .select("key")
        .eq("environment_id", environmentId)
        .eq("module", "market_research")
        .limit(1),
      supabase
        .from("module_settings")
        .select("value_json")
        .eq("environment_id", environmentId)
        .eq("module", "work")
        .eq("key", "onboarding")
        .maybeSingle(),
    ]);

    const p = productRes.data as Record<string, string> | null;
    if (p?.name) setProductName(p.name);

    const canvasDoc = (
      canvasRes.data?.value_json as Record<string, Record<string, string>> | null
    )?.doc;

    const pillarsRow = (pillarsRes.data as { value_json: unknown }[] | null)?.[0]?.value_json;
    const hasMessagingPillars = !!(
      pillarsRow &&
      typeof pillarsRow === "object" &&
      Object.keys(pillarsRow as object).length > 0
    );

    const kanban = campaignsRes.data?.value_json as Record<string, unknown> | null;
    const hasCampaign = !!(
      (Array.isArray(kanban?.cards) && (kanban.cards as unknown[]).length > 0) ||
      (kanban?.columns &&
        Object.values(
          kanban.columns as Record<string, { cardIds?: unknown[]; cards?: unknown[] }>
        ).some((col) => (col?.cardIds?.length ?? 0) > 0 || (col?.cards?.length ?? 0) > 0))
    );

    setCompletion({
      productCategory: p?.category ?? "",
      productIcpSummary: p?.icp_summary ?? "",
      newsSource: p?.news_rss_url ?? p?.news_keywords ?? "",
      competitorCount: competitorRes.count ?? 0,
      segmentCount: segmentRes.count ?? 0,
      hasMarketResearch: !!(mrRes.data && mrRes.data.length > 0),
      hasPositioningCanvas: !!(canvasDoc?.category && canvasDoc?.target),
      hasMessagingPillars,
      hasCampaign,
      hasGtmPlan: !!(gtmRes.data && gtmRes.data.length > 0),
    });

    const ts = tmplRes.data?.value_json as { applied_template_ids?: string[] } | null;
    setAppliedTemplates(Array.isArray(ts?.applied_template_ids) ? ts.applied_template_ids : []);
    setLoading(false);
  }, [environmentId, productId, supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  async function applyTemplate(t: GtmTemplate) {
    setSavingTemplate(true);
    setTemplateError(null);
    try {
      const segs = (t.payload.segments ?? null) as Array<{
        name: string;
        pnf_score?: number;
        pain_points?: string[];
        notes?: string;
      }> | null;
      if (segs?.length) {
        await supabase.from("segments").insert(
          segs.map((s) => ({
            environment_id: environmentId,
            name: s.name,
            pnf_score: s.pnf_score ?? 0,
            pain_points: s.pain_points ?? [],
            notes: s.notes ?? null,
          }))
        );
      }
      const entries: Array<{ module: string; key: string; value_json: unknown }> = [];
      if (t.payload.gtm_planner)
        entries.push({ module: "gtm_planner", key: "plan", value_json: t.payload.gtm_planner });
      if (t.payload.campaigns)
        entries.push({ module: "campaigns", key: "kanban", value_json: t.payload.campaigns });
      if (t.payload.content_studio)
        entries.push({ module: "content_studio", key: "workspace", value_json: t.payload.content_studio });
      if (t.payload.events)
        entries.push({ module: "events", key: "workspace", value_json: t.payload.events });
      for (const e of entries) {
        await supabase.from("module_settings").upsert({
          environment_id: environmentId,
          module: e.module,
          key: e.key,
          value_json: e.value_json,
        });
      }
      const nextIds = [...appliedTemplates, t.id];
      await supabase.from("module_settings").upsert({
        environment_id: environmentId,
        module: "work",
        key: "onboarding",
        value_json: { applied_template_ids: nextIds, updated_at: new Date().toISOString() },
      });
      setAppliedTemplates(nextIds);
      void load();
    } catch (e) {
      setTemplateError(e instanceof Error ? e.message : "Failed to apply template.");
    } finally {
      setSavingTemplate(false);
    }
  }

  // ── skeleton ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-40 animate-pulse rounded-2xl bg-surface3" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-48 animate-pulse rounded-2xl bg-surface3" />
        ))}
      </div>
    );
  }

  // ── derived ───────────────────────────────────────────────────────────────

  const doneCount = completion ? ALL_STEPS.filter((s) => s.isDone(completion)).length : 0;
  const totalCount = ALL_STEPS.length;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const allDone = doneCount === totalCount;
  const firstUndone = completion ? ALL_STEPS.find((s) => !s.isDone(completion)) : null;

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* Header card */}
      <div
        className={`overflow-hidden rounded-2xl border shadow-sm ${
          allDone ? "border-teal/30 bg-teal/5" : "border-border bg-surface"
        }`}
      >
        <div className="px-6 py-6">
          <Link
            href="/dashboard"
            className="text-xs font-medium text-link underline-offset-2 hover:underline"
          >
            ← Command Centre
          </Link>

          <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1
                className="text-3xl font-semibold text-heading"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {allDone ? "You're ready to launch" : "Getting Started"}
              </h1>
              <p className="mt-1 max-w-xl text-sm text-text2">
                {allDone
                  ? `${productName} is fully set up. Every module is powered by your strategy and market intelligence.`
                  : `Complete each stage for ${productName || "your product"} — each one makes the next more powerful.`}
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                {allDone ? (
                  <>
                    <Link
                      href="/dashboard"
                      className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
                    >
                      Go to Command Centre
                    </Link>
                    <Link
                      href="/dashboard/campaigns"
                      className="hs-card px-4 py-2 text-sm font-medium text-heading hover:bg-surface2"
                    >
                      Build a campaign →
                    </Link>
                  </>
                ) : firstUndone ? (
                  <Link
                    href={firstUndone.href}
                    className="rounded-xl bg-amber px-4 py-2 text-sm font-semibold text-black hover:bg-amber/90"
                  >
                    Next step: {firstUndone.title} →
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="shrink-0 text-right">
              <div
                className={`text-3xl font-bold tabular-nums ${
                  allDone ? "text-teal" : "text-heading"
                }`}
              >
                {pct}%
              </div>
              <div className="text-xs text-text2">
                {doneCount} of {totalCount} complete
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-surface3">
            <div
              className={`h-2 rounded-full transition-all duration-700 ease-out ${
                allDone ? "bg-teal" : "bg-primary"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* Per-group mini progress */}
          {!allDone ? (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {GROUPS.map((g) => {
                if (!completion) return null;
                const gDone = g.steps.filter((s) => s.isDone(completion)).length;
                const gPct = Math.round((gDone / g.steps.length) * 100);
                return (
                  <div key={g.id}>
                    <div className="mb-1 truncate text-[10px] text-text3">{g.label}</div>
                    <div className="h-1 overflow-hidden rounded-full bg-surface3">
                      <div
                        className={`h-1 rounded-full ${gPct === 100 ? "bg-teal" : "bg-primary/60"}`}
                        style={{ width: `${gPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      {/* Step groups */}
      {GROUPS.map((group, gi) => {
        if (!completion) return null;
        const groupDone = group.steps.filter((s) => s.isDone(completion)).length;
        const groupComplete = groupDone === group.steps.length;

        return (
          <div
            key={group.id}
            className={`overflow-hidden rounded-2xl border shadow-sm ${
              groupComplete ? "border-teal/25" : "border-border"
            } bg-surface`}
          >
            {/* Group header */}
            <div
              className={`flex items-center gap-3 border-b px-5 py-4 ${
                groupComplete ? "border-teal/20 bg-teal/4" : "border-border bg-surface2/40"
              }`}
            >
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  groupComplete ? "bg-teal text-white" : "bg-surface3 text-text2"
                }`}
              >
                {groupComplete ? "✓" : gi + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-heading">{group.label}</span>
                  {groupComplete ? (
                    <span className="rounded-full bg-teal/15 px-2 py-0.5 text-[11px] font-medium text-teal">
                      Complete
                    </span>
                  ) : (
                    <span className="rounded-full bg-surface3 px-2 py-0.5 text-[11px] text-text3">
                      {groupDone}/{group.steps.length}
                    </span>
                  )}
                </div>
                <p className="text-xs text-text2">{group.tagline}</p>
              </div>
            </div>

            {/* Step rows */}
            <div className="divide-y divide-border/50">
              {group.steps.map((step, si) => {
                const done = step.isDone(completion);
                const isNext = step.id === firstUndone?.id;

                return (
                  <div
                    key={step.id}
                    className={`flex items-center gap-4 px-5 py-4 transition-colors ${
                      done ? "opacity-55" : isNext ? "bg-primary/3" : ""
                    }`}
                  >
                    {/* Status dot */}
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                        done
                          ? "bg-teal text-white"
                          : isNext
                            ? "bg-primary text-white"
                            : "bg-surface3 text-text3"
                      }`}
                    >
                      {done ? "✓" : si + 1}
                    </div>

                    {/* Title + description */}
                    <div className="min-w-0 flex-1">
                      <div
                        className={`text-sm font-medium leading-snug ${
                          done ? "text-text2 line-through decoration-text3/60" : "text-heading"
                        }`}
                      >
                        {step.title}
                      </div>
                      <div className="mt-0.5 text-xs leading-relaxed text-text2">
                        {step.description}
                      </div>
                    </div>

                    {/* CTA */}
                    {done ? (
                      <span className="shrink-0 rounded-full bg-teal/10 px-3 py-1 text-[11px] font-medium text-teal">
                        Done
                      </span>
                    ) : (
                      <Link
                        href={step.href}
                        className={`shrink-0 rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
                          isNext
                            ? "bg-primary text-white hover:bg-primary/90"
                            : "border border-border bg-surface2 text-text hover:bg-surface3"
                        }`}
                      >
                        {step.ctaLabel} →
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Quick-start templates (collapsible) */}
      <details className="group overflow-hidden hs-card shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 hover:bg-surface2/50 transition-colors">
          <div>
            <div className="text-sm font-semibold text-heading">Quick-start templates</div>
            <div className="mt-0.5 text-xs text-text2">
              Seed workbenches, GTM plans, and segments with industry templates to jumpstart execution.
            </div>
          </div>
          <div className="ml-4 flex shrink-0 items-center gap-2">
            {appliedTemplates.length > 0 ? (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                {appliedTemplates.length} applied
              </span>
            ) : (
              <span className="text-xs text-text3">Optional</span>
            )}
            <span className="text-xs text-text3 transition-transform duration-200 group-open:rotate-180">
              ▾
            </span>
          </div>
        </summary>

        <div className="border-t border-border px-5 pb-5 pt-4">
          {templateError ? (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red">
              {templateError}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            {GTM_TEMPLATES.map((t) => {
              const applied = appliedTemplates.includes(t.id);
              return (
                <div
                  key={t.id}
                  className={`rounded-xl border p-4 transition-colors ${
                    applied ? "border-teal/25 bg-teal/4" : "border-border bg-surface2"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-heading">{t.name}</div>
                      <div className="mt-0.5 text-xs text-text2">{t.description}</div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {t.targets.map((x, i) => (
                          <span
                            key={`${t.id}-${i}`}
                            className="rounded bg-surface3 px-2 py-0.5 text-[10px] uppercase tracking-wide text-text3"
                          >
                            {x.kind.replaceAll("_", " ")}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={savingTemplate || applied}
                      onClick={() => void applyTemplate(t)}
                      className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                        applied
                          ? "cursor-default text-teal"
                          : "bg-primary text-white hover:bg-primary/90 disabled:opacity-60"
                      }`}
                    >
                      {applied ? "Applied ✓" : savingTemplate ? "Applying…" : "Apply"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-4 text-xs text-text3">
            Templates seed workbenches with example content. Everything is fully editable after
            applying.{" "}
            <Link
              href="/dashboard/work"
              className="text-link underline-offset-2 hover:underline"
            >
              Open Marketing Workbench →
            </Link>
          </p>
        </div>
      </details>
    </div>
  );
}
