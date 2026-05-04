"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AiProgressBar, AI_PROGRESS_ESTIMATE } from "@/app/dashboard/_components/AiProgressBar";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  POSITIONING_KEY,
  POSITIONING_MODULE,
  type PositioningCanvasValue,
  type PositioningHealth
} from "@/lib/positioningStudio";
import { buildPricingNarrativePrompt, PRICING_NARRATIVE_SYSTEM } from "@/lib/pmmPrompts";

const PRICING_NARRATIVE_STORAGE_KEY = "pricing_narrative";

const FIELD_LABELS: Record<keyof PositioningCanvasValue["doc"], string> = {
  category: "Category",
  target: "Target",
  problem: "Problem",
  solution: "Solution",
  diff: "Diff (Differentiation)",
  wedge: "Wedge"
};

const HEALTH_LABELS: [keyof PositioningHealth, string][] = [
  ["clarity", "Clarity"],
  ["differentiation", "Differentiation"],
  ["credibility", "Credibility"],
  ["message_market_fit", "Message-market fit"]
];

const emptyDoc = (): PositioningCanvasValue["doc"] => ({
  category: "",
  target: "",
  problem: "",
  solution: "",
  diff: "",
  wedge: ""
});

const defaultHealth = (): PositioningHealth => ({
  clarity: 70,
  differentiation: 70,
  credibility: 70,
  message_market_fit: 70
});

type VersionListItem = {
  id: string;
  version_number: number;
  status: string;
  submitted_at: string | null;
  approved_at: string | null;
  review_due_at: string | null;
  created_at: string;
};

