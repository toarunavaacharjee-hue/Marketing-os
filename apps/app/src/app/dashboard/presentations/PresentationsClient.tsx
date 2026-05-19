"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AiProgressBar, AI_PROGRESS_ESTIMATE } from "@/app/dashboard/_components/AiProgressBar";
import { NextStepNudge } from "@/app/dashboard/_components/NextStepNudge";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

// ─── Types ────────────────────────────────────────────────────────────────────

type DeckType =
  | "sales"
  | "investor"
  | "product-demo"
  | "board-update"
  | "onboarding"
  | "webinar"
  | "internal"
  | "other";

type DeckStatus = "outline" | "in-progress" | "in-review" | "approved" | "delivered";

type Deck = {
  id: string;
  title: string;
  deckType: DeckType;
  audience: string;
  status: DeckStatus;
  slideCount: string;
  dueDate: string;
  presentationDate: string;
  presenter: string;
  deckUrl: string;
  outline: string;
  notes: string;
  createdAt: string;
};

type AiHistoryEntry = { id: string; at: string; prompt: string; text: string };

type Workspace = {
  decks: Deck[];
  talkTrackNotes: string;
  prompt: string;
  lastOutput: string;
  aiHistory: AiHistoryEntry[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

const DECK_TYPES: { id: DeckType; label: string; slideHint: string }[] = [
  { id: "sales", label: "Sales deck", slideHint: "10–15 slides" },
  { id: "investor", label: "Investor pitch", slideHint: "10–12 slides" },
  { id: "product-demo", label: "Product demo", slideHint: "8–12 slides" },
  { id: "board-update", label: "Board update", slideHint: "12–20 slides" },
  { id: "onboarding", label: "Customer onboarding", slideHint: "8–15 slides" },
  { id: "webinar", label: "Webinar / event", slideHint: "20–30 slides" },
  { id: "internal", label: "Internal / all-hands", slideHint: "10–20 slides" },
  { id: "other", label: "Other", slideHint: "" },
];

const STATUS_CONFIG: Record<DeckStatus, { label: string; style: string }> = {
  outline: { label: "Outline", style: "border-border bg-surface2 text-text2" },
  "in-progress": { label: "In progress", style: "border-primary/30 bg-primary/10 text-primary" },
  "in-review": { label: "In review", style: "border-yellow-500/30 bg-yellow-500/10 text-yellow-700" },
  approved: { label: "Approved", style: "border-teal/30 bg-teal/10 text-teal" },
  delivered: { label: "Delivered", style: "border-teal/50 bg-teal/15 text-teal font-semibold" },
};

const STATUS_ORDER: DeckStatus[] = ["outline", "in-progress", "in-review", "approved", "delivered"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function deckTypeLabel(id: DeckType) {
  return DECK_TYPES.find((t) => t.id === id)?.label ?? "Other";
}

function emptyDeck(): Deck {
  return {
    id: crypto.randomUUID(),
    title: "",
    deckType: "sales",
    audience: "",
    status: "outline",
    slideCount: "",
    dueDate: "",
    presentationDate: "",
    presenter: "",
    deckUrl: "",
    outline: "",
    notes: "",
    createdAt: new Date().toISOString(),
  };
}

function emptyWorkspace(): Workspace {
  return { decks: [], talkTrackNotes: "", prompt: "", lastOutput: "", aiHistory: [] };
}

function migrateDeck(raw: unknown): Deck {
  const base = emptyDeck();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  const validTypes = DECK_TYPES.map((t) => t.id);
  return {
    id: String(o.id || crypto.randomUUID()),
    title: String(o.title ?? ""),
    deckType: (validTypes.includes(String(o.deckType) as DeckType) ? o.deckType : "other") as DeckType,
    audience: String(o.audience ?? ""),
    status: (STATUS_ORDER.includes(String(o.status) as DeckStatus) ? o.status : "outline") as DeckStatus,
    slideCount: String(o.slideCount ?? ""),
    dueDate: String(o.dueDate ?? ""),
    presentationDate: String(o.presentationDate ?? ""),
    presenter: String(o.presenter ?? ""),
    deckUrl: String(o.deckUrl ?? ""),
    outline: String(o.outline ?? ""),
    notes: String(o.notes ?? ""),
    createdAt: String(o.createdAt ?? new Date().toISOString()),
  };
}

function migrateWorkspace(v: unknown): Workspace {
  const base = emptyWorkspace();
  if (!v || typeof v !== "object") return base;
  const o = v as Record<string, unknown>;
  return {
    decks: Array.isArray(o.decks) ? o.decks.map(migrateDeck) : [],
    talkTrackNotes: typeof o.talkTrackNotes === "string" ? o.talkTrackNotes : "",
    prompt: typeof o.prompt === "string" ? o.prompt : "",
    lastOutput: typeof o.lastOutput === "string" ? o.lastOutput : "",
    aiHistory: Array.isArray(o.aiHistory)
      ? (o.aiHistory as unknown[])
          .filter((h): h is AiHistoryEntry => !!h && typeof h === "object" && "text" in h)
          .slice(0, 20)
      : [],
  };
}

function safeHref(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  if (/^[\w.-]+\.[a-z]{2,}/i.test(t)) return `https://${t}`;
  return null;
}

// ─── DeckCard ─────────────────────────────────────────────────────────────────

function DeckCard({
  deck,
  expanded,
  onToggle,
  onChange,
  onRemove,
}: {
  deck: Deck;
  expanded: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<Deck>) => void;
  onRemove: () => void;
}) {
  const statusCfg = STATUS_CONFIG[deck.status];

  return (
    <div
      className={`rounded-2xl border bg-surface shadow-sm transition-shadow ${
        expanded ? "border-primary/40 shadow-md" : "border-border hover:border-primary/20"
      }`}
    >
      {/* Collapsed header */}
      <button type="button" onClick={onToggle} className="flex w-full items-start gap-3 px-4 py-3 text-left">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded border border-border bg-surface2 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-text3">
              {deckTypeLabel(deck.deckType)}
            </span>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${statusCfg.style}`}>
              {statusCfg.label}
            </span>
            {deck.slideCount ? (
              <span className="text-[10px] text-text3">{deck.slideCount} slides</span>
            ) : null}
            {deck.presentationDate ? (
              <span className="rounded-full bg-amber/10 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                Presenting {new Date(deck.presentationDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
            ) : null}
          </div>
          <p className="text-sm font-medium text-text">
            {deck.title.trim() || <span className="font-normal italic text-text3">Untitled deck</span>}
          </p>
          {deck.audience ? <p className="text-xs text-text2">Audience: {deck.audience}</p> : null}
        </div>
        <span className="mt-0.5 shrink-0 text-xs text-text3">{expanded ? "▲" : "▼"}</span>
      </button>

      {/* Expanded form */}
      {expanded ? (
        <div className="space-y-3 border-t border-border px-4 pb-4 pt-3">
          {/* Title + type */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text3">Deck title</div>
              <input
                value={deck.title}
                onChange={(e) => onChange({ title: e.target.value })}
                placeholder="e.g. Q3 Sales Deck — Enterprise"
                className="w-full rounded-lg border border-border bg-surface2 px-2 py-1.5 text-sm text-heading placeholder:text-text3 focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text3">Deck type</div>
              <select
                value={deck.deckType}
                onChange={(e) => onChange({ deckType: e.target.value as DeckType })}
                className="w-full rounded-lg border border-border bg-surface2 px-2 py-1.5 text-sm text-heading"
              >
                {DECK_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Status + slides + due + presenter */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text3">Status</div>
              <select
                value={deck.status}
                onChange={(e) => onChange({ status: e.target.value as DeckStatus })}
                className="w-full rounded-lg border border-border bg-surface2 px-2 py-1.5 text-sm text-heading"
              >
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text3">Slide count</div>
              <input
                value={deck.slideCount}
                onChange={(e) => onChange({ slideCount: e.target.value })}
                placeholder={DECK_TYPES.find((t) => t.id === deck.deckType)?.slideHint ?? "e.g. 12"}
                className="w-full rounded-lg border border-border bg-surface2 px-2 py-1.5 text-sm text-heading placeholder:text-text3"
              />
            </div>
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text3">Due date</div>
              <input
                type="date"
                value={deck.dueDate}
                onChange={(e) => onChange({ dueDate: e.target.value })}
                className="w-full rounded-lg border border-border bg-surface2 px-2 py-1.5 text-sm text-heading"
              />
            </div>
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text3">Presenter</div>
              <input
                value={deck.presenter}
                onChange={(e) => onChange({ presenter: e.target.value })}
                placeholder="Name or email"
                className="w-full rounded-lg border border-border bg-surface2 px-2 py-1.5 text-sm text-heading placeholder:text-text3"
              />
            </div>
          </div>

          {/* Audience + presentation date */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text3">Audience / segment</div>
              <input
                value={deck.audience}
                onChange={(e) => onChange({ audience: e.target.value })}
                placeholder="e.g. Enterprise VPs, Series B investors"
                className="w-full rounded-lg border border-border bg-surface2 px-2 py-1.5 text-sm text-heading placeholder:text-text3"
              />
            </div>
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text3">Presentation date</div>
              <input
                type="datetime-local"
                value={deck.presentationDate}
                onChange={(e) => onChange({ presentationDate: e.target.value })}
                className="w-full rounded-lg border border-border bg-surface2 px-2 py-1.5 text-sm text-heading"
              />
            </div>
          </div>

          {/* Deck link */}
          <div>
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text3">Deck link</div>
            <div className="flex gap-1.5">
              <input
                value={deck.deckUrl}
                onChange={(e) => onChange({ deckUrl: e.target.value })}
                placeholder="Google Slides, Canva, PowerPoint, Pitch…"
                className="min-w-0 flex-1 rounded-lg border border-border bg-surface2 px-2 py-1.5 text-sm text-heading placeholder:text-text3"
              />
              {safeHref(deck.deckUrl) ? (
                <a
                  href={safeHref(deck.deckUrl)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-lg border border-primary/30 bg-primary/8 px-3 py-1.5 text-xs font-medium text-primary"
                >
                  Open →
                </a>
              ) : null}
            </div>
          </div>

          {/* Slide outline */}
          <div>
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text3">Slide outline</div>
            <textarea
              value={deck.outline}
              onChange={(e) => onChange({ outline: e.target.value })}
              rows={6}
              placeholder={`1. Title slide\n2. Problem / pain\n3. Market opportunity\n4. Solution\n5. How it works\n6. Social proof\n7. Pricing\n8. Call to action`}
              className="w-full rounded-xl border border-border bg-surface2 px-3 py-2.5 text-sm text-heading placeholder:text-text3 focus:border-primary focus:outline-none"
            />
          </div>

          {/* Notes */}
          <div>
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text3">Notes</div>
            <textarea
              value={deck.notes}
              onChange={(e) => onChange({ notes: e.target.value })}
              rows={2}
              placeholder="Key objections to cover, Q&A prep, follow-up actions…"
              className="w-full rounded-xl border border-border bg-surface2 px-3 py-2 text-sm text-heading placeholder:text-text3"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <button type="button" onClick={onRemove} className="text-xs text-text3 hover:text-red">
              Remove deck
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function PresentationsClient({ environmentId }: { environmentId: string }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const searchParams = useSearchParams();
  const qTopic = searchParams.get("topic") ?? "";
  const qProduct = searchParams.get("product") ?? "";
  const qSegment = searchParams.get("segment") ?? "";
  const qFrom = searchParams.get("from") ?? "";

  const [ws, setWs] = useState<Workspace>(() => emptyWorkspace());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<DeckStatus | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [strategyContext, setStrategyContext] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefilledRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: qErr } = await supabase
      .from("module_settings")
      .select("value_json")
      .eq("environment_id", environmentId)
      .eq("module", "presentations")
      .eq("key", "workspace")
      .maybeSingle();
    if (qErr) setError(qErr.message);
    const migrated = migrateWorkspace((data?.value_json ?? null) as unknown);
    if (!prefilledRef.current && qTopic && !migrated.prompt.trim()) {
      prefilledRef.current = true;
      const parts = [qTopic];
      if (qProduct) parts.push(`Product: ${qProduct}`);
      if (qSegment) parts.push(`Target audience: ${qSegment}`);
      migrated.prompt = parts.join("\n");
    }
    setWs(migrated);
    setLoading(false);
  }, [environmentId, supabase, qTopic, qProduct, qSegment]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let cancelled = false;
    async function loadCtx() {
      try {
        const [{ data: canvasRow }, { data: segs }, { data: pillarsRow }] = await Promise.all([
          supabase.from("module_settings").select("value_json").eq("environment_id", environmentId).eq("module", "positioning_studio").eq("key", "canvas").maybeSingle(),
          supabase.from("segments").select("name,pain_points").eq("environment_id", environmentId).order("created_at", { ascending: false }).limit(3),
          supabase.from("module_settings").select("value_json").eq("environment_id", environmentId).eq("module", "messaging_artifacts").eq("key", "pillars").maybeSingle(),
        ]);
        if (cancelled) return;
        const parts: string[] = [];
        const doc = (canvasRow?.value_json as { doc?: Record<string, string> } | null)?.doc;
        if (doc) {
          const lines: string[] = [];
          if (doc.category) lines.push(`Market category: ${doc.category}`);
          if (doc.target) lines.push(`Target customer: ${doc.target}`);
          if (doc.problem) lines.push(`Core problem: ${doc.problem}`);
          if (doc.solution) lines.push(`Solution: ${doc.solution}`);
          if (doc.diff) lines.push(`Differentiation: ${doc.diff}`);
          if (lines.length) parts.push(`Approved positioning:\n${lines.join("\n")}`);
        }
        const segList = (segs ?? []) as { name: string; pain_points?: string[] }[];
        if (segList.length) parts.push(`ICP segments: ${segList.map((s) => s.name).join(", ")}`);
        const pillars = (pillarsRow?.value_json as { pillars?: { headline?: string }[] } | null)?.pillars ?? [];
        const headlines = pillars.map((p) => p.headline).filter(Boolean).slice(0, 3);
        if (headlines.length) parts.push(`Key messaging pillars:\n${headlines.map((h) => `  - ${h}`).join("\n")}`);
        setStrategyContext(parts.length ? `\n\n---\n${parts.join("\n\n")}\n---` : "");
      } catch { /* non-critical */ }
    }
    void loadCtx();
    return () => { cancelled = true; };
  }, [environmentId, supabase]);

  const persist = useCallback(async (next: Workspace) => {
    setSaving(true);
    const { error: upErr } = await supabase.from("module_settings").upsert({
      environment_id: environmentId,
      module: "presentations",
      key: "workspace",
      value_json: next,
    });
    setSaving(false);
    if (upErr) setError(upErr.message);
  }, [environmentId, supabase]);

  function scheduleSave(next: Workspace) {
    setWs(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void persist(next), 450);
  }

  async function generate() {
    if (!ws.prompt.trim()) { setError("Describe the deck first."); return; }
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/module-generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt: ws.prompt,
          system: `You are a B2B presentation strategist. Generate a detailed slide-by-slide outline with: slide number, title, 1-sentence key message, bullet points (3 max), and a brief speaker note or talk track hint. Format clearly so it can be pasted directly into a deck tool. Use the product positioning and ICP context below to make it specific and compelling.${strategyContext}`,
        }),
      });
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Generation failed.");
      const text = data.text ?? "";
      const entry: AiHistoryEntry = { id: crypto.randomUUID(), at: new Date().toISOString(), prompt: ws.prompt, text };
      scheduleSave({ ...ws, lastOutput: text, aiHistory: [entry, ...ws.aiHistory].slice(0, 20) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  function addDeckFromOutput() {
    if (!ws.lastOutput.trim()) return;
    const deck: Deck = { ...emptyDeck(), title: ws.prompt.trim().slice(0, 60), outline: ws.lastOutput.trim() };
    const next = { ...ws, decks: [deck, ...ws.decks] };
    scheduleSave(next);
    setExpandedId(deck.id);
  }

  function addBlankDeck() {
    const deck = emptyDeck();
    const next = { ...ws, decks: [deck, ...ws.decks] };
    scheduleSave(next);
    setExpandedId(deck.id);
  }

  function updateDeck(id: string, patch: Partial<Deck>) {
    scheduleSave({ ...ws, decks: ws.decks.map((d) => (d.id === id ? { ...d, ...patch } : d)) });
  }

  function removeDeck(id: string) {
    scheduleSave({ ...ws, decks: ws.decks.filter((d) => d.id !== id) });
    if (expandedId === id) setExpandedId(null);
  }

  const filteredDecks = statusFilter === "all" ? ws.decks : ws.decks.filter((d) => d.status === statusFilter);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of ws.decks) counts[d.status] = (counts[d.status] ?? 0) + 1;
    return counts;
  }, [ws.decks]);

  const activeStatuses = STATUS_ORDER.filter((s) => (statusCounts[s] ?? 0) > 0);

  // Upcoming presentations (sorted by presentationDate)
  const upcoming = useMemo(() =>
    ws.decks
      .filter((d) => d.presentationDate && new Date(d.presentationDate) >= new Date())
      .sort((a, b) => new Date(a.presentationDate).getTime() - new Date(b.presentationDate).getTime())
      .slice(0, 5),
    [ws.decks]
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-3xl text-text" style={{ fontFamily: "var(--font-heading)" }}>Presentations</h1>
        <p className="mt-1 text-sm text-text2">
          Track decks, manage slide outlines, and generate talk tracks with AI.
        </p>
        {loading ? (
          <p className="mt-2 text-sm text-text2">Loading…</p>
        ) : (
          <p className="mt-2 text-xs text-text3">{saving ? "Saving…" : "Saved to this product environment."}</p>
        )}
      </div>

      {error ? <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red">{error}</div> : null}

      {qFrom ? (
        <div className="flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/8 px-4 py-2.5 text-sm">
          <span className="text-primary">←</span>
          <span className="text-text2">
            Context from <span className="font-semibold text-text">{qFrom}</span>
            {qProduct ? <> — <span className="font-medium text-text">{qProduct}</span></> : null}
            {qSegment ? <span className="text-text3"> · {qSegment}</span> : null}
          </span>
        </div>
      ) : null}

      {/* Upcoming presentations banner */}
      {upcoming.length > 0 ? (
        <div className="rounded-2xl border border-amber/30 bg-amber/8 p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-700">Upcoming presentations</div>
          <div className="flex flex-wrap gap-3">
            {upcoming.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => { setExpandedId(d.id); setStatusFilter("all"); }}
                className="flex items-center gap-2 rounded-xl border border-amber/30 bg-surface px-3 py-2 text-left text-sm shadow-sm hover:border-amber/50"
              >
                <span className="font-medium text-text">{d.title || "Untitled deck"}</span>
                <span className="text-xs text-amber-700">
                  {new Date(d.presentationDate).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <AiProgressBar active={generating} variant="dark" title="Generating slide outline…" estimate={AI_PROGRESS_ESTIMATE.short} durationMs={50_000} />

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left: Deck tracker */}
        <div className="space-y-4 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${statusFilter === "all" ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface2 text-text2 hover:border-primary/30"}`}
              >
                All{ws.decks.length > 0 ? ` (${ws.decks.length})` : ""}
              </button>
              {activeStatuses.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${statusFilter === s ? STATUS_CONFIG[s].style : "border-border bg-surface2 text-text2 hover:border-primary/30"}`}
                >
                  {STATUS_CONFIG[s].label} ({statusCounts[s]})
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={addBlankDeck}
              className="rounded-xl border border-border bg-surface2 px-3 py-1.5 text-xs font-semibold text-text hover:bg-surface3"
            >
              + New deck
            </button>
          </div>

          {filteredDecks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
              <div className="text-sm font-medium text-text2">No decks yet</div>
              <div className="mt-1 text-xs text-text3">
                Generate a slide outline with AI or click{" "}
                <span className="font-medium text-text">+ New deck</span> to start tracking.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDecks.map((deck) => (
                <DeckCard
                  key={deck.id}
                  deck={deck}
                  expanded={expandedId === deck.id}
                  onToggle={() => setExpandedId(expandedId === deck.id ? null : deck.id)}
                  onChange={(patch) => updateDeck(deck.id, patch)}
                  onRemove={() => removeDeck(deck.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: AI outline generator */}
        <div className="space-y-3">
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
            <div className="text-sm font-semibold text-heading">AI slide outline</div>
            <p className="mt-1 text-xs text-text3">
              Describe the deck — AI generates a slide-by-slide outline with talk track hints.
            </p>

            <textarea
              value={ws.prompt}
              onChange={(e) => scheduleSave({ ...ws, prompt: e.target.value })}
              rows={4}
              className="mt-3 w-full rounded-xl border border-border bg-surface2 px-3 py-2.5 text-sm text-heading placeholder:text-text3 focus:border-primary focus:outline-none"
              placeholder="e.g. 12-slide board update: GTM efficiency, pipeline, next 2 quarters; audience: board + investors"
            />

            <button
              type="button"
              onClick={() => void generate()}
              disabled={generating}
              className="mt-2 w-full rounded-xl bg-amber p-2.5 text-sm font-semibold text-black hover:bg-amber/90 disabled:opacity-50"
            >
              {generating ? "Generating…" : "Generate outline"}
            </button>

            {strategyContext ? (
              <div className="mt-2 flex items-center gap-1.5 text-[10px] text-text3">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-teal" />
                Positioning, ICP &amp; messaging context injected
              </div>
            ) : null}

            {ws.lastOutput ? (
              <div className="mt-3 space-y-2 rounded-xl border border-border bg-surface2 p-3">
                <div className="text-[10px] font-medium uppercase tracking-wide text-text3">Generated outline</div>
                <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap font-sans text-xs leading-relaxed text-heading">
                  {ws.lastOutput}
                </pre>
                <button
                  type="button"
                  onClick={addDeckFromOutput}
                  className="w-full rounded-lg border border-primary/30 bg-primary/8 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/15"
                >
                  Add to deck tracker →
                </button>
              </div>
            ) : null}

            {ws.aiHistory.length > 0 ? (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-medium text-text2 hover:text-text">
                  History ({ws.aiHistory.length})
                </summary>
                <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto">
                  {ws.aiHistory.map((h) => (
                    <li key={h.id} className="rounded-lg border border-border bg-surface p-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] text-text3">{new Date(h.at).toLocaleDateString()}</span>
                        <button
                          type="button"
                          onClick={() => scheduleSave({ ...ws, lastOutput: h.text, prompt: h.prompt })}
                          className="text-[10px] text-primary hover:underline"
                        >
                          Restore
                        </button>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-text2">{h.prompt}</p>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
        </div>
      </div>

      {/* Talk track notes */}
      <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <div className="mb-2 text-sm font-semibold text-heading">Talk track &amp; Q&amp;A notes</div>
        <textarea
          value={ws.talkTrackNotes}
          onChange={(e) => scheduleSave({ ...ws, talkTrackNotes: e.target.value })}
          rows={4}
          className="w-full rounded-xl border border-border bg-surface2 px-3 py-2.5 text-sm text-heading placeholder:text-text3"
          placeholder={`Common objections and responses\nKey proof points to hit\nDemo flow notes\nFollow-up actions after the presentation`}
        />
      </div>

      <NextStepNudge />
    </div>
  );
}
