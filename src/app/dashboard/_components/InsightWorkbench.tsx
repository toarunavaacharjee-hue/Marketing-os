"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Variant = "events" | "customer" | "sales";

type EventRow = { id: string; name: string; prepPct: number };
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
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [events, setEvents] = useState<EventsValue>({
    events: [
      { id: "1", name: "SaaS Growth Summit", prepPct: 72 },
      { id: "2", name: "RevOps Roundtable", prepPct: 48 },
      { id: "3", name: "Demand Gen Live", prepPct: 85 }
    ],
    pastNotes: "Q1 Summit: 146% ROI\nPipeline influenced: $92k\nMeetings booked: 43"
  });

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
      if (variant === "events" && "events" in v) setEvents(v as EventsValue);
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
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4">
          <div className="text-sm text-[#f0f0f8]">Upcoming events</div>
          <div className="mt-3 space-y-3">
            {events.events.map((ev, i) => (
              <div key={ev.id}>
                <div className="mb-1 flex justify-between text-sm text-[#9090b0]">
                  <input
                    value={ev.name}
                    onChange={(e) => {
                      const next = [
                        ...events.events.slice(0, i),
                        { ...ev, name: e.target.value },
                        ...events.events.slice(i + 1)
                      ];
                      const v = { ...events, events: next };
                      setEvents(v);
                      schedule(v);
                    }}
                    className="w-2/3 rounded border border-[#2a2e3f] bg-black/20 px-2 py-1 text-sm text-[#f0f0f8]"
                  />
                  <span>{ev.prepPct}% prep</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={ev.prepPct}
                  onChange={(e) => {
                    const pct = Number(e.target.value);
                    const next = [
                      ...events.events.slice(0, i),
                      { ...ev, prepPct: pct },
                      ...events.events.slice(i + 1)
                    ];
                    const v = { ...events, events: next };
                    setEvents(v);
                    schedule(v);
                  }}
                  className="w-full accent-[#7c6cff]"
                />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4 text-sm text-[#9090b0]">
          <div className="text-sm text-[#f0f0f8]">Past event ROI & notes</div>
          <textarea
            value={events.pastNotes}
            onChange={(e) => {
              const v = { ...events, pastNotes: e.target.value };
              setEvents(v);
              schedule(v);
            }}
            rows={10}
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
        <button
          type="button"
          onClick={() => generateInsight()}
          disabled={generating}
          className="rounded-xl bg-[#b8ff6c] px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
        >
          {generating ? "Generating…" : "AI assist (append insight)"}
        </button>
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
