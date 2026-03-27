"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type QueueRow = { id: string; title: string; due: string; status: string };

type Workspace = {
  queue: QueueRow[];
  notes: string;
  calendar: string;
  prompt: string;
  lastOutput: string;
};

const empty = (): Workspace => ({
  queue: [],
  notes: "",
  calendar: "",
  prompt: "",
  lastOutput: ""
});

export function CreationWorkbench({
  environmentId,
  moduleKey,
  title,
  description,
  placeholder,
  systemHint
}: {
  environmentId: string;
  moduleKey: string;
  title: string;
  description: string;
  placeholder: string;
  systemHint: string;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ws, setWs] = useState<Workspace>(() => empty());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: qErr } = await supabase
      .from("module_settings")
      .select("value_json")
      .eq("environment_id", environmentId)
      .eq("module", moduleKey)
      .eq("key", "workspace")
      .maybeSingle();
    if (qErr) setError(qErr.message);
    const v = (data?.value_json ?? null) as Partial<Workspace> | null;
    if (v && typeof v === "object") {
      setWs({
        queue: Array.isArray(v.queue) ? v.queue : [],
        notes: typeof v.notes === "string" ? v.notes : "",
        calendar: typeof v.calendar === "string" ? v.calendar : "",
        prompt: typeof v.prompt === "string" ? v.prompt : "",
        lastOutput: typeof v.lastOutput === "string" ? v.lastOutput : ""
      });
    } else setWs(empty());
    setLoading(false);
  }, [environmentId, moduleKey, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const persist = useCallback(
    async (next: Workspace) => {
      setSaving(true);
      setError(null);
      const { error: upErr } = await supabase.from("module_settings").upsert({
        environment_id: environmentId,
        module: moduleKey,
        key: "workspace",
        value_json: next
      });
      setSaving(false);
      if (upErr) setError(upErr.message);
    },
    [environmentId, moduleKey, supabase]
  );

  function scheduleSave(next: Workspace) {
    setWs(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void persist(next);
    }, 450);
  }

  async function generate() {
    if (!ws.prompt.trim()) {
      setError("Add a prompt or topic first.");
      return;
    }
    setGenerating(true);
    setError(null);
    const key = (window.localStorage.getItem("marketing_os_anthropic_api_key") ?? "").trim();
    try {
      const res = await fetch("/api/ai/module-generate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(key ? { "x-anthropic-key": key } : {})
        },
        body: JSON.stringify({
          prompt: ws.prompt,
          system: systemHint
        })
      });
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Generation failed.");
      const next = { ...ws, lastOutput: data.text ?? "" };
      setWs(next);
      await persist(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  function addQueueRow() {
    const row: QueueRow = {
      id: crypto.randomUUID(),
      title: "New item",
      due: "—",
      status: "Planned"
    };
    scheduleSave({ ...ws, queue: [...ws.queue, row] });
  }

  function updateQueue(id: string, patch: Partial<QueueRow>) {
    scheduleSave({
      ...ws,
      queue: ws.queue.map((r) => (r.id === id ? { ...r, ...patch } : r))
    });
  }

  function removeQueue(id: string) {
    scheduleSave({ ...ws, queue: ws.queue.filter((r) => r.id !== id) });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl text-[#f0f0f8]" style={{ fontFamily: "var(--font-heading)" }}>
          {title}
        </h1>
        <p className="mt-1 text-sm text-[#9090b0]">{description}</p>
        {loading ? (
          <p className="mt-2 text-sm text-[#9090b0]">Loading workspace…</p>
        ) : (
          <p className="mt-2 text-xs text-[#9090b0]">{saving ? "Saving…" : "Saved to this product environment."}</p>
        )}
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4 lg:col-span-2">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-[#f0f0f8]">Content queue</div>
            <button
              type="button"
              onClick={addQueueRow}
              className="rounded-xl border border-[#2a2e3f] px-3 py-1.5 text-xs text-[#f0f0f8] hover:bg-white/5"
            >
              + Add row
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[#9090b0]">
                <tr>
                  <th className="pb-2 text-left font-medium">Title</th>
                  <th className="pb-2 text-left font-medium">Due</th>
                  <th className="pb-2 text-left font-medium">Status</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="text-[#f0f0f8]">
                {ws.queue.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-[#9090b0]">
                      No items yet. Add a row or use AI output below.
                    </td>
                  </tr>
                ) : (
                  ws.queue.map((r) => (
                    <tr key={r.id} className="border-t border-[#2a2e3f]">
                      <td className="py-2 pr-2 align-top">
                        <input
                          value={r.title}
                          onChange={(e) => updateQueue(r.id, { title: e.target.value })}
                          className="w-full rounded-lg border border-[#2a2e3f] bg-black/20 px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="py-2 pr-2 align-top">
                        <input
                          value={r.due}
                          onChange={(e) => updateQueue(r.id, { due: e.target.value })}
                          className="w-full rounded-lg border border-[#2a2e3f] bg-black/20 px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="py-2 pr-2 align-top">
                        <input
                          value={r.status}
                          onChange={(e) => updateQueue(r.id, { status: e.target.value })}
                          className="w-full rounded-lg border border-[#2a2e3f] bg-black/20 px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="py-2 align-top">
                        <button
                          type="button"
                          onClick={() => removeQueue(r.id)}
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
          <div className="text-sm text-[#f0f0f8]">AI generator</div>
          <textarea
            value={ws.prompt}
            onChange={(e) => scheduleSave({ ...ws, prompt: e.target.value })}
            className="mt-2 min-h-[96px] w-full rounded-xl border border-[#2a2e3f] bg-black/20 p-3 text-sm text-[#f0f0f8]"
            placeholder={placeholder}
          />
          <button
            type="button"
            onClick={() => generate()}
            disabled={generating}
            className="mt-2 w-full rounded-xl bg-[#b8ff6c] p-2 text-sm font-medium text-black disabled:opacity-50"
          >
            {generating ? "Generating…" : "Generate"}
          </button>
          {ws.lastOutput ? (
            <div className="mt-3 rounded-xl border border-[#2a2e3f] bg-black/20 p-3 text-xs leading-relaxed text-[#9090b0]">
              <div className="mb-1 text-[10px] uppercase text-[#9090b0]">Output</div>
              <pre className="whitespace-pre-wrap font-sans text-[#f0f0f8]">{ws.lastOutput}</pre>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4 text-sm text-[#9090b0]">
          <div className="text-sm text-[#f0f0f8]">Mini calendar / milestones</div>
          <textarea
            value={ws.calendar}
            onChange={(e) => scheduleSave({ ...ws, calendar: e.target.value })}
            rows={5}
            className="mt-2 w-full rounded-xl border border-[#2a2e3f] bg-black/20 p-3 text-sm text-[#f0f0f8]"
            placeholder="Tue: draft&#10;Wed: review"
          />
        </div>
        <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4 text-sm text-[#9090b0]">
          <div className="text-sm text-[#f0f0f8]">Notes & performance</div>
          <textarea
            value={ws.notes}
            onChange={(e) => scheduleSave({ ...ws, notes: e.target.value })}
            rows={5}
            className="mt-2 w-full rounded-xl border border-[#2a2e3f] bg-black/20 p-3 text-sm text-[#f0f0f8]"
            placeholder="CTR, read time, top formats…"
          />
        </div>
      </div>
    </div>
  );
}
