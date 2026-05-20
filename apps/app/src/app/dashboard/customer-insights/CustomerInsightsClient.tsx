"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AiProgressBar, AI_PROGRESS_ESTIMATE } from "@/app/dashboard/_components/AiProgressBar";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { ModuleShell } from "@/app/dashboard/_components/ModuleShell";

// ── Types ──────────────────────────────────────────────────────────────────

type QuoteSource = "interview" | "survey" | "review" | "support" | "sales-call" | "other";
type QuoteSentiment = "positive" | "neutral" | "negative";

const SOURCE_LABELS: Record<QuoteSource, string> = {
  interview: "Interview",
  survey: "Survey",
  review: "Review",
  support: "Support",
  "sales-call": "Sales call",
  other: "Other",
};

const SENTIMENT_STYLES: Record<QuoteSentiment, string> = {
  positive: "bg-teal/10 text-teal border-teal/25",
  neutral: "bg-surface2 text-text2 border-border",
  negative: "bg-red-500/10 text-red border-red-500/25",
};

const SENTIMENT_LABELS: Record<QuoteSentiment, string> = {
  positive: "😊 Positive",
  neutral: "😐 Neutral",
  negative: "😞 Negative",
};

type VocQuote = {
  id: string;
  text: string;
  source: QuoteSource;
  sentiment: QuoteSentiment;
  customerName: string;
  segment: string;
  approved: boolean;
};

type ThemeType = "driver" | "risk";

type FeedbackTheme = {
  id: string;
  name: string;
  pct: number;
  trend: "up" | "stable" | "down";
  type: ThemeType;
};

type InsightChannel = "nps" | "csat" | "interview" | "review" | "other";

type SurveyInsight = {
  id: string;
  date: string;
  channel: InsightChannel;
  insight: string;
  action: string;
};

type Workspace = {
  nps: number;
  npsTrend: string;
  csat: string;
  csatTrend: string;
  quotes: VocQuote[];
  themes: FeedbackTheme[];
  surveyInsights: SurveyInsight[];
  customerNarrative: string;
  retentionBrief: string;
};

// ── Seed / normalize ───────────────────────────────────────────────────────

function seedWorkspace(): Workspace {
  return {
    nps: 47,
    npsTrend: "",
    csat: "4.5 / 5",
    csatTrend: "",
    quotes: [
      { id: "q1", text: "We finally know what to do every Monday.", source: "interview", sentiment: "positive", customerName: "", segment: "", approved: false },
      { id: "q2", text: "Copilot turns insights into action.", source: "survey", sentiment: "positive", customerName: "", segment: "", approved: false },
      { id: "q3", text: "Cross-channel visibility improved our reporting speed.", source: "review", sentiment: "positive", customerName: "", segment: "", approved: false },
    ],
    themes: [
      { id: "t1", name: "Speed to execution", pct: 71, trend: "up", type: "driver" },
      { id: "t2", name: "Attribution confidence", pct: 63, trend: "stable", type: "driver" },
      { id: "t3", name: "Onboarding friction", pct: 34, trend: "up", type: "risk" },
    ],
    surveyInsights: [],
    customerNarrative: "",
    retentionBrief: "",
  };
}

