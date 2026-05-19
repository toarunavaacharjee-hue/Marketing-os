"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { EmptyState } from "@/app/dashboard/_components/EmptyState";
import { SkeletonKanban } from "@/app/dashboard/_components/Skeleton";
import { useToast } from "@/app/dashboard/_components/Toast";
import { AiProgressBar, AI_PROGRESS_ESTIMATE } from "@/app/dashboard/_components/AiProgressBar";
import {
  buildCampaignNarrativePrompt,
  CAMPAIGN_NARRATIVE_SYSTEM,
  buildEmailSinglePrompt,
  buildEmailSequencePrompt,
  buildLinkedInCompanyPrompt,
  buildLinkedInPersonalPrompt,
  buildMetaAdPrompt,
  buildBlogOutlinePrompt,
  buildCreativeBriefPrompt,
  CHANNEL_ASSET_SYSTEM,
  type ChannelAssetInput
} from "@/lib/pmmPrompts";

type ColumnKey = "planning" | "in-progress" | "in-review" | "live";

type ChannelKey =
  | "email_single"
  | "email_sequence"
  | "linkedin_company"
  | "linkedin_personal"
  | "meta_ad"
  | "blog_outline"
  | "creative_brief";

const CHANNEL_LABELS: Record<ChannelKey, string> = {
  email_single: "Email (single)",
  email_sequence: "Email sequence (3-part)",
  linkedin_company: "LinkedIn company post",
  linkedin_personal: "LinkedIn personal post",
  meta_ad: "Meta / Facebook ad",
  blog_outline: "Blog outline",
  creative_brief: "Creative brief"
};

const ALL_CHANNELS: ChannelKey[] = [
  "email_single",
  "email_sequence",
  "linkedin_company",
  "linkedin_personal",
  "meta_ad",
  "blog_outline",
  "creative_brief"
];

type ChannelAsset = { content: string; approved: boolean };

type Card = {
  id: string;
  title: string;
  tags: string[];
  campaignProduct?: string;
  campaignSegment?: string;
  campaignSeason?: string;
  campaignTension?: string;
  campaignNarrative?: string;
  campaignTheme?: string;
  heroMessage?: string;
  channels: ChannelKey[];
  assets: Partial<Record<ChannelKey, ChannelAsset>>;
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
  const tags = Array.isArray(o.tags)
    ? o.tags.filter((t): t is string => typeof t === "string")
    : [];
  const channels = Array.isArray(o.channels)
    ? o.channels.filter((c): c is ChannelKey => ALL_CHANNELS.includes(c as ChannelKey))
    : [];
  const assetsRaw =
    o.assets && typeof o.assets === "object" ? (o.assets as Record<string, unknown>) : {};
  const assets: Partial<Record<ChannelKey, ChannelAsset>> = {};
  for (const k of ALL_CHANNELS) {
    const a = assetsRaw[k];
    if (a && typeof a === "object") {
      const ao = a as Record<string, unknown>;
      assets[k] = {
        content: typeof ao.content === "string" ? ao.content : "",
        approved: Boolean(ao.approved)
      };
    }
  }
  return {
    id,
    title,
    tags: tags.length ? tags : ["General"],
    campaignProduct: typeof o.campaignProduct === "string" ? o.campaignProduct : undefined,
    campaignNarrative:
      typeof o.campaignNarrative === "string" ? o.campaignNarrative : undefined,
    campaignSegment: typeof o.campaignSegment === "string" ? o.campaignSegment : undefined,
    campaignSeason: typeof o.campaignSeason === "string" ? o.campaignSeason : undefined,
    campaignTension: typeof o.campaignTension === "string" ? o.campaignTension : undefined,
    campaignTheme: typeof o.campaignTheme === "string" ? o.campaignTheme : undefined,
    heroMessage: typeof o.heroMessage === "string" ? o.heroMessage : undefined,
    channels,
    assets
  };
}

const MODULE = "campaigns";
const KEY = "kanban";

