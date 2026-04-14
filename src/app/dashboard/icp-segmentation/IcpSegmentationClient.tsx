"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AiProgressBar, AI_PROGRESS_ESTIMATE } from "@/app/dashboard/_components/AiProgressBar";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type SegmentDetails = {
  urgency?: number;
  budget_fit?: number;
  acv_potential?: number;
  retention_potential?: number;
  icp_profile?: string;
};

type DbSegment = {
  id: string;
  name: string;
  pnf_score: number;
  pain_points: string[];
  notes: string | null;
  details: SegmentDetails | null;
};

type DraftSegment = {
  name: string;
  pnf_score: number;
  pain_points: string[];
  urgency: number;
  budget_fit: number;
  acv_potential: number;
  retention_potential: number;
  icp_profile: string;
  notes: string | null;
};

type ProductProfileDraft = {
  name: string;
  website_url: string;
  category: string;
  icp_summary: string;
  positioning_summary: string;
};

function emptyProductProfile(): ProductProfileDraft {
  return {
    name: "",
    website_url: "",
    category: "",
    icp_summary: "",
    positioning_summary: ""
  };
}

function num(n: unknown, fallback: number): number {
  if (typeof n === "number" && !Number.isNaN(n)) return Math.max(0, Math.min(100, Math.round(n)));
  return fallback;
}

function parseDetails(raw: unknown): SegmentDetails | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  const p = num(d.urgency, 50);
  return {
    urgency: num(d.urgency, p),
    budget_fit: num(d.budget_fit, p),
    acv_potential: num(d.acv_potential, p),
    retention_potential: num(d.retention_potential, p),
    icp_profile: typeof d.icp_profile === "string" ? d.icp_profile : ""
  };
}

