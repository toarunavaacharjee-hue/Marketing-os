"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Task = { id: string; label: string; done: boolean };

const DEFAULT_TASKS: Task[] = [
  { id: "t1", label: "ICP finalized", done: false },
  { id: "t2", label: "Messaging approved", done: false },
  { id: "t3", label: "Creative produced", done: false },
  { id: "t4", label: "Landing page QA", done: false },
  { id: "t5", label: "Sales enablement ready", done: false }
];

type PlanValue = {
  tasks: Task[];
  timeline: string;
  stakeholders: string;
};

const DEFAULT_PLAN: PlanValue = {
  tasks: DEFAULT_TASKS,
  timeline:
    "Mon: creative lock\nTue: QA + tracking\nWed: internal enablement\nThu: soft launch\nFri: full push",
  stakeholders: "Marketing — R\nSales — A\nRevOps — C\nDesign — R"
};

const MODULE = "gtm_planner";
const KEY = "plan";

export function GtmPlannerClient({ environmentId }: { environmentId: string }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [data, setData] = useState<PlanValue>(DEFAULT_PLAN);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pct = useMemo(
    () =>
      data.tasks.length
        ? Math.round((data.tasks.filter((t) => t.done).length / data.tasks.length) * 100)
        : 0,
    [data.tasks]
  );

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
      setData({
        tasks: Array.isArray(v.tasks) && v.tasks.length ? v.tasks : DEFAULT_TASKS,
        timeline: typeof v.timeline === "string" ? v.timeline : DEFAULT_PLAN.timeline,
        stakeholders: typeof v.stakeholders === "string" ? v.stakeholders : DEFAULT_PLAN.stakeholders
      });
    }
    setLoading(false);
  }, [environmentId, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const persist = useCallback(
    async (next: PlanValue) => {
      setSaving(true);
      const { error: upErr } = await supabase.from("module_settings").upsert({
        environment_id: environmentId,
        module: MODULE,
        key: KEY,
        value_json: next
      });
      setSaving(false);
      if (upErr) setError(upErr.message);
    },
    [environmentId, supabase]
  );

  function schedule(next: PlanValue) {
    setData(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void persist(next), 400);
  }

  function toggle(i: number) {
    const tasks = data.tasks.map((t, idx) => (idx === i ? { ...t, done: !t.done } : t));
    schedule({ ...data, tasks });
  }

  return (
    <div className="space-y-4">
      {loading ? <div className="text-sm text-[#9090b0]">Loading…</div> : null}
      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}
      <p className="text-xs text-[#9090b0]">{saving ? "Saving…" : "Saved per product environment."}</p>

      <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4">
        <div className="mb-2 flex justify-between text-sm text-[#9090b0]">
          <span>Launch readiness</span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 rounded-full bg-black/30">
          <div className="h-2 rounded-full bg-[#7c6cff]" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-4 space-y-2">
          {data.tasks.map((t, i) => (
            <label key={t.id} className="flex items-center gap-2 text-sm text-[#f0f0f8]">
              <input
                type="checkbox"
                checked={t.done}
                onChange={() => toggle(i)}
                className="rounded border-[#2a2e3f]"
              />
              <input
                value={t.label}
                onChange={(e) => {
                  const tasks = data.tasks.map((x, idx) =>
                    idx === i ? { ...x, label: e.target.value } : x
                  );
                  schedule({ ...data, tasks });
                }}
                className="flex-1 rounded-lg border border-[#2a2e3f] bg-black/20 px-2 py-1 text-sm"
              />
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4 text-sm text-[#9090b0]">
          <div className="text-sm text-[#f0f0f8]">Launch timeline</div>
          <textarea
            value={data.timeline}
            onChange={(e) => schedule({ ...data, timeline: e.target.value })}
            rows={6}
            className="mt-2 w-full rounded-xl border border-[#2a2e3f] bg-black/20 p-3 text-sm text-[#f0f0f8]"
          />
        </div>
        <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4 text-sm">
          <div className="text-sm text-[#f0f0f8]">Stakeholders</div>
          <textarea
            value={data.stakeholders}
            onChange={(e) => schedule({ ...data, stakeholders: e.target.value })}
            rows={6}
            className="mt-2 w-full rounded-xl border border-[#2a2e3f] bg-black/20 p-3 text-sm text-[#9090b0]"
          />
        </div>
      </div>
    </div>
  );
}
