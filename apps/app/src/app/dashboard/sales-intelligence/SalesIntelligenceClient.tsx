"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AiProgressBar, AI_PROGRESS_ESTIMATE } from "@/app/dashboard/_components/AiProgressBar";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { ModuleShell } from "@/app/dashboard/_components/ModuleShell";

// ── Types ──────────────────────────────────────────────────────────────────

type ObjectionCategory = "price" | "competition" | "timing" | "authority" | "need" | "other";

const CATEGORY_LABELS: Record<ObjectionCategory, string> = {
  price: "Price",
  competition: "Competitor",
  timing: "Timing",
  authority: "Authority",
  need: "Need",
  other: "Other",
};

const CATEGORY_COLORS: Record<ObjectionCategory, string> = {
  price: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  competition: "bg-primary/10 text-primary border-primary/20",
  timing: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  authority: "bg-purple-500/10 text-purple-700 border-purple-500/20",
  need: "bg-teal/10 text-teal border-teal/20",
  other: "bg-surface2 text-text2 border-border",
};

type Objection = {
  id: string;
  name: string;
  frequency: number;
  category: ObjectionCategory;
  rebuttal: string;
  proofPoint: string;
  followUpQ: string;
};

type WinLossRow = {
  id: string;
  segment: string;
  wins: number;
  losses: number;
  topWinReason: string;
  topLossReason: string;
};

type DealStage = "discovery" | "demo" | "proposal" | "negotiation" | "close";

const DEAL_STAGES: { id: DealStage; label: string; emoji: string }[] = [
  { id: "discovery", label: "Discovery", emoji: "🔍" },
  { id: "demo", label: "Demo", emoji: "🎯" },
  { id: "proposal", label: "Proposal", emoji: "📋" },
  { id: "negotiation", label: "Negotiation", emoji: "🤝" },
  { id: "close", label: "Close", emoji: "🏆" },
];

type StageAsset = {
  talkTrack: string;
  emailTemplate: string;
  keyQuestions: string;
};

type CallInsight = {
  id: string;
  date: string;
  quote: string;
  theme: string;
  outcome: "won" | "lost" | "pending" | "no-decision";
};

type Workspace = {
  objections: Objection[];
  winloss: WinLossRow[];
  stages: Record<DealStage, StageAsset>;
  callInsights: CallInsight[];
  coachingPlaybook: string;
};

// ── Seed / normalize ───────────────────────────────────────────────────────

function emptyStage(): StageAsset {
  return { talkTrack: "", emailTemplate: "", keyQuestions: "" };
}

function seedWorkspace(): Workspace {
  return {
    objections: [
      { id: "o1", name: "Price sensitivity", frequency: 62, category: "price", rebuttal: "", proofPoint: "", followUpQ: "" },
      { id: "o2", name: "Already using a competitor", frequency: 48, category: "competition", rebuttal: "", proofPoint: "", followUpQ: "" },
      { id: "o3", name: "Need more proof / case studies", frequency: 55, category: "need", rebuttal: "", proofPoint: "", followUpQ: "" },
    ],
    winloss: [
      { id: "w1", segment: "Mid-market", wins: 58, losses: 42, topWinReason: "", topLossReason: "" },
      { id: "w2", segment: "Enterprise", wins: 44, losses: 56, topWinReason: "", topLossReason: "" },
      { id: "w3", segment: "PLG upmarket", wins: 63, losses: 37, topWinReason: "", topLossReason: "" },
    ],
    stages: {
      discovery: emptyStage(),
      demo: emptyStage(),
      proposal: emptyStage(),
      negotiation: emptyStage(),
      close: emptyStage(),
    },
    callInsights: [
      { id: "c1", date: "", quote: '"Need proof this works with small teams."', theme: "Proof depth", outcome: "pending" },
      { id: "c2", date: "", quote: '"Timeline risk is unclear."', theme: "Timing", outcome: "pending" },
      { id: "c3", date: "", quote: '"How does this compare to Acme?"', theme: "Competition", outcome: "pending" },
    ],
    coachingPlaybook: "",
  };
}