export default function IcpSegmentationClient({ environmentId }: { environmentId: string }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [segments, setSegments] = useState<DbSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState<DraftSegment[] | null>(null);
  const [productProfileDraft, setProductProfileDraft] = useState<ProductProfileDraft | null>(null);
  const [replaceAll, setReplaceAll] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [positioningNote, setPositioningNote] = useState<string | null>(null);
  const [profileNote, setProfileNote] = useState<string | null>(null);

  const [activeId, setActiveId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: qErr } = await supabase
      .from("segments")
      .select("id,name,pnf_score,pain_points,notes,details")
      .eq("environment_id", environmentId)
      .order("created_at", { ascending: false });

    if (qErr) setError(qErr.message);
    const rows = (data ?? []) as DbSegment[];
    setSegments(rows);
    setActiveId((prev) => {
      if (rows.length === 0) return null;
      if (prev && rows.some((r) => r.id === prev)) return prev;
      return rows[0].id;
    });
    setLoading(false);
  }, [environmentId, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const active = useMemo(
    () => segments.find((s) => s.id === activeId) ?? segments[0] ?? null,
    [segments, activeId]
  );

  const scorecard = useMemo(() => {
    if (!active) return null;
    const d = parseDetails(active.details);
    const base = active.pnf_score ?? 70;
    if (!d) {
      return [
        ["Urgency", base],
        ["Budget Fit", base],
        ["ACV Potential", base],
        ["Retention Potential", base]
      ] as [string, number][];
    }
    return [
      ["Urgency", d.urgency ?? base],
      ["Budget Fit", d.budget_fit ?? base],
      ["ACV Potential", d.acv_potential ?? base],
      ["Retention Potential", d.retention_potential ?? base]
    ] as [string, number][];
  }, [active]);

  async function onUpload(file: File) {
    setExtracting(true);
    setError(null);
    const fd = new FormData();
    fd.set("file", file);
    try {
      const res = await fetch("/api/segments/extract-document", {
        method: "POST",
        body: fd,
        headers: { "content-type": "application/json" }
      });
      const data = (await res.json()) as {
        ok?: boolean;
        draft?: { segments: DraftSegment[]; productProfile?: Partial<ProductProfileDraft> };
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Extraction failed.");
        return;
      }
      if (data.draft?.segments?.length) {
        setDraft(data.draft.segments);
        const pp = data.draft.productProfile ?? {};
        setProductProfileDraft({
          ...emptyProductProfile(),
          ...pp,
          name: typeof pp.name === "string" ? pp.name : "",
          website_url: typeof pp.website_url === "string" ? pp.website_url : "",
          category: typeof pp.category === "string" ? pp.category : "",
          icp_summary: typeof pp.icp_summary === "string" ? pp.icp_summary : "",
          positioning_summary: typeof pp.positioning_summary === "string" ? pp.positioning_summary : ""
        });
        setReplaceAll(false);
      } else {
        setError("No draft segments returned.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setExtracting(false);
    }
  }

  async function confirmDraft() {
    if (!draft?.length) return;
    setSaving(true);
    setError(null);
    setPositioningNote(null);
    setProfileNote(null);
    const profilePayload = productProfileDraft;
    try {
      const res = await fetch("/api/segments/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          segments: draft,
          mode: replaceAll ? "replace" : "append"
        })
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not save segments.");
        return;
      }
      setDraft(null);
      setProductProfileDraft(null);
      await load();

      if (profilePayload) {
        const pr = await fetch("/api/product/profile/apply-from-icp", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(profilePayload)
        });
        const prData = (await pr.json()) as { ok?: boolean; error?: string };
        if (!pr.ok) {
          setProfileNote(
            prData.error ??
              "Product profile was not updated. Edit fields under Settings → Product profile."
          );
        }
      }
      const posRes = await fetch("/api/positioning/generate-from-segments", {
        method: "POST",
        headers: { "content-type": "application/json" }
      });
      const posData = (await posRes.json()) as { ok?: boolean; error?: string };
      if (!posRes.ok) {
        setPositioningNote(
          posData.error ??
            "Positioning Studio was not updated. Open Positioning Studio and tap Regenerate from ICP segments."
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1
            className="text-3xl font-semibold tracking-tight text-heading"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            ICP Segmentation
          </h1>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-text2">
            Upload an ICP document to propose segments and a draft product profile; confirm to save segments and merge
            profile fields into{" "}
            <Link href="/dashboard/settings/product" className="font-medium text-link hover:underline">
              Settings → Product profile
            </Link>{" "}
            (empty extracted fields keep your current values). Segments match{" "}
            <Link href="/dashboard/settings/segments" className="font-medium text-link hover:underline">
              Settings → Segments
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="cursor-pointer rounded-sm bg-amber px-4 py-2 text-sm font-semibold text-heading shadow-card transition hover:bg-amber-hover disabled:opacity-50">
            {extracting ? "Reading…" : "Upload ICP document"}
            <input
              type="file"
              accept=".pdf,.docx,.xlsx,.xls,.csv"
              className="hidden"
              disabled={extracting}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void onUpload(f);
              }}
            />
          </label>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red/30 bg-red/10 px-3 py-2 text-sm text-red">
          {error}
        </div>
      ) : null}
      {positioningNote ? (
        <div className="rounded-lg border border-amber/40 bg-amber/10 px-3 py-2 text-sm text-heading">
          {positioningNote}
        </div>
      ) : null}
      {profileNote ? (
        <div className="rounded-lg border border-amber/40 bg-amber/10 px-3 py-2 text-sm text-heading">
          {profileNote}
        </div>
      ) : null}

      <AiProgressBar
        active={extracting}
        variant="dashboard"
        title="Reading ICP document…"
        estimate={AI_PROGRESS_ESTIMATE.extract}
        durationMs={75_000}
      />
      <AiProgressBar
        active={saving}
        variant="dashboard"
        title="Saving segments and updating positioning…"
        estimate={AI_PROGRESS_ESTIMATE.positioning}
        durationMs={120_000}
      />

      {draft?.length ? (
        <div className="rounded-lg border border-primary/30 bg-primary-light/40 p-5 shadow-card">
          <div className="text-sm font-semibold text-heading">Review proposed segments</div>
          <p className="mt-1 text-xs text-text2">
            Nothing is saved until you confirm. PDF, Word, or Excel up to 8 MB.
          </p>
          <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-text2">
            <input
              type="checkbox"
              checked={replaceAll}
              onChange={(e) => setReplaceAll(e.target.checked)}
              className="rounded border-input-border"
            />
            Replace all existing segments (otherwise new segments are appended)
          </label>
          <div className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1">
            {draft.map((s, i) => (
              <div
                key={`${s.name}-${i}`}
                className="rounded-lg border border-border bg-surface p-3 text-sm shadow-sm"
              >
                <div className="font-medium text-heading">{s.name}</div>
                <div className="mt-1 text-xs text-text2">
                  PNF {s.pnf_score} · Urgency {s.urgency}% · Budget {s.budget_fit}% · ACV {s.acv_potential}% ·
                  Retention {s.retention_potential}%
                </div>
                <ul className="mt-2 list-disc pl-5 text-xs text-text2">
                  {s.pain_points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
                {s.icp_profile ? (
                  <p className="mt-2 text-xs leading-relaxed text-text2">{s.icp_profile}</p>
                ) : null}
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => confirmDraft()}
              disabled={saving}
              className="rounded-sm bg-amber px-4 py-2 text-sm font-semibold text-heading shadow-card hover:bg-amber-hover disabled:opacity-50"
            >
              {saving ? "Saving…" : "Confirm and save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(null);
                setProductProfileDraft(null);
              }}
              disabled={saving}
              className="rounded-sm border border-input-border bg-surface px-4 py-2 text-sm font-medium text-text hover:bg-surface2"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="text-sm text-text2">Loading segments…</div>
      ) : segments.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface2 p-8 text-center text-sm text-text2">
          No segments yet. Upload an ICP document above, or add segments manually in{" "}
          <Link href="/dashboard/settings/segments" className="font-medium text-link hover:underline">
            Settings
          </Link>
          .
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {segments.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveId(s.id)}
                className={`rounded-lg border p-3 text-left shadow-card transition-colors ${
                  active?.id === s.id
                    ? "border-primary bg-primary-light ring-1 ring-primary/25"
                    : "border-border bg-surface hover:border-primary/40 hover:bg-surface2"
                }`}
              >
                <div className="text-sm font-medium text-heading">{s.name}</div>
                <div className="mt-1 text-xs text-text2">PNF {s.pnf_score}</div>
              </button>
            ))}
          </div>

          {active && scorecard ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-border bg-surface p-4 shadow-card">
                <div className="text-sm font-semibold text-heading">Detailed Scorecard — {active.name}</div>
                {scorecard.map(([k, v]) => (
                  <div key={k} className="mt-3">
                    <div className="mb-1 flex justify-between text-xs text-text2">
                      <span>{k}</span>
                      <span className="tabular-nums font-medium text-heading">{v}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface3 ring-1 ring-inset ring-border/60">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{ width: `${v}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-surface p-4 shadow-card">
                  <div className="text-sm font-semibold text-heading">Pain Points</div>
                  <ul className="mt-2 list-disc pl-5 text-sm text-text2">
                    {(active.pain_points ?? []).map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg border border-border bg-surface p-4 text-sm shadow-card">
                  <div className="text-sm font-semibold text-heading">ICP Profile</div>
                  <p className="mt-2 leading-relaxed text-text2">
                    {parseDetails(active.details)?.icp_profile?.trim() ||
                      active.notes?.trim() ||
                      "Add an ICP document with profile text, or enter notes in Settings → Segments."}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
