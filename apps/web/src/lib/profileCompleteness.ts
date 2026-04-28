import type { PositioningCanvasValue } from "@/lib/positioningStudio";

export type ProfileCompletenessResult = {
  score: number; // 0–100
  missing: string[];
  checks: {
    productName: boolean;
    website: boolean;
    icpSummary: boolean;
    positioningSummary: boolean;
    positioningCanvas: boolean;
    approvedPositioning: boolean;
  };
};

const MIN_ICP_LEN = 40;
const MIN_POS_SUMMARY_LEN = 40;
const MIN_CANVAS_FIELDS_FILLED = 4; // out of 6 doc fields

function nonEmpty(s: unknown, minLen: number): boolean {
  return typeof s === "string" && s.trim().length >= minLen;
}

export function computeProfileCompleteness(input: {
  productName?: string | null;
  websiteUrl?: string | null;
  icpSummary?: string | null;
  positioningSummary?: string | null;
  canvas?: PositioningCanvasValue | null;
  hasApprovedPositioningVersion?: boolean;
}): ProfileCompletenessResult {
  const checks = {
    productName: nonEmpty(input.productName, 2),
    website: typeof input.websiteUrl === "string" && /^https?:\/\//i.test(input.websiteUrl.trim()),
    icpSummary: nonEmpty(input.icpSummary, MIN_ICP_LEN),
    positioningSummary: nonEmpty(input.positioningSummary, MIN_POS_SUMMARY_LEN),
    positioningCanvas: (() => {
      const doc = input.canvas?.doc;
      if (!doc || typeof doc !== "object") return false;
      const keys = ["category", "target", "problem", "solution", "diff", "wedge"] as const;
      let filled = 0;
      for (const k of keys) {
        const v = doc[k];
        if (typeof v === "string" && v.trim().length >= 8) filled += 1;
      }
      return filled >= MIN_CANVAS_FIELDS_FILLED;
    })(),
    approvedPositioning: Boolean(input.hasApprovedPositioningVersion)
  };

  const weights: Array<[keyof ProfileCompletenessResult["checks"], number]> = [
    ["productName", 10],
    ["website", 10],
    ["icpSummary", 20],
    ["positioningSummary", 15],
    ["positioningCanvas", 25],
    ["approvedPositioning", 20]
  ];

  let score = 0;
  const missing: string[] = [];
  for (const [k, w] of weights) {
    if (checks[k]) score += w;
    else {
      if (k === "productName") missing.push("Product name");
      if (k === "website") missing.push("Product website URL (https://…)");
      if (k === "icpSummary") missing.push(`ICP summary (at least ${MIN_ICP_LEN} characters)`);
      if (k === "positioningSummary") missing.push(`Positioning summary in Product settings (at least ${MIN_POS_SUMMARY_LEN} characters)`);
      if (k === "positioningCanvas") missing.push("Positioning canvas (fill most fields in Positioning Studio)");
      if (k === "approvedPositioning") missing.push("Approved positioning version (submit + approve in Positioning Studio)");
    }
  }

  return { score: Math.min(100, Math.round(score)), missing, checks };
}
