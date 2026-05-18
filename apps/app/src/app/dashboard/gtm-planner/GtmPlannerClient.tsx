"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { AiProgressBar, AI_PROGRESS_ESTIMATE } from "@/app/dashboard/_components/AiProgressBar";
import { useToast } from "@/app/dashboard/_components/Toast";
import { buildGtmPlanPrompt, GTM_PLAN_SYSTEM } from "@/lib/pmmPrompts";

type Owner = "Marketing" | "Sales" | "Product" | "RevOps" | "Design" | "";

type Task = {
  id: string;
  label: string;
  done: boolean;
  owner: Owner;
};

type Phase = {
  id: string;
  label: string;
  timing: string;
  tasks: Task[];
};

type PlanValue = {
  launchDate: string;
  productOrFeature: string;
  segment: string;
  goals: string;
  phases: Phase[];
  stakeholders: string;
  riskNotes: string;
};

const OWNERS: Owner[] = ["Marketing", "Sales", "Product", "RevOps", "Design"];

const OWNER_COLORS: Record<string, string> = {
  Marketing: "bg-primary/10 text-primary border-primary/20",
  Sales:     "bg-blue-500/10 text-blue-600 border-blue-500/20",
  Product:   "bg-teal/10 text-teal border-teal/20",
  RevOps:    "bg-amber/10 text-amber border-amber/20",
  Design:    "bg-pink-500/10 text-pink-600 border-pink-500/20",
  "":        "bg-surface3 text-text2 border-border"
};

const DEFAULT_PHASES: Phase[] = [
  {
    id: "phase-1",
    label: "Strategy & Prep",
    timing: "T-8 to T-4 weeks",
    tasks: [
      { id: "p1t1", label: "Finalize ICP and segment definitions", done: false, owner: "Marketing" },
      { id: "p1t2", label: "Complete messaging pillars and positioning canvas", done: false, owner: "Marketing" },
      { id: "p1t3", label: "Lock feature scope and draft release notes", done: false, owner: "Product" },
      { id: "p1t4", label: "Brief sales team on ICP changes and target accounts", done: false, owner: "Sales" },
      { id: "p1t5", label: "Set up campaign tracking and attribution", done: false, owner: "RevOps" },
      { id: "p1t6", label: "Identify launch moment and timing hook", done: false, owner: "Marketing" }
    ]
  },
  {
    id: "phase-2",
    label: "Production & Enablement",
    timing: "T-4 to T-1 week",
    tasks: [
      { id: "p2t1", label: "Produce email sequence and campaign assets", done: false, owner: "Marketing" },
      { id: "p2t2", label: "Build landing page and creative", done: false, owner: "Design" },
      { id: "p2t3", label: "Write and QA launch blog post", done: false, owner: "Marketing" },
      { id: "p2t4", label: "Prepare demo environment and product screenshots", done: false, owner: "Product" },
      { id: "p2t5", label: "Update CRM sequences and outreach templates", done: false, owner: "Sales" },
      { id: "p2t6", label: "Deliver sales enablement brief and battle card", done: false, owner: "Marketing" },
      { id: "p2t7", label: "Final QA on tracking, UTMs, and conversion events", done: false, owner: "RevOps" }
    ]
  },
  {
    id: "phase-3",
    label: "Launch Week",
    timing: "T-0",
    tasks: [
      { id: "p3t1", label: "Send launch email to list", done: false, owner: "Marketing" },
      { id: "p3t2", label: "Publish launch blog post and social content", done: false, owner: "Marketing" },
      { id: "p3t3", label: "Begin outbound sequences to target accounts", done: false, owner: "Sales" },
      { id: "p3t4", label: "Monitor adoption metrics and surface early wins", done: false, owner: "Product" },
      { id: "p3t5", label: "Run launch social ads (LinkedIn + Meta)", done: false, owner: "Marketing" },
      { id: "p3t6", label: "Daily stand-up across Marketing, Sales, Product", done: false, owner: "Marketing" }
    ]
  },
  {
    id: "phase-4",
    label: "Post-Launch",
    timing: "T+30",
    tasks: [
      { id: "p4t1", label: "Review campaign performance vs launch goals", done: false, owner: "Marketing" },
      { id: "p4t2", label: "Collect win/loss signals from first closed deals", done: false, owner: "Sales" },
      { id: "p4t3", label: "Gather early customer feedback and NPS", done: false, owner: "Product" },
      { id: "p4t4", label: "Update messaging pillars based on market response", done: false, owner: "Marketing" },
      { id: "p4t5", label: "Document what worked and what didn't", done: false, owner: "Marketing" }
    ]
  }
];

