"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AiProgressBar, AI_PROGRESS_ESTIMATE } from "@/app/dashboard/_components/AiProgressBar";
import { EmptyState } from "@/app/dashboard/_components/EmptyState";
import { SkeletonSegmentList } from "@/app/dashboard/_components/Skeleton";
import { useToast } from "@/app/dashboard/_components/Toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { ProductStaleBanner } from "@/components/ProductStaleBanner";
import {
  buildMessagingPillarsPrompt,
  MESSAGING_PILLARS_SYSTEM
} from "@/lib/pmmPrompts";

type PillarData = {
  headline: string;
  subHeadline: string;
  valueProp1: string;
  valueProp2: string;
  valueProp3: string;
  proofPoint: string;
  objection1: string;
  response1: string;
  objection2: string;
  response2: string;
  objection3: string;
  response3: string;
};

type SegmentPillar = {
  segmentId: string;
  segmentName: string;
  painPoints: string[];
  pillars: PillarData;
};

const emptyPillars = (): PillarData => ({
  headline: "",
  subHeadline: "",
  valueProp1: "",
  valueProp2: "",
  valueProp3: "",
  proofPoint: "",
  objection1: "",
  response1: "",
  objection2: "",
  response2: "",
  objection3: "",
  response3: ""
});

const MODULE = "messaging_artifacts";
const KEY = "pillars";

function parsePillarsFromText(text: string): PillarData {
  const pillars = emptyPillars();

  function extract(label: string): string {
    const re = new RegExp(`^${label}:\\s*(.+)$`, "mi");
    const m = text.match(re);
    return m ? m[1].trim() : "";
  }

  pillars.headline = extract("Headline");
  pillars.subHeadline = extract("Sub-headline");
  pillars.valueProp1 = extract("Value prop 1");
  pillars.valueProp2 = extract("Value prop 2");
  pillars.valueProp3 = extract("Value prop 3");
  pillars.proofPoint = extract("Proof point");

  // Objections use "Objection 1: ... | Response: ..." format
  const objPattern = /^Objection (\d):\s*(.+?)\s*\|\s*Response:\s*(.+)$/m;
  const objMatches = [...text.matchAll(new RegExp(objPattern.source, "gm"))];
  for (const m of objMatches) {
    const num = m[1];
    const obj = m[2].trim();
    const resp = m[3].trim();
    if (num === "1") { pillars.objection1 = obj; pillars.response1 = resp; }
    if (num === "2") { pillars.objection2 = obj; pillars.response2 = resp; }
    if (num === "3") { pillars.objection3 = obj; pillars.response3 = resp; }
  }

  return pillars;
}

function PillarField({
  label,
  value,
  onChange,
  placeholder,
  rows = 1
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-text3">
        {label}
      </label>
      {rows > 1 ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className="hs-input w-full"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="hs-input w-full"
        />
      )}
    </div>
  );
}