export default function PositioningStudioClient({
  environmentId,
  productId
}: {
  environmentId: string;
  productId: string;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const [canvas, setCanvas] = useState<PositioningCanvasValue | null>(null);
  const [doc, setDoc] = useState<PositioningCanvasValue["doc"]>(() => emptyDoc());

  const [versions, setVersions] = useState<VersionListItem[]>([]);
  const [approvedVersionId, setApprovedVersionId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [versionBusy, setVersionBusy] = useState<string | null>(null);
  const [versionError, setVersionError] = useState<string | null>(null);

  const [pricingText, setPricingText] = useState("");
  const [pricingPlan, setPricingPlan] = useState("");
  const [pricingPrice, setPricingPrice] = useState("");
  const [pricingPersona, setPricingPersona] = useState("");
  const [pricingProof, setPricingProof] = useState("");
  const [pricingGenerating, setPricingGenerating] = useState(false);
  const [pricingSaving, setPricingSaving] = useState(false);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [pricingSaved, setPricingSaved] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [canvasRes, pricingRes] = await Promise.all([
      supabase
        .from("module_settings")
        .select("value_json")
        .eq("environment_id", environmentId)
        .eq("module", POSITIONING_MODULE)
        .eq("key", POSITIONING_KEY)
        .maybeSingle(),
      supabase
        .from("module_settings")
        .select("value_json")
        .eq("environment_id", environmentId)
        .eq("module", POSITIONING_MODULE)
        .eq("key", PRICING_NARRATIVE_STORAGE_KEY)
        .maybeSingle()
    ]);
    const { data, error: qErr } = canvasRes;

    if (qErr) setError(qErr.message);
    const raw = data?.value_json as Partial<PositioningCanvasValue> | null;
    if (raw?.doc && typeof raw.doc === "object") {
      const merged: PositioningCanvasValue = {
        doc: { ...emptyDoc(), ...raw.doc },
        health: { ...defaultHealth(), ...raw.health },
        revision: typeof raw.revision === "number" ? raw.revision : 0,
        history: Array.isArray(raw.history) ? raw.history : []
      };
      setCanvas(merged);
      setDoc(merged.doc);
    } else {
      setCanvas(null);
      setDoc(emptyDoc());
    }

    const pv = pricingRes.data?.value_json as { text?: string } | null;
    setPricingText(typeof pv?.text === "string" ? pv.text : "");

    setLoading(false);
  }, [environmentId, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const loadVersions = useCallback(async () => {
    setVersionError(null);
    try {
      const res = await fetch("/api/positioning/versions");
      const data = (await res.json()) as {
        versions?: VersionListItem[];
        approved_positioning_version_id?: string | null;
        is_admin?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setVersionError(data.error ?? "Could not load positioning versions.");
        return;
      }
      setVersions(data.versions ?? []);
      setApprovedVersionId(data.approved_positioning_version_id ?? null);
      setIsAdmin(Boolean(data.is_admin));
    } catch (e) {
      setVersionError(e instanceof Error ? e.message : "Could not load versions.");
    }
  }, []);

  useEffect(() => {
    void loadVersions();
  }, [loadVersions, environmentId, productId]);

  async function saveManualEdits() {
    if (!canvas) return;
    setSaving(true);
    setSaved(null);
    setError(null);
    const next: PositioningCanvasValue = {
      ...canvas,
      doc: { ...doc }
    };
    const { error: upErr } = await supabase.from("module_settings").upsert({
      environment_id: environmentId,
      module: POSITIONING_MODULE,
      key: POSITIONING_KEY,
      value_json: next
    });
    setSaving(false);
    if (upErr) {
      setError(upErr.message);
      return;
    }
    setCanvas(next);
    setSaved("Saved.");
  }

  function fullCanvasSnapshot(): PositioningCanvasValue {
    return {
      doc: { ...doc },
      health: canvas?.health ?? defaultHealth(),
      revision: canvas?.revision ?? 0,
      history: Array.isArray(canvas?.history) ? canvas!.history : []
    };
  }

  async function snapshotDraftVersion() {
    setVersionBusy("snapshot");
    setVersionError(null);
    try {
      const res = await fetch("/api/positioning/versions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "snapshot_draft", value_json: fullCanvasSnapshot() })
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setVersionError(data.error ?? "Could not save snapshot.");
        return;
      }
      await loadVersions();
      setSaved("Snapshot saved as draft version.");
    } catch (e) {
      setVersionError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setVersionBusy(null);
    }
  }

  async function submitVersion(id: string) {
    setVersionBusy(id + "-submit");
    setVersionError(null);
    try {
      const res = await fetch("/api/positioning/versions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "submit", version_id: id })
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setVersionError(data.error ?? "Could not submit for review.");
        return;
      }
      await loadVersions();
    } catch (e) {
      setVersionError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setVersionBusy(null);
    }
  }

  async function approveVersion(id: string) {
    setVersionBusy(id + "-approve");
    setVersionError(null);
    try {
      const res = await fetch("/api/positioning/versions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "approve", version_id: id })
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setVersionError(data.error ?? "Could not approve.");
        return;
      }
      await loadVersions();
      setSaved("Approved positioning version is now the spine for battlecards and GTM assets.");
    } catch (e) {
      setVersionError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setVersionBusy(null);
    }
  }

  async function generateFromSegments() {
    setGenerating(true);
    setError(null);
    setSaved(null);
    try {
      const res = await fetch("/api/positioning/generate-from-segments", {
        method: "POST",
        headers: { "content-type": "application/json" }
      });
      const data = (await res.json()) as { ok?: boolean; canvas?: PositioningCanvasValue; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Generation failed.");
        return;
      }
      if (data.canvas) {
        setCanvas(data.canvas);
        setDoc(data.canvas.doc);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setGenerating(false);
    }
  }

  function formatCanvasForPricing(d: PositioningCanvasValue["doc"]): string {
    return (Object.keys(FIELD_LABELS) as (keyof PositioningCanvasValue["doc"])[])
      .map((k) => `${FIELD_LABELS[k]}: ${d[k]}`)
      .join("\n");
  }

  async function savePricingNarrative() {
    setPricingSaving(true);
    setPricingError(null);
    setPricingSaved(null);
    const { error: upErr } = await supabase.from("module_settings").upsert({
      environment_id: environmentId,
      module: POSITIONING_MODULE,
      key: PRICING_NARRATIVE_STORAGE_KEY,
      value_json: { text: pricingText }
    });
    setPricingSaving(false);
    if (upErr) {
      setPricingError(upErr.message);
      return;
    }
    setPricingSaved("Pricing narrative saved.");
  }

  async function generatePricingNarrative() {
    setPricingGenerating(true);
    setPricingError(null);
    setPricingSaved(null);
    const positioningCanvasText = formatCanvasForPricing(doc);
    const prompt = buildPricingNarrativePrompt({
      planName: pricingPlan.trim() || "Your plan",
      price: pricingPrice.trim() || "—",
      persona: pricingPersona.trim() || "Economic buyer / champion",
      proof: pricingProof.trim() || undefined,
      positioningCanvasText
    });
    try {
      const res = await fetch("/api/ai/module-generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt,
          system: PRICING_NARRATIVE_SYSTEM,
          length: "medium"
        })
      });
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Generation failed.");
      setPricingText(data.text ?? "");
    } catch (e) {
      setPricingError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setPricingGenerating(false);
    }
  }

  const health = canvas?.health ?? defaultHealth();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1
            className="text-3xl text-heading"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Positioning Studio
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-text2">
            Canvas and health scores are generated from your saved ICP segments (from an uploaded document in{" "}
            <Link href="/dashboard/icp-segmentation" className="text-primary hover:underline">
              ICP Segmentation
            </Link>
            ). Regenerate after you change segments, or edit the text yourself and save.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => generateFromSegments()}
            disabled={generating || loading}
            className="rounded-xl bg-amber px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
          >
            {generating ? "Generating…" : "Regenerate from ICP segments"}
          </button>
          <button
            type="button"
            onClick={() => saveManualEdits()}
            disabled={saving || !canvas || loading}
            className="rounded-xl border border-border bg-surface px-4 py-2 text-sm text-heading hover:bg-surface2 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save edits"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red">
          {error}
        </div>
      ) : null}
      {saved ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          {saved}
        </div>
      ) : null}
      {versionError ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          {versionError}{" "}
          <span className="text-text2">
            (If this mentions a missing table, run <code className="font-mono text-[11px]">supabase/positioning_versions_spine.sql</code> in Supabase.)
          </span>
        </div>
      ) : null}

      <AiProgressBar
        active={generating || pricingGenerating}
        variant="dark"
        title={
          pricingGenerating
            ? "Generating pricing narrative…"
            : generating
              ? "Regenerating positioning from ICP segments…"
              : "Working…"
        }
        estimate={
          pricingGenerating ? AI_PROGRESS_ESTIMATE.short : AI_PROGRESS_ESTIMATE.positioning
        }
        durationMs={pricingGenerating ? 50_000 : 90_000}
      />

      {loading ? (
        <div className="text-sm text-text2">Loading…</div>
      ) : (
        <>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            {(Object.keys(FIELD_LABELS) as (keyof PositioningCanvasValue["doc"])[]).map((k) => (
              <div key={k} className="rounded-2xl border border-border bg-surface p-4">
                <div className="mb-2 text-xs uppercase text-text2">{FIELD_LABELS[k]}</div>
                <textarea
                  value={doc[k]}
                  onChange={(e) => setDoc((d) => ({ ...d, [k]: e.target.value }))}
                  className="min-h-[72px] w-full rounded-xl border border-border bg-surface2 p-3 text-sm text-heading"
                  placeholder="—"
                />
              </div>
            ))}
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-surface p-4">
              <div className="text-sm text-heading">Health Scores</div>
              {HEALTH_LABELS.map(([key, label]) => {
                const v = health[key];
                return (
                  <div className="mt-3" key={key}>
                    <div className="mb-1 flex justify-between text-xs text-text2">
                      <span>{label}</span>
                      <span>{v}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface3">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{ width: `${v}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="rounded-2xl border border-border bg-surface p-4 text-sm text-text2">
              <div className="mb-2 text-sm text-heading">AI version history</div>
              {canvas?.history?.length ? (
                <div className="space-y-2">
                  {canvas.history.map((h, i) => (
                    <div key={`${h.version}-${i}`}>
                      <span className="text-heading">{h.version}</span>
                      {" — "}
                      {h.label}
                    </div>
                  ))}
                </div>
              ) : (
                <div>No AI history yet. Generate from ICP segments to create history.</div>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-surface p-4">
              <div className="mb-2 text-sm text-heading">Governed positioning versions</div>
              <p className="text-xs text-text2">
                Snapshots become your approved spine. Battlecards save against the latest approved version.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => snapshotDraftVersion()}
                  disabled={loading || versionBusy !== null}
                  className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
                >
                  {versionBusy === "snapshot" ? "Saving…" : "Save snapshot (draft)"}
                </button>
              </div>
              {approvedVersionId ? (
                <div className="mt-3 text-xs text-emerald-200">
                  Approved spine: <span className="font-mono text-[11px]">{approvedVersionId.slice(0, 8)}…</span>
                </div>
              ) : (
                <div className="mt-3 text-xs text-text2">No approved positioning version yet.</div>
              )}
              <div className="mt-4 space-y-2">
                {versions.length ? (
                  versions.map((v) => (
                    <div
                      key={v.id}
                      className="rounded-xl border border-border bg-surface2 px-3 py-2 text-[12px]"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-heading">
                          v{v.version_number}{" "}
                          <span className="text-text2">({v.status})</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {v.status === "draft" ? (
                            <button
                              type="button"
                              onClick={() => submitVersion(v.id)}
                              disabled={versionBusy !== null}
                              className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white hover:bg-white/10 disabled:opacity-50"
                            >
                              {versionBusy === `${v.id}-submit` ? "…" : "Submit"}
                            </button>
                          ) : null}
                          {isAdmin && (v.status === "pending_review" || v.status === "draft") ? (
                            <button
                              type="button"
                              onClick={() => approveVersion(v.id)}
                              disabled={versionBusy !== null}
                              className="rounded-lg bg-amber px-2 py-1 text-[11px] font-semibold text-black hover:bg-amber-hover disabled:opacity-50"
                            >
                              {versionBusy === `${v.id}-approve` ? "…" : "Approve"}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-text2">No governed versions yet. Save a snapshot to start.</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="mb-1 text-sm font-medium text-heading">Pricing narrative</div>
          <p className="mb-4 text-xs text-text2">
            Value-based talking points for a price point. Generation uses the positioning canvas above — save edits to the
            canvas first if you want them included.
          </p>
          {pricingError ? (
            <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red">
              {pricingError}
            </div>
          ) : null}
          {pricingSaved ? (
            <div className="mb-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
              {pricingSaved}
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-[11px] uppercase text-text2">Plan or SKU</label>
              <input
                value={pricingPlan}
                onChange={(e) => setPricingPlan(e.target.value)}
                placeholder="e.g. Growth"
                className="w-full rounded-xl border border-border bg-surface2 px-3 py-2 text-sm text-heading"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] uppercase text-text2">Price</label>
              <input
                value={pricingPrice}
                onChange={(e) => setPricingPrice(e.target.value)}
                placeholder="e.g. $299/mo"
                className="w-full rounded-xl border border-border bg-surface2 px-3 py-2 text-sm text-heading"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] uppercase text-text2">Persona</label>
              <input
                value={pricingPersona}
                onChange={(e) => setPricingPersona(e.target.value)}
                placeholder="e.g. VP Marketing"
                className="w-full rounded-xl border border-border bg-surface2 px-3 py-2 text-sm text-heading"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] uppercase text-text2">Proof (optional)</label>
              <input
                value={pricingProof}
                onChange={(e) => setPricingProof(e.target.value)}
                placeholder="Metrics, outcomes"
                className="w-full rounded-xl border border-border bg-surface2 px-3 py-2 text-sm text-heading"
              />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void generatePricingNarrative()}
              disabled={pricingGenerating}
              className="rounded-xl bg-amber px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
            >
              {pricingGenerating ? "Generating…" : "Generate"}
            </button>
            <button
              type="button"
              onClick={() => void savePricingNarrative()}
              disabled={pricingSaving}
              className="rounded-xl border border-border bg-surface2 px-4 py-2 text-sm text-heading hover:bg-surface3 disabled:opacity-50"
            >
              {pricingSaving ? "Saving…" : "Save narrative"}
            </button>
          </div>
          <label className="mt-4 mb-1 block text-xs text-text2">Output</label>
          <textarea
            value={pricingText}
            onChange={(e) => setPricingText(e.target.value)}
            rows={12}
            className="w-full rounded-xl border border-border bg-surface2 p-3 text-sm text-heading"
            placeholder="Generated pricing narrative appears here."
          />
        </div>
        </>
      )}
    </div>
  );
}
