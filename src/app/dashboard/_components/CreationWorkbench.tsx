"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type QueueRow = {
  id: string;
  title: string;
  due: string;
  status: string;
  description: string;
  contentType: string;
  channel: string;
  audience: string;
  owner: string;
  reviewer: string;
  draftUrl: string;
  publishedUrl: string;
  dueDate: string;
};

type AiHistoryEntry = { id: string; at: string; prompt: string; text: string };

type Workspace = {
  queue: QueueRow[];
  notes: string;
  calendar: string;
  prompt: string;
  lastOutput: string;
  aiHistory: AiHistoryEntry[];
  aiTone: string;
  aiLength: string;
};

const STATUS_OPTIONS = [
  "Planned",
  "In draft",
  "In review",
  "Scheduled",
  "Published",
  "Paused"
] as const;

const CONTENT_TYPES = [
  "Blog",
  "Guide / ebook",
  "Email",
  "Social post",
  "Webinar / event",
  "Case study",
  "Product update",
  "Sales enablement",
  "Landing page",
  "Other"
] as const;

const CHANNELS = [
  "Website",
  "LinkedIn",
  "Twitter / X",
  "Newsletter",
  "Paid ads",
  "Sales team",
  "Community / Slack",
  "Partner",
  "Other"
] as const;

const AI_TONES = ["Professional", "Conversational", "Bold", "Technical", "Inspirational"] as const;
const AI_LENGTHS = [
  ["short", "Short"],
  ["medium", "Medium"],
  ["long", "Long"]
] as const;

function empty(): Workspace {
  return {
    queue: [],
    notes: "",
    calendar: "",
    prompt: "",
    lastOutput: "",
    aiHistory: [],
    aiTone: "Professional",
    aiLength: "medium"
  };
}

function migrateQueueRow(raw: unknown): QueueRow {
  if (!raw || typeof raw !== "object") {
    return {
      id: crypto.randomUUID(),
      title: "",
      due: "",
      status: "Planned",
      description: "",
      contentType: "",
      channel: "",
      audience: "",
      owner: "",
      reviewer: "",
      draftUrl: "",
      publishedUrl: "",
      dueDate: ""
    };
  }
  const o = raw as Record<string, unknown>;
  return {
    id: String(o.id || crypto.randomUUID()),
    title: String(o.title ?? ""),
    due: String(o.due ?? ""),
    status: String(o.status ?? "Planned"),
    description: String(o.description ?? ""),
    contentType: String(o.contentType ?? ""),
    channel: String(o.channel ?? ""),
    audience: String(o.audience ?? ""),
    owner: String(o.owner ?? ""),
    reviewer: String(o.reviewer ?? ""),
    draftUrl: String(o.draftUrl ?? ""),
    publishedUrl: String(o.publishedUrl ?? ""),
    dueDate: String(o.dueDate ?? "")
  };
}

function migrateWorkspace(v: Partial<Workspace> | null): Workspace {
  const base = empty();
  if (!v || typeof v !== "object") return base;
  return {
    queue: Array.isArray(v.queue) ? v.queue.map(migrateQueueRow) : [],
    notes: typeof v.notes === "string" ? v.notes : "",
    calendar: typeof v.calendar === "string" ? v.calendar : "",
    prompt: typeof v.prompt === "string" ? v.prompt : "",
    lastOutput: typeof v.lastOutput === "string" ? v.lastOutput : "",
    aiHistory: Array.isArray(v.aiHistory)
      ? v.aiHistory
          .filter((h): h is AiHistoryEntry => h && typeof h === "object" && "text" in h)
          .map((h) => ({
            id: String((h as AiHistoryEntry).id || crypto.randomUUID()),
            at: String((h as AiHistoryEntry).at || new Date().toISOString()),
            prompt: String((h as AiHistoryEntry).prompt || ""),
            text: String((h as AiHistoryEntry).text || "")
          }))
          .slice(0, 25)
      : [],
    aiTone: typeof v.aiTone === "string" && v.aiTone ? v.aiTone : base.aiTone,
    aiLength: typeof v.aiLength === "string" && v.aiLength ? v.aiLength : base.aiLength
  };
}

function hrefForUserUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  if (/^[\w.-]+\.[a-z]{2,}/i.test(t)) return `https://${t}`;
  return null;
}