export function MessagingArtifactsClient({
  environmentId,
  productName = ""
}: {
  environmentId: string;
  productName?: string;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const toast = useToast();
  const [segments, setSegments] = useState<{ id: string; name: string; pain_points?: string[] }[]>([]);
  const [segmentPillars, setSegmentPillars] = useState<Record<string, SegmentPillar>>({});
  const [positioningContext, setPositioningContext] = useState<string | undefined>(undefined);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: segData }, { data: ms }, { data: posRow }] = await Promise.all([
      supabase
        .from("segments")
        .select("id,name,pain_points")
        .eq("environment_id", environmentId)
        .order("created_at", { ascending: false }),
      supabase
        .from("module_settings")
        .select("value_json")
        .eq("environment_id", environmentId)
        .eq("module", MODULE)
        .eq("key", KEY)
        .maybeSingle(),
      supabase
        .from("module_settings")
        .select("value_json")
        .eq("environment_id", environmentId)
        .eq("module", "positioning_studio")
        .eq("key", "canvas")
        .maybeSingle()
    ]);

    // Build positioning context string from approved canvas
    const posDoc = (posRow?.value_json as { doc?: Record<string, string> } | null)?.doc;
    if (posDoc) {
      const lines: string[] = [];
      if (posDoc.category) lines.push(`Market category: ${posDoc.category}`);
      if (posDoc.target) lines.push(`Target customer: ${posDoc.target}`);
      if (posDoc.problem) lines.push(`Core problem: ${posDoc.problem}`);
      if (posDoc.solution) lines.push(`Solution: ${posDoc.solution}`);
      if (posDoc.diff) lines.push(`Differentiation: ${posDoc.diff}`);
      if (posDoc.wedge) lines.push(`Wedge: ${posDoc.wedge}`);
      if (lines.length) setPositioningContext(lines.join("\n"));
    }

    const segs = (segData ?? []) as { id: string; name: string; pain_points?: string[] }[];
    setSegments(segs);

    const stored = ((ms as { value_json?: unknown } | null)?.value_json ?? {}) as Record<string, unknown>;
    const pillarsMap: Record<string, SegmentPillar> = {};

    for (const seg of segs) {
      const raw = stored[seg.id];
      if (raw && typeof raw === "object") {
        const r = raw as Record<string, unknown>;
        pillarsMap[seg.id] = {
          segmentId: seg.id,
          segmentName: seg.name,
          painPoints: seg.pain_points ?? [],
          pillars: {
            headline: String(r.headline ?? ""),
            subHeadline: String(r.subHeadline ?? ""),
            valueProp1: String(r.valueProp1 ?? ""),
            valueProp2: String(r.valueProp2 ?? ""),
            valueProp3: String(r.valueProp3 ?? ""),
            proofPoint: String(r.proofPoint ?? ""),
            objection1: String(r.objection1 ?? ""),
            response1: String(r.response1 ?? ""),
            objection2: String(r.objection2 ?? ""),
            response2: String(r.response2 ?? ""),
            objection3: String(r.objection3 ?? ""),
            response3: String(r.response3 ?? "")
          }
        };
      } else {
        pillarsMap[seg.id] = {
          segmentId: seg.id,
          segmentName: seg.name,
          painPoints: seg.pain_points ?? [],
          pillars: emptyPillars()
        };
      }
    }

    setSegmentPillars(pillarsMap);
    if (segs.length > 0 && !expandedId) setExpandedId(segs[0].id);
    setLoading(false);
  }, [environmentId, supabase]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [load]);

  const persist = useCallback(
    async (next: Record<string, SegmentPillar>) => {
      setSaving(true);
      const payload: Record<string, PillarData> = {};
      for (const [id, sp] of Object.entries(next)) {
        payload[id] = sp.pillars;
      }
      const { error: upErr } = await supabase.from("module_settings").upsert({
        environment_id: environmentId,
        module: MODULE,
        key: KEY,
        value_json: payload
      });
      setSaving(false);
      if (upErr) setError(upErr.message);
    },
    [environmentId, supabase]
  );

  function schedule(next: Record<string, SegmentPillar>) {
    setSegmentPillars(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void persist(next), 400);
  }

  function patchPillars(segId: string, patch: Partial<PillarData>) {
    const existing = segmentPillars[segId];
    if (!existing) return;
    const next = {
      ...segmentPillars,
      [segId]: { ...existing, pillars: { ...existing.pillars, ...patch } }
    };
    schedule(next);
  }

  async function generatePillars(segId: string) {
    const sp = segmentPillars[segId];
    if (!sp) return;
    setGeneratingId(segId);
    setGenError(null);
    const prompt = buildMessagingPillarsPrompt({
      productOrFeature: productName || "this product",
      segmentName: sp.segmentName,
      segmentPains: sp.painPoints.length ? sp.painPoints.join("; ") : undefined,
      positioningContext: positioningContext || undefined
    });
    try {
      const res = await fetch("/api/ai/module-generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt, system: MESSAGING_PILLARS_SYSTEM, length: "medium" })
      });
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Generation failed.");
      const parsed = parsePillarsFromText(data.text ?? "");
      const next = {
        ...segmentPillars,
        [segId]: { ...sp, pillars: parsed }
      };
      schedule(next);
      toast(`✓ Pillars generated for ${sp.segmentName}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Generation failed.";
      setGenError(msg);
      toast(msg, "error");
    } finally {
      setGeneratingId(null);
    }
  }

  function hasContent(p: PillarData): boolean {
    return Boolean(p.headline || p.valueProp1 || p.objection1);
  }

  if (loading) return <SkeletonSegmentList count={3} />;

  return (
    <div className="space-y-4">
      <ProductStaleBanner environmentId={environmentId} moduleName="Messaging & Artifacts" />
      {error ? (
        <div className="hs-alert hs-alert-error flex items-start justify-between gap-4">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void load()}
            className="hs-btn hs-btn-secondary shrink-0"
          >
            Try again
          </button>
        </div>
      ) : null}
      {genError ? (
        <div className="hs-alert hs-alert-error">
          {genError}
        </div>
      ) : null}

      <p className="text-xs text-text2">
        {saving ? "Saving…" : "Pillars saved per product environment."}{" "}
        {segments.length === 0
          ? "Add segments in Settings → Segments to get started."
          : `${segments.length} segment${segments.length !== 1 ? "s" : ""} found.`}
        {positioningContext ? (
          <span className="ml-2 rounded-full border border-teal/30 bg-teal/10 px-2 py-0.5 text-[10px] font-medium text-teal">
            ✓ Positioning loaded
          </span>
        ) : null}
      </p>

      {segments.length === 0 ? (
        <EmptyState
          icon="✨"
          headline="No ICP segments yet"
          subheading="Each segment gets its own messaging pillar set — headlines, value props, and objection handling tailored to that buyer."
          cta={{ label: "Add segments", href: "/dashboard/settings/segments" }}
          secondaryCta={{ label: "Upload ICP document", href: "/dashboard/icp-segmentation" }}
        />
      ) : (
        <div className="space-y-3">
          {segments.map((seg) => {
            const sp = segmentPillars[seg.id];
            if (!sp) return null;
            const isOpen = expandedId === seg.id;
            const isGenerating = generatingId === seg.id;
            const filled = hasContent(sp.pillars);

            return (
              <div
                key={seg.id}
                className="hs-card"
              >
                {/* Segment header */}
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isOpen ? null : seg.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <span
                      className={`inline-block h-2 w-2 shrink-0 rounded-full ${filled ? "bg-emerald-500" : "bg-border"}`}
                      title={filled ? "Pillars defined" : "Not generated yet"}
                    />
                    <span className="truncate text-sm font-semibold text-heading">
                      {seg.name}
                    </span>
                    <span className="text-xs text-text3 transition-transform duration-200">
                      {isOpen ? "▾" : "▸"}
                    </span>
                  </button>

                  <div className="flex shrink-0 items-center gap-2">
                    {filled ? (
                      <span className="text-[11px] text-emerald-600">Pillars ready</span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void generatePillars(seg.id)}
                      disabled={Boolean(generatingId)}
                      className="hs-btn hs-btn-primary disabled:opacity-40"
                    >
                      {isGenerating ? "Generating…" : filled ? "Regenerate" : "Generate pillars"}
                    </button>
                  </div>
                </div>

                <AiProgressBar
                  active={isGenerating}
                  variant="dark"
                  title={`Generating messaging pillars for ${seg.name}…`}
                  estimate={AI_PROGRESS_ESTIMATE.short}
                  durationMs={55_000}
                />

                {isOpen ? (
                  <div className="border-t border-border px-4 pb-4 pt-3">
                    <div className="grid gap-4 lg:grid-cols-2">
                      {/* Left column: headline, sub-headline, value props, proof point */}
                      <div className="space-y-3">
                        <PillarField
                          label="Headline"
                          value={sp.pillars.headline}
                          onChange={(v) => patchPillars(seg.id, { headline: v })}
                          placeholder="Under 10 words, outcome-led"
                        />
                        <PillarField
                          label="Sub-headline"
                          value={sp.pillars.subHeadline}
                          onChange={(v) => patchPillars(seg.id, { subHeadline: v })}
                          placeholder="1 sentence — who it's for and what changes"
                          rows={2}
                        />
                        <div className="hs-card p-3 space-y-2">
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-text3">
                            Value propositions
                          </div>
                          <PillarField
                            label="Value prop 1"
                            value={sp.pillars.valueProp1}
                            onChange={(v) => patchPillars(seg.id, { valueProp1: v })}
                            placeholder="Outcome, not feature — 1 sentence"
                          />
                          <PillarField
                            label="Value prop 2"
                            value={sp.pillars.valueProp2}
                            onChange={(v) => patchPillars(seg.id, { valueProp2: v })}
                            placeholder="Outcome, not feature — 1 sentence"
                          />
                          <PillarField
                            label="Value prop 3"
                            value={sp.pillars.valueProp3}
                            onChange={(v) => patchPillars(seg.id, { valueProp3: v })}
                            placeholder="Outcome, not feature — 1 sentence"
                          />
                        </div>
                        <PillarField
                          label="Proof point"
                          value={sp.pillars.proofPoint}
                          onChange={(v) => patchPillars(seg.id, { proofPoint: v })}
                          placeholder="Specific stat, customer result, or named example"
                          rows={2}
                        />
                      </div>

                      {/* Right column: objections */}
                      <div className="space-y-3">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-text3">
                          Objection handling
                        </div>
                        {([1, 2, 3] as const).map((n) => {
                          const objKey = `objection${n}` as keyof PillarData;
                          const respKey = `response${n}` as keyof PillarData;
                          return (
                            <div
                              key={n}
                              className="rounded-xl border border-border bg-surface2 p-3 space-y-2"
                            >
                              <PillarField
                                label={`Objection ${n}`}
                                value={sp.pillars[objKey]}
                                onChange={(v) => patchPillars(seg.id, { [objKey]: v })}
                                placeholder="Common objection from prospects"
                              />
                              <PillarField
                                label="Response"
                                value={sp.pillars[respKey]}
                                onChange={(v) => patchPillars(seg.id, { [respKey]: v })}
                                placeholder="1-sentence reframe"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