const DEFAULT_PLAN: PlanValue = {
  launchDate: "",
  productOrFeature: "",
  segment: "",
  goals: "",
  phases: DEFAULT_PHASES,
  stakeholders: "Marketing — Responsible\nSales — Accountable\nProduct — Consulted\nRevOps — Consulted\nDesign — Responsible",
  riskNotes: ""
};

const MODULE = "gtm_planner";
const KEY = "plan";

function normalizeTask(raw: unknown): Task | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : crypto.randomUUID();
  const label = typeof o.label === "string" ? o.label : "";
  if (!label) return null;
  return {
    id,
    label,
    done: Boolean(o.done),
    owner: (OWNERS.includes(o.owner as Owner) ? o.owner : "") as Owner
  };
}

function normalizePhase(raw: unknown, idx: number): Phase | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const label = typeof o.label === "string" ? o.label : `Phase ${idx + 1}`;
  const timing = typeof o.timing === "string" ? o.timing : "";
  const tasks = Array.isArray(o.tasks)
    ? o.tasks.map(normalizeTask).filter(Boolean) as Task[]
    : [];
  return { id: typeof o.id === "string" ? o.id : crypto.randomUUID(), label, timing, tasks };
}

function parseAiPlan(text: string): Phase[] {
  const phases: Phase[] = [];
  let current: Phase | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const phaseMatch = line.match(/^PHASE:\s*(.+?)\s*\|\s*(.+)$/);
    if (phaseMatch) {
      if (current) phases.push(current);
      current = { id: crypto.randomUUID(), label: phaseMatch[1].trim(), timing: phaseMatch[2].trim(), tasks: [] };
      continue;
    }
    const taskMatch = line.match(/^TASK:\s*(.+?)\s*\|\s*(.+)$/);
    if (taskMatch && current) {
      const ownerRaw = taskMatch[1].trim() as Owner;
      current.tasks.push({
        id: crypto.randomUUID(),
        label: taskMatch[2].trim(),
        done: false,
        owner: OWNERS.includes(ownerRaw) ? ownerRaw : ""
      });
    }
  }
  if (current) phases.push(current);
  return phases.length > 0 ? phases : DEFAULT_PHASES;
}

function phaseProgress(phase: Phase): number {
  if (!phase.tasks.length) return 0;
  return Math.round((phase.tasks.filter((t) => t.done).length / phase.tasks.length) * 100);
}