function parseNarrativeForThemeHero(text: string): { theme: string; hero: string } {
  const lines = text.split(/\r?\n/);
  let theme = "";
  let hero = "";
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (/^1\)\s*/i.test(line)) {
      const after = line.replace(/^1\)\s*(core theme\s*[-—]\s*)?/i, "").trim();
      if (after) {
        theme = after;
      } else {
        const next = lines.slice(i + 1).find((l) => l.trim());
        if (next) theme = next.trim();
      }
    }
    if (/^2\)\s*/i.test(line)) {
      const after = line.replace(/^2\)\s*(hero message\s*[-—]\s*)?/i, "").trim();
      if (after) {
        hero = after;
      } else {
        const next = lines.slice(i + 1).find((l) => l.trim());
        if (next) hero = next.trim();
      }
    }
  }
  const nonEmpty = lines.filter((l) => l.trim()).slice(0, 2);
  if (!theme && nonEmpty[0]) theme = nonEmpty[0].trim().slice(0, 120);
  if (!hero && nonEmpty[1]) hero = nonEmpty[1].trim().slice(0, 300);
  return { theme, hero };
}

function buildChannelPrompt(channel: ChannelKey, input: ChannelAssetInput): string {
  switch (channel) {
    case "email_single":
      return buildEmailSinglePrompt(input);
    case "email_sequence":
      return buildEmailSequencePrompt(input);
    case "linkedin_company":
      return buildLinkedInCompanyPrompt(input);
    case "linkedin_personal":
      return buildLinkedInPersonalPrompt(input);
    case "meta_ad":
      return buildMetaAdPrompt(input);
    case "blog_outline":
      return buildBlogOutlinePrompt(input);
    case "creative_brief":
      return buildCreativeBriefPrompt(input);
  }
}

