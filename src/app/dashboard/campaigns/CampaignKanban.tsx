"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type ColumnKey = "planning" | "in-progress" | "in-review" | "live";
type Card = { id: string; title: string; tags: string[] };

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

const MODULE = "campaigns";
const KEY = "kanban";

export function CampaignKanban({ environmentId }: { environmentId: string }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [board, setBoard] = useState<Record<ColumnKey, Card[]>>(() => emptyBoard());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    const v = data?.value_json as { columns?: Record<ColumnKey, Card[]> } | null;
    if (v?.columns && typeof v.columns === "object") {
      const next = emptyBoard();
      for (const k of Object.keys(next) as ColumnKey[]) {
        if (Array.isArray(v.columns[k])) next[k] = v.columns[k] as Card[];
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
    schedulePersist(next);
  }

  return (
    <div className="space-y-3">
      {loading ? <div className="text-sm text-[#9090b0]">Loading board…</div> : null}
      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}
      <p className="text-xs text-[#9090b0]">
        Drag cards between columns. {saving ? "Saving…" : "Synced to your product environment."}
      </p>
      <div className="grid gap-4 lg:grid-cols-4">
        {columns.map((col) => (
          <div
            key={col.key}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const id = e.dataTransfer.getData("text/plain");
              if (id) onDrop(col.key, id);
            }}
            className="min-h-[360px] rounded-2xl border border-[#2a2e3f] bg-[#141420] p-3"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="text-sm text-[#f0f0f8]">
                {col.label}{" "}
                <span className="text-[#9090b0]">({board[col.key].length})</span>
              </div>
              <button
                type="button"
                onClick={() => addCard(col.key)}
                className="rounded-lg border border-[#2a2e3f] px-2 py-0.5 text-[11px] text-[#f0f0f8] hover:bg-white/5"
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
                  className="cursor-move rounded-xl border border-[#2a2e3f] bg-[#1e1e2e] p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm text-[#f0f0f8]">{card.title}</div>
                    <button
                      type="button"
                      onClick={() => removeCard(card.id)}
                      className="shrink-0 text-[11px] text-[#9090b0] hover:text-red-300"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {card.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-full border border-[#2a2e3f] px-2 py-0.5 text-[11px] text-[#9090b0]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
