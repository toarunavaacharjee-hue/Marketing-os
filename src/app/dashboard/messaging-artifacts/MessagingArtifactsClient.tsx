"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type ArtifactRow = {
  id: string;
  name: string;
  segmentName: string;
  status: string;
  consistency: number;
};

type Store = {
  items: ArtifactRow[];
  genType: string;
  genTone: string;
  genSegment: string;
  lastOutput: string;
};

const MODULE = "messaging_artifacts";
const KEY = "artifacts";

const emptyStore = (): Store => ({
  items: [],
  genType: "Landing page copy",
  genTone: "Confident + practical",
  genSegment: "",
  lastOutput: ""
});

export function MessagingArtifactsClient({ environmentId }: { environmentId: string }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [segments, setSegments] = useState<{ id: string; name: string }[]>([]);
  const [store, setStore] = useState<Store>(emptyStore);
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
    const v = ms?.value_json as Partial<Store> | null;
    if (v && typeof v === "object") {
      setStore({
        items: Array.isArray(v.items) ? v.items : [],
        genType: typeof v.genType === "string" ? v.genType : emptyStore().genType,
        genTone: typeof v.genTone === "string" ? v.genTone : emptyStore().genTone,
        genSegment: typeof v.genSegment === "string" ? v.genSegment : "",
        lastOutput: typeof v.lastOutput === "string" ? v.lastOutput : ""
      });
    } else setStore(emptyStore());
    setLoading(false);
  }, [environmentId, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const persist = useCallback(
    async (next: Store) => {
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

  function schedule(next: Store) {
    setStore(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void persist(next), 400);
  }

  function addRow() {
    const row: ArtifactRow = {
      id: crypto.randomUUID(),
      name: "New artifact",
      segmentName: store.genSegment || segments[0]?.name || "—",
      status: "Draft",
      consistency: 80
    };
    schedule({ ...store, items: [...store.items, row] });
  }

  function updateRow(id: string, patch: Partial<ArtifactRow>) {
    schedule({
      ...store,
      items: store.items.map((r) => (r.id === id ? { ...r, ...patch } : r))
    });
  }

  function removeRow(id: string) {
    schedule({ ...store, items: store.items.filter((r) => r.id !== id) });
  }

  async function generate() {
    setGenerating(true);
    setError(null);
    const prompt = `Create a ${store.genType} for the segment "${store.genSegment || "primary ICP"}".
Tone: ${store.genTone}.
Return:
Line 1: short artifact title
Line 2: blank
Lines 3+: 2–4 sentences of copy suitable for marketing.`;

    try {
      const res = await fetch("/api/ai/module-generate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          system:
            "You write sharp B2B marketing copy. Follow the user's output shape exactly (title line, blank line, body)."
        })
      });
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Generation failed.");
      const text = data.text ?? "";
      schedule({ ...store, lastOutput: text });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  function insertFromOutput() {
    setStore((prev) => {
      if (!prev.lastOutput.trim()) return prev;
      const lines = prev.lastOutput.split(/\r?\n/).filter(Boolean);
      const title = lines[0]?.trim() || "Generated artifact";
      const row: ArtifactRow = {
        id: crypto.randomUUID(),
        name: title.slice(0, 120),
        segmentName: prev.genSegment || segments[0]?.name || "—",
        status: "Draft",
        consistency: 85
      };
      const next = { ...prev, items: [...prev.items, row] };
      void persist(next);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      {loading ? <div className="text-sm text-[#9090b0]">Loading…</div> : null}
      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}
      <p className="text-xs text-[#9090b0]">{saving ? "Saving…" : "Artifacts saved per product."}</p>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4 lg:col-span-2">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-[#f0f0f8]">Artifacts</div>
            <button
              type="button"
              onClick={addRow}
              className="rounded-xl border border-[#2a2e3f] px-3 py-1.5 text-xs text-[#f0f0f8] hover:bg-white/5"
            >
              + Add row
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[#9090b0]">
                <tr>
                  <th className="pb-2 text-left font-medium">Artifact</th>
                  <th className="pb-2 text-left font-medium">Segment</th>
                  <th className="pb-2 text-left font-medium">Status</th>
                  <th className="pb-2 text-left font-medium">Fit %</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="text-[#f0f0f8]">
                {store.items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-[#9090b0]">
                      No artifacts yet. Generate or add a row.
                    </td>
                  </tr>
                ) : (
                  store.items.map((r) => (
                    <tr key={r.id} className="border-t border-[#2a2e3f]">
                      <td className="py-2 pr-2 align-top">
                        <input
                          value={r.name}
                          onChange={(e) => updateRow(r.id, { name: e.target.value })}
                          className="w-full min-w-[140px] rounded-lg border border-[#2a2e3f] bg-black/20 px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="py-2 pr-2 align-top">
                        <input
                          value={r.segmentName}
                          onChange={(e) => updateRow(r.id, { segmentName: e.target.value })}
                          className="w-full rounded-lg border border-[#2a2e3f] bg-black/20 px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="py-2 pr-2 align-top">
                        <select
                          value={r.status}
                          onChange={(e) => updateRow(r.id, { status: e.target.value })}
                          className="rounded-lg border border-[#2a2e3f] bg-black/20 px-2 py-1 text-sm"
                        >
                          {["Draft", "Review", "Approved"].map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 pr-2 align-top">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={r.consistency}
                          onChange={(e) =>
                            updateRow(r.id, { consistency: Number(e.target.value) || 0 })
                          }
                          className="w-16 rounded-lg border border-[#2a2e3f] bg-black/20 px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="py-2 align-top">
                        <button
                          type="button"
                          onClick={() => removeRow(r.id)}
                          className="text-xs text-[#9090b0] hover:text-red-300"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4">
          <div className="mb-3 text-sm text-[#f0f0f8]">Artifact generator</div>
          <div className="space-y-2">
            <label className="block text-xs text-[#9090b0]">Type</label>
            <input
              value={store.genType}
              onChange={(e) => schedule({ ...store, genType: e.target.value })}
              className="w-full rounded-xl border border-[#2a2e3f] bg-black/20 p-2 text-sm text-[#f0f0f8]"
            />
            <label className="block text-xs text-[#9090b0]">Segment</label>
            <select
              value={store.genSegment}
              onChange={(e) => schedule({ ...store, genSegment: e.target.value })}
              className="w-full rounded-xl border border-[#2a2e3f] bg-black/20 p-2 text-sm text-[#f0f0f8]"
            >
              <option value="">Best-fit segment</option>
              {segments.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
            <label className="block text-xs text-[#9090b0]">Tone</label>
            <input
              value={store.genTone}
              onChange={(e) => schedule({ ...store, genTone: e.target.value })}
              className="w-full rounded-xl border border-[#2a2e3f] bg-black/20 p-2 text-sm text-[#f0f0f8]"
            />
            <button
              type="button"
              onClick={() => generate()}
              disabled={generating}
              className="mt-2 w-full rounded-xl bg-[#b8ff6c] p-2 text-sm font-medium text-black disabled:opacity-50"
            >
              {generating ? "Generating…" : "Generate"}
            </button>
            {store.lastOutput ? (
              <div className="mt-3 space-y-2">
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-xl border border-[#2a2e3f] bg-black/20 p-2 text-xs text-[#9090b0]">
                  {store.lastOutput}
                </pre>
                <button
                  type="button"
                  onClick={insertFromOutput}
                  className="w-full rounded-xl border border-[#2a2e3f] px-2 py-2 text-xs text-[#f0f0f8] hover:bg-white/5"
                >
                  Add title to table
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
