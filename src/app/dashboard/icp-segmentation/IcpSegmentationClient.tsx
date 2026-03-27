"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  const [replaceAll, setReplaceAll] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [positioningNote, setPositioningNote] = useState<string | null>(null);

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
    const key = (window.localStorage.getItem("marketing_os_anthropic_api_key") ?? "").trim();
    const fd = new FormData();
    fd.set("file", file);
    try {
      const res = await fetch("/api/segments/extract-document", {
        method: "POST",
        body: fd,
        headers: key ? { "x-anthropic-key": key } : {}
      });
      const data = (await res.json()) as { ok?: boolean; draft?: { segments: DraftSegment[] }; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Extraction failed.");
        return;
      }
      if (data.draft?.segments?.length) {
        setDraft(data.draft.segments);
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
      await load();

      const key = (window.localStorage.getItem("marketing_os_anthropic_api_key") ?? "").trim();
      const posRes = await fetch("/api/positioning/generate-from-segments", {
        method: "POST",
        headers: key ? { "x-anthropic-key": key } : {}
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
            className="text-3xl text-[#f0f0f8]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            ICP Segmentation
          </h1>
          <p className="mt-1 text-sm text-[#9090b0]">
            Upload an ICP document to propose segments; confirm to save. Segments are stored per product
            environment (same list as{" "}
            <Link href="/dashboard/settings/segments" className="text-[#7c6cff] hover:underline">
              Settings → Segments
            </Link>
            ).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="cursor-pointer rounded-xl bg-[#b8ff6c] px-4 py-2 text-sm font-medium text-black hover:opacity-90 disabled:opacity-50">
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
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}
      {positioningNote ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          {positioningNote}
        </div>
      ) : null}

      {draft?.length ? (
        <div className="rounded-2xl border border-[#7c6cff]/40 bg-[#141420] p-5">
          <div className="text-sm font-medium text-[#f0f0f8]">Review proposed segments</div>
          <p className="mt-1 text-xs text-[#9090b0]">
            Nothing is saved until you confirm. PDF, Word, or Excel up to 8 MB.
          </p>
          <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-[#9090b0]">
            <input
              type="checkbox"
              checked={replaceAll}
              onChange={(e) => setReplaceAll(e.target.checked)}
              className="rounded border-[#2a2e3f]"
            />
            Replace all existing segments (otherwise new segments are appended)
          </label>
          <div className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1">
            {draft.map((s, i) => (
              <div key={`${s.name}-${i}`} className="rounded-xl border border-[#2a2e3f] bg-black/20 p-3 text-sm">
                <div className="text-[#f0f0f8]">{s.name}</div>
                <div className="mt-1 text-xs text-[#9090b0]">
                  PNF {s.pnf_score} · Urgency {s.urgency}% · Budget {s.budget_fit}% · ACV {s.acv_potential}% ·
                  Retention {s.retention_potential}%
                </div>
                <ul className="mt-2 list-disc pl-5 text-xs text-[#9090b0]">
                  {s.pain_points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
                {s.icp_profile ? (
                  <p className="mt-2 text-xs leading-relaxed text-[#9090b0]">{s.icp_profile}</p>
                ) : null}
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => confirmDraft()}
              disabled={saving}
              className="rounded-xl bg-[#b8ff6c] px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
            >
              {saving ? "Saving…" : "Confirm and save"}
            </button>
            <button
              type="button"
              onClick={() => setDraft(null)}
              disabled={saving}
              className="rounded-xl border border-[#2a2e3f] bg-[#141420] px-4 py-2 text-sm text-[#f0f0f8] hover:bg-white/5"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="text-sm text-[#9090b0]">Loading segments…</div>
      ) : segments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#2a2e3f] bg-[#141420]/60 p-8 text-center text-sm text-[#9090b0]">
          No segments yet. Upload an ICP document above, or add segments manually in{" "}
          <Link href="/dashboard/settings/segments" className="text-[#7c6cff] hover:underline">
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
                className={`rounded-2xl border p-3 text-left transition-colors ${
                  active?.id === s.id
                    ? "border-[#7c6cff] bg-[#1e1e2e]"
                    : "border-[#2a2e3f] bg-[#141420] hover:border-[#3a3e4f]"
                }`}
              >
                <div className="text-sm text-[#f0f0f8]">{s.name}</div>
                <div className="mt-1 text-xs text-[#9090b0]">PNF {s.pnf_score}</div>
              </button>
            ))}
          </div>

          {active && scorecard ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4">
                <div className="text-sm text-[#f0f0f8]">Detailed Scorecard — {active.name}</div>
                {scorecard.map(([k, v]) => (
                  <div key={k} className="mt-3">
                    <div className="mb-1 flex justify-between text-xs text-[#9090b0]">
                      <span>{k}</span>
                      <span>{v}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-black/30">
                      <div
                        className="h-2 rounded-full bg-[#7c6cff]"
                        style={{ width: `${v}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4">
                  <div className="text-sm text-[#f0f0f8]">Pain Points</div>
                  <ul className="mt-2 list-disc pl-5 text-sm text-[#9090b0]">
                    {(active.pain_points ?? []).map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4 text-sm text-[#9090b0]">
                  <div className="text-sm text-[#f0f0f8]">ICP Profile</div>
                  <p className="mt-2 leading-relaxed">
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
