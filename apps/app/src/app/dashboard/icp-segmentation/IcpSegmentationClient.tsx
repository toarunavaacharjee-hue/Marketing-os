"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AiProgressBar, AI_PROGRESS_ESTIMATE } from "@/app/dashboard/_components/AiProgressBar";
import { SkeletonIcpSegmentation } from "@/app/dashboard/_components/Skeleton";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { ProductStaleBanner } from "@/components/ProductStaleBanner";
import { ModuleShell } from "@/app/dashboard/_components/ModuleShell";

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
  const [generating, setGenerating] = useState(false);

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

  async function generateWithAi() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/module-generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt:
            "Generate 4–5 distinct ICP segments for this product. For each segment return a JSON object with: name, pnf_score (0-100), pain_points (array of 4-5 strings), urgency (0-100), budget_fit (0-100), acv_potential (0-100), retention_potential (0-100), icp_profile (2-3 sentence description of the buyer persona and buying context). Return a JSON array of segment objects only, no other text.",
          system:
            "You are a B2B go-to-market strategist. Generate realistic, differentiated ICP segments based on the product profile and market context available. Return valid JSON only.",
          length: "short"
        })
      });
      const data = (await res.json()) as { ok?: boolean; text?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "AI generation failed.");
      const raw = data.text ?? "";
      const match = raw.match(/\[[\s\S]*\]/);
      if (!match) throw new Error("Could not parse AI response.");
      const parsed = JSON.parse(match[0]) as DraftSegment[];
      if (!Array.isArray(parsed) || !parsed.length) throw new Error("No segments returned.");
      const normalised: DraftSegment[] = parsed.map((s) => ({
        name: String(s.name ?? "Segment"),
        pnf_score: num(s.pnf_score, 70),
        pain_points: Array.isArray(s.pain_points) ? s.pain_points.map(String) : [],
        urgency: num(s.urgency, 70),
        budget_fit: num(s.budget_fit, 70),
        acv_potential: num(s.acv_potential, 70),
        retention_potential: num(s.retention_potential, 70),
        icp_profile: String(s.icp_profile ?? ""),
        notes: null
      }));
      setDraft(normalised);
      setProductProfileDraft(null);
      setReplaceAll(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  async function onUpload(file: File) {
    setExtracting(true);
    setError(null);
    const fd = new FormData();
    fd.set("file", file);
    try {
      const res = await fetch("/api/segments/extract-document", {
        method: "POST",
        body: fd
        // Do NOT set content-type — browser must auto-set multipart/form-data with boundary
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
    <ModuleShell
      title="ICP Segmentation"
      subtitle="Upload an ICP document or generate segments with AI, then confirm to save and sync your product profile."
      actions={
        <>
          <button
            type="button"
            onClick={() => void generateWithAi()}
            disabled={extracting || generating || saving}
            className="hs-btn hs-btn-secondary disabled:opacity-50"
          >
            {generating ? "Generating…" : "Generate with AI"}
          </button>
          <label className="hs-btn hs-btn-cta cursor-pointer disabled:opacity-50">
            {extracting ? "Reading…" : "Upload ICP document"}
            <input
              type="file"
              accept=".pdf,.docx,.xlsx,.xls,.csv"
              className="hidden"
              disabled={extracting || generating}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void onUpload(f);
              }}
            />
          </label>
        </>
      }
    >
      <div className="space-y-5">
      <ProductStaleBanner environmentId={environmentId} moduleName="ICP Segmentation" />

      {error ? (
        <div className="hs-alert hs-alert-error flex items-start justify-between gap-4">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void load()}
            className="hs-btn hs-btn-secondary shrink-0 text-xs"
          >
            Try again
          </button>
        </div>
      ) : null}
      {positioningNote ? (
        <div className="hs-alert hs-alert-warn">
          {positioningNote}
        </div>
      ) : null}
      {profileNote ? (
        <div className="hs-alert hs-alert-warn">
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
        active={generating}
        variant="dashboard"
        title="Generating ICP segments with AI…"
        estimate={AI_PROGRESS_ESTIMATE.short}
        durationMs={30_000}
      />
      <AiProgressBar
        active={saving}
        variant="dashboard"
        title="Saving segments and updating positioning…"
        estimate={AI_PROGRESS_ESTIMATE.positioning}
        durationMs={120_000}
      />

      {draft?.length ? (
        <div className="hs-card p-5">
          <div className="text-[14px] font-semibold text-heading">Review proposed segments</div>
          <div className="mt-0.5 text-[12px] text-text2">
            Nothing is saved until you confirm. PDF, Word, or Excel up to 8 MB.
          </div>
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
                className="hs-card p-3 text-sm"
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
              className="hs-btn hs-btn-cta disabled:opacity-50"
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
              className="hs-btn hs-btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <SkeletonIcpSegmentation />
      ) : segments.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface2 p-8 text-center text-sm text-text2">
          No segments yet. Upload an ICP document above, or add segments manually in{" "}
          <Link href="/dashboard/settings/segments" className="font-medium text-link underline underline-offset-2">
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
                className={`hs-card p-3 text-left transition-[border-color,background-color,box-shadow,transform] duration-200 ease-out ${
                  active?.id === s.id
                    ? "border-primary bg-primary-light ring-1 ring-primary/25"
                    : "hover:border-primary/40 hover:bg-surface2 hover:shadow-md active:scale-[0.99] motion-reduce:active:scale-100"
                }`}
              >
                <div className="text-sm font-medium text-heading">{s.name}</div>
                <div className="mt-1 text-xs text-text2">PNF {s.pnf_score}</div>
              </button>
            ))}
          </div>

          {active && scorecard ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="hs-card p-4">
                <div className="text-[14px] font-semibold text-heading">Detailed Scorecard — {active.name}</div>
                {scorecard.map(([k, v]) => (
                  <div key={k} className="mt-3">
                    <div className="mb-1 flex justify-between text-xs text-text2">
                      <span>{k}</span>
                      <span className="tabular-nums font-medium text-heading">{v}%</span>
                    </div>
                    <div className="hs-progress">
                      <div
                        className="hs-progress-bar transition-[width] duration-500 ease-aimw-out motion-reduce:transition-none"
                        style={{ width: `${v}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                <div className="hs-card p-4">
                  <div className="text-[14px] font-semibold text-heading">Pain Points</div>
                  <ul className="mt-2 list-disc pl-5 text-sm text-text2">
                    {(active.pain_points ?? []).map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>
                <div className="hs-card p-4">
                  <div className="text-[14px] font-semibold text-heading">ICP Profile</div>
                  <p className="mt-2 text-sm leading-relaxed text-text2">
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
    </ModuleShell>
  );
}