function normalizeWorkspace(v: unknown): Workspace {
  if (!v || typeof v !== "object") return seedWorkspace();
  const o = v as Record<string, unknown>;
  const seed = seedWorkspace();

  const objections: Objection[] = Array.isArray(o.objections)
    ? (o.objections as unknown[]).map((x) => {
        if (!x || typeof x !== "object") return seed.objections[0];
        const r = x as Record<string, unknown>;
        const cat = r.category as string;
        return {
          id: String(r.id ?? crypto.randomUUID()),
          name: String(r.name ?? ""),
          frequency: typeof r.frequency === "number" ? r.frequency : typeof r.pct === "number" ? r.pct : 0,
          category: (["price","competition","timing","authority","need","other"].includes(cat) ? cat : "other") as ObjectionCategory,
          rebuttal: String(r.rebuttal ?? ""),
          proofPoint: String(r.proofPoint ?? ""),
          followUpQ: String(r.followUpQ ?? ""),
        };
      })
    : seed.objections;

  const winloss: WinLossRow[] = Array.isArray(o.winloss)
    ? (o.winloss as unknown[]).map((x) => {
        if (!x || typeof x !== "object") return seed.winloss[0];
        const r = x as Record<string, unknown>;
        return {
          id: String(r.id ?? crypto.randomUUID()),
          segment: String(r.segment ?? ""),
          wins: typeof r.wins === "number" ? r.wins : 0,
          losses: typeof r.losses === "number" ? r.losses : 0,
          topWinReason: String(r.topWinReason ?? ""),
          topLossReason: String(r.topLossReason ?? ""),
        };
      })
    : seed.winloss;

  const stagesRaw = o.stages && typeof o.stages === "object" ? (o.stages as Record<string, unknown>) : {};
  const stages = {} as Record<DealStage, StageAsset>;
  for (const s of DEAL_STAGES) {
    const raw = stagesRaw[s.id];
    if (raw && typeof raw === "object") {
      const r = raw as Record<string, unknown>;
      stages[s.id] = {
        talkTrack: String(r.talkTrack ?? ""),
        emailTemplate: String(r.emailTemplate ?? ""),
        keyQuestions: String(r.keyQuestions ?? ""),
      };
    } else {
      stages[s.id] = emptyStage();
    }
  }

  const callInsights: CallInsight[] = Array.isArray(o.callInsights)
    ? (o.callInsights as unknown[]).map((x) => {
        if (!x || typeof x !== "object") return seed.callInsights[0];
        const r = x as Record<string, unknown>;
        const outcome = r.outcome as string;
        return {
          id: String(r.id ?? crypto.randomUUID()),
          date: String(r.date ?? ""),
          quote: String(r.quote ?? ""),
          theme: String(r.theme ?? ""),
          outcome: (["won","lost","pending","no-decision"].includes(outcome) ? outcome : "pending") as CallInsight["outcome"],
        };
      })
    : seed.callInsights;

  return {
    objections,
    winloss,
    stages,
    callInsights,
    coachingPlaybook: String(o.coachingPlaybook ?? ""),
  };
}

// ── AI helper ──────────────────────────────────────────────────────────────

const SALES_SYSTEM =
  "You are an expert B2B sales enablement specialist and product marketing manager. Generate crisp, actionable sales assets reps can use directly in calls and emails. Be specific, confident, and outcome-focused.";

async function callAI(prompt: string, system: string, length: "short" | "deep" = "short"): Promise<string> {
  const res = await fetch("/api/ai/module-generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt, system, length }),
  });
  const data = (await res.json()) as { text?: string; error?: string };
  if (!res.ok) throw new Error(data.error ?? "Generation failed.");
  return data.text ?? "";
}

// ── Component ──────────────────────────────────────────────────────────────

