"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Variant = "events" | "customer" | "sales";

type EventTask = { id: string; label: string; done: boolean };

type EventRow = {
  id: string;
  name: string;
  prepPct: number;
  eventDate: string;
  location: string;
  boothOrTrack: string;
  goals: string;
  tasks: EventTask[];
};

type ThemeRow = { id: string; name: string; pct: number };
type ObjRow = { id: string; name: string; pct: number };

type EventsValue = { events: EventRow[]; pastNotes: string };
type CustomerValue = {
  nps: number;
  csat: string;
  quotes: string[];
  themes: ThemeRow[];
  summary: string;
};
type SalesValue = {
  objections: ObjRow[];
  winloss: string;
  calls: string;
};

const MODULE: Record<Variant, string> = {
  events: "events",
  customer: "customer_insights",
  sales: "sales_intelligence"
};

function clampPct(n: unknown, fallback: number): number {
  if (typeof n !== "number" || Number.isNaN(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function migrateEventRow(raw: unknown, idx: number): EventRow {
  if (!raw || typeof raw !== "object") {
    return {
      id: crypto.randomUUID(),
      name: `Event ${idx + 1}`,
      prepPct: 0,
      eventDate: "",
      location: "",
      boothOrTrack: "",
      goals: "",
      tasks: []
    };
  }
  const o = raw as Record<string, unknown>;
  const tasksRaw = o.tasks;
  const tasks: EventTask[] = [];
  if (Array.isArray(tasksRaw)) {
    for (const t of tasksRaw) {
      if (t && typeof t === "object" && "label" in t) {
        const x = t as { id?: string; label?: string; done?: boolean };
        tasks.push({
          id: String(x.id || crypto.randomUUID()),
          label: String(x.label || ""),
          done: Boolean(x.done)
        });
      } else if (typeof t === "string" && t.trim()) {
        tasks.push({ id: crypto.randomUUID(), label: t.trim(), done: false });
      }
    }
  }
  return {
    id: String(o.id || crypto.randomUUID()),
    name: String(o.name || "Untitled event"),
    prepPct: clampPct(o.prepPct, 0),
    eventDate: String(o.eventDate ?? ""),
    location: String(o.location ?? ""),
    boothOrTrack: String(o.boothOrTrack ?? ""),
    goals: String(o.goals ?? ""),
    tasks
  };
}

function normalizeEventsFromStorage(v: unknown): EventsValue | null {
  if (!v || typeof v !== "object" || !("events" in v)) return null;
  const o = v as { events?: unknown[]; pastNotes?: unknown };
  const list = Array.isArray(o.events) ? o.events : [];
  return {
    events: list.map((r, i) => migrateEventRow(r, i)),
    pastNotes: typeof o.pastNotes === "string" ? o.pastNotes : ""
  };
}

function seedEventsDefault(): EventsValue {
  return {
    events: [
      migrateEventRow({ id: "1", name: "SaaS Growth Summit", prepPct: 72 }, 0),
      migrateEventRow({ id: "2", name: "RevOps Roundtable", prepPct: 48 }, 1),
      migrateEventRow({ id: "3", name: "Demand Gen Live", prepPct: 85 }, 2)
    ],
    pastNotes: "Q1 Summit: 146% ROI\nPipeline influenced: $92k\nMeetings booked: 43"
  };
}

function newBlankEvent(): EventRow {
  return {
    id: crypto.randomUUID(),
    name: "",
    prepPct: 0,
    eventDate: "",
    location: "",
    boothOrTrack: "",
    goals: "",
    tasks: []
  };
}

function prepFromTasks(ev: EventRow): number {
  if (!ev.tasks.length) return ev.prepPct;
  const done = ev.tasks.filter((t) => t.done).length;
  return Math.round((done / ev.tasks.length) * 100);
}

export function InsightWorkbench({
  environmentId,
  variant,
  title
}: {
  environmentId: string;
  variant: Variant;
  title: string;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const mod = MODULE[variant];
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [importing, setImporting] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [events, setEvents] = useState<EventsValue>(() => seedEventsDefault());

  const [customer, setCustomer] = useState<CustomerValue>({
    nps: 47,
    csat: "4.5 / 5",
    quotes: [
      "We finally know what to do every Monday.",
      "Copilot turns insights into action.",
      "Cross-channel visibility improved reporting speed."
    ],
    themes: [
      { id: "a", name: "Speed to execution", pct: 71 },
      { id: "b", name: "Attribution confidence", pct: 63 },
      { id: "c", name: "Onboarding friction", pct: 34 }
    ],
    summary:
      "Customer sentiment is positive around execution speed; biggest retention risk is onboarding clarity for cross-functional teams."
  });

  const [sales, setSales] = useState<SalesValue>({
    objections: [
      { id: "o1", name: "Price sensitivity", pct: 62 },
      { id: "o2", name: "Integration concern", pct: 48 },
      { id: "o3", name: "Proof depth", pct: 55 }
    ],
    winloss: "Mid-market: 58/42\nEnterprise: 44/56\nPLG upmarket: 63/37",
    calls:
      '1) "Need proof this works with small teams."\n2) "Timeline risk is unclear."\n3) "How does this compare to Acme?"'
  });

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: qErr } = await supabase
      .from("module_settings")
      .select("value_json")
      .eq("environment_id", environmentId)
      .eq("module", mod)
      .eq("key", "workspace")
      .maybeSingle();
    if (qErr) setError(qErr.message);
    const v = data?.value_json;
    if (v && typeof v === "object") {
      if (variant === "events") {
        const normalized = normalizeEventsFromStorage(v);
        if (normalized) setEvents(normalized);
      }
      if (variant === "customer" && "nps" in v) setCustomer(v as CustomerValue);
      if (variant === "sales" && "objections" in v) setSales(v as SalesValue);
    }
    setLoading(false);
  }, [environmentId, mod, supabase, variant]);

  useEffect(() => {
    load();
  }, [load]);

  const persist = useCallback(
    async (payload: unknown) => {
      setSaving(true);
      const { error: upErr } = await supabase.from("module_settings").upsert({
        environment_id: environmentId,
        module: mod,
        key: "workspace",
        value_json: payload
      });
      setSaving(false);
      if (upErr) setError(upErr.message);
    },
    [environmentId, mod, supabase]
  );

  function schedule(payload: unknown) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void persist(payload), 400);
  }

  function addEvent() {
    const v = { ...events, events: [...events.events, newBlankEvent()] };
    setEvents(v);
    schedule(v);
  }

  function removeEvent(id: string) {
    const v = { ...events, events: events.events.filter((e) => e.id !== id) };
    setEvents(v);
    schedule(v);
  }

  function replaceEventsList(nextList: EventRow[]) {
    const v = { ...events, events: nextList };
    setEvents(v);
    schedule(v);
  }

  async function importEventsFromPdf(file: File) {
    setImporting(true);
    setError(null);
    const key = (window.localStorage.getItem("marketing_os_anthropic_api_key") ?? "").trim();
    const fd = new FormData();
    fd.set("file", file);
    try {
      const res = await fetch("/api/events/extract-document", {
        method: "POST",
        body: fd,
        headers: key ? { "x-anthropic-key": key } : {}
      });
      const data = (await res.json()) as {
        ok?: boolean;
        events?: Array<{
          name: string;
          eventDate: string;
          location: string;
          boothOrTrack: string;
          goals: string;
          taskLabels: string[];
        }>;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Import failed.");
      const extracted = data.events ?? [];
      if (!extracted.length) throw new Error("No events returned from file.");
      const newRows: EventRow[] = extracted.map((ex) => ({
        id: crypto.randomUUID(),
        name: ex.name,
        prepPct: 0,
        eventDate: ex.eventDate,
        location: ex.location,
        boothOrTrack: ex.boothOrTrack,
        goals: ex.goals,
        tasks: (ex.taskLabels ?? []).map((label) => ({
          id: crypto.randomUUID(),
          label,
          done: false
        }))
      }));
      setEvents((prev) => {
        const v = { ...prev, events: [...prev.events, ...newRows] };
        schedule(v);
        return v;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  }

  async function generateInsight() {
    setGenerating(true);
    setError(null);
    const key = (window.localStorage.getItem("marketing_os_anthropic_api_key") ?? "").trim();
    const prompts: Record<Variant, string> = {
      events:
        "Summarize 3 upcoming event priorities and 3 KPIs to track for a B2B marketing team. Short bullets.",
      customer:
        "Summarize customer voice themes and one risk from the data provided. Keep under 120 words.",
      sales:
        "List top 3 objection themes and 3 call coaching tips for reps. Short bullets."
    };
    try {
      const res = await fetch("/api/ai/module-generate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(key ? { "x-anthropic-key": key } : {})
        },
        body: JSON.stringify({
          prompt: prompts[variant],
          system: "You are a revenue operations analyst. Be concise."
        })
      });
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Generation failed.");
      const text = data.text ?? "";
      if (variant === "events") {
        setEvents((prev) => {
          const v = { ...prev, pastNotes: `${prev.pastNotes}\n\n---\n${text}` };
          schedule(v);
          return v;
        });
      }
      if (variant === "customer") {
        setCustomer((prev) => {
          const v = { ...prev, summary: text };
          schedule(v);
          return v;
        });
      }
      if (variant === "sales") {
        setSales((prev) => {
          const v = { ...prev, calls: `${prev.calls}\n\n---\n${text}` };
          schedule(v);
          return v;
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  function renderEvents() {
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <p className="text-xs text-[#9090b0]">
            Add conferences or field events manually, or <strong className="text-[#f0f0f8]">Import PDF</strong> (agenda,
            exhibitor guide, registration) to draft goals and tasks. Edit anything before relying on it — then use{" "}
            <strong className="text-[#f0f0f8]">Match prep to tasks</strong> to align the slider with checklist progress.
          </p>

          {events.events.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#2a2e3f] bg-[#141420]/60 p-8 text-center text-sm text-[#9090b0]">
              No upcoming events yet. Click <span className="text-[#f0f0f8]">Add event</span> or import a PDF.
            </div>
          ) : null}

          {events.events.map((ev, i) => (
            <div
              key={ev.id}
              className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <input
                  value={ev.name}
                  onChange={(e) => {
                    const next = events.events.map((x, j) =>
                      j === i ? { ...x, name: e.target.value } : x
                    );
                    replaceEventsList(next);
                  }}
                  placeholder="Conference or event name (e.g. SIIA National Conference — AI Forum)"
                  className="min-w-0 flex-1 rounded-lg border border-[#2a2e3f] bg-black/20 px-3 py-2 text-sm font-medium text-[#f0f0f8]"
                />
                <button
                  type="button"
                  onClick={() => removeEvent(ev.id)}
                  className="shrink-0 rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-200 hover:bg-red-500/10"
                >
                  Remove
                </button>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div>
                  <div className="mb-1 text-[10px] uppercase text-[#9090b0]">Dates</div>
                  <input
                    value={ev.eventDate}
                    onChange={(e) => {
                      const next = events.events.map((x, j) =>
                        j === i ? { ...x, eventDate: e.target.value } : x
                      );
                      replaceEventsList(next);
                    }}
                    placeholder="Feb 19–20, 2025"
                    className="w-full rounded-lg border border-[#2a2e3f] bg-black/20 px-2 py-1.5 text-sm text-[#f0f0f8]"
                  />
                </div>
                <div>
                  <div className="mb-1 text-[10px] uppercase text-[#9090b0]">Location</div>
                  <input
                    value={ev.location}
                    onChange={(e) => {
                      const next = events.events.map((x, j) =>
                        j === i ? { ...x, location: e.target.value } : x
                      );
                      replaceEventsList(next);
                    }}
                    placeholder="City / venue / virtual"
                    className="w-full rounded-lg border border-[#2a2e3f] bg-black/20 px-2 py-1.5 text-sm text-[#f0f0f8]"
                  />
                </div>
                <div>
                  <div className="mb-1 text-[10px] uppercase text-[#9090b0]">Booth / track</div>
                  <input
                    value={ev.boothOrTrack}
                    onChange={(e) => {
                      const next = events.events.map((x, j) =>
                        j === i ? { ...x, boothOrTrack: e.target.value } : x
                      );
                      replaceEventsList(next);
                    }}
                    placeholder="Booth, pavilion, session track"
                    className="w-full rounded-lg border border-[#2a2e3f] bg-black/20 px-2 py-1.5 text-sm text-[#f0f0f8]"
                  />
                </div>
              </div>

              <div className="mt-3">
                <div className="mb-1 text-[10px] uppercase text-[#9090b0]">Goals</div>
                <textarea
                  value={ev.goals}
                  onChange={(e) => {
                    const next = events.events.map((x, j) =>
                      j === i ? { ...x, goals: e.target.value } : x
                    );
                    replaceEventsList(next);
                  }}
                  rows={3}
                  placeholder="Pipeline targets, meetings to book, awareness, launch moments…"
                  className="w-full rounded-lg border border-[#2a2e3f] bg-black/20 px-3 py-2 text-sm text-[#f0f0f8]"
                />
              </div>

              <div className="mt-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[10px] uppercase text-[#9090b0]">Tasks</div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const next = events.events.map((x, j) =>
                          j === i
                            ? {
                                ...x,
                                tasks: [
                                  ...x.tasks,
                                  { id: crypto.randomUUID(), label: "", done: false }
                                ]
                              }
                            : x
                        );
                        replaceEventsList(next);
                      }}
                      className="rounded-lg border border-[#2a2e3f] px-2 py-1 text-[11px] text-[#f0f0f8] hover:bg-white/5"
                    >
                      + Add task
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = events.events.map((x, j) =>
                          j === i ? { ...x, prepPct: prepFromTasks(x) } : x
                        );
                        replaceEventsList(next);
                      }}
                      className="rounded-lg border border-[#7c6cff]/40 bg-[#7c6cff]/10 px-2 py-1 text-[11px] text-[#c4b8ff]"
                    >
                      Match prep to tasks
                    </button>
                  </div>
                </div>
                <ul className="space-y-2">
                  {ev.tasks.length === 0 ? (
                    <li className="text-xs text-[#9090b0]">No tasks — add steps like travel, booth order, lead capture.</li>
                  ) : null}
                  {ev.tasks.map((task, ti) => (
                    <li key={task.id} className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={task.done}
                        onChange={() => {
                          const next = events.events.map((x, j) => {
                            if (j !== i) return x;
                            const tasks = x.tasks.map((t, k) =>
                              k === ti ? { ...t, done: !t.done } : t
                            );
                            return { ...x, tasks };
                          });
                          replaceEventsList(next);
                        }}
                        className="mt-1 rounded border-[#2a2e3f]"
                      />
                      <input
                        value={task.label}
                        onChange={(e) => {
                          const next = events.events.map((x, j) => {
                            if (j !== i) return x;
                            const tasks = x.tasks.map((t, k) =>
                              k === ti ? { ...t, label: e.target.value } : t
                            );
                            return { ...x, tasks };
                          });
                          replaceEventsList(next);
                        }}
                        placeholder="Task description"
                        className="min-w-0 flex-1 rounded-lg border border-[#2a2e3f] bg-black/20 px-2 py-1.5 text-sm text-[#f0f0f8]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const next = events.events.map((x, j) => {
                            if (j !== i) return x;
                            return { ...x, tasks: x.tasks.filter((_, k) => k !== ti) };
                          });
                          replaceEventsList(next);
                        }}
                        className="text-xs text-[#9090b0] hover:text-red-300"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#2a2e3f] pt-3">
                <span className="text-sm text-[#9090b0]">Prep {ev.prepPct}%</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={ev.prepPct}
                  onChange={(e) => {
                    const pct = Number(e.target.value);
                    const next = events.events.map((x, j) =>
                      j === i ? { ...x, prepPct: pct } : x
                    );
                    replaceEventsList(next);
                  }}
                  className="max-w-full flex-1 accent-[#7c6cff] sm:max-w-[240px]"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4 text-sm text-[#9090b0] lg:sticky lg:top-4 lg:self-start">
          <div className="text-sm text-[#f0f0f8]">Past event ROI &amp; notes</div>
          <textarea
            value={events.pastNotes}
            onChange={(e) => {
              const v = { ...events, pastNotes: e.target.value };
              setEvents(v);
              schedule(v);
            }}
            rows={14}
            className="mt-2 w-full rounded-xl border border-[#2a2e3f] bg-black/20 p-3 text-sm text-[#f0f0f8]"
          />
        </div>
      </div>
    );
  }

  function renderCustomer() {
    return (
      <>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4">
            <div className="text-xs text-[#9090b0]">NPS</div>
            <input
              type="number"
              value={customer.nps}
              onChange={(e) => {
                const v = { ...customer, nps: Number(e.target.value) || 0 };
                setCustomer(v);
                schedule(v);
              }}
              className="mt-1 w-full bg-transparent text-3xl text-[#f0f0f8] outline-none"
            />
          </div>
          <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4">
            <div className="text-xs text-[#9090b0]">CSAT</div>
            <input
              value={customer.csat}
              onChange={(e) => {
                const v = { ...customer, csat: e.target.value };
                setCustomer(v);
                schedule(v);
              }}
              className="mt-1 w-full bg-transparent text-3xl text-[#f0f0f8] outline-none"
            />
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4">
            <div className="text-sm text-[#f0f0f8]">VOC quotes</div>
            <div className="mt-2 space-y-2">
              {customer.quotes.map((q, i) => (
                <textarea
                  key={i}
                  value={q}
                  onChange={(e) => {
                    const quotes = [...customer.quotes];
                    quotes[i] = e.target.value;
                    const v = { ...customer, quotes };
                    setCustomer(v);
                    schedule(v);
                  }}
                  rows={2}
                  className="w-full rounded-xl border border-[#2a2e3f] bg-black/20 p-3 text-sm text-[#9090b0]"
                />
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4">
            <div className="text-sm text-[#f0f0f8]">Feedback themes</div>
            {customer.themes.map((t, i) => (
              <div key={t.id} className="mt-3">
                <div className="mb-1 flex justify-between text-xs text-[#9090b0]">
                  <input
                    value={t.name}
                    onChange={(e) => {
                      const themes = [...customer.themes];
                      themes[i] = { ...t, name: e.target.value };
                      const v = { ...customer, themes };
                      setCustomer(v);
                      schedule(v);
                    }}
                    className="w-2/3 rounded border border-[#2a2e3f] bg-black/20 px-2 py-1 text-xs"
                  />
                  <span>{t.pct}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={t.pct}
                  onChange={(e) => {
                    const pct = Number(e.target.value);
                    const themes = [...customer.themes];
                    themes[i] = { ...t, pct };
                    const v = { ...customer, themes };
                    setCustomer(v);
                    schedule(v);
                  }}
                  className="w-full accent-[#7c6cff]"
                />
              </div>
            ))}
            <textarea
              value={customer.summary}
              onChange={(e) => {
                const v = { ...customer, summary: e.target.value };
                setCustomer(v);
                schedule(v);
              }}
              rows={4}
              className="mt-4 w-full rounded-xl border border-[#2a2e3f] bg-black/20 p-3 text-sm text-[#9090b0]"
              placeholder="AI summary"
            />
          </div>
        </div>
      </>
    );
  }

  function renderSales() {
    return (
      <>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4">
            <div className="text-sm text-[#f0f0f8]">Objection themes</div>
            {sales.objections.map((o, i) => (
              <div key={o.id} className="mt-3">
                <div className="mb-1 flex justify-between text-xs text-[#9090b0]">
                  <input
                    value={o.name}
                    onChange={(e) => {
                      const objections = [...sales.objections];
                      objections[i] = { ...o, name: e.target.value };
                      const v = { ...sales, objections };
                      setSales(v);
                      schedule(v);
                    }}
                    className="w-2/3 rounded border border-[#2a2e3f] bg-black/20 px-2 py-1 text-xs"
                  />
                  <span>{o.pct}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={o.pct}
                  onChange={(e) => {
                    const pct = Number(e.target.value);
                    const objections = [...sales.objections];
                    objections[i] = { ...o, pct };
                    const v = { ...sales, objections };
                    setSales(v);
                    schedule(v);
                  }}
                  className="w-full accent-[#7c6cff]"
                />
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4 text-sm text-[#9090b0]">
            <div className="text-sm text-[#f0f0f8]">Win / loss by segment</div>
            <textarea
              value={sales.winloss}
              onChange={(e) => {
                const v = { ...sales, winloss: e.target.value };
                setSales(v);
                schedule(v);
              }}
              rows={4}
              className="mt-2 w-full rounded-xl border border-[#2a2e3f] bg-black/20 p-3 text-sm text-[#f0f0f8]"
            />
          </div>
        </div>
        <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4 text-sm text-[#9090b0]">
          <div className="text-sm text-[#f0f0f8]">Recent call insights</div>
          <textarea
            value={sales.calls}
            onChange={(e) => {
              const v = { ...sales, calls: e.target.value };
              setSales(v);
              schedule(v);
            }}
            rows={10}
            className="mt-2 w-full rounded-xl border border-[#2a2e3f] bg-black/20 p-3 text-sm text-[#f0f0f8]"
          />
        </div>
      </>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-3xl text-[#f0f0f8]" style={{ fontFamily: "var(--font-heading)" }}>
        {title}
      </h1>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => generateInsight()}
            disabled={generating}
            className="rounded-xl bg-[#b8ff6c] px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
          >
            {generating ? "Generating…" : "AI assist (append insight)"}
          </button>
          {variant === "events" ? (
            <>
              <button
                type="button"
                onClick={addEvent}
                className="rounded-xl border border-[#2a2e3f] bg-[#141420] px-4 py-2 text-sm font-medium text-[#f0f0f8] hover:bg-white/5"
              >
                + Add event
              </button>
              <label className="cursor-pointer rounded-xl border border-[#7c6cff]/50 bg-[#7c6cff]/10 px-4 py-2 text-sm font-medium text-[#c4b8ff] hover:bg-[#7c6cff]/20">
                {importing ? "Reading PDF…" : "Import PDF"}
                <input
                  type="file"
                  accept=".pdf,.docx,.xlsx,.xls,.csv"
                  className="hidden"
                  disabled={importing}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) void importEventsFromPdf(f);
                  }}
                />
              </label>
            </>
          ) : null}
        </div>
        <span className="text-xs text-[#9090b0]">
          {loading ? "Loading…" : null} {saving ? "Saving…" : "Saved per product."}
        </span>
      </div>
      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {variant === "events" ? renderEvents() : null}
      {variant === "customer" ? renderCustomer() : null}
      {variant === "sales" ? renderSales() : null}
    </div>
  );
}
