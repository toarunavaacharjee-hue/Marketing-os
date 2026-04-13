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

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: qErr } = await supabase
      .from("module_settings")
      .select("value_json")
      .eq("environment_id", environmentId)
      .eq("module", POSITIONING_MODULE)
      .eq("key", POSITIONING_KEY)
      .maybeSingle();

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

  const health = canvas?.health ?? defaultHealth();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1
            className="text-3xl text-[#f0f0f8]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Positioning Studio
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[#9090b0]">
            Canvas and health scores are generated from your saved ICP segments (from an uploaded document in{" "}
            <Link href="/dashboard/icp-segmentation" className="text-[#7c6cff] hover:underline">
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
            className="rounded-xl bg-[#b8ff6c] px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
          >
            {generating ? "Generating…" : "Regenerate from ICP segments"}
          </button>
          <button
            type="button"
            onClick={() => saveManualEdits()}
            disabled={saving || !canvas || loading}
            className="rounded-xl border border-[#2a2e3f] bg-[#141420] px-4 py-2 text-sm text-[#f0f0f8] hover:bg-white/5 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save edits"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
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
          <span className="text-[#9090b0]">
            (If this mentions a missing table, run <code className="font-mono text-[11px]">supabase/positioning_versions_spine.sql</code> in Supabase.)
          </span>
        </div>
      ) : null}

      <AiProgressBar
        active={generating}
        variant="dark"
        title="Regenerating positioning from ICP segments…"
        estimate={AI_PROGRESS_ESTIMATE.positioning}
        durationMs={90_000}
      />

      {loading ? (
        <div className="text-sm text-[#9090b0]">Loading…</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            {(Object.keys(FIELD_LABELS) as (keyof PositioningCanvasValue["doc"])[]).map((k) => (
              <div key={k} className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4">
                <div className="mb-2 text-xs uppercase text-[#9090b0]">{FIELD_LABELS[k]}</div>
                <textarea
                  value={doc[k]}
                  onChange={(e) => setDoc((d) => ({ ...d, [k]: e.target.value }))}
                  className="min-h-[72px] w-full rounded-xl border border-[#2a2e3f] bg-black/20 p-3 text-sm text-[#f0f0f8]"
                  placeholder="—"
                />
              </div>
            ))}
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4">
              <div className="text-sm text-[#f0f0f8]">Health Scores</div>
              {HEALTH_LABELS.map(([key, label]) => {
                const v = health[key];
                return (
                  <div className="mt-3" key={key}>
                    <div className="mb-1 flex justify-between text-xs text-[#9090b0]">
                      <span>{label}</span>
                      <span>{v}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-black/30">
                      <div
                        className="h-2 rounded-full bg-[#7c6cff]"
                        style={{ width: `${v}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4 text-sm text-[#9090b0]">
              <div className="mb-2 text-sm text-[#f0f0f8]">AI version history</div>
              {canvas?.history?.length ? (
                <div className="space-y-2">
                  {canvas.history.map((h, i) => (
                    <div key={`${h.version}-${i}`}>
                      <span className="text-[#f0f0f8]">{h.version}</span>
                      {" — "}
                      {h.label}
                    </div>
                  ))}
                </div>
              ) : (
                <div>No AI history yet. Generate from ICP segments to create history.</div>
              )}
            </div>

            <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4">
              <div className="mb-2 text-sm text-[#f0f0f8]">Governed positioning versions</div>
              <p className="text-xs text-[#9090b0]">
                Snapshots become your approved spine. Battlecards save against the latest approved version.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => snapshotDraftVersion()}
                  disabled={loading || versionBusy !== null}
                  className="rounded-xl bg-[#7c6cff] px-3 py-2 text-xs font-semibold text-white hover:bg-[#8b7cff] disabled:opacity-50"
                >
                  {versionBusy === "snapshot" ? "Saving…" : "Save snapshot (draft)"}
                </button>
              </div>
              {approvedVersionId ? (
                <div className="mt-3 text-xs text-emerald-200">
                  Approved spine: <span className="font-mono text-[11px]">{approvedVersionId.slice(0, 8)}…</span>
                </div>
              ) : (
                <div className="mt-3 text-xs text-[#9090b0]">No approved positioning version yet.</div>
              )}
              <div className="mt-4 space-y-2">
                {versions.length ? (
                  versions.map((v) => (
                    <div
                      key={v.id}
                      className="rounded-xl border border-[#2a2e3f] bg-black/20 px-3 py-2 text-[12px]"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-[#f0f0f8]">
                          v{v.version_number}{" "}
                          <span className="text-[#9090b0]">({v.status})</span>
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
                              className="rounded-lg bg-[#b8ff6c] px-2 py-1 text-[11px] font-semibold text-black hover:bg-[#c8ff7c] disabled:opacity-50"
                            >
                              {versionBusy === `${v.id}-approve` ? "…" : "Approve"}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-[#9090b0]">No governed versions yet. Save a snapshot to start.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
