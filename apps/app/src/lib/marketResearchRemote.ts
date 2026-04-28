import type { MarketResearchScanResult } from "@/lib/marketResearchTypes";
import { writeMrCache } from "@/lib/marketResearchCache";

const inflight = new Map<
  string,
  Promise<{ summary: string | null; resultJson: MarketResearchScanResult | null } | null>
>();

/**
 * Fetches /api/research/latest once per productId even if multiple callers
 * run in parallel (e.g. React Strict Mode double mount).
 */
export async function loadLatestScanOnce(productId: string): Promise<{
  summary: string | null;
  resultJson: MarketResearchScanResult | null;
} | null> {
  if (inflight.has(productId)) {
    return inflight.get(productId)!;
  }
  const promise = (async () => {
    const res = await fetch("/api/research/latest");
    const contentType = res.headers.get("content-type") ?? "";
    const raw = await res.text();
    if (!contentType.includes("application/json")) return null;
    let data: {
      scan?: { summary?: string | null; result_json?: MarketResearchScanResult | null } | null;
      error?: string;
    };
    try {
      data = JSON.parse(raw) as typeof data;
    } catch {
      return null;
    }
    if (!res.ok || !data?.scan) return null;
    const summary = data.scan.summary ?? null;
    const resultJson = data.scan.result_json ?? null;
    writeMrCache(productId, { summary, resultJson });
    return { summary, resultJson };
  })().finally(() => inflight.delete(productId));

  inflight.set(productId, promise);
  return promise;
}