export function GtmPlannerClient({
  environmentId,
  productName = ""
}: {
  environmentId: string;
  productName?: string;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const toast = useToast();
  const searchParams = useSearchParams();
  const qProduct = searchParams.get("product") ?? "";
  const qSegment = searchParams.get("segment") ?? "";
  const qFrom = searchParams.get("from") ?? "";
  const [plan, setPlan] = useState<PlanValue>(() => ({
    ...DEFAULT_PLAN,
    productOrFeature: qProduct || productName,
    segment: qSegment
  }));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({
    "phase-1": true,
    "phase-2": false,
    "phase-3": false,
    "phase-4": false
  });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const overallPct = useMemo(() => {
    const allTasks = plan.phases.flatMap((p) => p.tasks);
    if (!allTasks.length) return 0;
    return Math.round((allTasks.filter((t) => t.done).length / allTasks.length) * 100);
  }, [plan.phases]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: row, error: qErr } = await supabase
      .from("module_settings")
      .select("value_json")
      .eq("environment_id", environmentId)
      .eq("module", MODULE)
      .eq("key", KEY)
      .maybeSingle();
    if (qErr) setError(qErr.message);
    const v = row?.value_json as Partial<PlanValue> | null;
    if (v && typeof v === "object") {
      const phases = Array.isArray(v.phases) && v.phases.length
        ? v.phases.map(normalizePhase).filter(Boolean) as Phase[]
        : DEFAULT_PHASES;
      const savedProduct = typeof v.productOrFeature === "string" ? v.productOrFeature : "";
      const savedSegment = typeof v.segment === "string" ? v.segment : "";
      // Query params from "Plan launch →" always win — user deliberately navigated from a campaign card
      setPlan({
        launchDate: typeof v.launchDate === "string" ? v.launchDate : "",
        productOrFeature: qProduct || savedProduct || productName,
        segment: qSegment || savedSegment,
        goals: typeof v.goals === "string" ? v.goals : "",
        phases,
        stakeholders: typeof v.stakeholders === "string" ? v.stakeholders : DEFAULT_PLAN.stakeholders,
        riskNotes: typeof v.riskNotes === "string" ? v.riskNotes : ""
      });
      const initExpand: Record<string, boolean> = {};
      phases.forEach((p, i) => { initExpand[p.id] = i === 0; });
      setExpandedPhases(initExpand);
    }
    setLoading(false);
  }, [environmentId, supabase, productName, qProduct, qSegment]);

  useEffect(() => { load(); }, [load]);

  const persist = useCallback(async (next: PlanValue) => {
    setSaving(true);
    const { error: upErr } = await supabase.from("module_settings").upsert({
      environment_id: environmentId,
      module: MODULE,
      key: KEY,
      value_json: next
    });
    setSaving(false);
    if (upErr) setError(upErr.message);
  }, [environmentId, supabase]);

  function schedule(next: PlanValue) {
    setPlan(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void persist(next), 400);
  }

  function updatePhases(phases: Phase[]) {
    schedule({ ...plan, phases });
  }

  function toggleTask(phaseId: string, taskId: string) {
    updatePhases(plan.phases.map((p) =>
      p.id !== phaseId ? p : {
        ...p,
        tasks: p.tasks.map((t) => t.id === taskId ? { ...t, done: !t.done } : t)
      }
    ));
  }

  function patchTask(phaseId: string, taskId: string, patch: Partial<Task>) {
    updatePhases(plan.phases.map((p) =>
      p.id !== phaseId ? p : {
        ...p,
        tasks: p.tasks.map((t) => t.id === taskId ? { ...t, ...patch } : t)
      }
    ));
  }

  function removeTask(phaseId: string, taskId: string) {
    updatePhases(plan.phases.map((p) =>
      p.id !== phaseId ? p : { ...p, tasks: p.tasks.filter((t) => t.id !== taskId) }
    ));
  }

  function addTask(phaseId: string) {
    updatePhases(plan.phases.map((p) =>
      p.id !== phaseId ? p : {
        ...p,
        tasks: [...p.tasks, { id: crypto.randomUUID(), label: "", done: false, owner: "" }]
      }
    ));
  }

  function togglePhase(phaseId: string) {
    setExpandedPhases((prev) => ({ ...prev, [phaseId]: !prev[phaseId] }));
  }

  async function generatePlan() {
    setGenerating(true);
    setGenError(null);
    const prompt = buildGtmPlanPrompt({
      productOrFeature: plan.productOrFeature.trim() || "this product",
      segment: plan.segment.trim() || "primary ICP",
      launchDate: plan.launchDate || undefined,
      goals: plan.goals.trim() || undefined
    });
    try {
      const res = await fetch("/api/ai/module-generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt, system: GTM_PLAN_SYSTEM, length: "medium" })
      });
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Generation failed.");
      const phases = parseAiPlan(data.text ?? "");
      const expanded: Record<string, boolean> = {};
      phases.forEach((p, i) => { expanded[p.id] = i === 0; });
      setExpandedPhases(expanded);
      schedule({ ...plan, phases });
      toast("✓ GTM plan generated — review and adjust tasks");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Generation failed.";
      setGenError(msg);
      toast(msg, "error");
    } finally {
      setGenerating(false);
    }
  }

  if (loading) return <div className="h-8 w-48 animate-pulse rounded-xl bg-surface3" />;

  return (
    <div className="space-y-5">
      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red">{error}</div>
      ) : null}

      {qFrom ? (
        <div className="flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/8 px-4 py-2.5 text-sm">
          <span className="text-primary">←</span>
          <span className="text-text2">
            Pre-filled from campaign: <span className="font-semibold text-text">{qFrom}</span>
          </span>
        </div>
      ) : null}

      {/* Context inputs + AI generate */}
      <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="text-sm font-semibold text-heading">Launch context</div>
          <span className="text-xs text-text2">{saving ? "Saving…" : "Saved per product."}</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-text2">Product or feature</label>
            <input
              value={plan.productOrFeature}
              onChange={(e) => schedule({ ...plan, productOrFeature: e.target.value })}
              placeholder="e.g. AI Campaign Builder"
              className="w-full rounded-xl border border-border bg-surface2 px-3 py-2 text-sm text-heading placeholder:text-text3 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-text2">Target segment</label>
            <input
              value={plan.segment}
              onChange={(e) => schedule({ ...plan, segment: e.target.value })}
              placeholder="e.g. Series B SaaS PMMs"
              className="w-full rounded-xl border border-border bg-surface2 px-3 py-2 text-sm text-heading placeholder:text-text3 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-text2">Target launch date</label>
            <input
              type="date"
              value={plan.launchDate}
              onChange={(e) => schedule({ ...plan, launchDate: e.target.value })}
              className="w-full rounded-xl border border-border bg-surface2 px-3 py-2 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-text2">Launch goals (optional)</label>
            <input
              value={plan.goals}
              onChange={(e) => schedule({ ...plan, goals: e.target.value })}
              placeholder="e.g. 50 trials, $200k pipeline"
              className="w-full rounded-xl border border-border bg-surface2 px-3 py-2 text-sm text-heading placeholder:text-text3 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>

        {genError ? (
          <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red">
            {genError}
          </div>
        ) : null}

        <AiProgressBar
          active={generating}
          variant="dark"
          title="Generating GTM launch plan…"
          estimate={AI_PROGRESS_ESTIMATE.short}
          durationMs={55_000}
        />

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void generatePlan()}
            disabled={generating}
            className="rounded-xl bg-amber px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
          >
            {generating ? "Generating plan…" : "AI: Generate GTM plan"}
          </button>
          <p className="text-xs text-text2">
            Fills all 4 phases with tasks specific to your product and segment.
          </p>
        </div>
      </div>

      {/* Overall progress */}
      <div className="rounded-2xl border border-border bg-surface px-4 py-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-heading">Launch readiness</span>
          <span className="font-semibold text-heading">{overallPct}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-surface3">
          <div
            className="h-2.5 rounded-full bg-primary transition-all duration-300"
            style={{ width: `${overallPct}%` }}
          />
        </div>
        {/* Per-phase mini bars */}
        <div className="mt-3 grid grid-cols-4 gap-2">
          {plan.phases.map((phase) => {
            const pct = phaseProgress(phase);
            return (
              <div key={phase.id}>
                <div className="mb-1 truncate text-[10px] text-text2">{phase.label}</div>
                <div className="h-1.5 rounded-full bg-surface3">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-300 ${pct === 100 ? "bg-teal" : "bg-primary/60"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-0.5 text-[10px] text-text3">{pct}%</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Phase cards */}
      <div className="space-y-3">
        {plan.phases.map((phase) => {
          const pct = phaseProgress(phase);
          const isOpen = expandedPhases[phase.id] ?? false;
          const done = phase.tasks.filter((t) => t.done).length;

          return (
            <div
              key={phase.id}
              className={`rounded-2xl border bg-surface shadow-sm transition-colors ${
                pct === 100 ? "border-teal/30" : "border-border"
              }`}
            >
              {/* Phase header */}
              <button
                type="button"
                onClick={() => togglePhase(phase.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    pct === 100
                      ? "bg-teal text-white"
                      : pct > 0
                        ? "bg-primary/20 text-primary"
                        : "bg-surface3 text-text2"
                  }`}
                >
                  {pct === 100 ? "✓" : plan.phases.indexOf(phase) + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-heading">{phase.label}</span>
                    <span className="rounded-full border border-border bg-surface2 px-2 py-0.5 text-[10px] text-text3">
                      {phase.timing}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-text2">
                    {done}/{phase.tasks.length} tasks complete
                  </div>
                </div>
                <span className="shrink-0 text-xs text-text3 transition-transform duration-200">
                  {isOpen ? "▾" : "▸"}
                </span>
              </button>

              {isOpen ? (
                <div className="border-t border-border px-4 pb-4 pt-3">
                  <div className="space-y-2">
                    {phase.tasks.length === 0 ? (
                      <p className="text-xs text-text2">No tasks yet. Add one below.</p>
                    ) : (
                      phase.tasks.map((task) => (
                        <div
                          key={task.id}
                          className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors ${
                            task.done ? "border-teal/20 bg-teal/5" : "border-border bg-surface2"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={task.done}
                            onChange={() => toggleTask(phase.id, task.id)}
                            className="shrink-0 rounded border-border accent-[var(--color-primary)]"
                          />
                          <input
                            value={task.label}
                            onChange={(e) => patchTask(phase.id, task.id, { label: e.target.value })}
                            className={`min-w-0 flex-1 bg-transparent text-sm focus:outline-none ${
                              task.done ? "text-text2 line-through" : "text-heading"
                            }`}
                            placeholder="Task description"
                          />
                          <select
                            value={task.owner}
                            onChange={(e) => patchTask(phase.id, task.id, { owner: e.target.value as Owner })}
                            className={`shrink-0 rounded-lg border px-2 py-1 text-[11px] font-medium ${OWNER_COLORS[task.owner] || OWNER_COLORS[""]}`}
                          >
                            <option value="">Owner</option>
                            {OWNERS.map((o) => (
                              <option key={o} value={o}>{o}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => removeTask(phase.id, task.id)}
                            className="shrink-0 text-[11px] text-text3 hover:text-red"
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => addTask(phase.id)}
                    className="mt-3 rounded-lg border border-dashed border-border px-3 py-1.5 text-xs text-text2 hover:border-primary/40 hover:text-primary"
                  >
                    + Add task
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Stakeholders + risk notes */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <div className="mb-1 flex items-center justify-between">
            <div className="text-sm font-semibold text-heading">Stakeholders (RACI)</div>
            <span className={`text-[11px] tabular-nums ${plan.stakeholders.length > 800 ? "text-amber" : "text-text3"}`}>
              {plan.stakeholders.length}/1000
            </span>
          </div>
          <p className="mb-2 text-xs text-text2">
            R = Responsible, A = Accountable, C = Consulted, I = Informed
          </p>
          <textarea
            value={plan.stakeholders}
            onChange={(e) => schedule({ ...plan, stakeholders: e.target.value })}
            rows={7}
            maxLength={1000}
            className="w-full rounded-xl border border-border bg-surface2 p-3 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <div className="mb-1 flex items-center justify-between">
            <div className="text-sm font-semibold text-heading">Risks & dependencies</div>
            <span className={`text-[11px] tabular-nums ${plan.riskNotes.length > 800 ? "text-amber" : "text-text3"}`}>
              {plan.riskNotes.length}/1000
            </span>
          </div>
          <p className="mb-2 text-xs text-text2">
            Flag blockers, external dependencies, or risks to the launch date.
          </p>
          <textarea
            value={plan.riskNotes}
            onChange={(e) => schedule({ ...plan, riskNotes: e.target.value })}
            rows={7}
            maxLength={1000}
            placeholder="e.g. Eng feature flag needs sign-off by T-2 weeks&#10;Legal review of pricing page required&#10;Competitor launching same week — monitor closely"
            className="w-full rounded-xl border border-border bg-surface2 p-3 text-sm text-heading placeholder:text-text3 focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>
    </div>
  );
}
