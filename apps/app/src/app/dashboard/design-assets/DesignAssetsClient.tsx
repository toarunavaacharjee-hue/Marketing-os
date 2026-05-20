"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AiProgressBar, AI_PROGRESS_ESTIMATE } from "@/app/dashboard/_components/AiProgressBar";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { ModuleShell } from "@/app/dashboard/_components/ModuleShell";

// ─── Types ────────────────────────────────────────────────────────────────────

type AssetType =
  | "banner"
  | "social-graphic"
  | "hero-image"
  | "email-header"
  | "presentation"
  | "icon-illustration"
  | "infographic"
  | "video-thumbnail"
  | "landing-page"
  | "print"
  | "other";

type AssetStatus = "briefed" | "in-progress" | "in-review" | "approved" | "delivered" | "cancelled";

type DesignAsset = {
  id: string;
  name: string;
  assetType: AssetType;
  dimensions: string;
  status: AssetStatus;
  campaign: string;
  audience: string;
  dueDate: string;
  assignee: string;
  brief: string;
  referenceUrl: string;
  deliveryUrl: string;
  notes: string;
  createdAt: string;
};

type AiHistoryEntry = { id: string; at: string; prompt: string; text: string };

type Workspace = {
  assets: DesignAsset[];
  brandNotes: string;
  prompt: string;
  lastOutput: string;
  aiHistory: AiHistoryEntry[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

const ASSET_TYPES: { id: AssetType; label: string; hint: string }[] = [
  { id: "banner", label: "Banner / Display ad", hint: "300×250, 728×90, 160×600…" },
  { id: "social-graphic", label: "Social graphic", hint: "1080×1080, 1200×628…" },
  { id: "hero-image", label: "Hero image", hint: "1440×800, 1920×1080…" },
  { id: "email-header", label: "Email header", hint: "600×200, 600×300…" },
  { id: "presentation", label: "Presentation deck", hint: "16:9 slides" },
  { id: "icon-illustration", label: "Icon / Illustration", hint: "SVG, 64×64, 256×256…" },
  { id: "infographic", label: "Infographic", hint: "800×2000, A4 portrait…" },
  { id: "video-thumbnail", label: "Video thumbnail", hint: "1280×720 (YouTube/Loom)" },
  { id: "landing-page", label: "Landing page mockup", hint: "Desktop + mobile" },
  { id: "print", label: "Print collateral", hint: "A4, letter, DL, poster…" },
  { id: "other", label: "Other", hint: "" },
];

const STATUS_CONFIG: Record<AssetStatus, { label: string; style: string }> = {
  briefed: { label: "Briefed", style: "border-border bg-surface2 text-text2" },
  "in-progress": { label: "In progress", style: "border-primary/30 bg-primary/10 text-primary" },
  "in-review": { label: "In review", style: "border-yellow-500/30 bg-yellow-500/10 text-yellow-700" },
  approved: { label: "Approved", style: "border-teal/30 bg-teal/10 text-teal" },
  delivered: { label: "Delivered", style: "border-teal/50 bg-teal/15 text-teal font-semibold" },
  cancelled: { label: "Cancelled", style: "border-border bg-surface3 text-text3 line-through" },
};

const STATUS_ORDER: AssetStatus[] = ["briefed", "in-progress", "in-review", "approved", "delivered", "cancelled"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function assetTypeLabel(id: AssetType): string {
  return ASSET_TYPES.find((t) => t.id === id)?.label ?? "Other";
}

function emptyAsset(): DesignAsset {
  return {
    id: crypto.randomUUID(),
    name: "",
    assetType: "social-graphic",
    dimensions: "",
    status: "briefed",
    campaign: "",
    audience: "",
    dueDate: "",
    assignee: "",
    brief: "",
    referenceUrl: "",
    deliveryUrl: "",
    notes: "",
    createdAt: new Date().toISOString(),
  };
}

function emptyWorkspace(): Workspace {
  return { assets: [], brandNotes: "", prompt: "", lastOutput: "", aiHistory: [] };
}

function migrateAsset(raw: unknown): DesignAsset {
  const base = emptyAsset();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  const validTypes = ASSET_TYPES.map((t) => t.id);
  const validStatuses = STATUS_ORDER;
  return {
    id: String(o.id || crypto.randomUUID()),
    name: String(o.name ?? ""),
    assetType: (validTypes.includes(String(o.assetType) as AssetType) ? o.assetType : "other") as AssetType,
    dimensions: String(o.dimensions ?? ""),
    status: (validStatuses.includes(String(o.status) as AssetStatus) ? o.status : "briefed") as AssetStatus,
    campaign: String(o.campaign ?? ""),
    audience: String(o.audience ?? ""),
    dueDate: String(o.dueDate ?? ""),
    assignee: String(o.assignee ?? ""),
    brief: String(o.brief ?? ""),
    referenceUrl: String(o.referenceUrl ?? ""),
    deliveryUrl: String(o.deliveryUrl ?? ""),
    notes: String(o.notes ?? ""),
    createdAt: String(o.createdAt ?? new Date().toISOString()),
  };
}

function migrateWorkspace(v: unknown): Workspace {
  const base = emptyWorkspace();
  if (!v || typeof v !== "object") return base;
  const o = v as Record<string, unknown>;
  return {
    assets: Array.isArray(o.assets) ? o.assets.map(migrateAsset) : [],
    brandNotes: typeof o.brandNotes === "string" ? o.brandNotes : "",
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

// ─── Sub-component: AssetCard ─────────────────────────────────────────────────

function AssetCard({
  asset,
  expanded,
  onToggle,
  onChange,
  onRemove,
}: {
  asset: DesignAsset;
  expanded: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<DesignAsset>) => void;
  onRemove: () => void;
}) {
  const statusCfg = STATUS_CONFIG[asset.status];

  return (
    <div
      className={`hs-card transition-shadow ${
        expanded ? "border-primary/40 shadow-md" : "hover:border-primary/20"
      }`}
    >
      {/* Collapsed header */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded border border-border bg-surface2 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-text3">
              {assetTypeLabel(asset.assetType)}
            </span>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${statusCfg.style}`}>
              {statusCfg.label}
            </span>
            {asset.dimensions ? (
              <span className="text-[10px] text-text3">{asset.dimensions}</span>
            ) : null}
            {asset.dueDate ? (
              <span className="text-[10px] text-text3">
                Due {new Date(asset.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
            ) : null}
            {asset.campaign ? (
              <span className="rounded-full bg-surface3 px-2 py-0.5 text-[10px] text-text2">#{asset.campaign}</span>
            ) : null}
          </div>
          <p className="text-sm font-medium text-text">
            {asset.name.trim() || <span className="font-normal italic text-text3">Untitled asset</span>}
          </p>
          {asset.brief ? (
            <p className="line-clamp-1 text-xs text-text2">{asset.brief}</p>
          ) : null}
        </div>
        <span className="mt-0.5 shrink-0 text-xs text-text3">{expanded ? "▲" : "▼"}</span>
      </button>

      {/* Expanded form */}
      {expanded ? (
        <div className="space-y-3 border-t border-border px-4 pb-4 pt-3">
          {/* Name + type row */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text3">Asset name</div>
              <input
                value={asset.name}
                onChange={(e) => onChange({ name: e.target.value })}
                placeholder="e.g. Q3 launch hero banner"
                className="w-full rounded-lg border border-border bg-surface2 px-2 py-1.5 text-sm text-heading placeholder:text-text3 focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text3">Asset type</div>
              <select
                value={asset.assetType}
                onChange={(e) => onChange({ assetType: e.target.value as AssetType })}
                className="w-full rounded-lg border border-border bg-surface2 px-2 py-1.5 text-sm text-heading"
              >
                {ASSET_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Status + dimensions + due + assignee */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text3">Status</div>
              <select
                value={asset.status}
                onChange={(e) => onChange({ status: e.target.value as AssetStatus })}
                className="w-full rounded-lg border border-border bg-surface2 px-2 py-1.5 text-sm text-heading"
              >
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text3">Dimensions</div>
              <input
                value={asset.dimensions}
                onChange={(e) => onChange({ dimensions: e.target.value })}
                placeholder={ASSET_TYPES.find((t) => t.id === asset.assetType)?.hint ?? "e.g. 1200×628px"}
                className="w-full rounded-lg border border-border bg-surface2 px-2 py-1.5 text-sm text-heading placeholder:text-text3"
              />
            </div>
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text3">Due date</div>
              <input
                type="date"
                value={asset.dueDate}
                onChange={(e) => onChange({ dueDate: e.target.value })}
                className="w-full rounded-lg border border-border bg-surface2 px-2 py-1.5 text-sm text-heading"
              />
            </div>
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text3">Designer</div>
              <input
                value={asset.assignee}
                onChange={(e) => onChange({ assignee: e.target.value })}
                placeholder="Name or email"
                className="w-full rounded-lg border border-border bg-surface2 px-2 py-1.5 text-sm text-heading placeholder:text-text3"
              />
            </div>
          </div>

          {/* Campaign + audience */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text3">Campaign</div>
              <input
                value={asset.campaign}
                onChange={(e) => onChange({ campaign: e.target.value })}
                placeholder="e.g. q3-launch"
                className="w-full rounded-lg border border-border bg-surface2 px-2 py-1.5 text-sm text-heading placeholder:text-text3"
              />
            </div>
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text3">Target audience</div>
              <input
                value={asset.audience}
                onChange={(e) => onChange({ audience: e.target.value })}
                placeholder="e.g. Series A CMOs"
                className="w-full rounded-lg border border-border bg-surface2 px-2 py-1.5 text-sm text-heading placeholder:text-text3"
              />
            </div>
          </div>

          {/* Creative brief */}
          <div>
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text3">Creative brief</div>
            <textarea
              value={asset.brief}
              onChange={(e) => onChange({ brief: e.target.value })}
              rows={4}
              placeholder="Describe the concept, visual direction, copy overlay, mood, brand usage, CTA…"
              className="w-full rounded-xl border border-border bg-surface2 px-3 py-2.5 text-sm text-heading placeholder:text-text3 focus:border-primary focus:outline-none"
            />
          </div>

          {/* Links */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text3">Reference / examples</div>
              <div className="flex gap-1.5">
                <input
                  value={asset.referenceUrl}
                  onChange={(e) => onChange({ referenceUrl: e.target.value })}
                  placeholder="Brand guide, inspiration link…"
                  className="min-w-0 flex-1 rounded-lg border border-border bg-surface2 px-2 py-1.5 text-sm text-heading placeholder:text-text3"
                />
                {safeHref(asset.referenceUrl) ? (
                  <a href={safeHref(asset.referenceUrl)!} target="_blank" rel="noopener noreferrer"
                    className="shrink-0 rounded-lg border border-primary/30 bg-primary/8 px-2 py-1.5 text-xs text-primary">
                    Open
                  </a>
                ) : null}
              </div>
            </div>
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text3">Delivery link</div>
              <div className="flex gap-1.5">
                <input
                  value={asset.deliveryUrl}
                  onChange={(e) => onChange({ deliveryUrl: e.target.value })}
                  placeholder="Figma, Google Drive, Dropbox…"
                  className="min-w-0 flex-1 rounded-lg border border-border bg-surface2 px-2 py-1.5 text-sm text-heading placeholder:text-text3"
                />
                {safeHref(asset.deliveryUrl) ? (
                  <a href={safeHref(asset.deliveryUrl)!} target="_blank" rel="noopener noreferrer"
                    className="shrink-0 rounded-lg border border-teal/30 bg-teal/8 px-2 py-1.5 text-xs text-teal">
                    Open
                  </a>
                ) : null}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text3">Notes</div>
            <textarea
              value={asset.notes}
              onChange={(e) => onChange({ notes: e.target.value })}
              rows={2}
              placeholder="Revisions, feedback, print specs, file format requirements…"
              className="w-full rounded-xl border border-border bg-surface2 px-3 py-2 text-sm text-heading placeholder:text-text3"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <button type="button" onClick={onRemove} className="text-xs text-text3 hover:text-red">
              Remove asset
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DesignAssetsClient({ environmentId }: { environmentId: string }) {
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
  const [statusFilter, setStatusFilter] = useState<AssetStatus | "all">("all");
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
      .eq("module", "design_assets")
      .eq("key", "workspace")
      .maybeSingle();
    if (qErr) setError(qErr.message);
    const migrated = migrateWorkspace((data?.value_json ?? null) as unknown);
    if (!prefilledRef.current && qTopic && !migrated.prompt.trim()) {
      prefilledRef.current = true;
      const parts = [qTopic];
      if (qProduct) parts.push(`Product: ${qProduct}`);
      if (qSegment) parts.push(`Target segment: ${qSegment}`);
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
        const [{ data: canvasRow }, { data: segs }] = await Promise.all([
          supabase.from("module_settings").select("value_json").eq("environment_id", environmentId).eq("module", "positioning_studio").eq("key", "canvas").maybeSingle(),
          supabase.from("segments").select("name,pain_points").eq("environment_id", environmentId).order("created_at", { ascending: false }).limit(3),
        ]);
        if (cancelled) return;
        const parts: string[] = [];
        const doc = (canvasRow?.value_json as { doc?: Record<string, string> } | null)?.doc;
        if (doc) {
          const lines: string[] = [];
          if (doc.category) lines.push(`Market category: ${doc.category}`);
          if (doc.target) lines.push(`Target customer: ${doc.target}`);
          if (doc.solution) lines.push(`Solution: ${doc.solution}`);
          if (doc.diff) lines.push(`Differentiation: ${doc.diff}`);
          if (lines.length) parts.push(`Positioning:\n${lines.join("\n")}`);
        }
        const segList = (segs ?? []) as { name: string; pain_points?: string[] }[];
        if (segList.length) parts.push(`ICP segments: ${segList.map((s) => s.name).join(", ")}`);
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
      module: "design_assets",
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
    if (!ws.prompt.trim()) { setError("Describe the asset or campaign first."); return; }
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/module-generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt: ws.prompt,
          system: `You are a creative director writing structured design briefs for a B2B SaaS marketing team. For each asset requested, output a concise creative brief covering: (1) Concept & headline direction, (2) Visual style & mood, (3) Key message / copy overlay, (4) Brand usage notes, (5) Technical specs reminder. Be specific and actionable.${strategyContext}`,
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

  function addAssetFromOutput() {
    if (!ws.lastOutput.trim()) return;
    const asset: DesignAsset = { ...emptyAsset(), brief: ws.lastOutput.trim(), name: ws.prompt.trim().slice(0, 60) };
    const next = { ...ws, assets: [asset, ...ws.assets] };
    scheduleSave(next);
    setExpandedId(asset.id);
  }

  function addBlankAsset() {
    const asset = emptyAsset();
    const next = { ...ws, assets: [asset, ...ws.assets] };
    scheduleSave(next);
    setExpandedId(asset.id);
  }

  function updateAsset(id: string, patch: Partial<DesignAsset>) {
    scheduleSave({ ...ws, assets: ws.assets.map((a) => (a.id === id ? { ...a, ...patch } : a)) });
  }

  function removeAsset(id: string) {
    scheduleSave({ ...ws, assets: ws.assets.filter((a) => a.id !== id) });
    if (expandedId === id) setExpandedId(null);
  }

  const filteredAssets = statusFilter === "all" ? ws.assets : ws.assets.filter((a) => a.status === statusFilter);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of ws.assets) counts[a.status] = (counts[a.status] ?? 0) + 1;
    return counts;
  }, [ws.assets]);

  const activeStatuses = STATUS_ORDER.filter((s) => (statusCounts[s] ?? 0) > 0);

  return (
    <ModuleShell
      title="Design & Assets"
      subtitle="Track creative requests, write briefs, and generate visual direction with AI."
      actions={
        <span className="text-xs text-text3">
          {loading ? "Loading…" : saving ? "Saving…" : "Saved"}
        </span>
      }
    >
    <div className="space-y-5">

      {error ? <div className="hs-alert hs-alert-error">{error}</div> : null}

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

      <AiProgressBar active={generating} variant="dark" title="Writing creative brief…" estimate={AI_PROGRESS_ESTIMATE.short} durationMs={40_000} />

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left: Asset tracker */}
        <div className="space-y-4 lg:col-span-2">
          {/* Status filter + add */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${statusFilter === "all" ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface2 text-text2 hover:border-primary/30"}`}
              >
                All{ws.assets.length > 0 ? ` (${ws.assets.length})` : ""}
              </button>
              {activeStatuses.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${statusFilter === s ? `${STATUS_CONFIG[s].style}` : "border-border bg-surface2 text-text2 hover:border-primary/30"}`}
                >
                  {STATUS_CONFIG[s].label} ({statusCounts[s]})
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={addBlankAsset}
              className="hs-btn hs-btn-primary"
            >
              + New asset
            </button>
          </div>

          {/* Asset list */}
          {filteredAssets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
              <div className="text-sm font-medium text-text2">No assets yet</div>
              <div className="mt-1 text-xs text-text3">
                Generate a creative brief with AI or click{" "}
                <span className="font-medium text-text">+ New asset</span> to add a request.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAssets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  expanded={expandedId === asset.id}
                  onToggle={() => setExpandedId(expandedId === asset.id ? null : asset.id)}
                  onChange={(patch) => updateAsset(asset.id, patch)}
                  onRemove={() => removeAsset(asset.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: AI brief generator */}
        <div className="space-y-3">
          <div className="hs-card p-4">
            <div className="text-sm font-semibold text-heading">AI brief generator</div>
            <p className="mt-1 text-xs text-text3">
              Describe the campaign or asset — AI will write a structured creative brief.
            </p>

            <textarea
              value={ws.prompt}
              onChange={(e) => scheduleSave({ ...ws, prompt: e.target.value })}
              rows={4}
              className="mt-3 w-full rounded-xl border border-border bg-surface2 px-3 py-2.5 text-sm text-heading placeholder:text-text3 focus:border-primary focus:outline-none"
              placeholder="e.g. Product launch hero banner + 3 social graphics; target PLG teams; bold, minimal, teal accent"
            />

            <button
              type="button"
              onClick={() => void generate()}
              disabled={generating}
              className="hs-btn hs-btn-cta mt-2 w-full disabled:opacity-50"
            >
              {generating ? "Writing brief…" : "Generate brief"}
            </button>

            {strategyContext ? (
              <div className="mt-2 flex items-center gap-1.5 text-[10px] text-text3">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-teal" />
                Positioning &amp; ICP context injected
              </div>
            ) : null}

            {ws.lastOutput ? (
              <div className="mt-3 space-y-2 rounded-xl border border-border bg-surface2 p-3">
                <div className="text-[10px] font-medium uppercase tracking-wide text-text3">Generated brief</div>
                <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap font-sans text-xs leading-relaxed text-heading">
                  {ws.lastOutput}
                </pre>
                <button
                  type="button"
                  onClick={addAssetFromOutput}
                  className="w-full rounded-lg border border-primary/30 bg-primary/8 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/15"
                >
                  Add to asset tracker →
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

      {/* Brand notes */}
      <div className="hs-card p-4">
        <div className="mb-2 text-sm font-semibold text-heading">Brand notes & guidelines reminder</div>
        <textarea
          value={ws.brandNotes}
          onChange={(e) => scheduleSave({ ...ws, brandNotes: e.target.value })}
          rows={4}
          className="w-full rounded-xl border border-border bg-surface2 px-3 py-2.5 text-sm text-heading placeholder:text-text3"
          placeholder={`Primary: #7C4DFF · Teal: #00BFA5 · Amber: #FF8F00\nFonts: DM Sans (headings), Inter (body)\nLogo clearspace: 32px min · No gradients on logo\nTone: confident, concise, not corporate`}
        />
      </div>

    </div>
    </ModuleShell>
  );
}
