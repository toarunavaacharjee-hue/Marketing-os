import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSelectedProductId } from "@/lib/productContext";
import { extractSameOriginLinks, isLikelyDistinctPage } from "@/lib/websiteAssetIngest";
import { parseJsonObject } from "@/lib/extractJsonObject";

type AnthropicMessageResponse = {
  content?: Array<{ type?: string; text?: string }>;
  error?: { message?: string };
};

function asStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function normalizeUrl(u: string): string {
  const raw = (u ?? "").trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return `https://${raw}`;
}

function stripHtmlToText(html: string): string {
  const noScript = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
  return noScript
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchPage(url: string) {
  const res = await fetch(url, {
    method: "GET",
    redirect: "follow",
    headers: {
      "user-agent": "MarketingOSResearchBot/1.0 (+https://example.local; contact: support)"
    }
  });
  const html = await res.text();
  const text = stripHtmlToText(html);
  return { ok: res.ok, status: res.status, url: res.url, text, html };
}

function extractExternalLinksFromHtml(html: string, baseUrl: string, limit: number): string[] {
  let base: URL;
  try {
    base = new URL(baseUrl);
  } catch {
    return [];
  }

  const out: string[] = [];
  const seen = new Set<string>();
  const re = /<a[^>]+href\s*=\s*["']([^"'<>]+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null && out.length < limit) {
    const raw = (m[1] ?? "").trim();
    if (!raw) continue;
    if (raw.startsWith("mailto:") || raw.startsWith("javascript:") || raw.startsWith("tel:")) continue;
    if (raw.startsWith("#")) continue;
    try {
      const u = new URL(raw, base);
      if (u.protocol !== "http:" && u.protocol !== "https:") continue;
      if (u.origin === base.origin) continue;
      const path = u.pathname.toLowerCase();
      if (/\.(pdf|zip|png|jpe?g|gif|webp|svg|ico|css|js|xml|json)$/i.test(path)) continue;
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

function stripUrlToOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

async function urlRespondsOk(url: string, timeoutMs: number): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "MarketingOSResearchBot/1.0 (+https://example.local; contact: support)"
      }
    });
    return Boolean(res.ok);
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const productId = await getSelectedProductId();
    if (!productId) return NextResponse.json({ error: "No product selected." }, { status: 400 });

    const body = (await req.json().catch(() => ({}))) as { replaceCompetitors?: boolean };
    const replaceCompetitors = Boolean(body?.replaceCompetitors);

    const { data: product, error: pErr } = await supabase
      .from("products")
      .select("id,name,website_url")
      .eq("id", productId)
      .maybeSingle();

    if (pErr || !product) return NextResponse.json({ error: pErr?.message ?? "Product not found." }, { status: 404 });

    const productName = asStr(product.name);
    const baseUrl = normalizeUrl(asStr(product.website_url));
    if (!productName) return NextResponse.json({ error: "Product name is missing." }, { status: 400 });
    if (!baseUrl) return NextResponse.json({ error: "Product website URL is missing." }, { status: 400 });

    const { count: competitorCount } = await supabase
      .from("product_competitors")
      .select("id", { count: "exact", head: true })
      .eq("product_id", productId);

    const shouldInsertCompetitors = replaceCompetitors || !competitorCount || Number(competitorCount) === 0;
    if (!shouldInsertCompetitors) {
      return NextResponse.json({ ok: true, filled: { competitors_inserted: 0, competitor_generation_available: true } });
    }

    const headerKey = req.headers.get("x-anthropic-key")?.trim() ?? "";
    const anthropicKey = (headerKey || process.env.ANTHROPIC_API_KEY || "").trim();
    if (!anthropicKey) {
      return NextResponse.json({ error: "Missing Anthropic API key." }, { status: 400 });
    }

    // Candidate competitor URLs from the product's own website external links.
    const MAX_EXTRA_PRODUCT_PAGES = 6;
    const home = await fetchPage(baseUrl).catch(() => null);
    if (!home?.ok) return NextResponse.json({ error: "Could not fetch product website." }, { status: 400 });

    const links = extractSameOriginLinks(home.html ?? home.text, baseUrl, MAX_EXTRA_PRODUCT_PAGES);
    const extraPages = await Promise.all(
      links.map(async (u) => {
        try {
          return await fetchPage(u);
        } catch {
          return null;
        }
      })
    );

    const homeText = home.text ?? "";
    const distinctExtra = (extraPages.filter(Boolean) as Array<{ ok: boolean; text: string; html?: string; url: string }>).filter((p) =>
      isLikelyDistinctPage(homeText, p.text ?? "", Boolean(p.ok))
    );

    const competitorCandidatesSet = new Set<string>();
    const candidateHtmlPages: Array<{ html?: string; url: string }> = [{ html: home.html, url: home.url }, ...distinctExtra.map((p) => ({ html: (p as any).html, url: p.url }))];
    for (const page of candidateHtmlPages) {
      if (!page.html) continue;
      for (const u of extractExternalLinksFromHtml(page.html, baseUrl, 20)) competitorCandidatesSet.add(u);
      if (competitorCandidatesSet.size >= 60) break;
    }
    const competitorCandidates = Array.from(competitorCandidatesSet).slice(0, 60);

    if (replaceCompetitors) {
      const del = await supabase.from("product_competitors").delete().eq("product_id", productId);
      if (del.error) return NextResponse.json({ error: del.error.message }, { status: 500 });
    }

    let competitorsInserted = 0;
    let competitor_generation_available = true;

    if (competitorCandidates.length) {
      const allowed = new Set(competitorCandidates);
      const systemC = `You choose likely direct competitors from a list of candidate URLs extracted from the product's own website.
Output ONLY valid JSON (no prose).

Schema exactly:
{
  "competitors": [ { "name": string, "website_url": string } ]
}

Rules:
- You MUST copy "website_url" values exactly from the provided candidates list.
- Only include competitors if they are clearly alternative products.
- If unsure, return an empty array.`;

      const userC = `Product name: ${productName}

Candidate external URLs (pick from these exactly):
${competitorCandidates.map((u, i) => `${i + 1}. ${u}`).join("\n")}`;

      const competitorRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 900,
          temperature: 0.2,
          system: systemC,
          messages: [{ role: "user", content: userC }]
        })
      });

      const competitorData = (await competitorRes.json()) as AnthropicMessageResponse;
      if (competitorRes.ok) {
        const competitorOutText = competitorData.content?.find((c) => c.type === "text")?.text ?? "";
        const competitorParsed = parseJsonObject(competitorOutText);
        const rawComps = competitorParsed?.competitors;
        const compsArr = Array.isArray(rawComps) ? rawComps : [];

        const validated = compsArr
          .map((item) => item as Record<string, unknown>)
          .map((c) => {
            const website_url = asStr(c.website_url);
            if (!website_url || !allowed.has(website_url)) return null;
            const name = asStr(c.name);
            return { name: name || website_url.replace(/^https?:\/\//, "").split("/")[0], website_url };
          })
          .filter(Boolean) as Array<{ name: string; website_url: string }>;

        const unique = new Map<string, { name: string; website_url: string }>();
        for (const c of validated) unique.set(c.website_url, c);
        const toInsert = Array.from(unique.values()).slice(0, 5);

        if (toInsert.length) {
          const rows = toInsert
            .filter((c) => c.name.trim() && c.website_url.trim())
            .map((c) => ({ product_id: productId, name: c.name.trim(), website_url: c.website_url.trim() }));
          if (rows.length) {
            const ins = await supabase.from("product_competitors").insert(rows);
            if (!ins.error) competitorsInserted = rows.length;
          }
        }
      }
    } else {
      competitor_generation_available = false;
    }

    // Fallback: if still none, ask the model for competitors and verify URLs respond.
    if (competitorsInserted === 0) {
      competitor_generation_available = true;
      const baseOrigin = stripUrlToOrigin(baseUrl);

      const fallbackSystemC = `You propose likely direct competitors for a B2B product.
Output ONLY valid JSON (no prose).

Schema exactly:
{
  "competitors": [ { "name": string, "website_url": string } ]
}

Rules:
- Competitors must be alternative vendors/products, not blogs/docs.
- Provide website_url as a full https URL to the vendor's homepage.
- If unsure, return an empty array.`;

      const fallbackUserC = `Product name: ${productName}
Product website: ${baseUrl}`;

      const fallbackRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 900,
          temperature: 0.2,
          system: fallbackSystemC,
          messages: [{ role: "user", content: fallbackUserC }]
        })
      });

      const fallbackData = (await fallbackRes.json()) as AnthropicMessageResponse;
      if (fallbackRes.ok) {
        const fallbackOutText = fallbackData.content?.find((c) => c.type === "text")?.text ?? "";
        const parsed = parseJsonObject(fallbackOutText);
        const rawComps = parsed?.competitors;
        const compsArr = Array.isArray(rawComps) ? rawComps : [];

        const toTry: Array<{ name: string; website_url: string }> = [];
        for (const item of compsArr) {
          const c = item as Record<string, unknown>;
          const name = asStr(c.name);
          const website_url_raw = asStr(c.website_url);
          const normalized = website_url_raw ? normalizeUrl(website_url_raw) : "";
          if (!name || !normalized) continue;
          if (baseOrigin && stripUrlToOrigin(normalized) === baseOrigin) continue;
          toTry.push({ name, website_url: normalized });
          if (toTry.length >= 8) break;
        }

        const verified: Array<{ name: string; website_url: string }> = [];
        for (const c of toTry) {
          const ok = await urlRespondsOk(c.website_url, 4500);
          if (!ok) continue;
          verified.push(c);
          if (verified.length >= 5) break;
        }

        // Validation only requires competitor URLs to exist.
        // If verification fails (sites block bots), still insert top suggestions so scans can proceed.
        const toInsert = verified.length ? verified : toTry.slice(0, 3);

        if (toInsert.length) {
          const rows = toInsert.map((c) => ({
            product_id: productId,
            name: c.name.trim(),
            website_url: c.website_url.trim()
          }));
          const ins = await supabase.from("product_competitors").insert(rows);
          if (!ins.error) competitorsInserted = rows.length;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      filled: {
        competitors_inserted: competitorsInserted,
        competitor_generation_available
      }
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}

