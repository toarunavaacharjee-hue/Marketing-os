"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AiProgressBar, AI_PROGRESS_ESTIMATE } from "@/app/dashboard/_components/AiProgressBar";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

// ─── Types ────────────────────────────────────────────────────────────────────

type PageType =
  | "homepage"
  | "pricing"
  | "features"
  | "about"
  | "landing"
  | "case-study"
  | "blog"
  | "contact"
  | "careers"
  | "other";

type PageStatus = "draft" | "live" | "needs-update" | "archived";

type GeneratedCopy = {
  headline: string;
  subhead: string;
  bodyCopy: string;
  ctaCopy: string;
  metaDescription: string;
};

type LandingPage = {
  id: string;
  name: string;
  pageType: PageType;
  url: string;
  status: PageStatus;
  seoKeyword: string;
  primaryCta: string;
  copy: GeneratedCopy;
  notes: string;
  generatedAt: string;
  createdAt: string;
};

type AiHistoryEntry = {
  id: string;
  at: string;
  prompt: string;
  pageId: string;
  pageName: string;
  text: string;
};

type Workspace = {
  pages: LandingPage[];
  prompt: string;
  targetPageId: string;
  aiHistory: AiHistoryEntry[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_TYPES: { id: PageType; label: string; copyFocus: string }[] = [
  { id: "homepage", label: "Homepage", copyFocus: "value proposition, hero headline, social proof" },
  { id: "pricing", label: "Pricing", copyFocus: "plan names, feature bullets, ROI and value framing, FAQs" },
  { id: "features", label: "Features / Product", copyFocus: "capability descriptions, outcome-focused benefits, use cases" },
  { id: "landing", label: "Campaign landing page", copyFocus: "conversion-focused, single CTA, urgency, specific audience" },
  { id: "about", label: "About", copyFocus: "company story, mission, team credibility, trust signals" },
  { id: "case-study", label: "Case study", copyFocus: "customer outcome, proof stats, before/after narrative" },
  { id: "blog", label: "Blog / Content", copyFocus: "SEO-optimised titles, meta descriptions, hook intro" },
  { id: "contact", label: "Contact", copyFocus: "low-friction CTA, what to expect after contact, trust cues" },
  { id: "careers", label: "Careers", copyFocus: "culture, role impact, team story, growth" },
  { id: "other", label: "Other", copyFocus: "clear headline, value prop, CTA" },
];

const STATUS_CONFIG: Record<PageStatus, { label: string; style: string }> = {
  draft: { label: "Draft", style: "border-border bg-surface2 text-text2" },
  live: { label: "Live", style: "border-teal/30 bg-teal/10 text-teal" },
  "needs-update": { label: "Needs update", style: "border-yellow-500/30 bg-yellow-500/10 text-yellow-700" },
  archived: { label: "Archived", style: "border-border bg-surface3 text-text3" },
};

const DEFAULT_PAGES: Pick<LandingPage, "name" | "pageType">[] = [
  { name: "Homepage", pageType: "homepage" },
  { name: "Pricing", pageType: "pricing" },
  { name: "Features", pageType: "features" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pageTypeInfo(id: PageType) {
  return PAGE_TYPES.find((t) => t.id === id) ?? PAGE_TYPES[PAGE_TYPES.length - 1]!;
}

function emptyCopy(): GeneratedCopy {
  return { headline: "", subhead: "", bodyCopy: "", ctaCopy: "", metaDescription: "" };
}

function emptyPage(name = "", pageType: PageType = "homepage"): LandingPage {
  return {
    id: crypto.randomUUID(),
    name,
    pageType,
    url: "",
    status: "draft",
    seoKeyword: "",
    primaryCta: "",
    copy: emptyCopy(),
    notes: "",
    generatedAt: "",
    createdAt: new Date().toISOString(),
  };
}

function emptyWorkspace(): Workspace {
  return { pages: [], prompt: "", targetPageId: "", aiHistory: [] };
}

function migrateCopy(raw: unknown): GeneratedCopy {
  const base = emptyCopy();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  return {
    headline: String(o.headline ?? ""),
    subhead: String(o.subhead ?? ""),
    bodyCopy: String(o.bodyCopy ?? ""),
    ctaCopy: String(o.ctaCopy ?? ""),
    metaDescription: String(o.metaDescription ?? ""),
  };
}

function migratePage(raw: unknown): LandingPage {
  const base = emptyPage();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  const validTypes = PAGE_TYPES.map((t) => t.id);
  const validStatuses: PageStatus[] = ["draft", "live", "needs-update", "archived"];
  return {
    id: String(o.id || crypto.randomUUID()),
    name: String(o.name ?? ""),
    pageType: (validTypes.includes(String(o.pageType) as PageType) ? o.pageType : "other") as PageType,
    url: String(o.url ?? ""),
    status: (validStatuses.includes(String(o.status) as PageStatus) ? o.status : "draft") as PageStatus,
    seoKeyword: String(o.seoKeyword ?? ""),
    primaryCta: String(o.primaryCta ?? ""),
    copy: migrateCopy(o.copy),
    notes: String(o.notes ?? ""),
    generatedAt: String(o.generatedAt ?? ""),
    createdAt: String(o.createdAt ?? new Date().toISOString()),
  };
}

function migrateWorkspace(v: unknown): Workspace {
  const base = emptyWorkspace();
  if (!v || typeof v !== "object") return base;
  const o = v as Record<string, unknown>;
  return {
    pages: Array.isArray(o.pages) ? o.pages.map(migratePage) : [],
    prompt: typeof o.prompt === "string" ? o.prompt : "",
    targetPageId: typeof o.targetPageId === "string" ? o.targetPageId : "",
    aiHistory: Array.isArray(o.aiHistory)
      ? (o.aiHistory as unknown[])
          .filter((h): h is AiHistoryEntry => !!h && typeof h === "object" && "text" in h)
          .slice(0, 20)
      : [],
  };
}

function parseCopyFromOutput(text: string): Partial<GeneratedCopy> {
  const result: Partial<GeneratedCopy> = {};
  const sections: [keyof GeneratedCopy, RegExp][] = [
    ["headline", /(?:##?\s*)?(?:hero\s*)?headline[:\s]+(.+?)(?=\n##|\n\*\*|\n---|\z)/is],
    ["subhead", /(?:##?\s*)?(?:sub-?headline|subhead(?:line)?)[:\s]+(.+?)(?=\n##|\n\*\*|\n---|\z)/is],
    ["bodyCopy", /(?:##?\s*)?(?:body\s*copy|body)[:\s]+(.+?)(?=\n##|\n\*\*|\n---|\z)/is],
    ["ctaCopy", /(?:##?\s*)?(?:(?:primary\s*)?cta|call[\s-]to[\s-]action)[:\s]+(.+?)(?=\n##|\n\*\*|\n---|\z)/is],
    ["metaDescription", /(?:##?\s*)?(?:meta(?:\s*description)?|seo\s*description)[:\s]+(.+?)(?=\n##|\n\*\*|\n---|\z)/is],
  ];
  for (const [key, re] of sections) {
    const m = text.match(re);
    if (m?.[1]) result[key] = m[1].replace(/\*\*/g, "").trim();
  }
  return result;
}

function safeHref(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  if (/^[\w.-]+\.[a-z]{2,}/i.test(t)) return `https://${t}`;
  return null;
}

// ─── PageCard ─────────────────────────────────────────────────────────────────

function PageCard({
  page,
  expanded,
  isGenerating,
  onToggle,
  onChange,
  onGenerate,
  onRemove,
}: {
  page: LandingPage;
  expanded: boolean;
  isGenerating: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<LandingPage>) => void;
  onGenerate: () => void;
  onRemove: () => void;
}) {
  const statusCfg = STATUS_CONFIG[page.status];
  const hasCopy = Boolean(page.copy.headline || page.copy.subhead || page.copy.bodyCopy);

  return (
    <div
      className={`rounded-2xl border bg-surface shadow-sm transition-shadow ${
        expanded ? "border-primary/40 shadow-md" : "border-border hover:border-primary/20"
      }`}
    >
      {/* Header */}
      <button type="button" onClick={onToggle} className="flex w-full items-start gap-3 px-4 py-3 text-left">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded border border-border bg-surface2 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-text3">
              {pageTypeInfo(page.pageType).label}
            </span>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${statusCfg.style}`}>
              {statusCfg.label}
            </span>
            {page.seoKeyword ? (
              <span className="rounded-full bg-primary/8 px-2 py-0.5 text-[10px] text-primary">
                🔍 {page.seoKeyword}
              </span>
            ) : null}
            {hasCopy ? (
              <span className="rounded-full bg-teal/10 px-2 py-0.5 text-[10px] text-teal">Copy ready</span>
            ) : null}
          </div>
          <p className="text-sm font-medium text-text">
            {page.name.trim() || <span className="font-normal italic text-text3">Untitled page</span>}
          </p>
          {page.copy.headline ? (
            <p className="line-clamp-1 text-xs text-text2">"{page.copy.headline}"</p>
          ) : page.url ? (
            <p className="text-xs text-text3">{page.url}</p>
          ) : null}
        </div>
        <span className="mt-0.5 shrink-0 text-xs text-text3">{expanded ? "▲" : "▼"}</span>
      </button>

      {/* Expanded */}
      {expanded ? (
        <div className="space-y-3 border-t border-border px-4 pb-4 pt-3">
          {/* Name + type */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text3">Page name</div>
              <input
                value={page.name}
                onChange={(e) => onChange({ name: e.target.value })}
                placeholder="e.g. Homepage, Pricing"
                className="w-full rounded-lg border border-border bg-surface2 px-2 py-1.5 text-sm text-heading placeholder:text-text3 focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text3">Page type</div>
              <select
                value={page.pageType}
                onChange={(e) => onChange({ pageType: e.target.value as PageType })}
                className="w-full rounded-lg border border-border bg-surface2 px-2 py-1.5 text-sm text-heading"
              >
                {PAGE_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Status + URL + SEO + CTA */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text3">Status</div>
              <select
                value={page.status}
                onChange={(e) => onChange({ status: e.target.value as PageStatus })}
                className="w-full rounded-lg border border-border bg-surface2 px-2 py-1.5 text-sm text-heading"
              >
                {(["draft", "live", "needs-update", "archived"] as PageStatus[]).map((s) => (
                  <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text3">SEO keyword</div>
              <input
                value={page.seoKeyword}
                onChange={(e) => onChange({ seoKeyword: e.target.value })}
                placeholder="e.g. revenue ops software"
                className="w-full rounded-lg border border-border bg-surface2 px-2 py-1.5 text-sm text-heading placeholder:text-text3"
              />
            </div>
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text3">Primary CTA goal</div>
              <input
                value={page.primaryCta}
                onChange={(e) => onChange({ primaryCta: e.target.value })}
                placeholder="e.g. Book demo"
                className="w-full rounded-lg border border-border bg-surface2 px-2 py-1.5 text-sm text-heading placeholder:text-text3"
              />
            </div>
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text3">Live URL</div>
              <div className="flex gap-1">
                <input
                  value={page.url}
                  onChange={(e) => onChange({ url: e.target.value })}
                  placeholder="/pricing"
                  className="min-w-0 flex-1 rounded-lg border border-border bg-surface2 px-2 py-1.5 text-sm text-heading placeholder:text-text3"
                />
                {safeHref(page.url) ? (
                  <a href={safeHref(page.url)!} target="_blank" rel="noopener noreferrer"
                    className="shrink-0 rounded-lg border border-primary/30 bg-primary/8 px-2 py-1.5 text-xs text-primary">
                    ↗
                  </a>
                ) : null}
              </div>
            </div>
          </div>

          {/* Generate copy button */}
          <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5">
            <div className="text-xs text-text2">
              Generate on-brand copy for this page using your positioning + ICP.
            </div>
            <button
              type="button"
              onClick={onGenerate}
              disabled={isGenerating}
              className="ml-3 shrink-0 rounded-xl bg-amber px-3 py-1.5 text-xs font-semibold text-black hover:bg-amber/90 disabled:opacity-50"
            >
              {isGenerating ? "Generating…" : "Generate copy →"}
            </button>
          </div>

          {/* Copy fields */}
          {hasCopy || page.generatedAt ? (
            <div className="space-y-3 rounded-xl border border-border bg-surface2 p-3">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-text3">Page copy</div>
                {page.generatedAt ? (
                  <span className="text-[10px] text-text3">
                    Generated {new Date(page.generatedAt).toLocaleDateString()}
                  </span>
                ) : null}
              </div>

              <div>
                <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text3">Hero headline</div>
                <input
                  value={page.copy.headline}
                  onChange={(e) => onChange({ copy: { ...page.copy, headline: e.target.value } })}
                  placeholder="Clear, outcome-focused headline"
                  className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm font-medium text-heading placeholder:text-text3"
                />
              </div>

              <div>
                <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text3">Subheadline</div>
                <input
                  value={page.copy.subhead}
                  onChange={(e) => onChange({ copy: { ...page.copy, subhead: e.target.value } })}
                  placeholder="Supporting sentence"
                  className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-heading placeholder:text-text3"
                />
              </div>

              <div>
                <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text3">Body copy</div>
                <textarea
                  value={page.copy.bodyCopy}
                  onChange={(e) => onChange({ copy: { ...page.copy, bodyCopy: e.target.value } })}
                  rows={4}
                  placeholder="2–3 paragraphs covering the core message, proof, and benefits"
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-heading placeholder:text-text3"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text3">CTA copy</div>
                  <input
                    value={page.copy.ctaCopy}
                    onChange={(e) => onChange({ copy: { ...page.copy, ctaCopy: e.target.value } })}
                    placeholder="e.g. Start free trial"
                    className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm font-medium text-heading placeholder:text-text3"
                  />
                </div>
                <div>
                  <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text3">
                    Meta description <span className="text-text3 normal-case font-normal">(155 chars)</span>
                  </div>
                  <input
                    value={page.copy.metaDescription}
                    onChange={(e) => onChange({ copy: { ...page.copy, metaDescription: e.target.value } })}
                    maxLength={160}
                    placeholder="SEO meta description"
                    className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-heading placeholder:text-text3"
                  />
                  <div className="mt-1 text-right text-[10px] text-text3">
                    {page.copy.metaDescription.length}/155
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* Notes */}
          <div>
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text3">Notes</div>
            <textarea
              value={page.notes}
              onChange={(e) => onChange({ notes: e.target.value })}
              rows={2}
              placeholder="A/B tests, conversion rate, copywriter briefing notes…"
              className="w-full rounded-xl border border-border bg-surface2 px-3 py-2 text-sm text-heading placeholder:text-text3"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <button type="button" onClick={onRemove} className="text-xs text-text3 hover:text-red">
              Remove page
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function LandingPageWorkspace({ environmentId }: { environmentId: string }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [ws, setWs] = useState<Workspace>(() => emptyWorkspace());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [strategyContext, setStrategyContext] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: qErr } = await supabase
      .from("module_settings")
      .select("value_json")
      .eq("environment_id", environmentId)
      .eq("module", "website_pages")
      .eq("key", "landing_workspace")
      .maybeSingle();
    if (qErr) setError(qErr.message);
    const migrated = migrateWorkspace((data?.value_json ?? null) as unknown);
    // Seed default pages for new workspaces
    if (migrated.pages.length === 0) {
      migrated.pages = DEFAULT_PAGES.map(({ name, pageType }) => emptyPage(name, pageType));
    }
    setWs(migrated);
    setLoading(false);
  }, [environmentId, supabase]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let cancelled = false;
    async function loadCtx() {
      try {
        const [{ data: canvasRow }, { data: segs }, { data: pillarsRow }] = await Promise.all([
          supabase.from("module_settings").select("value_json").eq("environment_id", environmentId).eq("module", "positioning_studio").eq("key", "canvas").maybeSingle(),
          supabase.from("segments").select("name,pain_points").eq("environment_id", environmentId).order("created_at", { ascending: false }).limit(3),
          supabase.from("module_settings").select("value_json").eq("environment_id", environmentId).eq("module", "messaging_artifacts").eq("key", "pillars").maybeSingle(),
        ]);
        if (cancelled) return;
        const parts: string[] = [];
        const doc = (canvasRow?.value_json as { doc?: Record<string, string> } | null)?.doc;
        if (doc) {
          const lines: string[] = [];
          if (doc.category) lines.push(`Market category: ${doc.category}`);
          if (doc.target) lines.push(`Target customer: ${doc.target}`);
          if (doc.problem) lines.push(`Core problem solved: ${doc.problem}`);
          if (doc.solution) lines.push(`Solution: ${doc.solution}`);
          if (doc.diff) lines.push(`Differentiation: ${doc.diff}`);
          if (doc.wedge) lines.push(`Wedge: ${doc.wedge}`);
          if (lines.length) parts.push(`Approved positioning:\n${lines.join("\n")}`);
        }
        const segList = (segs ?? []) as { name: string; pain_points?: string[] }[];
        if (segList.length) {
          const segLines = segList.map((s) => {
            const pains = (s.pain_points ?? []).slice(0, 2).join("; ");
            return pains ? `  - ${s.name} (pains: ${pains})` : `  - ${s.name}`;
          });
          parts.push(`ICP segments:\n${segLines.join("\n")}`);
        }
        const pillars = (pillarsRow?.value_json as { pillars?: { headline?: string; body?: string }[] } | null)?.pillars ?? [];
        const pillarLines = pillars.slice(0, 3).map((p) => `  - ${p.headline ?? ""}${p.body ? `: ${p.body.slice(0, 80)}` : ""}`).filter((l) => l.trim().length > 4);
        if (pillarLines.length) parts.push(`Key messaging pillars:\n${pillarLines.join("\n")}`);
        setStrategyContext(parts.length ? `\n\n---\nProduct & positioning context:\n${parts.join("\n\n")}\n---` : "");
      } catch { /* non-critical */ }
    }
    void loadCtx();
    return () => { cancelled = true; };
  }, [environmentId, supabase]);

  const persist = useCallback(async (next: Workspace) => {
    setSaving(true);
    const { error: upErr } = await supabase.from("module_settings").upsert({
      environment_id: environmentId,
      module: "website_pages",
      key: "landing_workspace",
      value_json: next,
    });
    setSaving(false);
    if (upErr) setError(upErr.message);
  }, [environmentId, supabase]);

  function scheduleSave(next: Workspace) {
    setWs(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void persist(next), 450);
  }

  async function generateForPage(pageId: string) {
    const page = ws.pages.find((p) => p.id === pageId);
    if (!page) return;
    setGeneratingId(pageId);
    setError(null);
    const typeInfo = pageTypeInfo(page.pageType);
    const focus = typeInfo.copyFocus;
    const prompt = [
      `Write complete, on-brand copy for a ${typeInfo.label} page.`,
      page.seoKeyword ? `SEO focus keyword: "${page.seoKeyword}"` : "",
      page.primaryCta ? `Primary CTA goal: ${page.primaryCta}` : "",
      page.notes ? `Additional context: ${page.notes}` : "",
      `Copy focus: ${focus}.`,
    ].filter(Boolean).join(" ");

    try {
      const res = await fetch("/api/ai/module-generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt,
          system: `You are a B2B conversion copywriter. Write structured page copy with clearly labeled sections exactly as follows (use these exact labels):

Headline: [8–12 word hero headline, outcome-focused]
Subheadline: [15–25 word supporting sentence]
Body Copy: [2–3 short paragraphs, benefit-led, specific]
CTA Copy: [3–6 word button text]
Meta Description: [Under 155 characters, includes keyword if provided]

Each section on its own line with the label. Be specific, no filler. Use the product context to make every line concrete.${strategyContext}`,
        }),
      });
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Generation failed.");
      const text = data.text ?? "";
      const parsed = parseCopyFromOutput(text);
      const entry: AiHistoryEntry = {
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        prompt,
        pageId,
        pageName: page.name,
        text,
      };
      const updatedPage: LandingPage = {
        ...page,
        copy: { ...page.copy, ...parsed },
        generatedAt: new Date().toISOString(),
        status: page.status === "draft" ? "draft" : page.status,
      };
      const next: Workspace = {
        ...ws,
        pages: ws.pages.map((p) => (p.id === pageId ? updatedPage : p)),
        aiHistory: [entry, ...ws.aiHistory].slice(0, 20),
      };
      scheduleSave(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setGeneratingId(null);
    }
  }

  function updatePage(id: string, patch: Partial<LandingPage>) {
    scheduleSave({ ...ws, pages: ws.pages.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  }

  function addPage() {
    const page = emptyPage("", "landing");
    const next = { ...ws, pages: [...ws.pages, page] };
    scheduleSave(next);
    setExpandedId(page.id);
  }

  function removePage(id: string) {
    scheduleSave({ ...ws, pages: ws.pages.filter((p) => p.id !== id) });
    if (expandedId === id) setExpandedId(null);
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="h-4 w-48 animate-pulse rounded bg-surface3" />
        <div className="mt-3 h-3 w-64 animate-pulse rounded bg-surface3" />
      </div>
    );
  }

  const liveCount = ws.pages.filter((p) => p.status === "live").length;
  const copyReadyCount = ws.pages.filter((p) => p.copy.headline).length;

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-heading">Landing page copy</h2>
          <p className="mt-0.5 text-sm text-text2">
            Track and generate on-brand copy for each key page using your positioning + ICP.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-3 text-[11px] text-text3">
            <span>{ws.pages.length} pages</span>
            <span className="text-teal">{liveCount} live</span>
            <span className="text-primary">{copyReadyCount} with copy</span>
          </div>
          <span className="text-[10px] text-text3">{saving ? "Saving…" : ""}</span>
          <button
            type="button"
            onClick={addPage}
            className="rounded-xl border border-border bg-surface2 px-3 py-1.5 text-xs font-semibold text-text hover:bg-surface3"
          >
            + Add page
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red">{error}</div>
      ) : null}

      {strategyContext ? (
        <div className="flex items-center gap-1.5 text-[10px] text-text3">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-teal" />
          Positioning, ICP &amp; messaging pillars loaded — copy will reflect your strategy
        </div>
      ) : null}

      <AiProgressBar
        active={Boolean(generatingId)}
        variant="dark"
        title="Writing page copy…"
        estimate={AI_PROGRESS_ESTIMATE.short}
        durationMs={45_000}
      />

      <div className="space-y-3">
        {ws.pages.map((page) => (
          <PageCard
            key={page.id}
            page={page}
            expanded={expandedId === page.id}
            isGenerating={generatingId === page.id}
            onToggle={() => setExpandedId(expandedId === page.id ? null : page.id)}
            onChange={(patch) => updatePage(page.id, patch)}
            onGenerate={() => void generateForPage(page.id)}
            onRemove={() => removePage(page.id)}
          />
        ))}
      </div>

      {ws.aiHistory.length > 0 ? (
        <details className="rounded-xl border border-border bg-surface p-3">
          <summary className="cursor-pointer text-xs font-medium text-text2 hover:text-text">
            Generation history ({ws.aiHistory.length})
          </summary>
          <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto">
            {ws.aiHistory.map((h) => (
              <li key={h.id} className="rounded-lg border border-border bg-surface2 p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-medium text-text">{h.pageName}</span>
                  <span className="text-[10px] text-text3">{new Date(h.at).toLocaleDateString()}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-text2">{h.text.slice(0, 120)}…</p>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
