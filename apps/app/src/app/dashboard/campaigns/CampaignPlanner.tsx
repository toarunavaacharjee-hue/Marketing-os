"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { AiProgressBar, AI_PROGRESS_ESTIMATE } from "@/app/dashboard/_components/AiProgressBar";
import {
  buildCampaignNarrativePrompt,
  CAMPAIGN_NARRATIVE_SYSTEM
} from "@/lib/pmmPrompts";

type ColumnKey = "planning" | "in-progress" | "in-review" | "live";
type Card = {
  id: string;
  title: string;
  tags: string[];
  campaignNarrative?: string;
  campaignSegment?: string;
  campaignSeason?: string;
  campaignTension?: string;
};

const columns: { key: ColumnKey; label: string }[] = [
  { key: "planning", label: "Planning" },
  { key: "in-progress", label: "In Progress" },
  { key: "in-review", label: "In Review" },
  { key: "live", label: "Live" }
];

const emptyBoard = (): Record<ColumnKey, Card[]> => ({
  planning: [],
  "in-progress": [],
  "in-review": [],
  live: []
});

function normalizeCard(raw: unknown): Card | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : "";
  const title = typeof o.title === "string" ? o.title : "";
  if (!id || !title) return null;
  const tags = Array.isArray(o.tags) ? o.tags.filter((t): t is string => typeof t === "string") : [];
  return {
    id,
    title,
    tags: tags.length ? tags : ["General"],
    campaignNarrative: typeof o.campaignNarrative === "string" ? o.campaignNarrative : undefined,
    campaignSegment: typeof o.campaignSegment === "string" ? o.campaignSegment : undefined,
    campaignSeason: typeof o.campaignSeason === "string" ? o.campaignSeason : undefined,
    campaignTension: typeof o.campaignTension === "string" ? o.campaignTension : undefined
  };
}

const MODULE = "campaigns";
const KEY = "kanban";