function titleFromAiOutput(text: string, prompt: string): string {
  const first = text
    .split("\n")
    .map((l) => l.replace(/^#+\s*/, "").trim())
    .find((l) => l.length > 0);
  if (first && first.length <= 120) return first;
  if (first) return `${first.slice(0, 117)}…`;
  const p = prompt.trim().split("\n")[0];
  if (p.length <= 80) return p || "AI draft";
  return `${p.slice(0, 77)}…`;
}

export function CreationWorkbench({
  environmentId,
  moduleKey,
  title,
  description,
  placeholder,
  systemHint,
  contentStudio = false
}: {
  environmentId: string;
  moduleKey: string;
  title: string;
  description: string;
  placeholder: string;
  systemHint: string;
  /** Full pipeline: richer queue, AI tone/length, history, add-to-queue. */
  contentStudio?: boolean;
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
    setWs(migrateWorkspace(v));
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
          system: systemHint,
          ...(contentStudio
            ? {
                tone: ws.aiTone,
                length: ws.aiLength
              }
            : {})
        })
      });
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Generation failed.");
      const text = data.text ?? "";
      const entry: AiHistoryEntry = {
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        prompt: ws.prompt,
        text
      };
      const nextHistory = contentStudio ? [entry, ...ws.aiHistory].slice(0, 25) : ws.aiHistory;
      const next = { ...ws, lastOutput: text, aiHistory: nextHistory };
      setWs(next);
      await persist(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  function addQueueRow() {
    const row: QueueRow = contentStudio
      ? {
          id: crypto.randomUUID(),
          title: "",
          due: "",
          status: "Planned",
          description: "",
          contentType: "",
          channel: "",
          audience: "",
          owner: "",
          reviewer: "",
          draftUrl: "",
          publishedUrl: "",
          dueDate: ""
        }
      : {
          id: crypto.randomUUID(),
          title: "New item",
          due: "—",
          status: "Planned",
          description: "",
          contentType: "",
          channel: "",
          audience: "",
          owner: "",
          reviewer: "",
          draftUrl: "",
          publishedUrl: "",
          dueDate: ""
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

  function addLastOutputToQueue() {
    if (!ws.lastOutput.trim()) return;
    const title = titleFromAiOutput(ws.lastOutput, ws.prompt);
    const row: QueueRow = {
      id: crypto.randomUUID(),
      title,
      due: "",
      status: "In draft",
      description: ws.prompt.trim() ? `Prompt: ${ws.prompt.trim().slice(0, 200)}${ws.prompt.length > 200 ? "…" : ""}` : "",
      contentType: "",
      channel: "",
      audience: "",
      owner: "",
      reviewer: "",
      draftUrl: "",
      publishedUrl: "",
      dueDate: ""
    };
    scheduleSave({ ...ws, queue: [...ws.queue, row] });
  }

  function appendOutputToNotes() {
    if (!ws.lastOutput.trim()) return;
    const block = `\n\n---\n${new Date().toLocaleString()}\n${ws.lastOutput.trim()}\n`;
    scheduleSave({ ...ws, notes: `${ws.notes}${block}` });
  }

  function removeHistoryEntry(id: string) {
    scheduleSave({ ...ws, aiHistory: ws.aiHistory.filter((h) => h.id !== id) });
  }

  function restoreHistoryEntry(h: AiHistoryEntry) {
    scheduleSave({ ...ws, lastOutput: h.text, prompt: h.prompt });
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

      {contentStudio ? (
        <div className="rounded-xl border border-[#7c6cff]/25 bg-[#7c6cff]/5 px-4 py-3 text-xs leading-relaxed text-[#c4c8e8]">
          <strong className="text-[#f0f0f8]">Assist</strong> — Queue items carry type, channel, audience, owners, and
          links. AI uses your product + ICP segments from the workspace (same as Copilot). Tone and length shape each
          draft; history keeps past runs. Use <strong className="text-[#f0f0f8]">Add draft to queue</strong> to turn output
          into a tracked piece.
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4 lg:col-span-2">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-[#f0f0f8]">{contentStudio ? "Content pipeline" : "Content queue"}</div>
            <button
              type="button"
              onClick={addQueueRow}
              className="rounded-xl border border-[#2a2e3f] px-3 py-1.5 text-xs text-[#f0f0f8] hover:bg-white/5"
            >
              + Add {contentStudio ? "piece" : "row"}
            </button>
          </div>

          {!contentStudio ? (
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
          ) : (
            <div className="space-y-3">
              {ws.queue.length === 0 ? (
                <p className="py-4 text-sm text-[#9090b0]">
                  No pieces yet. Add one, or generate with AI and click <span className="text-[#f0f0f8]">Add draft to queue</span>.
                </p>
              ) : (
                ws.queue.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-xl border border-[#2a2e3f] bg-black/20 p-3 text-sm text-[#f0f0f8]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <input
                        value={r.title}
                        onChange={(e) => updateQueue(r.id, { title: e.target.value })}
                        placeholder="Working title"
                        className="min-w-0 flex-1 rounded-lg border border-[#2a2e3f] bg-[#141420] px-2 py-1.5 font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => removeQueue(r.id)}
                        className="shrink-0 text-xs text-[#9090b0] hover:text-red-300"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <div>
                        <div className="mb-0.5 text-[10px] uppercase text-[#9090b0]">Type</div>
                        <select
                          value={r.contentType}
                          onChange={(e) => updateQueue(r.id, { contentType: e.target.value })}
                          className="w-full rounded-lg border border-[#2a2e3f] bg-[#141420] px-2 py-1.5 text-sm text-[#f0f0f8]"
                        >
                          <option value="">Select…</option>
                          {CONTENT_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <div className="mb-0.5 text-[10px] uppercase text-[#9090b0]">Channel</div>
                        <select
                          value={r.channel}
                          onChange={(e) => updateQueue(r.id, { channel: e.target.value })}
                          className="w-full rounded-lg border border-[#2a2e3f] bg-[#141420] px-2 py-1.5 text-sm text-[#f0f0f8]"
                        >
                          <option value="">Select…</option>
                          {CHANNELS.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <div className="mb-0.5 text-[10px] uppercase text-[#9090b0]">Status</div>
                        <select
                          value={r.status}
                          onChange={(e) => updateQueue(r.id, { status: e.target.value })}
                          className="w-full rounded-lg border border-[#2a2e3f] bg-[#141420] px-2 py-1.5 text-sm text-[#f0f0f8]"
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <div className="mb-0.5 text-[10px] uppercase text-[#9090b0]">Due date</div>
                        <input
                          type="date"
                          value={r.dueDate}
                          onChange={(e) => updateQueue(r.id, { dueDate: e.target.value })}
                          className="w-full rounded-lg border border-[#2a2e3f] bg-[#141420] px-2 py-1.5 text-sm text-[#f0f0f8]"
                        />
                      </div>
                      <div>
                        <div className="mb-0.5 text-[10px] uppercase text-[#9090b0]">Owner</div>
                        <input
                          value={r.owner}
                          onChange={(e) => updateQueue(r.id, { owner: e.target.value })}
                          placeholder="Writer"
                          className="w-full rounded-lg border border-[#2a2e3f] bg-[#141420] px-2 py-1.5 text-sm"
                        />
                      </div>
                      <div>
                        <div className="mb-0.5 text-[10px] uppercase text-[#9090b0]">Reviewer</div>
                        <input
                          value={r.reviewer}
                          onChange={(e) => updateQueue(r.id, { reviewer: e.target.value })}
                          placeholder="Approver"
                          className="w-full rounded-lg border border-[#2a2e3f] bg-[#141420] px-2 py-1.5 text-sm"
                        />
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="mb-0.5 text-[10px] uppercase text-[#9090b0]">Audience / segment</div>
                      <input
                        value={r.audience}
                        onChange={(e) => updateQueue(r.id, { audience: e.target.value })}
                        placeholder="e.g. Series A CMOs, enterprise IT"
                        className="w-full rounded-lg border border-[#2a2e3f] bg-[#141420] px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <div>
                        <div className="mb-0.5 text-[10px] uppercase text-[#9090b0]">Draft link</div>
                        <div className="flex gap-1">
                          <input
                            value={r.draftUrl}
                            onChange={(e) => updateQueue(r.id, { draftUrl: e.target.value })}
                            placeholder="Doc, Notion, CMS…"
                            className="min-w-0 flex-1 rounded-lg border border-[#2a2e3f] bg-[#141420] px-2 py-1.5 text-sm"
                          />
                          {hrefForUserUrl(r.draftUrl) ? (
                            <a
                              href={hrefForUserUrl(r.draftUrl)!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 rounded-lg border border-[#7c6cff]/40 bg-[#7c6cff]/10 px-2 py-1.5 text-sm text-[#c4b8ff]"
                            >
                              Open
                            </a>
                          ) : null}
                        </div>
                      </div>
                      <div>
                        <div className="mb-0.5 text-[10px] uppercase text-[#9090b0]">Published URL</div>
                        <div className="flex gap-1">
                          <input
                            value={r.publishedUrl}
                            onChange={(e) => updateQueue(r.id, { publishedUrl: e.target.value })}
                            placeholder="Live URL"
                            className="min-w-0 flex-1 rounded-lg border border-[#2a2e3f] bg-[#141420] px-2 py-1.5 text-sm"
                          />
                          {hrefForUserUrl(r.publishedUrl) ? (
                            <a
                              href={hrefForUserUrl(r.publishedUrl)!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 rounded-lg border border-[#7c6cff]/40 bg-[#7c6cff]/10 px-2 py-1.5 text-sm text-[#c4b8ff]"
                            >
                              Open
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="mb-0.5 text-[10px] uppercase text-[#9090b0]">Brief / notes</div>
                      <textarea
                        value={r.description}
                        onChange={(e) => updateQueue(r.id, { description: e.target.value })}
                        rows={2}
                        placeholder="Angle, hook, CTA, or link to Messaging & Artifacts"
                        className="w-full rounded-lg border border-[#2a2e3f] bg-[#141420] px-2 py-1.5 text-sm text-[#f0f0f8]"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4">
          <div className="text-sm text-[#f0f0f8]">AI generator</div>
          {contentStudio ? (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <div className="mb-0.5 text-[10px] uppercase text-[#9090b0]">Tone</div>
                <select
                  value={ws.aiTone}
                  onChange={(e) => scheduleSave({ ...ws, aiTone: e.target.value })}
                  className="w-full rounded-lg border border-[#2a2e3f] bg-black/20 px-2 py-1.5 text-sm text-[#f0f0f8]"
                >
                  {AI_TONES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="mb-0.5 text-[10px] uppercase text-[#9090b0]">Length</div>
                <select
                  value={ws.aiLength}
                  onChange={(e) => scheduleSave({ ...ws, aiLength: e.target.value })}
                  className="w-full rounded-lg border border-[#2a2e3f] bg-black/20 px-2 py-1.5 text-sm text-[#f0f0f8]"
                >
                  {AI_LENGTHS.map(([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}
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
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[10px] uppercase text-[#9090b0]">Output</span>
                {contentStudio ? (
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={addLastOutputToQueue}
                      className="rounded-lg border border-[#7c6cff]/40 bg-[#7c6cff]/10 px-2 py-0.5 text-[11px] text-[#c4b8ff] hover:bg-[#7c6cff]/20"
                    >
                      Add draft to queue
                    </button>
                    <button
                      type="button"
                      onClick={appendOutputToNotes}
                      className="rounded-lg border border-[#2a2e3f] px-2 py-0.5 text-[11px] text-[#f0f0f8] hover:bg-white/5"
                    >
                      Append to notes
                    </button>
                  </div>
                ) : null}
              </div>
              <pre className="max-h-[min(40vh,320px)] overflow-y-auto whitespace-pre-wrap font-sans text-[#f0f0f8]">
                {ws.lastOutput}
              </pre>
            </div>
          ) : null}
          {contentStudio && ws.aiHistory.length > 0 ? (
            <details className="mt-3 rounded-lg border border-[#2a2e3f] bg-black/10 p-2">
              <summary className="cursor-pointer text-xs font-medium text-[#c4b8ff]">
                Recent generations ({ws.aiHistory.length})
              </summary>
              <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto text-[11px]">
                {ws.aiHistory.map((h) => (
                  <li key={h.id} className="rounded border border-[#2a2e3f]/80 bg-[#141420]/80 p-2">
                    <div className="flex flex-wrap justify-between gap-2 text-[#9090b0]">
                      <span>{new Date(h.at).toLocaleString()}</span>
                      <span className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => restoreHistoryEntry(h)}
                          className="text-[#c4b8ff] hover:text-[#ddd6ff]"
                        >
                          Restore
                        </button>
                        <button
                          type="button"
                          onClick={() => removeHistoryEntry(h.id)}
                          className="text-red-300/80 hover:text-red-200"
                        >
                          Remove
                        </button>
                      </span>
                    </div>
                    <div className="mt-1 line-clamp-2 text-[#f0f0f8]">{h.prompt}</div>
                  </li>
                ))}
              </ul>
            </details>
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
            placeholder="CTR, read time, top formats, learnings from Analytics…"
          />
        </div>
      </div>
    </div>
  );
}