export function SalesIntelligenceClient({ environmentId }: { environmentId: string }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [ws, setWsRaw] = useState<Workspace>(() => seedWorkspace());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [activeStage, setActiveStage] = useState<DealStage>("discovery");
  const [expandedObjection, setExpandedObjection] = useState<string | null>(null);
  const [expandedWinLoss, setExpandedWinLoss] = useState<string | null>(null);

  // AI state
  const [generatingRebuttal, setGeneratingRebuttal] = useState<string | null>(null);
  const [generatingStage, setGeneratingStage] = useState(false);
  const [generatingPlaybook, setGeneratingPlaybook] = useState(false);
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
      .eq("module", "sales_intelligence")
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
        module: "sales_intelligence",
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

  // ── Objection helpers ─────────────────────────────────────────────────

  function addObjection() {
    const newObj: Objection = {
      id: crypto.randomUUID(),
      name: "",
      frequency: 30,
      category: "other",
      rebuttal: "",
      proofPoint: "",
      followUpQ: "",
    };
    const next = { ...ws, objections: [...ws.objections, newObj] };
    schedule(next);
    setExpandedObjection(newObj.id);
  }

  function patchObjection(id: string, patch: Partial<Objection>) {
    schedule({ ...ws, objections: ws.objections.map((o) => (o.id === id ? { ...o, ...patch } : o)) });
  }

  function removeObjection(id: string) {
    schedule({ ...ws, objections: ws.objections.filter((o) => o.id !== id) });
    if (expandedObjection === id) setExpandedObjection(null);
  }

  async function generateRebuttal(o: Objection) {
    setGeneratingRebuttal(o.id);
    setError(null);
    try {
      const prompt = `Generate a complete objection handling card for a B2B SaaS sales rep.

Objection: "${o.name}"
Category: ${CATEGORY_LABELS[o.category]}
Frequency: ${o.frequency}% of deals

Return exactly this format (no extra commentary):

REBUTTAL:
[2-3 sentence confident response that acknowledges the concern, reframes it, and pivots to value]

PROOF POINT:
[1 specific data point, customer outcome, or third-party evidence that backs the rebuttal]

FOLLOW-UP QUESTION:
[1 open question to ask after the rebuttal to re-engage the prospect]`;

      const text = await callAI(prompt, SALES_SYSTEM, "short");

      const rebuttalMatch = text.match(/REBUTTAL:\s*([\s\S]*?)(?=PROOF POINT:|$)/i);
      const proofMatch = text.match(/PROOF POINT:\s*([\s\S]*?)(?=FOLLOW-UP QUESTION:|$)/i);
      const followUpMatch = text.match(/FOLLOW-UP QUESTION:\s*([\s\S]*?)$/i);

      patchObjection(o.id, {
        rebuttal: rebuttalMatch?.[1]?.trim() ?? text,
        proofPoint: proofMatch?.[1]?.trim() ?? "",
        followUpQ: followUpMatch?.[1]?.trim() ?? "",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setGeneratingRebuttal(null);
    }
  }

  // ── Win/loss helpers ──────────────────────────────────────────────────

  function addWinLoss() {
    const row: WinLossRow = { id: crypto.randomUUID(), segment: "", wins: 0, losses: 0, topWinReason: "", topLossReason: "" };
    schedule({ ...ws, winloss: [...ws.winloss, row] });
    setExpandedWinLoss(row.id);
  }

  function patchWinLoss(id: string, patch: Partial<WinLossRow>) {
    schedule({ ...ws, winloss: ws.winloss.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  }

  function removeWinLoss(id: string) {
    schedule({ ...ws, winloss: ws.winloss.filter((r) => r.id !== id) });
    if (expandedWinLoss === id) setExpandedWinLoss(null);
  }

  // ── Stage helpers ─────────────────────────────────────────────────────

  function patchStage(stage: DealStage, patch: Partial<StageAsset>) {
    schedule({ ...ws, stages: { ...ws.stages, [stage]: { ...ws.stages[stage], ...patch } } });
  }

  async function generateStageAssets() {
    setGeneratingStage(true);
    setError(null);
    const stageMeta = DEAL_STAGES.find((s) => s.id === activeStage)!;
    const topObjections = ws.objections
      .slice()
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 3)
      .map((o) => `${o.name} (${o.frequency}%)`)
      .join(", ");
    const segments = ws.winloss.map((r) => r.segment).filter(Boolean).join(", ");

    const stageGoal: Record<DealStage, string> = {
      discovery: "Qualify fit, uncover pain, and set the agenda for a demo",
      demo: "Show differentiated value and create an internal champion",
      proposal: "Present ROI, justify budget, and differentiate from competition",
      negotiation: "Handle final objections, agree on terms, and protect deal value",
      close: "Get the signature, set CS expectations, and hand off cleanly",
    };

    try {
      const prompt = `Generate complete sales enablement assets for the ${stageMeta.label} stage of a B2B SaaS deal.

Stage goal: ${stageGoal[activeStage]}
Top objections in this product: ${topObjections || "price, competition, proof depth"}
Key segments: ${segments || "mid-market, enterprise"}

Return exactly this format:

TALK TRACK:
[5 bullet points — the key things to say and in what order at this stage. Be specific, not generic.]

EMAIL TEMPLATE:
Subject: [email subject line]

[4-6 sentence email body. Use [PROSPECT_NAME], [COMPANY], [PAIN_POINT], [PRODUCT] as merge variables. Tone: professional but direct.]

KEY QUESTIONS:
[5 targeted questions to ask at this stage, one per line, numbered]`;

      const text = await callAI(prompt, SALES_SYSTEM, "deep");

      const talkMatch = text.match(/TALK TRACK:\s*([\s\S]*?)(?=EMAIL TEMPLATE:|$)/i);
      const emailMatch = text.match(/EMAIL TEMPLATE:\s*([\s\S]*?)(?=KEY QUESTIONS:|$)/i);
      const questionsMatch = text.match(/KEY QUESTIONS:\s*([\s\S]*?)$/i);

      patchStage(activeStage, {
        talkTrack: talkMatch?.[1]?.trim() ?? text,
        emailTemplate: emailMatch?.[1]?.trim() ?? "",
        keyQuestions: questionsMatch?.[1]?.trim() ?? "",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setGeneratingStage(false);
    }
  }

  // ── Call insight helpers ──────────────────────────────────────────────

  function addCallInsight() {
    const c: CallInsight = { id: crypto.randomUUID(), date: "", quote: "", theme: "", outcome: "pending" };
    schedule({ ...ws, callInsights: [...ws.callInsights, c] });
  }

  function patchCallInsight(id: string, patch: Partial<CallInsight>) {
    schedule({ ...ws, callInsights: ws.callInsights.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  }

  function removeCallInsight(id: string) {
    schedule({ ...ws, callInsights: ws.callInsights.filter((c) => c.id !== id) });
  }

  // ── Coaching playbook ─────────────────────────────────────────────────

  async function generateCoachingPlaybook() {
    setGeneratingPlaybook(true);
    setError(null);
    try {
      const objectionSummary = ws.objections
        .slice()
        .sort((a, b) => b.frequency - a.frequency)
        .map((o) => `- ${o.name} (${o.frequency}%)`)
        .join("\n");

      const winlossSummary = ws.winloss
        .map((r) => {
          const total = r.wins + r.losses;
          const rate = total > 0 ? Math.round((r.wins / total) * 100) : 0;
          return `- ${r.segment}: ${rate}% win rate (${r.wins}W / ${r.losses}L)${r.topWinReason ? ` — won: ${r.topWinReason}` : ""}${r.topLossReason ? ` — lost: ${r.topLossReason}` : ""}`;
        })
        .join("\n");

      const callThemes = ws.callInsights
        .filter((c) => c.quote || c.theme)
        .slice(0, 8)
        .map((c) => `- "${c.quote}" [${c.theme}] → ${c.outcome}`)
        .join("\n");

      const prompt = `Generate a practical sales rep coaching playbook from real field data.

Objection frequency:
${objectionSummary || "Not provided"}

Win/loss by segment:
${winlossSummary || "Not provided"}

Recent call themes:
${callThemes || "Not provided"}

Structure your playbook exactly as follows:

TOP 3 COACHING PRIORITIES
[3 specific things managers should focus on this quarter based on the data]

REP QUICK-REFERENCE
[One-line rebuttal for each of the top 3 objections — something a rep can recall mid-call]

WINNING PATTERNS
[3 behaviours common in won deals from the data above]

WATCH-OUTS
[3 patterns in lost deals or low win-rate segments to address]

THIS WEEK'S FOCUS
[The single highest-leverage thing a rep can practise or change right now]

Be specific and data-driven. Under 400 words total.`;

      const text = await callAI(prompt, SALES_SYSTEM, "deep");
      schedule({ ...ws, coachingPlaybook: text });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setGeneratingPlaybook(false);
    }
  }

  // ── Strategy feedback ─────────────────────────────────────────────────

  async function generateStrategyFeedback() {
    if (!strategyInsight.trim()) return;
    setGeneratingStrategy(true);
    setStrategyError(null);
    try {
      const prompt = `Extract PMM strategy signals from this sales field insight.

Product/feature context: ${strategyProduct.trim() || "not specified"}
Insight from the field: ${strategyInsight.trim()}

Return exactly this format:

ICP SIGNAL:
[What this tells us about our ideal customer profile — who we should target more or less]

MESSAGING SIGNAL:
[What needs to change in our positioning, messaging, or proof points]

SUGGESTED ACTION:
[One concrete thing PMM should do in the next two weeks based on this signal]`;

      const text = await callAI(prompt, SALES_SYSTEM, "short");
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

  const stageData = ws.stages[activeStage];
  const stageMeta = DEAL_STAGES.find((s) => s.id === activeStage)!;

  return (
    <ModuleShell
      title="Sales Intelligence"
      subtitle="Objection handling, win/loss analysis, deal-stage playbooks, and coaching insights."
      actions={<span className="text-xs text-text3">{saving ? "Saving…" : "Saved per product"}</span>}
    >
    <div className="space-y-5">

      {error && (
        <div className="hs-alert hs-alert-error">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-3 text-xs underline">Dismiss</button>
        </div>
      )}

      {/* Objection Library + Win/Loss */}
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">

        {/* Objection Library */}
        <div className="hs-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-heading">🎯 Objection Library</div>
              <p className="mt-0.5 text-xs text-text2">Track frequency — generate a full rebuttal kit per objection</p>
            </div>
            <button
              onClick={addObjection}
              className="hs-btn hs-btn-secondary"
            >
              + Add objection
            </button>
          </div>

          {ws.objections.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface2 p-6 text-center text-sm text-text2">
              No objections tracked. Add common ones like &ldquo;too expensive&rdquo; or &ldquo;already have X&rdquo;.
            </div>
          ) : (
            <div className="space-y-2">
              {ws.objections.map((o) => {
                const isOpen = expandedObjection === o.id;
                return (
                  <div
                    key={o.id}
                    className={`rounded-xl border transition-colors ${isOpen ? "border-primary/30 bg-primary/5" : "border-border bg-surface2"}`}
                  >
                    {/* Collapsed row */}
                    <div
                      className="flex cursor-pointer items-center gap-3 px-3 py-2.5"
                      onClick={() => setExpandedObjection(isOpen ? null : o.id)}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-heading">
                            {o.name || <span className="italic text-text3">New objection</span>}
                          </span>
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${CATEGORY_COLORS[o.category]}`}>
                            {CATEGORY_LABELS[o.category]}
                          </span>
                          {o.rebuttal && (
                            <span className="rounded-full border border-teal/30 bg-teal/10 px-2 py-0.5 text-[10px] font-semibold text-teal">
                              ✓ Rebuttal ready
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${o.frequency}%` }}
                            />
                          </div>
                          <span className="shrink-0 text-xs font-medium tabular-nums text-text2">{o.frequency}%</span>
                        </div>
                      </div>
                      <span className={`text-xs text-text2 transition-transform duration-150 ${isOpen ? "rotate-90" : ""}`}>▸</span>
                    </div>

                    {/* Expanded panel */}
                    {isOpen && (
                      <div className="space-y-3 border-t border-border/60 px-3 pb-3 pt-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-text3">Objection</label>
                            <input
                              value={o.name}
                              onChange={(e) => patchObjection(o.id, { name: e.target.value })}
                              placeholder="e.g. Price sensitivity"
                              className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-heading placeholder:text-text3"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-text3">Frequency %</label>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={o.frequency}
                                onChange={(e) => patchObjection(o.id, { frequency: Math.max(0, Math.min(100, Number(e.target.value))) })}
                                className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-heading"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-text3">Category</label>
                              <select
                                value={o.category}
                                onChange={(e) => patchObjection(o.id, { category: e.target.value as ObjectionCategory })}
                                className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-heading"
                              >
                                {(Object.entries(CATEGORY_LABELS) as [ObjectionCategory, string][]).map(([k, v]) => (
                                  <option key={k} value={k}>{v}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-heading">Rebuttal kit</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => void generateRebuttal(o)}
                              disabled={generatingRebuttal === o.id}
                              className="hs-btn hs-btn-primary disabled:opacity-50"
                            >
                              {generatingRebuttal === o.id ? "Generating…" : o.rebuttal ? "Regenerate →" : "Generate rebuttal →"}
                            </button>
                            <button
                              onClick={() => removeObjection(o.id)}
                              className="rounded-lg border border-red-500/30 px-2 py-1.5 text-xs text-red hover:bg-red-500/10"
                            >
                              Remove
                            </button>
                          </div>
                        </div>

                        {generatingRebuttal === o.id && (
                          <AiProgressBar
                            active
                            variant="dark"
                            title="Generating rebuttal kit…"
                            estimate={AI_PROGRESS_ESTIMATE.short}
                            durationMs={30_000}
                          />
                        )}

                        <div>
                          <div className="mb-1 flex items-center justify-between">
                            <label className="text-[10px] font-semibold uppercase tracking-wide text-text3">Rebuttal response</label>
                            {o.rebuttal && <button onClick={() => void copy(o.rebuttal)} className="text-[10px] text-primary hover:underline">Copy</button>}
                          </div>
                          <textarea
                            value={o.rebuttal}
                            onChange={(e) => patchObjection(o.id, { rebuttal: e.target.value })}
                            rows={3}
                            placeholder="What to say when this objection comes up…"
                            className="w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-sm text-heading placeholder:text-text3"
                          />
                        </div>
                        <div>
                          <div className="mb-1 flex items-center justify-between">
                            <label className="text-[10px] font-semibold uppercase tracking-wide text-text3">Proof point / evidence</label>
                            {o.proofPoint && <button onClick={() => void copy(o.proofPoint)} className="text-[10px] text-primary hover:underline">Copy</button>}
                          </div>
                          <textarea
                            value={o.proofPoint}
                            onChange={(e) => patchObjection(o.id, { proofPoint: e.target.value })}
                            rows={2}
                            placeholder="Case study, stat, or third-party evidence to back the rebuttal…"
                            className="w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-sm text-heading placeholder:text-text3"
                          />
                        </div>
                        <div>
                          <div className="mb-1 flex items-center justify-between">
                            <label className="text-[10px] font-semibold uppercase tracking-wide text-text3">Follow-up question</label>
                            {o.followUpQ && <button onClick={() => void copy(o.followUpQ)} className="text-[10px] text-primary hover:underline">Copy</button>}
                          </div>
                          <input
                            value={o.followUpQ}
                            onChange={(e) => patchObjection(o.id, { followUpQ: e.target.value })}
                            placeholder="Question to re-engage the prospect after handling the objection…"
                            className="w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-sm text-heading placeholder:text-text3"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Win / Loss */}
        <div className="hs-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-heading">📈 Win / Loss by Segment</div>
              <p className="mt-0.5 text-xs text-text2">Track outcomes and root causes per segment</p>
            </div>
            <button
              onClick={addWinLoss}
              className="hs-btn hs-btn-secondary"
            >
              + Add
            </button>
          </div>

          {ws.winloss.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface2 p-4 text-center text-sm text-text2">
              No segments yet
            </div>
          ) : (
            <div className="space-y-2">
              {ws.winloss.map((r) => {
                const total = r.wins + r.losses;
                const winRate = total > 0 ? Math.round((r.wins / total) * 100) : 0;
                const isOpen = expandedWinLoss === r.id;
                return (
                  <div
                    key={r.id}
                    className={`rounded-xl border transition-colors ${isOpen ? "border-primary/30 bg-primary/5" : "border-border bg-surface2"}`}
                  >
                    <div
                      className="flex cursor-pointer items-center gap-3 px-3 py-2.5"
                      onClick={() => setExpandedWinLoss(isOpen ? null : r.id)}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-heading">
                            {r.segment || <span className="italic text-text3">New segment</span>}
                          </span>
                          <span className={`text-sm font-bold tabular-nums ${winRate >= 50 ? "text-teal" : "text-red"}`}>
                            {winRate}%
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                            <div
                              className={`h-full rounded-full transition-all ${winRate >= 50 ? "bg-teal" : "bg-red"}`}
                              style={{ width: `${winRate}%` }}
                            />
                          </div>
                          <span className="shrink-0 text-[10px] tabular-nums text-text2">{r.wins}W / {r.losses}L</span>
                        </div>
                      </div>
                      <span className={`text-xs text-text2 transition-transform duration-150 ${isOpen ? "rotate-90" : ""}`}>▸</span>
                    </div>

                    {isOpen && (
                      <div className="space-y-2 border-t border-border/60 px-3 pb-3 pt-3">
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-text3">Segment</label>
                            <input
                              value={r.segment}
                              onChange={(e) => patchWinLoss(r.id, { segment: e.target.value })}
                              placeholder="Mid-market"
                              className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-heading"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-text3">Wins</label>
                            <input
                              type="number"
                              min={0}
                              value={r.wins}
                              onChange={(e) => patchWinLoss(r.id, { wins: Math.max(0, Number(e.target.value)) })}
                              className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-heading"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-text3">Losses</label>
                            <input
                              type="number"
                              min={0}
                              value={r.losses}
                              onChange={(e) => patchWinLoss(r.id, { losses: Math.max(0, Number(e.target.value)) })}
                              className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-heading"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-text3">Top reason won</label>
                          <input
                            value={r.topWinReason}
                            onChange={(e) => patchWinLoss(r.id, { topWinReason: e.target.value })}
                            placeholder="e.g. Fastest time-to-value, champion was CMO…"
                            className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-heading placeholder:text-text3"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-text3">Top reason lost</label>
                          <input
                            value={r.topLossReason}
                            onChange={(e) => patchWinLoss(r.id, { topLossReason: e.target.value })}
                            placeholder="e.g. No champion, lost to price, missed evaluation criteria…"
                            className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-heading placeholder:text-text3"
                          />
                        </div>
                        <button
                          onClick={() => removeWinLoss(r.id)}
                          className="rounded-lg border border-red-500/30 px-2 py-1 text-xs text-red hover:bg-red-500/10"
                        >
                          Remove row
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Deal-Stage Playbook */}
      <div className="hs-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-heading">🗺️ Deal-Stage Playbook</div>
            <p className="mt-0.5 text-xs text-text2">Talk tracks, email templates, and key questions — one set per stage</p>
          </div>
          <button
            onClick={() => void generateStageAssets()}
            disabled={generatingStage}
            className="hs-btn hs-btn-primary disabled:opacity-50"
          >
            {generatingStage ? "Generating…" : `Generate ${stageMeta.emoji} ${stageMeta.label} assets →`}
          </button>
        </div>

        {/* Stage tabs */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {DEAL_STAGES.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveStage(s.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${activeStage === s.id ? "bg-primary text-white" : "bg-surface2 text-text2 hover:bg-surface3"}`}
            >
              {s.emoji} {s.label}
            </button>
          ))}
        </div>

        <AiProgressBar
          active={generatingStage}
          variant="dark"
          title={`Generating ${stageMeta.label} assets…`}
          estimate={AI_PROGRESS_ESTIMATE.deep}
          durationMs={70_000}
        />

        <div className="grid gap-4 lg:grid-cols-3">
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-semibold text-heading">💬 Talk track</label>
              {stageData.talkTrack && (
                <button onClick={() => void copy(stageData.talkTrack)} className="text-[10px] text-primary hover:underline">Copy</button>
              )}
            </div>
            <textarea
              value={stageData.talkTrack}
              onChange={(e) => patchStage(activeStage, { talkTrack: e.target.value })}
              rows={12}
              placeholder={`Key points to cover during ${stageMeta.label}…`}
              className="w-full rounded-xl border border-border bg-surface2 px-3 py-2.5 text-sm text-heading placeholder:text-text3"
            />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-semibold text-heading">📧 Email template</label>
              {stageData.emailTemplate && (
                <button onClick={() => void copy(stageData.emailTemplate)} className="text-[10px] text-primary hover:underline">Copy</button>
              )}
            </div>
            <textarea
              value={stageData.emailTemplate}
              onChange={(e) => patchStage(activeStage, { emailTemplate: e.target.value })}
              rows={12}
              placeholder={"Subject: …\n\nHi [PROSPECT_NAME],\n\n…"}
              className="w-full rounded-xl border border-border bg-surface2 px-3 py-2.5 font-mono text-sm text-heading placeholder:text-text3"
            />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-semibold text-heading">❓ Key questions</label>
              {stageData.keyQuestions && (
                <button onClick={() => void copy(stageData.keyQuestions)} className="text-[10px] text-primary hover:underline">Copy</button>
              )}
            </div>
            <textarea
              value={stageData.keyQuestions}
              onChange={(e) => patchStage(activeStage, { keyQuestions: e.target.value })}
              rows={12}
              placeholder="Qualifying and discovery questions for this stage…"
              className="w-full rounded-xl border border-border bg-surface2 px-3 py-2.5 text-sm text-heading placeholder:text-text3"
            />
          </div>
        </div>
      </div>

      {/* Call Intelligence + Coaching Playbook */}
      <div className="grid gap-4 lg:grid-cols-[1fr_400px]">

        {/* Call Intelligence */}
        <div className="hs-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-heading">📞 Call Intelligence</div>
              <p className="mt-0.5 text-xs text-text2">Log quotes, themes, and outcomes from recent discovery and demo calls</p>
            </div>
            <button
              onClick={addCallInsight}
              className="hs-btn hs-btn-secondary"
            >
              + Add insight
            </button>
          </div>

          {ws.callInsights.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface2 p-4 text-center text-sm text-text2">
              No call insights yet — log direct quotes and themes from recent calls.
            </div>
          ) : (
            <div className="space-y-2">
              {ws.callInsights.map((c) => (
                <div key={c.id} className="rounded-xl border border-border bg-surface2 p-3">
                  <div className="grid gap-2 sm:grid-cols-[1fr_120px_130px_auto] sm:items-center">
                    <input
                      value={c.quote}
                      onChange={(e) => patchCallInsight(c.id, { quote: e.target.value })}
                      placeholder="Quote or insight from the call…"
                      className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-heading placeholder:text-text3"
                    />
                    <input
                      value={c.theme}
                      onChange={(e) => patchCallInsight(c.id, { theme: e.target.value })}
                      placeholder="Theme"
                      className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-heading placeholder:text-text3"
                    />
                    <select
                      value={c.outcome}
                      onChange={(e) => patchCallInsight(c.id, { outcome: e.target.value as CallInsight["outcome"] })}
                      className={`rounded-lg border px-2 py-1.5 text-xs font-semibold ${
                        c.outcome === "won"
                          ? "border-teal/30 bg-teal/10 text-teal"
                          : c.outcome === "lost"
                            ? "border-red-500/30 bg-red-500/10 text-red"
                            : "border-border bg-surface text-text2"
                      }`}
                    >
                      <option value="pending">Pending</option>
                      <option value="won">Won</option>
                      <option value="lost">Lost</option>
                      <option value="no-decision">No decision</option>
                    </select>
                    <button
                      onClick={() => removeCallInsight(c.id)}
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

        {/* Coaching Playbook */}
        <div className="hs-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-heading">🏋️ Coaching Playbook</div>
              <p className="mt-0.5 text-xs text-text2">AI-generated from your objections, win/loss, and call data</p>
            </div>
            <button
              onClick={() => void generateCoachingPlaybook()}
              disabled={generatingPlaybook}
              className="hs-btn hs-btn-primary disabled:opacity-50"
            >
              {generatingPlaybook ? "Generating…" : ws.coachingPlaybook ? "Regenerate →" : "Generate →"}
            </button>
          </div>

          <AiProgressBar
            active={generatingPlaybook}
            variant="dark"
            title="Analysing field data…"
            estimate={AI_PROGRESS_ESTIMATE.deep}
            durationMs={55_000}
          />

          {ws.coachingPlaybook ? (
            <div className="relative">
              <textarea
                value={ws.coachingPlaybook}
                onChange={(e) => schedule({ ...ws, coachingPlaybook: e.target.value })}
                rows={18}
                className="w-full rounded-xl border border-border bg-surface2 px-3 py-2.5 text-sm text-heading"
              />
              <button
                onClick={() => void copy(ws.coachingPlaybook)}
                className="absolute right-2 top-2 rounded-lg border border-border bg-surface px-2 py-1 text-[10px] font-semibold text-primary hover:bg-surface2"
              >
                Copy
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-surface2 p-4 text-sm text-text2">
              Click &ldquo;Generate&rdquo; — the playbook is built from your live objection frequency, win/loss rates, and call themes.
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
          Paste a field insight and AI will extract ICP updates, messaging signals, and a suggested PMM action to feed back into strategy.
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
              placeholder="e.g. AI Marketing Workbench — Campaigns module"
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-heading placeholder:text-text3"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-text2">Insight to analyse</label>
            <textarea
              value={strategyInsight}
              onChange={(e) => setStrategyInsight(e.target.value)}
              rows={3}
              placeholder="e.g. Reps are hearing 'we already have HubSpot for this' on 60% of calls this quarter…"
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-heading placeholder:text-text3"
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
            <pre className="whitespace-pre-wrap rounded-xl border border-border bg-surface p-3 text-sm text-heading">
              {strategyOutput}
            </pre>
          </div>
        )}
      </div>
    </div>
    </ModuleShell>
  );
}