export function CampaignPlanner({
  environmentId,
  productName = ""
}: {
  environmentId: string;
  productName?: string;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [board, setBoard] = useState<Record<ColumnKey, Card[]>>(() => emptyBoard());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [modalCardId, setModalCardId] = useState<string | null>(null);
  const [modalProduct, setModalProduct] = useState("");
  const [modalSegment, setModalSegment] = useState("");
  const [modalSeason, setModalSeason] = useState("");
  const [modalTension, setModalTension] = useState("");
  const [modalNarrative, setModalNarrative] = useState("");
  const [generating, setGenerating] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: qErr } = await supabase
      .from("module_settings")
      .select("value_json")
      .eq("environment_id", environmentId)
      .eq("module", MODULE)
      .eq("key", KEY)
      .maybeSingle();
    if (qErr) setError(qErr.message);
    const v = data?.value_json as { columns?: Record<string, unknown[]> } | null;
    if (v?.columns && typeof v.columns === "object") {
      const next = emptyBoard();
      for (const k of Object.keys(next) as ColumnKey[]) {
        const arr = v.columns[k];
        if (!Array.isArray(arr)) continue;
        next[k] = arr.map((c) => normalizeCard(c)).filter(Boolean) as Card[];
      }
      setBoard(next);
    } else {
      setBoard(emptyBoard());
    }
    setLoading(false);
  }, [environmentId, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const persist = useCallback(
    async (next: Record<ColumnKey, Card[]>) => {
      setSaving(true);
      setError(null);
      const { error: upErr } = await supabase.from("module_settings").upsert({
        environment_id: environmentId,
        module: MODULE,
        key: KEY,
        value_json: { columns: next }
      });
      setSaving(false);
      if (upErr) setError(upErr.message);
    },
    [environmentId, supabase]
  );

  function schedulePersist(next: Record<ColumnKey, Card[]>) {
    setBoard(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void persist(next), 400);
  }

  function onDrop(target: ColumnKey, cardId: string) {
    let moved: Card | null = null;
    const next = { ...board };
    (Object.keys(next) as ColumnKey[]).forEach((k) => {
      next[k] = next[k].filter((c) => {
        if (c.id === cardId) moved = c;
        return c.id !== cardId;
      });
    });
    if (moved) next[target] = [...next[target], moved];
    schedulePersist(next);
  }

  function addCard(column: ColumnKey) {
    const title = window.prompt("Campaign title");
    if (!title?.trim()) return;
    const tagsRaw = window.prompt("Tags (comma-separated)", "GTM, Ops");
    const tags = (tagsRaw ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const card: Card = { id: crypto.randomUUID(), title: title.trim(), tags: tags.length ? tags : ["General"] };
    schedulePersist({ ...board, [column]: [...board[column], card] });
  }

  function removeCard(cardId: string) {
    const next = { ...board };
    (Object.keys(next) as ColumnKey[]).forEach((k) => {
      next[k] = next[k].filter((c) => c.id !== cardId);
    });
    if (modalCardId === cardId) setModalCardId(null);
    schedulePersist(next);
  }

  function findCard(cardId: string): Card | null {
    for (const k of Object.keys(board) as ColumnKey[]) {
      const c = board[k].find((x) => x.id === cardId);
      if (c) return c;
    }
    return null;
  }

  function openBrief(cardId: string) {
    const c = findCard(cardId);
    if (!c) return;
    setModalCardId(cardId);
    setModalProduct((productName || c.title).trim());
    setModalSegment(c.campaignSegment ?? "");
    setModalSeason(c.campaignSeason ?? "");
    setModalTension(c.campaignTension ?? "");
    setModalNarrative(c.campaignNarrative ?? "");
    setModalError(null);
  }

  function updateCardById(
    cardId: string,
    patch: Partial<
      Pick<Card, "campaignNarrative" | "campaignSegment" | "campaignSeason" | "campaignTension">
    >
  ) {
    const next = { ...board };
    (Object.keys(next) as ColumnKey[]).forEach((k) => {
      next[k] = next[k].map((c) => (c.id === cardId ? { ...c, ...patch } : c));
    });
    schedulePersist(next);
  }

  function closeModal() {
    setModalCardId(null);
    setModalError(null);
    setGenerating(false);
  }

  async function generateNarrative() {
    if (!modalCardId) return;
    setGenerating(true);
    setModalError(null);
    const prompt = buildCampaignNarrativePrompt({
      productOrFeature: modalProduct.trim() || findCard(modalCardId)?.title || "Product",
      segment: modalSegment.trim() || "Primary ICP",
      seasonOrMoment: modalSeason.trim() || "This quarter",
      tension: modalTension.trim() || undefined
    });
    try {
      const res = await fetch("/api/ai/module-generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt,
          system: CAMPAIGN_NARRATIVE_SYSTEM,
          length: "medium"
        })
      });
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Generation failed.");
      setModalNarrative(data.text ?? "");
    } catch (e) {
      setModalError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  function saveModal() {
    if (!modalCardId) return;
    updateCardById(modalCardId, {
      campaignNarrative: modalNarrative,
      campaignSegment: modalSegment,
      campaignSeason: modalSeason,
      campaignTension: modalTension
    });
    closeModal();
  }

  useEffect(() => {
    if (!modalCardId) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeModal();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalCardId]);

  const modalOpen = Boolean(modalCardId);

  return (
    <div className="space-y-3">
      {loading ? <div className="text-sm text-text2">Loading board…</div> : null}
      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red">
          {error}
        </div>
      ) : null}
      <p className="text-xs text-text2">
        Drag cards between columns. Open <span className="font-medium text-text">Campaign narrative</span> to draft a
        theme, hero message, and formats — saved on the card. {saving ? "Saving…" : "Synced to your product environment."}
      </p>

      <AiProgressBar
        active={generating}
        variant="dark"
        title="Generating campaign narrative…"
        estimate={AI_PROGRESS_ESTIMATE.short}
        durationMs={50_000}
      />

      <div className="grid gap-4 lg:grid-cols-4">
        {columns.map((col) => (
          <div
            key={col.key}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const id = e.dataTransfer.getData("text/plain");
              if (id) onDrop(col.key, id);
            }}
            className="min-h-[360px] rounded-2xl border border-border bg-surface p-3 shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="text-sm font-medium text-text">
                {col.label}{" "}
                <span className="text-text2">({board[col.key].length})</span>
              </div>
              <button
                type="button"
                onClick={() => addCard(col.key)}
                className="rounded-lg border border-border bg-surface2 px-2 py-0.5 text-[11px] font-semibold text-text hover:bg-surface3"
              >
                + Add
              </button>
            </div>
            <div className="space-y-2">
              {board[col.key].map((card) => (
                <div
                  key={card.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", card.id)}
                  className="cursor-move rounded-xl border border-border bg-surface2 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-medium text-text">{card.title}</div>
                    <button
                      type="button"
                      onClick={() => removeCard(card.id)}
                      className="shrink-0 text-[11px] text-text2 hover:text-red"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {card.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-full border border-border bg-bg px-2 py-0.5 text-[11px] text-text2"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openBrief(card.id)}
                      className="rounded-lg border border-primary/40 bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/20"
                    >
                      Campaign narrative
                    </button>
                    {card.campaignNarrative?.trim() ? (
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-300">Brief saved</span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {modalOpen && modalCardId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="campaign-narrative-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface p-4 shadow-xl">
            <h2 id="campaign-narrative-title" className="text-lg font-semibold text-heading">
              Campaign narrative
            </h2>
            <p className="mt-1 text-xs text-text2">
              Theme, hero message, and three formats. Uses your product name when set; edit fields then generate.
            </p>

            {modalError ? (
              <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red">
                {modalError}
              </div>
            ) : null}

            <div className="mt-4 space-y-2">
              <label className="block text-xs text-text2">Product or feature</label>
              <input
                value={modalProduct}
                onChange={(e) => setModalProduct(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface2 px-3 py-2 text-sm text-heading"
              />
              <label className="block text-xs text-text2">Target segment</label>
              <input
                value={modalSegment}
                onChange={(e) => setModalSegment(e.target.value)}
                placeholder="e.g. Series B SaaS marketing leaders"
                className="w-full rounded-xl border border-border bg-surface2 px-3 py-2 text-sm text-heading placeholder:text-text3"
              />
              <label className="block text-xs text-text2">Season or moment</label>
              <input
                value={modalSeason}
                onChange={(e) => setModalSeason(e.target.value)}
                placeholder="e.g. Q1 planning, post-earnings, conference week"
                className="w-full rounded-xl border border-border bg-surface2 px-3 py-2 text-sm text-heading placeholder:text-text3"
              />
              <label className="block text-xs text-text2">Market tension (optional)</label>
              <input
                value={modalTension}
                onChange={(e) => setModalTension(e.target.value)}
                placeholder="e.g. noisy category, budget scrutiny"
                className="w-full rounded-xl border border-border bg-surface2 px-3 py-2 text-sm text-heading placeholder:text-text3"
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void generateNarrative()}
                disabled={generating}
                className="rounded-xl bg-amber px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
              >
                {generating ? "Generating…" : "Generate"}
              </button>
            </div>

            <label className="mt-4 block text-xs text-text2">Narrative</label>
            <textarea
              value={modalNarrative}
              onChange={(e) => setModalNarrative(e.target.value)}
              rows={12}
              className="mt-1 w-full rounded-xl border border-border bg-surface2 p-3 text-sm text-heading"
              placeholder="Generated text appears here. Edit as needed."
            />

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl border border-border bg-surface2 px-4 py-2 text-sm text-heading hover:bg-surface3"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveModal}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
              >
                Save to card
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
