import type { MarketResearchScanResult } from "@/lib/marketResearchTypes";

const PREFIX = "marketing_os_mr_v1_";

export type MrCachePayload = {
  summary: string | null;
  resultJson: MarketResearchScanResult | null;
};

export function readMrCache(productId: string): MrCachePayload | null {
  if (typeof window === "undefined" || !productId) return null;
  try {
    const raw = window.localStorage.getItem(PREFIX + productId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MrCachePayload;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      summary: parsed.summary ?? null,
      resultJson: parsed.resultJson ?? null
    };
  } catch {
    return null;
  }
}

export function writeMrCache(productId: string, payload: MrCachePayload) {
  if (typeof window === "undefined" || !productId) return;
  try {
    window.localStorage.setItem(PREFIX + productId, JSON.stringify(payload));
  } catch {
    // quota / private mode
  }
}