function normalizeWorkspace(v: unknown): Workspace {
  if (!v || typeof v !== "object") return seedWorkspace();
  const o = v as Record<string, unknown>;
  const seed = seedWorkspace();

  const quotes: VocQuote[] = Array.isArray(o.quotes)
    ? (o.quotes as unknown[]).map((x) => {
        if (!x || typeof x !== "object") return seed.quotes[0];
        const r = x as Record<string, unknown>;
        const src = r.source as string;
        const sent = r.sentiment as string;
        return {
          id: String(r.id ?? crypto.randomUUID()),
          text: String(r.text ?? ""),
          source: (["interview","survey","review","support","sales-call","other"].includes(src) ? src : "other") as QuoteSource,
          sentiment: (["positive","neutral","negative"].includes(sent) ? sent : "positive") as QuoteSentiment,
          customerName: String(r.customerName ?? ""),
          segment: String(r.segment ?? ""),
          approved: Boolean(r.approved),
        };
      })
    : seed.quotes;

  const themes: FeedbackTheme[] = Array.isArray(o.themes)
    ? (o.themes as unknown[]).map((x) => {
        if (!x || typeof x !== "object") return seed.themes[0];
        const r = x as Record<string, unknown>;
        const trend = r.trend as string;
        const type = r.type as string;
        return {
          id: String(r.id ?? crypto.randomUUID()),
          name: String(r.name ?? ""),
          pct: typeof r.pct === "number" ? r.pct : 0,
          trend: (["up","stable","down"].includes(trend) ? trend : "stable") as FeedbackTheme["trend"],
          type: (["driver","risk"].includes(type) ? type : "driver") as ThemeType,
        };
      })
    : seed.themes;

  const surveyInsights: SurveyInsight[] = Array.isArray(o.surveyInsights)
    ? (o.surveyInsights as unknown[]).map((x) => {
        if (!x || typeof x !== "object") return seed.surveyInsights[0] ?? { id: crypto.randomUUID(), date: "", channel: "other" as InsightChannel, insight: "", action: "" };
        const r = x as Record<string, unknown>;
        const ch = r.channel as string;
        return {
          id: String(r.id ?? crypto.randomUUID()),
          date: String(r.date ?? ""),
          channel: (["nps","csat","interview","review","other"].includes(ch) ? ch : "other") as InsightChannel,
          insight: String(r.insight ?? ""),
          action: String(r.action ?? ""),
        };
      })
    : seed.surveyInsights;

  return {
    nps: typeof o.nps === "number" ? o.nps : seed.nps,
    npsTrend: String(o.npsTrend ?? ""),
    csat: String(o.csat ?? seed.csat),
    csatTrend: String(o.csatTrend ?? ""),
    quotes,
    themes,
    surveyInsights,
    customerNarrative: String(o.customerNarrative ?? ""),
    retentionBrief: String(o.retentionBrief ?? ""),
  };
}

// ── AI helper ──────────────────────────────────────────────────────────────

const CUSTOMER_SYSTEM =
  "You are an expert product marketing manager specialising in voice-of-customer research, customer retention, and PMM strategy. Generate crisp, actionable insights that connect customer sentiment to product and go-to-market decisions.";

async function callAI(prompt: string, length: "short" | "deep" = "short"): Promise<string> {
  const res = await fetch("/api/ai/module-generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt, system: CUSTOMER_SYSTEM, length }),
  });
  const data = (await res.json()) as { text?: string; error?: string };
  if (!res.ok) throw new Error(data.error ?? "Generation failed.");
  return data.text ?? "";
}

// ── Component ──────────────────────────────────────────────────────────────

