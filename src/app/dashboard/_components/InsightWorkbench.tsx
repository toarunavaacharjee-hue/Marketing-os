"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AiProgressBar, AI_PROGRESS_ESTIMATE } from "@/app/dashboard/_components/AiProgressBar";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Variant = "events" | "customer" | "sales";

type EventTask = { id: string; label: string; done: boolean };

type EventRow = {
  id: string;
  name: string;
  prepPct: number;
  eventUrl: string;
  eventDate: string;
  location: string;
  boothOrTrack: string;
  attendees: string;
  timeline: string;
  logistics: string;
  commercialNotes: string;
  leadCaptureNotes: string;
  speakingNotes: string;
  meetingsNotes: string;
  competitorNotes: string;
  followUpNotes: string;
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
      eventUrl: "",
      eventDate: "",
      location: "",
      boothOrTrack: "",
      attendees: "",
      timeline: "",
      logistics: "",
      commercialNotes: "",
      leadCaptureNotes: "",
      speakingNotes: "",
      meetingsNotes: "",
      competitorNotes: "",
      followUpNotes: "",
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
    eventUrl: String(o.eventUrl ?? ""),
    eventDate: String(o.eventDate ?? ""),
    location: String(o.location ?? ""),
    boothOrTrack: String(o.boothOrTrack ?? ""),
    attendees: String(o.attendees ?? ""),
    timeline: String(o.timeline ?? ""),
    logistics: String(o.logistics ?? ""),
    commercialNotes: String(o.commercialNotes ?? ""),
    leadCaptureNotes: String(o.leadCaptureNotes ?? ""),
    speakingNotes: String(o.speakingNotes ?? ""),
    meetingsNotes: String(o.meetingsNotes ?? ""),
    competitorNotes: String(o.competitorNotes ?? ""),
    followUpNotes: String(o.followUpNotes ?? ""),
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
    eventUrl: "",
    eventDate: "",
    location: "",
    boothOrTrack: "",
    attendees: "",
    timeline: "",
    logistics: "",
    commercialNotes: "",
    leadCaptureNotes: "",
    speakingNotes: "",
    meetingsNotes: "",
    competitorNotes: "",
    followUpNotes: "",
    goals: "",
    tasks: []
  };
}

function hrefForUserUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  if (/^[\w.-]+\.[a-z]{2,}/i.test(t)) return `https://${t}`;
  return null;
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

  function patchEventRow(index: number, patch: Partial<EventRow>) {
    replaceEventsList(events.events.map((x, j) => (j === index ? { ...x, ...patch } : x)));
  }

  async function importEventsFromPdf(file: File) {
    setImporting(true);
    setError(null);
    const fd = new FormData();
    fd.set("file", file);
    try {
      const res = await fetch("/api/events/extract-document", {
        method: "POST",
        body: fd
      });
      const data = (await res.json()) as {
        ok?: boolean;
        events?: Array<{
          name: string;
          eventUrl?: string;
          eventDate: string;
          location: string;
          boothOrTrack: string;
          attendees?: string;
          timeline?: string;
          logistics?: string;
          commercialNotes?: string;
          leadCaptureNotes?: string;
          speakingNotes?: string;
          meetingsNotes?: string;
          competitorNotes?: string;
          followUpNotes?: string;
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
        eventUrl: ex.eventUrl ?? "",
        eventDate: ex.eventDate,
        location: ex.location,
        boothOrTrack: ex.boothOrTrack,
        attendees: ex.attendees ?? "",
        timeline: ex.timeline ?? "",
        logistics: ex.logistics ?? "",
        commercialNotes: ex.commercialNotes ?? "",
        leadCaptureNotes: ex.leadCaptureNotes ?? "",
        speakingNotes: ex.speakingNotes ?? "",
        meetingsNotes: ex.meetingsNotes ?? "",
        competitorNotes: ex.competitorNotes ?? "",
        followUpNotes: ex.followUpNotes ?? "",
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
          "content-type": "application/json"
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
          <p className="text-xs text-text2">
            Capture the official site, who is going, logistics, and a prep timeline alongside goals and tasks. Use{" "}
            <strong className="text-text">Import PDF</strong> to draft from an agenda or exhibitor pack — then edit.{" "}
            <strong className="text-text">Match prep to tasks</strong> syncs the slider with your checklist. Expand{" "}
            <strong className="text-text">Program &amp; commercial</strong> for sponsor/budget, lead capture, speaking,
            meetings, competitors, and follow-up.
          </p>

          {events.events.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface2 p-8 text-center text-sm text-text2">
              No upcoming events yet. Click <span className="font-medium text-text">Add event</span> or import a PDF.
            </div>
          ) : null}

          {events.events.map((ev, i) => (
            <div
              key={ev.id}
              className="rounded-2xl border border-border bg-surface p-4 shadow-sm"
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
                  className="min-w-0 flex-1 rounded-lg border border-border bg-surface2 px-3 py-2 text-sm font-medium text-text placeholder:text-text3 focus:border-accent focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeEvent(ev.id)}
                  className="shrink-0 rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red hover:bg-red-500/10"
                >
                  Remove
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-end gap-2">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 text-[10px] uppercase text-text3">Event website</div>
                  <input
                    value={ev.eventUrl}
                    onChange={(e) => {
                      const next = events.events.map((x, j) =>
                        j === i ? { ...x, eventUrl: e.target.value } : x
                      );
                      replaceEventsList(next);
                    }}
                    placeholder="https://conference.example.com"
                    className="w-full rounded-lg border border-border bg-surface2 px-2 py-1.5 text-sm text-text placeholder:text-text3 focus:border-accent focus:outline-none"
                  />
                </div>
                {hrefForUserUrl(ev.eventUrl) ? (
                  <a
                    href={hrefForUserUrl(ev.eventUrl)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/15"
                  >
                    Open site
                  </a>
                ) : null}
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div>
                  <div className="mb-1 text-[10px] uppercase text-text2">Dates</div>
                  <input
                    value={ev.eventDate}
                    onChange={(e) => {
                      const next = events.events.map((x, j) =>
                        j === i ? { ...x, eventDate: e.target.value } : x
                      );
                      replaceEventsList(next);
                    }}
                    placeholder="Feb 19–20, 2025"
                    className="w-full rounded-lg border border-border bg-surface2 px-2 py-1.5 text-sm text-heading"
                  />
                </div>
                <div>
                  <div className="mb-1 text-[10px] uppercase text-text2">Location</div>
                  <input
                    value={ev.location}
                    onChange={(e) => {
                      const next = events.events.map((x, j) =>
                        j === i ? { ...x, location: e.target.value } : x
                      );
                      replaceEventsList(next);
                    }}
                    placeholder="City / venue / virtual"
                    className="w-full rounded-lg border border-border bg-surface2 px-2 py-1.5 text-sm text-heading"
                  />
                </div>
                <div>
                  <div className="mb-1 text-[10px] uppercase text-text2">Booth / track</div>
                  <input
                    value={ev.boothOrTrack}
                    onChange={(e) => {
                      const next = events.events.map((x, j) =>
                        j === i ? { ...x, boothOrTrack: e.target.value } : x
                      );
                      replaceEventsList(next);
                    }}
                    placeholder="Booth, pavilion, session track"
                    className="w-full rounded-lg border border-border bg-surface2 px-2 py-1.5 text-sm text-heading"
                  />
                </div>
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <div>
                  <div className="mb-1 text-[10px] uppercase text-text2">Team attending</div>
                  <textarea
                    value={ev.attendees}
                    onChange={(e) => {
                      const next = events.events.map((x, j) =>
                        j === i ? { ...x, attendees: e.target.value } : x
                      );
                      replaceEventsList(next);
                    }}
                    rows={4}
                    placeholder="One per line: name, role (e.g. Alex Chen — PMM; Jordan — AE)"
                    className="w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-sm text-heading"
                  />
                </div>
                <div>
                  <div className="mb-1 text-[10px] uppercase text-text2">Timeline &amp; milestones</div>
                  <textarea
                    value={ev.timeline}
                    onChange={(e) => {
                      const next = events.events.map((x, j) =>
                        j === i ? { ...x, timeline: e.target.value } : x
                      );
                      replaceEventsList(next);
                    }}
                    rows={4}
                    placeholder="Reg deadline, booth setup, ship collateral, travel days, show floor hours…"
                    className="w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-sm text-heading"
                  />
                </div>
              </div>

              <div className="mt-3">
                <div className="mb-1 text-[10px] uppercase text-text2">Logistics &amp; on-site details</div>
                <textarea
                  value={ev.logistics}
                  onChange={(e) => {
                    const next = events.events.map((x, j) =>
                      j === i ? { ...x, logistics: e.target.value } : x
                    );
                    replaceEventsList(next);
                  }}
                  rows={4}
                  placeholder="Hotel & confirmation, flights, badge pickup, parking, dress code, budget code, internal briefing doc link, emergency contact…"
                  className="w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-sm text-heading"
                />
              </div>

              <div className="mt-3">
                <div className="mb-1 text-[10px] uppercase text-text2">Goals</div>
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
                  className="w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-sm text-heading"
                />
              </div>

              <details className="group mt-3 rounded-xl border border-border bg-black/10 px-3 py-2 [&_summary]:list-none [&_summary::-webkit-details-marker]:hidden">
                <summary className="cursor-pointer text-xs font-medium text-primary hover:text-primary-dark">
                  <span className="mr-1 text-text2 group-open:rotate-90 inline-block transition-transform">
                    ▸
                  </span>
                  Program &amp; commercial (sponsor, lead capture, speaking, pipeline, follow-up)
                </summary>
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <div>
                    <div className="mb-1 text-[10px] uppercase text-text2">Commercial &amp; budget</div>
                    <textarea
                      value={ev.commercialNotes}
                      onChange={(e) => patchEventRow(i, { commercialNotes: e.target.value })}
                      rows={3}
                      placeholder="Sponsor tier, booth package, PO / budget owner, cancellation terms…"
                      className="w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-sm text-heading"
                    />
                  </div>
                  <div>
                    <div className="mb-1 text-[10px] uppercase text-text2">Lead capture</div>
                    <textarea
                      value={ev.leadCaptureNotes}
                      onChange={(e) => patchEventRow(i, { leadCaptureNotes: e.target.value })}
                      rows={3}
                      placeholder="Scanner app, login, badge rules, data export owner…"
                      className="w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-sm text-heading"
                    />
                  </div>
                  <div>
                    <div className="mb-1 text-[10px] uppercase text-text2">Speaking / sponsored session</div>
                    <textarea
                      value={ev.speakingNotes}
                      onChange={(e) => patchEventRow(i, { speakingNotes: e.target.value })}
                      rows={3}
                      placeholder="Session title, slot time, AV contact, sponsor deliverables…"
                      className="w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-sm text-heading"
                    />
                  </div>
                  <div>
                    <div className="mb-1 text-[10px] uppercase text-text2">Meetings &amp; booth duty</div>
                    <textarea
                      value={ev.meetingsNotes}
                      onChange={(e) => patchEventRow(i, { meetingsNotes: e.target.value })}
                      rows={3}
                      placeholder="Target accounts, pre-booked meetings, booth schedule, battlecard link…"
                      className="w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-sm text-heading"
                    />
                  </div>
                  <div>
                    <div className="mb-1 text-[10px] uppercase text-text2">Competitors on the floor</div>
                    <textarea
                      value={ev.competitorNotes}
                      onChange={(e) => patchEventRow(i, { competitorNotes: e.target.value })}
                      rows={3}
                      placeholder="Who else is exhibiting; notes for reps…"
                      className="w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-sm text-heading"
                    />
                  </div>
                  <div>
                    <div className="mb-1 text-[10px] uppercase text-text2">Post-event follow-up</div>
                    <textarea
                      value={ev.followUpNotes}
                      onChange={(e) => patchEventRow(i, { followUpNotes: e.target.value })}
                      rows={3}
                      placeholder="Owner, SLA for leads, nurture track, CRM campaign…"
                      className="w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-sm text-heading"
                    />
                  </div>
                </div>
              </details>

              <div className="mt-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[10px] uppercase text-text2">Tasks</div>
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
                      className="rounded-lg border border-border px-2 py-1 text-[11px] text-heading hover:bg-surface2"
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
                      className="rounded-lg border border-primary/40 bg-primary/10 px-2 py-1 text-[11px] text-primary"
                    >
                      Match prep to tasks
                    </button>
                  </div>
                </div>
                <ul className="space-y-2">
                  {ev.tasks.length === 0 ? (
                    <li className="text-xs text-text2">No tasks — add steps like travel, booth order, lead capture.</li>
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
                        className="mt-1 rounded border-border"
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
                        className="min-w-0 flex-1 rounded-lg border border-border bg-surface2 px-2 py-1.5 text-sm text-heading"
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
                        className="text-xs text-text2 hover:text-red-300"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                <span className="text-sm text-text2">Prep {ev.prepPct}%</span>
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
                  className="max-w-full flex-1 accent-[var(--color-primary)] sm:max-w-[240px]"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 text-sm text-text2 lg:sticky lg:top-4 lg:self-start">
          <div className="text-sm text-heading">Past event ROI &amp; notes</div>
          <textarea
            value={events.pastNotes}
            onChange={(e) => {
              const v = { ...events, pastNotes: e.target.value };
              setEvents(v);
              schedule(v);
            }}
            rows={14}
            className="mt-2 w-full rounded-xl border border-border bg-surface2 p-3 text-sm text-heading"
          />
        </div>
      </div>
    );
  }

  function renderCustomer() {
    return (
      <>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-surface p-4">
            <div className="text-xs text-text2">NPS</div>
            <input
              type="number"
              value={customer.nps}
              onChange={(e) => {
                const v = { ...customer, nps: Number(e.target.value) || 0 };
                setCustomer(v);
                schedule(v);
              }}
              className="mt-1 w-full bg-transparent text-3xl text-heading outline-none"
            />
          </div>
          <div className="rounded-2xl border border-border bg-surface p-4">
            <div className="text-xs text-text2">CSAT</div>
            <input
              value={customer.csat}
              onChange={(e) => {
                const v = { ...customer, csat: e.target.value };
                setCustomer(v);
                schedule(v);
              }}
              className="mt-1 w-full bg-transparent text-3xl text-heading outline-none"
            />
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-surface p-4">
            <div className="text-sm text-heading">VOC quotes</div>
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
                  className="w-full rounded-xl border border-border bg-surface2 p-3 text-sm text-text2"
                />
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-4">
            <div className="text-sm text-heading">Feedback themes</div>
            {customer.themes.map((t, i) => (
              <div key={t.id} className="mt-3">
                <div className="mb-1 flex justify-between text-xs text-text2">
                  <input
                    value={t.name}
                    onChange={(e) => {
                      const themes = [...customer.themes];
                      themes[i] = { ...t, name: e.target.value };
                      const v = { ...customer, themes };
                      setCustomer(v);
                      schedule(v);
                    }}
                    className="w-2/3 rounded border border-border bg-surface2 px-2 py-1 text-xs"
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
                  className="w-full accent-[var(--color-primary)]"
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
              className="mt-4 w-full rounded-xl border border-border bg-surface2 p-3 text-sm text-text2"
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
          <div className="rounded-2xl border border-border bg-surface p-4">
            <div className="text-sm text-heading">Objection themes</div>
            {sales.objections.map((o, i) => (
              <div key={o.id} className="mt-3">
                <div className="mb-1 flex justify-between text-xs text-text2">
                  <input
                    value={o.name}
                    onChange={(e) => {
                      const objections = [...sales.objections];
                      objections[i] = { ...o, name: e.target.value };
                      const v = { ...sales, objections };
                      setSales(v);
                      schedule(v);
                    }}
                    className="w-2/3 rounded border border-border bg-surface2 px-2 py-1 text-xs"
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
                  className="w-full accent-[var(--color-primary)]"
                />
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-border bg-surface p-4 text-sm text-text2">
            <div className="text-sm text-heading">Win / loss by segment</div>
            <textarea
              value={sales.winloss}
              onChange={(e) => {
                const v = { ...sales, winloss: e.target.value };
                setSales(v);
                schedule(v);
              }}
              rows={4}
              className="mt-2 w-full rounded-xl border border-border bg-surface2 p-3 text-sm text-heading"
            />
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 text-sm text-text2">
          <div className="text-sm text-heading">Recent call insights</div>
          <textarea
            value={sales.calls}
            onChange={(e) => {
              const v = { ...sales, calls: e.target.value };
              setSales(v);
              schedule(v);
            }}
            rows={10}
            className="mt-2 w-full rounded-xl border border-border bg-surface2 p-3 text-sm text-heading"
          />
        </div>
      </>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-3xl text-heading" style={{ fontFamily: "var(--font-heading)" }}>
        {title}
      </h1>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => generateInsight()}
            disabled={generating}
            className="rounded-xl bg-amber px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
          >
            {generating ? "Generating…" : "AI assist (append insight)"}
          </button>
          {variant === "events" ? (
            <>
              <button
                type="button"
                onClick={addEvent}
                className="rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium text-heading hover:bg-surface2"
              >
                + Add event
              </button>
              <label className="cursor-pointer rounded-xl border border-primary/50 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20">
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
        <span className="text-xs text-text2">
          {loading ? "Loading…" : null} {saving ? "Saving…" : "Saved per product."}
        </span>
      </div>
      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red">
          {error}
        </div>
      ) : null}

      <AiProgressBar
        active={generating || importing}
        variant="dark"
        title={importing ? "Extracting from document…" : "Generating AI insight…"}
        estimate={importing ? AI_PROGRESS_ESTIMATE.extract : AI_PROGRESS_ESTIMATE.short}
        durationMs={importing ? 75_000 : 50_000}
      />

      {variant === "events" ? renderEvents() : null}
      {variant === "customer" ? renderCustomer() : null}
      {variant === "sales" ? renderSales() : null}
    </div>
  );
}
