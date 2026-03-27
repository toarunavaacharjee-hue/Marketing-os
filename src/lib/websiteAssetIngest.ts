import type { SupabaseClient } from "@supabase/supabase-js";

export type CrawlRowLike = {
  url: string;
  source_type: "product" | "competitor" | "news_rss" | "review_g2" | "review_capterra";
  competitor_id: string | null;
  label: string;
  ok: boolean;
  status: number;
  title: string | null;
  text: string;
};

/** Same-origin http(s) links from HTML (paths suitable for Website & Pages). */
export function extractSameOriginLinks(html: string, baseUrl: string, max: number): string[] {
  let base: URL;
  try {
    base = new URL(baseUrl);
  } catch {
    return [];
  }
  const seen = new Set<string>([base.href.split("#")[0]]);
  const out: string[] = [];
  const re = /<a[^>]+href\s*=\s*["']([^"'<>]+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null && out.length < max) {
    const raw = (m[1] ?? "").trim();
    if (
      !raw ||
      raw.startsWith("mailto:") ||
      raw.startsWith("javascript:") ||
      raw.startsWith("tel:") ||
      raw.startsWith("#")
    ) {
      continue;
    }
    try {
      const u = new URL(raw, base);
      if (u.protocol !== "http:" && u.protocol !== "https:") continue;
      if (u.origin !== base.origin) continue;
      const path = u.pathname.toLowerCase();
      if (/\.(pdf|zip|png|jpe?g|gif|webp|svg|ico|css|js|xml|json)$/i.test(path)) {
        continue;
      }
      const normalized = u.href.split("#")[0];
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      out.push(normalized);
    } catch {
      /* skip */
    }
  }
  return out;
}

/**
 * Extra URLs from the homepage often hit SPAs that return 200 with the same HTML shell as `/`
 * (or nav links to routes that don’t really exist). Drop those so `/pricing` etc. don’t appear
 * when the body is effectively the same as the homepage.
 */
export function isLikelyDistinctPage(
  homePageText: string,
  candidateText: string,
  fetchOk: boolean
): boolean {
  if (!fetchOk) return false;
  const t = candidateText.trim();
  if (t.length < 120) return false;
  const h = homePageText.trim();
  if (h.length < 200) return true;
  const n = Math.min(1400, h.length, t.length);
  if (n < 200) return t.length >= 120;
  let same = 0;
  for (let i = 0; i < n; i++) {
    if (h[i] === t[i]) same++;
  }
  const ratio = same / n;
  return ratio < 0.985;
}

/**
 * Upsert `assets` rows for successfully crawled product + competitor HTML pages.
 * - Product pages → source `website`
 * - Competitor pages → source `competitor_site`
 */
export async function ingestPageAssetsFromCrawl(
  supabase: SupabaseClient,
  environmentId: string,
  rows: CrawlRowLike[]
): Promise<{ inserted: number; updated: number; error?: string }> {
  const pageRows = rows.filter(
    (r) =>
      r.ok &&
      r.text.length > 0 &&
      (r.source_type === "product" || r.source_type === "competitor")
  );
  let inserted = 0;
  let updated = 0;
  const now = new Date().toISOString();

  for (const r of pageRows) {
    const source = r.source_type === "product" ? "website" : "competitor_site";
    const title = (r.title?.trim() || r.url).slice(0, 500);
    const url = r.url.split("#")[0];

    const { data: existing, error: selErr } = await supabase
      .from("assets")
      .select("id")
      .eq("environment_id", environmentId)
      .eq("url", url)
      .maybeSingle();

    if (selErr) {
      return { inserted, updated, error: selErr.message };
    }

    if (existing?.id) {
      const { error: upErr } = await supabase
        .from("assets")
        .update({
          title,
          status: "indexed",
          last_seen_at: now,
          source,
          is_demo: false
        })
        .eq("id", existing.id);
      if (upErr) return { inserted, updated, error: upErr.message };
      updated++;
    } else {
      const { error: insErr } = await supabase.from("assets").insert({
        environment_id: environmentId,
        source,
        asset_type: "page",
        title,
        url,
        status: "indexed",
        last_seen_at: now,
        is_demo: false
      });
      if (insErr) return { inserted, updated, error: insErr.message };
      inserted++;
    }
  }

  return { inserted, updated };
}
