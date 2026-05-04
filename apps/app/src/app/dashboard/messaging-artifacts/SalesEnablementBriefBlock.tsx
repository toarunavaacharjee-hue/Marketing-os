"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AiProgressBar, AI_PROGRESS_ESTIMATE } from "@/app/dashboard/_components/AiProgressBar";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { buildEnablementBriefPrompt, ENABLEMENT_BRIEF_SYSTEM } from "@/lib/pmmPrompts";

const MODULE = "messaging_artifacts";
const KEY = "enablement_brief";

type Value = {
  feature: string;
  buyer: string;
  objections: string;
  brief: string;
  segmentName: string;
};

const empty = (): Value => ({
  feature: "",
  buyer: "",
  objections: "",
  brief: "",
  segmentName: ""
});

export function SalesEnablementBriefBlock({ environmentId }: { environmentId: string }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [segments, setSegments] = useState<{ id: string; name: string }[]>([]);
  const [data, setData] = useState<Value>(() => empty());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: segData }, { data: ms }] = await Promise.all([
      supabase.from("segments").select("id,name").eq("environment_id", environmentId).order("created_at", {
        ascending: false
      }),
      supabase.from("module_settings").select("value_json").eq("environment_id", environmentId).eq("module", MODULE).eq("key", KEY).maybeSingle()
    ]);
    setSegments((segData ?? []) as { id: string; name: string }[]);
    const v = ms?.value_json as Partial<Value> | null;
    if (v && typeof v === "object") {
      const e = empty();
      setData({
        feature: typeof v.feature === "string" ? v.feature : e.feature,
        buyer: typeof v.buyer === "string" ? v.buyer : e.buyer,
        objections: typeof v.objections === "string" ? v.objections : e.objections,
        brief: typeof v.brief === "string" ? v.brief : e.brief,
        segmentName: typeof v.segmentName === "string" ? v.segmentName : e.segmentName
      });
    } else setData(empty());
    setLoading(false);
  }, [environmentId, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const persist = useCallback(
    async (next: Value) => {
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

  function schedule(next: Value) {
    setData(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void persist(next), 400);
  }

  async function generate() {
    setGenerating(true);
    setError(null);
    const prompt = buildEnablementBriefPrompt({
      feature: data.feature.trim() || "Feature",
      buyer: data.buyer.trim() || "Buyer",
      objections: data.objections.trim() || undefined,
      segmentName: data.segmentName.trim() || undefined
    });
    try {
      const res = await fetch("/api/ai/module-generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt,
          system: ENABLEMENT_BRIEF_SYSTEM,
          length: "medium"
        })
      });
      const j = (await res.json()) as { text?: string; error?: string };
      if (!res.ok) throw new Error(j.error ?? "Generation failed.");
      schedule({ ...data, brief: j.text ?? "" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="mb-1 text-sm font-medium text-heading">Sales enablement brief (1-pager)</div>
      <p className="mb-4 text-xs text-text2">
        One page for reps: what it is, who it is for, pitch, and objections. Saved per product.
      </p>
      {loading ? <div className="text-sm text-text2">Loading…</div> : null}
      {error ? (
        <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red">
          {error}
        </div>
      ) : null}
      <AiProgressBar
        active={generating}
        variant="dark"
        title="Generating sales enablement brief…"
        estimate={AI_PROGRESS_ESTIMATE.short}
        durationMs={50_000}
      />
      <p className="text-xs text-text2">{saving ? "Saving…" : "Saved per product."}</p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-text2">Feature or initiative</label>
          <input
            value={data.feature}
            onChange={(e) => schedule({ ...data, feature: e.target.value })}
            className="w-full rounded-xl border border-border bg-surface2 p-2 text-sm text-heading"
            placeholder="e.g. Real-time analytics dashboards"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-text2">Primary buyer</label>
          <input
            value={data.buyer}
            onChange={(e) => schedule({ ...data, buyer: e.target.value })}
            className="w-full rounded-xl border border-border bg-surface2 p-2 text-sm text-heading"
            placeholder="e.g. Director of RevOps"
          />
        </div>
      </div>
      <div className="mt-3">
        <label className="mb-1 block text-xs text-text2">Segment (optional)</label>
        <select
          value={data.segmentName}
          onChange={(e) => schedule({ ...data, segmentName: e.target.value })}
          className="w-full max-w-md rounded-xl border border-border bg-surface2 p-2 text-sm text-heading"
        >
          <option value="">Best-fit / not specified</option>
          {segments.map((s) => (
            <option key={s.id} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-3">
        <label className="mb-1 block text-xs text-text2">Objections or friction (optional)</label>
        <textarea
          value={data.objections}
          onChange={(e) => schedule({ ...data, objections: e.target.value })}
          rows={3}
          className="w-full rounded-xl border border-border bg-surface2 p-3 text-sm text-heading"
          placeholder="What reps hear in discovery…"
        />
      </div>
      <button
        type="button"
        onClick={() => void generate()}
        disabled={generating}
        className="mt-3 rounded-xl bg-amber px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
      >
        {generating ? "Generating…" : "Generate enablement brief"}
      </button>
      <label className="mt-4 mb-1 block text-xs text-text2">Brief</label>
      <textarea
        value={data.brief}
        onChange={(e) => schedule({ ...data, brief: e.target.value })}
        rows={14}
        className="w-full rounded-xl border border-border bg-surface2 p-3 text-sm text-heading"
        placeholder="Generated brief appears here. Edits save automatically (debounced)."
      />
    </div>
  );
}