export function CampaignPlanner({
  environmentId,
  productName = ""
}: {
  environmentId: string;
  productName?: string;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const toast = useToast();
  const [board, setBoard] = useState<Record<ColumnKey, Card[]>>(() => emptyBoard());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Inline add-card form
  const [addingIn, setAddingIn] = useState<ColumnKey | null>(null);
  const [addTitle, setAddTitle] = useState("");
  const [addTags, setAddTags] = useState("");

  // Modal
  const [modalCardId, setModalCardId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"brief" | "channels" | "assets">("brief");
  const [modalProduct, setModalProduct] = useState("");
  const [modalSegment, setModalSegment] = useState("");
  const [modalSeason, setModalSeason] = useState("");
  const [modalTension, setModalTension] = useState("");
  const [modalNarrative, setModalNarrative] = useState("");
  const [modalTheme, setModalTheme] = useState("");
  const [modalHero, setModalHero] = useState("");
  const [modalChannels, setModalChannels] = useState<ChannelKey[]>([]);
  const [modalAssets, setModalAssets] = useState<Partial<Record<ChannelKey, ChannelAsset>>>({});
  const [generatingNarrative, setGeneratingNarrative] = useState(false);
  const [generatingChannel, setGeneratingChannel] = useState<ChannelKey | null>(null);
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
    if (v?.columns) {
      const next = emptyBoard();
      for (const k of Object.keys(next) as ColumnKey[]) {
        const arr = v.columns[k];
        if (Array.isArray(arr)) {
          next[k] = arr.map(normalizeCard).filter(Boolean) as Card[];
        }
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

  function confirmAddCard(column: ColumnKey) {
    if (!addTitle.trim()) return;
    const tags = addTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const card: Card = {
      id: crypto.randomUUID(),
      title: addTitle.trim(),
      tags: tags.length ? tags : ["General"],
      channels: [],
      assets: {}
    };
    schedulePersist({ ...board, [column]: [...board[column], card] });
    setAddingIn(null);
    setAddTitle("");
    setAddTags("");
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

  function openModal(cardId: string) {
    const c = findCard(cardId);
    if (!c) return;
    setModalCardId(cardId);
    setActiveTab("brief");
    setModalProduct((c.campaignProduct || productName || c.title).trim());
    setModalSegment(c.campaignSegment ?? "");
    setModalSeason(c.campaignSeason ?? "");
    setModalTension(c.campaignTension ?? "");
    setModalNarrative(c.campaignNarrative ?? "");
    setModalTheme(c.campaignTheme ?? "");
    setModalHero(c.heroMessage ?? "");
    setModalChannels(c.channels ?? []);
    setModalAssets(c.assets ?? {});
    setModalError(null);
  }

  const closeModal = useCallback(() => {
    setModalCardId(null);
    setModalError(null);
    setGeneratingNarrative(false);
    setGeneratingChannel(null);
  }, []);

  function updateCardById(cardId: string, patch: Partial<Card>) {
    const next = { ...board };
    (Object.keys(next) as ColumnKey[]).forEach((k) => {
      next[k] = next[k].map((c) => (c.id === cardId ? { ...c, ...patch } : c));
    });
    schedulePersist(next);
  }

  async function generateNarrative() {
    if (!modalCardId) return;
    setGeneratingNarrative(true);
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
        body: JSON.stringify({ prompt, system: CAMPAIGN_NARRATIVE_SYSTEM, length: "medium" })
      });
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Generation failed.");
      const text = data.text ?? "";
      setModalNarrative(text);
      const { theme, hero } = parseNarrativeForThemeHero(text);
      setModalTheme((prev) => prev || theme);
      setModalHero((prev) => prev || hero);
      toast("✓ Campaign brief generated");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Generation failed.";
      setModalError(msg);
      toast(msg, "error");
    } finally {
      setGeneratingNarrative(false);
    }
  }

  async function generateChannelAsset(channel: ChannelKey) {
    if (!modalCardId) return;
    setGeneratingChannel(channel);
    setModalError(null);
    const card = findCard(modalCardId);
    const input: ChannelAssetInput = {
      campaignTheme: modalTheme.trim() || card?.title || "Campaign",
      heroMessage: modalHero.trim() || "",
      segment: modalSegment.trim() || "Primary ICP",
      productOrFeature: modalProduct.trim() || card?.title || "Product",
      season: modalSeason.trim() || "This quarter",
      tension: modalTension.trim() || undefined
    };
    try {
      const res = await fetch("/api/ai/module-generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt: buildChannelPrompt(channel, input),
          system: CHANNEL_ASSET_SYSTEM,
          length: "medium"
        })
      });
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Generation failed.");
      setModalAssets((prev) => ({
        ...prev,
        [channel]: { content: data.text ?? "", approved: false }
      }));
      toast(`✓ ${CHANNEL_LABELS[channel]} generated`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Generation failed.";
      setModalError(msg);
      toast(msg, "error");
    } finally {
      setGeneratingChannel(null);
    }
  }

  function saveModal() {
    if (!modalCardId) return;
    updateCardById(modalCardId, {
      campaignProduct: modalProduct,
      campaignSegment: modalSegment,
      campaignSeason: modalSeason,
      campaignTension: modalTension,
      campaignNarrative: modalNarrative,
      campaignTheme: modalTheme,
      heroMessage: modalHero,
      channels: modalChannels,
      assets: modalAssets
    });
    toast("✓ Campaign card saved");
    closeModal();
  }

  useEffect(() => {
    if (!modalCardId) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeModal();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalCardId, closeModal]);

  function cardStats(card: Card) {
    const channelCount = card.channels.length;
    const approvedCount = card.channels.filter((c) => card.assets[c]?.approved).length;
    const hasNarrative = Boolean(card.campaignNarrative?.trim() || card.campaignTheme?.trim());
    return { channelCount, approvedCount, hasNarrative };
  }

  const modalOpen = Boolean(modalCardId);
  const isAnyGenerating = generatingNarrative || Boolean(generatingChannel);

  return (
    <div className="space-y-3">
      {loading ? <SkeletonKanban /> : null}
      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red">
          {error}
        </div>
      ) : null}
      <p className="text-xs text-text2">
        Drag cards between columns. Open a card to write the brief, select channels, and generate
        assets.{" "}
        {saving ? "Saving…" : "Synced to your product environment."}
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
            className="min-h-[360px] rounded-2xl border border-border bg-surface p-3 shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="text-sm font-medium text-text">
                {col.label}{" "}
                <span className="text-text2">({board[col.key].length})</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAddingIn(col.key);
                  setAddTitle("");
                  setAddTags("");
                }}
                className="rounded-lg border border-border bg-surface2 px-2 py-0.5 text-[11px] font-semibold text-text hover:bg-surface3"
              >
                + Add
              </button>
            </div>

            <div className="space-y-2">
              {board[col.key].map((card) => {
                const { channelCount, approvedCount, hasNarrative } = cardStats(card);
                return (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", card.id)}
                    className="cursor-grab rounded-xl border border-border bg-surface2 p-3 active:cursor-grabbing active:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span className="shrink-0 select-none text-[14px] leading-none text-text3" title="Drag to move">⠿</span>
                        <div className="truncate text-sm font-medium text-text">{card.title}</div>
                      </div>
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
                        onClick={() => openModal(card.id)}
                        className="rounded-lg border border-primary/40 bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/20"
                      >
                        Campaign brief
                      </button>
                      {hasNarrative ? (
                        <Link
                          href={`/dashboard/gtm-planner?product=${encodeURIComponent(card.campaignProduct || productName || card.title)}&segment=${encodeURIComponent(card.campaignSegment ?? "")}&from=${encodeURIComponent(card.title)}`}
                          className="rounded-lg border border-teal/40 bg-teal/10 px-2 py-1 text-[11px] font-medium text-teal hover:bg-teal/20"
                        >
                          Plan launch →
                        </Link>
                      ) : null}
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-block h-1.5 w-1.5 rounded-full ${hasNarrative ? "bg-emerald-500" : "bg-border"}`}
                          title={hasNarrative ? "Brief ready" : "No brief yet"}
                        />
                        {channelCount > 0 ? (
                          <span className="text-[11px] text-text2">
                            {channelCount} channel{channelCount !== 1 ? "s" : ""} ·{" "}
                            {approvedCount} approved
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {addingIn === col.key ? (
              <div className="mt-2 space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
                <input
                  autoFocus
                  value={addTitle}
                  onChange={(e) => setAddTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") confirmAddCard(col.key);
                    if (e.key === "Escape") setAddingIn(null);
                  }}
                  placeholder="Campaign title"
                  className="w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-sm text-heading placeholder:text-text3 focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <input
                  value={addTags}
                  onChange={(e) => setAddTags(e.target.value)}
                  placeholder="Tags (comma-separated)"
                  className="w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-sm text-heading placeholder:text-text3 focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => confirmAddCard(col.key)}
                    disabled={!addTitle.trim()}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                  >
                    Add card
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddingIn(null)}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs text-heading hover:bg-surface2"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {modalOpen && modalCardId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <div className="text-base font-semibold text-heading">
                  {findCard(modalCardId)?.title}
                </div>
                <div className="mt-0.5 text-xs text-text2">Campaign builder</div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg px-2 py-1 text-text2 hover:text-text"
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border px-5">
              {(["brief", "channels", "assets"] as const).map((tab) => {
                const label =
                  tab === "brief"
                    ? "Brief"
                    : tab === "channels"
                      ? `Channels${modalChannels.length > 0 ? ` (${modalChannels.length})` : ""}`
                      : `Assets${Object.keys(modalAssets).length > 0 ? ` (${Object.keys(modalAssets).length})` : ""}`;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === tab
                        ? "border-primary text-primary"
                        : "border-transparent text-text2 hover:text-text"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Tab body */}
            <div className="flex-1 overflow-y-auto p-5">
              {modalError ? (
                <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red">
                  {modalError}
                </div>
              ) : null}

              {activeTab === "brief" ? (
                <div className="space-y-3">
                  <p className="text-xs text-text2">
                    Fill in the brief and generate the campaign narrative (theme, hero message, 3
                    format ideas). The theme and hero message feed into channel asset generation.
                  </p>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs text-text2">Product or feature</label>
                      <input
                        value={modalProduct}
                        onChange={(e) => setModalProduct(e.target.value)}
                        className="w-full rounded-xl border border-border bg-surface2 px-3 py-2 text-sm text-heading"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-text2">Target segment</label>
                      <input
                        value={modalSegment}
                        onChange={(e) => setModalSegment(e.target.value)}
                        placeholder="e.g. Series B SaaS marketing leaders"
                        className="w-full rounded-xl border border-border bg-surface2 px-3 py-2 text-sm text-heading placeholder:text-text3 focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-text2">Season or timing hook</label>
                      <input
                        value={modalSeason}
                        onChange={(e) => setModalSeason(e.target.value)}
                        placeholder="e.g. Q1 planning, post-earnings"
                        className="w-full rounded-xl border border-border bg-surface2 px-3 py-2 text-sm text-heading placeholder:text-text3 focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-text2">
                        Market tension (optional)
                      </label>
                      <input
                        value={modalTension}
                        onChange={(e) => setModalTension(e.target.value)}
                        placeholder="e.g. noisy category, budget scrutiny"
                        className="w-full rounded-xl border border-border bg-surface2 px-3 py-2 text-sm text-heading placeholder:text-text3 focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                  </div>

                  <AiProgressBar
                    active={generatingNarrative}
                    variant="dark"
                    title="Generating campaign narrative…"
                    estimate={AI_PROGRESS_ESTIMATE.short}
                    durationMs={50_000}
                  />

                  <button
                    type="button"
                    onClick={() => void generateNarrative()}
                    disabled={generatingNarrative}
                    className="rounded-xl bg-amber px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
                  >
                    {generatingNarrative ? "Generating…" : "Generate narrative"}
                  </button>

                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label className="text-xs text-text2">Campaign narrative</label>
                      <span className={`text-[11px] tabular-nums ${modalNarrative.length > 1800 ? "text-amber" : "text-text3"}`}>
                        {modalNarrative.length}/2000
                      </span>
                    </div>
                    <textarea
                      value={modalNarrative}
                      onChange={(e) => setModalNarrative(e.target.value)}
                      rows={8}
                      maxLength={2000}
                      placeholder="Generated narrative appears here. Edit as needed."
                      className="w-full rounded-xl border border-border bg-surface2 p-3 text-sm text-heading placeholder:text-text3 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs text-text2">
                        Core theme{" "}
                        <span className="text-text3">(auto-extracted · editable)</span>
                      </label>
                      <input
                        value={modalTheme}
                        onChange={(e) => setModalTheme(e.target.value)}
                        placeholder="Used as input for channel assets"
                        className="w-full rounded-xl border border-border bg-surface2 px-3 py-2 text-sm text-heading placeholder:text-text3 focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-text2">
                        Hero message{" "}
                        <span className="text-text3">(auto-extracted · editable)</span>
                      </label>
                      <input
                        value={modalHero}
                        onChange={(e) => setModalHero(e.target.value)}
                        placeholder="Used as input for channel assets"
                        className="w-full rounded-xl border border-border bg-surface2 px-3 py-2 text-sm text-heading placeholder:text-text3 focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => setActiveTab("channels")}
                      className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white"
                    >
                      Next: Select channels →
                    </button>
                  </div>
                </div>
              ) : null}

              {activeTab === "channels" ? (
                <div className="space-y-3">
                  <p className="text-xs text-text2">
                    Select the channels you want to produce assets for. Generate each one on the
                    Assets tab.
                  </p>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {ALL_CHANNELS.map((ch) => (
                      <label
                        key={ch}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${
                          modalChannels.includes(ch)
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/40"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={modalChannels.includes(ch)}
                          onChange={(e) => {
                            setModalChannels((prev) =>
                              e.target.checked ? [...prev, ch] : prev.filter((c) => c !== ch)
                            );
                          }}
                          className="rounded border-border accent-[var(--color-primary)]"
                        />
                        <div>
                          <div className="text-sm font-medium text-heading">
                            {CHANNEL_LABELS[ch]}
                          </div>
                          {modalAssets[ch]?.content ? (
                            <div className="mt-0.5 text-[11px] text-text2">
                              {modalAssets[ch]?.approved ? "✓ Approved" : "Draft ready"}
                            </div>
                          ) : null}
                        </div>
                      </label>
                    ))}
                  </div>

                  <div className="flex justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab("brief")}
                      className="rounded-xl border border-border px-4 py-2 text-sm text-heading hover:bg-surface2"
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("assets")}
                      disabled={modalChannels.length === 0}
                      className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                    >
                      Next: Generate assets →
                    </button>
                  </div>
                </div>
              ) : null}

              {activeTab === "assets" ? (
                <div className="space-y-4">
                  {modalChannels.length === 0 ? (
                    <div className="rounded-xl border border-border bg-surface2 p-4 text-sm text-text2">
                      No channels selected.{" "}
                      <button
                        type="button"
                        onClick={() => setActiveTab("channels")}
                        className="text-primary hover:underline"
                      >
                        Go to Channels
                      </button>{" "}
                      to pick what to generate.
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-text2">
                        Generate each asset individually using your brief. Edit inline, then approve
                        when ready.
                      </p>

                      <AiProgressBar
                        active={Boolean(generatingChannel)}
                        variant="dark"
                        title={`Generating ${generatingChannel ? CHANNEL_LABELS[generatingChannel] : ""}…`}
                        estimate={AI_PROGRESS_ESTIMATE.short}
                        durationMs={60_000}
                      />

                      {modalChannels.map((ch) => (
                        <div
                          key={ch}
                          className={`rounded-xl border p-4 ${
                            modalAssets[ch]?.approved
                              ? "border-emerald-500/30 bg-emerald-500/5"
                              : "border-border"
                          }`}
                        >
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <div className="text-sm font-semibold text-heading">
                              {CHANNEL_LABELS[ch]}
                            </div>
                            <div className="flex items-center gap-2">
                              {modalAssets[ch]?.content ? (
                                <label className="flex cursor-pointer items-center gap-1.5 text-xs text-text2">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(modalAssets[ch]?.approved)}
                                    onChange={(e) => {
                                      setModalAssets((prev) => ({
                                        ...prev,
                                        [ch]: {
                                          ...(prev[ch] ?? { content: "" }),
                                          approved: e.target.checked
                                        }
                                      }));
                                    }}
                                    className="rounded border-border accent-[var(--color-primary)]"
                                  />
                                  Approved
                                </label>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => void generateChannelAsset(ch)}
                                disabled={isAnyGenerating}
                                className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 disabled:opacity-40"
                              >
                                {generatingChannel === ch
                                  ? "Generating…"
                                  : modalAssets[ch]?.content
                                    ? "Regenerate"
                                    : "Generate"}
                              </button>
                            </div>
                          </div>
                          <textarea
                            value={modalAssets[ch]?.content ?? ""}
                            onChange={(e) => {
                              setModalAssets((prev) => ({
                                ...prev,
                                [ch]: {
                                  content: e.target.value,
                                  approved: prev[ch]?.approved ?? false
                                }
                              }));
                            }}
                            rows={6}
                            placeholder={`${CHANNEL_LABELS[ch]} will appear here after generation.`}
                            className="w-full rounded-xl border border-border bg-surface2 p-3 text-sm text-heading placeholder:text-text3"
                          />
                        </div>
                      ))}
                    </>
                  )}

                  <div className="flex justify-start pt-1">
                    <button
                      type="button"
                      onClick={() => setActiveTab("channels")}
                      className="rounded-xl border border-border px-4 py-2 text-sm text-heading hover:bg-surface2"
                    >
                      ← Back to Channels
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
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
                disabled={isAnyGenerating}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
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