export function CustomerInsightsClient({ environmentId }: { environmentId: string }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [ws, setWsRaw] = useState<Workspace>(() => seedWorkspace());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [expandedQuote, setExpandedQuote] = useState<string | null>(null);
  const [quoteFilter, setQuoteFilter] = useState<QuoteSentiment | "all">("all");

  // AI state
  const [generatingNarrative, setGeneratingNarrative] = useState(false);
  const [generatingRetention, setGeneratingRetention] = useState(false);
  const [generatingStrategy, setGeneratingStrategy] = useState(false);
  const [strategyInsight, setStrategyInsight] = useState("");
  const [strategyProduct, setStrategyProduct] = useState("");
  const [strategyOutput, setStrategyOutput] = useState("");
  const [strategyError, setStrategyError] = useState<string | null>(null);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load / persist ────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: qErr } = await supabase
      .from("module_settings")
      .select("value_json")
      .eq("environment_id", environmentId)
      .eq("module", "customer_insights")
      .eq("key", "workspace")
      .maybeSingle();
    if (qErr) setError(qErr.message);
    if (data?.value_json) setWsRaw(normalizeWorkspace(data.value_json));
    setLoading(false);
  }, [environmentId, supabase]);

  useEffect(() => { void load(); }, [load]);

  const persist = useCallback(
    async (payload: Workspace) => {
      setSaving(true);
      const { error: upErr } = await supabase.from("module_settings").upsert({
        environment_id: environmentId,
        module: "customer_insights",
        key: "workspace",
        value_json: payload as unknown as Record<string, unknown>,
      });
      setSaving(false);
      if (upErr) setError(upErr.message);
    },
    [environmentId, supabase],
  );

  function schedule(next: Workspace) {
    setWsRaw(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void persist(next), 450);
  }

  // ── Quote helpers ─────────────────────────────────────────────────────

  function addQuote() {
    const q: VocQuote = {
      id: crypto.randomUUID(),
      text: "",
      source: "interview",
      sentiment: "positive",
      customerName: "",
      segment: "",
      approved: false,
    };
    const next = { ...ws, quotes: [...ws.quotes, q] };
    schedule(next);
    setExpandedQuote(q.id);
  }

  function patchQuote(id: string, patch: Partial<VocQuote>) {
    schedule({ ...ws, quotes: ws.quotes.map((q) => (q.id === id ? { ...q, ...patch } : q)) });
  }

  function removeQuote(id: string) {
    schedule({ ...ws, quotes: ws.quotes.filter((q) => q.id !== id) });
    if (expandedQuote === id) setExpandedQuote(null);
  }

  // ── Theme helpers ─────────────────────────────────────────────────────

  function addTheme(type: ThemeType) {
    const t: FeedbackTheme = { id: crypto.randomUUID(), name: "", pct: 30, trend: "stable", type };
    schedule({ ...ws, themes: [...ws.themes, t] });
  }

  function patchTheme(id: string, patch: Partial<FeedbackTheme>) {
    schedule({ ...ws, themes: ws.themes.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
  }

  function removeTheme(id: string) {
    schedule({ ...ws, themes: ws.themes.filter((t) => t.id !== id) });
  }

  // ── Survey insight helpers ────────────────────────────────────────────

  function addSurveyInsight() {
    const s: SurveyInsight = { id: crypto.randomUUID(), date: "", channel: "nps", insight: "", action: "" };
    schedule({ ...ws, surveyInsights: [...ws.surveyInsights, s] });
  }

  function patchSurveyInsight(id: string, patch: Partial<SurveyInsight>) {
    schedule({ ...ws, surveyInsights: ws.surveyInsights.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  }

  function removeSurveyInsight(id: string) {
    schedule({ ...ws, surveyInsights: ws.surveyInsights.filter((s) => s.id !== id) });
  }

  // ── AI generation ─────────────────────────────────────────────────────

  async function generateNarrative() {
    setGeneratingNarrative(true);
    setError(null);
    try {
      const drivers = ws.themes.filter((t) => t.type === "driver").map((t) => `${t.name} (${t.pct}%)`).join(", ");
      const risks = ws.themes.filter((t) => t.type === "risk").map((t) => `${t.name} (${t.pct}%)`).join(", ");
      const topQuotes = ws.quotes
        .filter((q) => q.text.trim())
        .slice(0, 5)
        .map((q) => `"${q.text}" [${q.sentiment}, ${q.source}]`)
        .join("\n");

      const prompt = `Write a customer narrative for a PMM based on real VOC data. This will be used in messaging documents and executive presentations.

NPS: ${ws.nps}${ws.npsTrend ? ` (${ws.npsTrend})` : ""}
CSAT: ${ws.csat}${ws.csatTrend ? ` (${ws.csatTrend})` : ""}
Retention drivers: ${drivers || "not specified"}
Churn risks: ${risks || "not specified"}
Customer quotes:
${topQuotes || "not provided"}

Write 2–3 paragraphs:
1. What customers love most and why they stay (lead with the highest-impact driver)
2. Where friction exists and what it signals about product/onboarding gaps
3. The single most important customer insight PMM should act on this quarter

Be specific, grounded in the data above. Under 250 words. No generic filler.`;

      const text = await callAI(prompt, "deep");
      schedule({ ...ws, customerNarrative: text });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setGeneratingNarrative(false);
    }
  }

  async function generateRetentionBrief() {
    setGeneratingRetention(true);
    setError(null);
    try {
      const risks = ws.themes.filter((t) => t.type === "risk").map((t) => `- ${t.name} (${t.pct}%${t.trend === "up" ? ", trending up ⚠️" : ""})`).join("\n");
      const drivers = ws.themes.filter((t) => t.type === "driver").map((t) => `- ${t.name} (${t.pct}%)`).join("\n");
      const negativeQuotes = ws.quotes
        .filter((q) => q.sentiment === "negative" && q.text.trim())
        .slice(0, 3)
        .map((q) => `"${q.text}"`)
        .join("\n");
      const surveyActions = ws.surveyInsights
        .filter((s) => s.insight.trim())
        .slice(0, 4)
        .map((s) => `[${s.channel.toUpperCase()}] ${s.insight}`)
        .join("\n");

      const prompt = `Generate a retention risk brief for a PMM team based on customer data.

NPS: ${ws.nps} | CSAT: ${ws.csat}

Churn risk signals:
${risks || "None logged"}

Retention drivers:
${drivers || "Not specified"}

Negative customer feedback:
${negativeQuotes || "None logged"}

Survey / interview insights:
${surveyActions || "None logged"}

Structure the brief as:

🚨 TOP RETENTION RISKS
[3 specific risks ranked by urgency, with a one-line PMM action for each]

💪 EXPANSION SIGNALS
[2-3 things customers want more of — upsell or feature expansion opportunities]

📣 MESSAGING IMPLICATIONS
[What these signals mean for how we talk about the product — what to emphasise, what to stop saying]

🎯 RECOMMENDED PMM ACTIONS THIS QUARTER
[3 specific, prioritised actions with owners (PMM/CS/Product)]

Under 350 words. Be specific and data-driven.`;

      const text = await callAI(prompt, "deep");
      schedule({ ...ws, retentionBrief: text });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setGeneratingRetention(false);
    }
  }

  async function generateStrategyFeedback() {
    if (!strategyInsight.trim()) return;
    setGeneratingStrategy(true);
    setStrategyError(null);
    try {
      const prompt = `Extract PMM strategy signals from this customer insight.

Product/feature context: ${strategyProduct.trim() || "not specified"}
Customer insight: ${strategyInsight.trim()}

Return exactly this format:

ICP SIGNAL:
[What this tells us about our ideal customer profile — who we should target more or less]

MESSAGING SIGNAL:
[What needs to change in our positioning, messaging, or proof points]

SUGGESTED ACTION:
[One concrete thing PMM should do in the next two weeks based on this signal]`;

      const text = await callAI(prompt, "short");
      setStrategyOutput(text);
    } catch (e) {
      setStrategyError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setGeneratingStrategy(false);
    }
  }

  // ── Copy helper ───────────────────────────────────────────────────────

  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
  }

  // ── Render ────────────────────────────────────────────────────────────

  if (loading) return <div className="h-12 animate-pulse rounded-xl bg-surface2" />;

  const npsColor = ws.nps >= 50 ? "text-teal" : ws.nps >= 30 ? "text-amber-700" : "text-red";
  const drivers = ws.themes.filter((t) => t.type === "driver");
  const risks = ws.themes.filter((t) => t.type === "risk");
  const filteredQuotes = quoteFilter === "all" ? ws.quotes : ws.quotes.filter((q) => q.sentiment === quoteFilter);
  const approvedCount = ws.quotes.filter((q) => q.approved).length;

  const TREND_ICONS: Record<FeedbackTheme["trend"], string> = { up: "↑", stable: "→", down: "↓" };
  const TREND_COLORS: Record<FeedbackTheme["trend"], string> = { up: "text-amber-700", stable: "text-text2", down: "text-red" };

  return (
    <ModuleShell
      title="Customer Insights"
      subtitle="Voice-of-customer quotes, feedback themes, survey insights, and retention analysis."
      actions={<span className="text-xs text-text3">{saving ? "Saving…" : "Saved per product"}</span>}
    >
    <div className="space-y-5">

      {error && (
        <div className="hs-alert hs-alert-error">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-3 text-xs underline">Dismiss</button>
        </div>
      )}

      {/* NPS / CSAT / approved quotes strip */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="hs-card hs-card-hover p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-text2">NPS</div>
          <div className="mt-1 flex items-end gap-2">
            <input
              type="number"
              value={ws.nps}
              onChange={(e) => schedule({ ...ws, nps: Number(e.target.value) || 0 })}
              className={`w-24 bg-transparent text-3xl font-bold tabular-nums outline-none ${npsColor}`}
            />
            <input
              value={ws.npsTrend}
              onChange={(e) => schedule({ ...ws, npsTrend: e.target.value })}
              placeholder="e.g. ↑ +3 QoQ"
              className="mb-1 min-w-0 flex-1 hs-card2 px-2 py-1 text-xs text-text2 placeholder:text-text3"
            />
          </div>
        </div>
        <div className="hs-card hs-card-hover p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-text2">CSAT</div>
          <div className="mt-1 flex items-end gap-2">
            <input
              value={ws.csat}
              onChange={(e) => schedule({ ...ws, csat: e.target.value })}
              className="w-28 bg-transparent text-3xl font-bold tabular-nums text-teal outline-none"
            />
            <input
              value={ws.csatTrend}
              onChange={(e) => schedule({ ...ws, csatTrend: e.target.value })}
              placeholder="e.g. ↑ +0.2 QoQ"
              className="mb-1 min-w-0 flex-1 hs-card2 px-2 py-1 text-xs text-text2 placeholder:text-text3"
            />
          </div>
        </div>
        <div className="hs-card hs-card-hover p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-text2">Approved quotes</div>
          <div className={`mt-1 text-3xl font-bold tabular-nums ${approvedCount > 0 ? "text-teal" : "text-text2"}`}>{approvedCount}</div>
          <div className="mt-0.5 text-xs text-text2">of {ws.quotes.length} total — approved for marketing use</div>
        </div>
      </div>

      {/* VOC Quote Library + Feedback Themes */}
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">

        {/* VOC Quote Library */}
        <div className="hs-card p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-heading">🗣️ VOC Quote Library</div>
              <p className="mt-0.5 text-xs text-text2">Tag, approve, and copy customer quotes for use in messaging and decks</p>
            </div>
            <button
              onClick={addQuote}
              className="hs-btn hs-btn-secondary"
            >
              + Add quote
            </button>
          </div>

          {/* Sentiment filter */}
          <div className="mb-3 flex gap-1.5">
            {(["all", "positive", "neutral", "negative"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setQuoteFilter(f)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${quoteFilter === f ? "bg-primary text-white" : "bg-surface2 text-text2 hover:bg-surface3"}`}
              >
                {f === "all" ? "All" : f === "positive" ? "😊 Positive" : f === "neutral" ? "😐 Neutral" : "😞 Negative"}
                {f !== "all" && (
                  <span className="ml-1 tabular-nums opacity-70">
                    {ws.quotes.filter((q) => q.sentiment === f).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {filteredQuotes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface2 p-6 text-center text-sm text-text2">
              No quotes yet — add direct customer feedback from interviews, surveys, or reviews.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredQuotes.map((q) => {
                const isOpen = expandedQuote === q.id;
                return (
                  <div
                    key={q.id}
                    className={`rounded-xl border transition-colors ${isOpen ? "border-primary/30 bg-primary/5" : q.approved ? "border-teal/25 bg-teal/5" : "border-border bg-surface2"}`}
                  >
                    {/* Collapsed row */}
                    <div
                      className="flex cursor-pointer items-start gap-3 px-3 py-2.5"
                      onClick={() => setExpandedQuote(isOpen ? null : q.id)}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${SENTIMENT_STYLES[q.sentiment]}`}>
                            {SENTIMENT_LABELS[q.sentiment]}
                          </span>
                          <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] text-text2">
                            {SOURCE_LABELS[q.source]}
                          </span>
                          {q.segment && (
                            <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                              {q.segment}
                            </span>
                          )}
                          {q.approved && (
                            <span className="rounded-full border border-teal/30 bg-teal/10 px-2 py-0.5 text-[10px] font-semibold text-teal">
                              ✓ Approved
                            </span>
                          )}
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm italic text-heading">
                          {q.text ? `"${q.text}"` : <span className="not-italic text-text3">New quote…</span>}
                        </p>
                        {q.customerName && <p className="mt-0.5 text-[11px] text-text2">— {q.customerName}</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {q.text && (
                          <button
                            onClick={(e) => { e.stopPropagation(); void copy(`"${q.text}"${q.customerName ? ` — ${q.customerName}` : ""}`); }}
                            className="hs-card px-2 py-1 text-[10px] font-semibold text-primary hover:bg-surface2"
                          >
                            Copy
                          </button>
                        )}
                        <span className={`text-xs text-text2 transition-transform duration-150 ${isOpen ? "rotate-90" : ""}`}>▸</span>
                      </div>
                    </div>

                    {/* Expanded */}
                    {isOpen && (
                      <div className="space-y-3 border-t border-border/60 px-3 pb-3 pt-3">
                        <div>
                          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-text3">Quote text</label>
                          <textarea
                            value={q.text}
                            onChange={(e) => patchQuote(q.id, { text: e.target.value })}
                            rows={3}
                            placeholder="Paste the exact customer quote…"
                            className="w-full hs-card px-2.5 py-2 text-sm italic text-heading placeholder:text-text3 placeholder:not-italic"
                          />
                        </div>
                        <div className="grid gap-2 sm:grid-cols-3">
                          <div>
                            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-text3">Source</label>
                            <select
                              value={q.source}
                              onChange={(e) => patchQuote(q.id, { source: e.target.value as QuoteSource })}
                              className="w-full hs-card px-2 py-1.5 text-sm text-heading"
                            >
                              {(Object.entries(SOURCE_LABELS) as [QuoteSource, string][]).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-text3">Sentiment</label>
                            <select
                              value={q.sentiment}
                              onChange={(e) => patchQuote(q.id, { sentiment: e.target.value as QuoteSentiment })}
                              className="w-full hs-card px-2 py-1.5 text-sm text-heading"
                            >
                              <option value="positive">😊 Positive</option>
                              <option value="neutral">😐 Neutral</option>
                              <option value="negative">😞 Negative</option>
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-text3">Segment</label>
                            <input
                              value={q.segment}
                              onChange={(e) => patchQuote(q.id, { segment: e.target.value })}
                              placeholder="e.g. Enterprise"
                              className="w-full hs-card px-2 py-1.5 text-sm text-heading placeholder:text-text3"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-text3">Customer name / company (optional)</label>
                          <input
                            value={q.customerName}
                            onChange={(e) => patchQuote(q.id, { customerName: e.target.value })}
                            placeholder="e.g. Sarah M., Head of Marketing at Acme"
                            className="w-full hs-card px-2.5 py-1.5 text-sm text-heading placeholder:text-text3"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="flex cursor-pointer items-center gap-2 text-sm text-heading">
                            <input
                              type="checkbox"
                              checked={q.approved}
                              onChange={(e) => patchQuote(q.id, { approved: e.target.checked })}
                              className="rounded border-border"
                            />
                            <span className="text-xs font-medium">Approved for marketing use</span>
                          </label>
                          <button
                            onClick={() => removeQuote(q.id)}
                            className="rounded-lg border border-red-500/30 px-2 py-1 text-xs text-red hover:bg-red-500/10"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Feedback Themes */}
        <div className="hs-card p-5">
          <div className="mb-4 text-sm font-semibold text-heading">📊 Feedback Themes</div>

          {/* Retention drivers */}
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-teal">💪 Retention drivers</span>
              <button
                onClick={() => addTheme("driver")}
                className="text-[10px] text-primary hover:underline"
              >
                + Add
              </button>
            </div>
            {drivers.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-surface2 p-3 text-center text-xs text-text2">No drivers yet</div>
            ) : (
              <div className="space-y-3">
                {drivers.map((t) => (
                  <div key={t.id} className="group">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <input
                        value={t.name}
                        onChange={(e) => patchTheme(t.id, { name: e.target.value })}
                        placeholder="Theme name"
                        className="min-w-0 flex-1 hs-card2 px-2 py-1 text-xs text-heading placeholder:text-text3"
                      />
                      <div className="flex shrink-0 items-center gap-1">
                        <select
                          value={t.trend}
                          onChange={(e) => patchTheme(t.id, { trend: e.target.value as FeedbackTheme["trend"] })}
                          className={`rounded border border-border bg-surface2 px-1 py-0.5 text-[10px] font-bold ${TREND_COLORS[t.trend]}`}
                        >
                          <option value="up">↑ Up</option>
                          <option value="stable">→ Stable</option>
                          <option value="down">↓ Down</option>
                        </select>
                        <span className="w-8 text-right text-xs font-medium tabular-nums text-text2">{t.pct}%</span>
                        <button onClick={() => removeTheme(t.id)} className="text-[10px] text-text3 opacity-0 hover:text-red group-hover:opacity-100">✕</button>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={t.pct}
                      onChange={(e) => patchTheme(t.id, { pct: Number(e.target.value) })}
                      className="w-full accent-teal"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Churn risks */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-red">⚠️ Churn risks</span>
              <button
                onClick={() => addTheme("risk")}
                className="text-[10px] text-primary hover:underline"
              >
                + Add
              </button>
            </div>
            {risks.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-surface2 p-3 text-center text-xs text-text2">No risks logged</div>
            ) : (
              <div className="space-y-3">
                {risks.map((t) => (
                  <div key={t.id} className="group">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <input
                        value={t.name}
                        onChange={(e) => patchTheme(t.id, { name: e.target.value })}
                        placeholder="Risk name"
                        className="min-w-0 flex-1 hs-card2 px-2 py-1 text-xs text-heading placeholder:text-text3"
                      />
                      <div className="flex shrink-0 items-center gap-1">
                        <select
                          value={t.trend}
                          onChange={(e) => patchTheme(t.id, { trend: e.target.value as FeedbackTheme["trend"] })}
                          className={`rounded border border-border bg-surface2 px-1 py-0.5 text-[10px] font-bold ${TREND_COLORS[t.trend]}`}
                        >
                          <option value="up">↑ Up</option>
                          <option value="stable">→ Stable</option>
                          <option value="down">↓ Down</option>
                        </select>
                        <span className="w-8 text-right text-xs font-medium tabular-nums text-text2">{t.pct}%</span>
                        <button onClick={() => removeTheme(t.id)} className="text-[10px] text-text3 opacity-0 hover:text-red group-hover:opacity-100">✕</button>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={t.pct}
                      onChange={(e) => patchTheme(t.id, { pct: Number(e.target.value) })}
                      className="w-full accent-red-500"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Survey / Interview Log */}
      <div className="hs-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-heading">📋 Survey & Interview Log</div>
            <p className="mt-0.5 text-xs text-text2">Capture key findings and the PMM action each one warrants</p>
          </div>
          <button
            onClick={addSurveyInsight}
            className="hs-btn hs-btn-secondary"
          >
            + Add finding
          </button>
        </div>

        {ws.surveyInsights.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface2 p-5 text-center text-sm text-text2">
            No findings logged yet — add key takeaways from NPS surveys, CSAT responses, or customer interviews.
          </div>
        ) : (
          <div className="space-y-2">
            {ws.surveyInsights.map((s) => (
              <div key={s.id} className="hs-card2 p-3">
                <div className="grid gap-2 sm:grid-cols-[110px_1fr_1fr_auto] sm:items-start">
                  <select
                    value={s.channel}
                    onChange={(e) => patchSurveyInsight(s.id, { channel: e.target.value as InsightChannel })}
                    className="hs-card px-2 py-1.5 text-xs font-semibold text-heading"
                  >
                    <option value="nps">NPS</option>
                    <option value="csat">CSAT</option>
                    <option value="interview">Interview</option>
                    <option value="review">Review</option>
                    <option value="other">Other</option>
                  </select>
                  <input
                    value={s.insight}
                    onChange={(e) => patchSurveyInsight(s.id, { insight: e.target.value })}
                    placeholder="Key finding or insight…"
                    className="hs-card px-2.5 py-1.5 text-sm text-heading placeholder:text-text3"
                  />
                  <input
                    value={s.action}
                    onChange={(e) => patchSurveyInsight(s.id, { action: e.target.value })}
                    placeholder="PMM action this warrants…"
                    className="rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-sm text-heading placeholder:text-text3"
                  />
                  <button
                    onClick={() => removeSurveyInsight(s.id)}
                    className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-text2 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Customer Narrative + Retention Brief */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Customer Narrative */}
        <div className="hs-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-heading">✍️ Customer Narrative</div>
              <p className="mt-0.5 text-xs text-text2">PMM-ready summary for decks and messaging docs</p>
            </div>
            <button
              onClick={() => void generateNarrative()}
              disabled={generatingNarrative}
              className="hs-btn hs-btn-primary disabled:opacity-50"
            >
              {generatingNarrative ? "Generating…" : ws.customerNarrative ? "Regenerate →" : "Generate →"}
            </button>
          </div>

          <AiProgressBar
            active={generatingNarrative}
            variant="dark"
            title="Writing customer narrative…"
            estimate={AI_PROGRESS_ESTIMATE.deep}
            durationMs={55_000}
          />

          {ws.customerNarrative ? (
            <div className="relative">
              <textarea
                value={ws.customerNarrative}
                onChange={(e) => schedule({ ...ws, customerNarrative: e.target.value })}
                rows={10}
                className="w-full hs-card2 px-3 py-2.5 text-sm leading-relaxed text-heading"
              />
              <button
                onClick={() => void copy(ws.customerNarrative)}
                className="absolute right-2 top-2 hs-card px-2 py-1 text-[10px] font-semibold text-primary hover:bg-surface2"
              >
                Copy
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-surface2 p-4 text-sm text-text2">
              Click &ldquo;Generate&rdquo; — the narrative is built from your VOC quotes, NPS/CSAT scores, and feedback themes.
            </div>
          )}
        </div>

        {/* Retention Brief */}
        <div className="hs-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-heading">🚨 Retention Brief</div>
              <p className="mt-0.5 text-xs text-text2">Risks, expansion signals, and PMM actions this quarter</p>
            </div>
            <button
              onClick={() => void generateRetentionBrief()}
              disabled={generatingRetention}
              className="hs-btn hs-btn-primary disabled:opacity-50"
            >
              {generatingRetention ? "Generating…" : ws.retentionBrief ? "Regenerate →" : "Generate →"}
            </button>
          </div>

          <AiProgressBar
            active={generatingRetention}
            variant="dark"
            title="Analysing retention signals…"
            estimate={AI_PROGRESS_ESTIMATE.deep}
            durationMs={55_000}
          />

          {ws.retentionBrief ? (
            <div className="relative">
              <textarea
                value={ws.retentionBrief}
                onChange={(e) => schedule({ ...ws, retentionBrief: e.target.value })}
                rows={10}
                className="w-full hs-card2 px-3 py-2.5 text-sm leading-relaxed text-heading"
              />
              <button
                onClick={() => void copy(ws.retentionBrief)}
                className="absolute right-2 top-2 hs-card px-2 py-1 text-[10px] font-semibold text-primary hover:bg-surface2"
              >
                Copy
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-surface2 p-4 text-sm text-text2">
              Click &ldquo;Generate&rdquo; — the brief prioritises churn risks, expansion opportunities, and messaging implications from your data.
            </div>
          )}
        </div>
      </div>

      {/* Send to Strategy */}
      <div className="hs-card p-5">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-sm font-semibold text-heading">Send to Strategy</span>
          <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">AI</span>
        </div>
        <p className="mb-4 text-xs text-text2">
          Paste a customer insight and AI will extract ICP updates, messaging signals, and a suggested PMM action to feed back into strategy.
        </p>

        {strategyError && (
          <div className="hs-alert hs-alert-error mb-3">{strategyError}</div>
        )}

        <div className="space-y-2">
          <div>
            <label className="mb-1 block text-xs text-text2">Product or feature (context)</label>
            <input
              value={strategyProduct}
              onChange={(e) => setStrategyProduct(e.target.value)}
              placeholder="e.g. AI Marketing Workbench — Onboarding flow"
              className="w-full hs-card px-3 py-2 text-sm text-heading placeholder:text-text3"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-text2">Insight to analyse</label>
            <textarea
              value={strategyInsight}
              onChange={(e) => setStrategyInsight(e.target.value)}
              rows={3}
              placeholder="e.g. NPS detractors mention onboarding friction as the top reason in 3 consecutive quarters…"
              className="w-full hs-card px-3 py-2 text-sm text-heading placeholder:text-text3"
            />
          </div>
        </div>

        <AiProgressBar
          active={generatingStrategy}
          variant="dark"
          title="Extracting strategy signals…"
          estimate={AI_PROGRESS_ESTIMATE.short}
          durationMs={45_000}
        />

        <button
          onClick={() => void generateStrategyFeedback()}
          disabled={generatingStrategy || !strategyInsight.trim()}
          className="hs-btn hs-btn-primary mt-3 disabled:opacity-40"
        >
          {generatingStrategy ? "Analysing…" : "Extract strategy signals"}
        </button>

        {strategyOutput && (
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs text-text2">Strategy signals</span>
              <button onClick={() => void copy(strategyOutput)} className="text-[10px] text-primary hover:underline">Copy</button>
            </div>
            <pre className="whitespace-pre-wrap hs-card p-3 text-sm text-heading">
              {strategyOutput}
            </pre>
          </div>
        )}
      </div>
    </div>
    </ModuleShell>
  );
}
