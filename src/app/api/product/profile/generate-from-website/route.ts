import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDefaultEnvironmentIdForSelectedProduct, getSelectedProductId } from "@/lib/productContext";
import { extractSameOriginLinks, isLikelyDistinctPage } from "@/lib/websiteAssetIngest";
import { parseJsonObject } from "@/lib/extractJsonObject";

type AnthropicMessageResponse = {
  content?: Array<{ type?: string; text?: string }>;
  error?: { message?: string };
};

type SegmentDraft = {
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

function clamp0to100(n: unknown, fallback: number): number {
  if (typeof n !== "number" || Number.isNaN(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function asStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function asPainPoints(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => asStr(x)).filter(Boolean).slice(0, 6);
}

function normalizeUrl(u: string): string {
  const raw = (u ?? "").trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return `https://${raw}`;
}

function stripHtmlToText(html: string): string {
  const noScript = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");
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

function titleFromHtml(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m?.[1]?.replace(/\s+/g, " ").trim() ?? null;
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
  const title = titleFromHtml(html);
  const text = stripHtmlToText(html);
  return { ok: res.ok, status: res.status, url: res.url, title, text, html };
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

    const env = await getDefaultEnvironmentIdForSelectedProduct();
    if (!env) return NextResponse.json({ error: "No default environment for selected product." }, { status: 400 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let body: any = {};
    try {
      body = (await req.json()) ?? {};
    } catch {
      body = {};
    }

    const replaceSegments = Boolean(body?.replaceSegments);

    const headerKey = req.headers.get("x-anthropic-key")?.trim() ?? "";
    const anthropicKey = (headerKey || process.env.ANTHROPIC_API_KEY || "").trim();
    if (!anthropicKey) {
      return NextResponse.json(
        { error: "Missing Anthropic API key. Add your key in the sidebar or Settings." },
        { status: 400 }
      );
    }

    const { data: product, error: pErr } = await supabase
      .from("products")
      .select("id,name,website_url,category,icp_summary,positioning_summary")
      .eq("id", productId)
      .maybeSingle();

    if (pErr || !product) {
      return NextResponse.json({ error: pErr?.message ?? "Product not found." }, { status: 404 });
    }

    const productName = asStr(product.name);
    const baseUrl = normalizeUrl(asStr(product.website_url));
    if (!productName.trim()) {
      return NextResponse.json({ error: "Product name is missing." }, { status: 400 });
    }
    if (!baseUrl) {
      return NextResponse.json({ error: "Product website URL is missing." }, { status: 400 });
    }

    // Crawl a few same-origin pages and build a condensed text bundle for the model.
    const MAX_EXTRA_PRODUCT_PAGES = 6;
    const MAX_HOME_TEXT = 18000;
    const MAX_OTHER_TEXT = 9000;
    const MAX_TOTAL_TEXT = 50000;

    const home = await fetchPage(baseUrl).catch(() => null);
    if (!home?.ok) {
      return NextResponse.json({ error: `Could not fetch product website: ${home?.status ?? "unknown"}` }, { status: 400 });
    }

    const homeText = home.text ?? "";
    const links = extractSameOriginLinks(home.html ?? homeText, baseUrl, MAX_EXTRA_PRODUCT_PAGES);

    const extraPages = await Promise.all(
      links.map(async (u) => {
        try {
          const page = await fetchPage(u);
          return page;
        } catch {
          return null;
        }
      })
    );

    const distinctExtra = (extraPages.filter(Boolean) as Array<Awaited<ReturnType<typeof fetchPage>>>).filter((p) =>
      isLikelyDistinctPage(homeText, p.text ?? "", Boolean(p.ok))
    );

    const snapshots: string[] = [];
    let totalChars = 0;

    const addSnapshot = (label: string, url: string, title: string | null, text: string) => {
      const clipped =
        label === "Your site"
          ? text.slice(0, MAX_HOME_TEXT)
          : text.slice(0, MAX_OTHER_TEXT);
      const blob = `SOURCE: ${label}\nURL: ${url}\n${title ? `Title: ${title}\n` : ""}TEXT:\n${clipped}\n`;
      if (!clipped.trim()) return;
      if (totalChars + blob.length > MAX_TOTAL_TEXT) return;
      snapshots.push(blob);
      totalChars += blob.length;
    };

    addSnapshot("Your site", home.url, home.title, home.text ?? "");
    for (const p of distinctExtra.slice(0, MAX_EXTRA_PRODUCT_PAGES)) {
      addSnapshot("Your site (page)", p.url, p.title, p.text ?? "");
    }

    const bundle = snapshots.join("\n---\n") || homeText.slice(0, MAX_HOME_TEXT);

    const system = `You extract ICP (ideal customer profile) segments AND a product profile from website pages for a B2B marketing product.
Output ONLY one JSON object (no prose, no markdown fences).

Schema exactly:
{
  "segments": [ {
    "name": string,
    "pnf_score": number (0-100 product-needs fit for this segment),
    "pain_points": string[] (2-6 short bullets),
    "urgency": number (0-100),
    "budget_fit": number (0-100),
    "acv_potential": number (0-100),
    "retention_potential": number (0-100),
    "icp_profile": string (one paragraph, 2-5 sentences describing firmographics, motion, budget signals),
    "notes": string (optional, one line)
  } ],
  "product_profile": {
    "name": string,
    "website_url": string,
    "category": string,
    "icp_summary": string,
    "positioning_summary": string
  }
}

Rules for "segments":
- Infer 3-6 segments for different ICP slices. If unsure, return 3.
- pain_points must be specific phrases, not paragraphs.
- Infer scores from the page context; use mid values (50) when unknown.

Rules for "product_profile":
- "name": use the provided product name.
- "website_url": use the provided website URL.
- "category": short market category inferred from the site.
- "icp_summary": synthesize who you sell to (size, roles, pains, buying motion).
- "positioning_summary": how the product positions and core value vs alternatives. If unknown, return "".
- Use "" for any string with no basis in the provided pages (do not invent URLs).`;

    const userPrompt = `Product name: ${productName}
Website: ${baseUrl}

Website pages text (condensed):
${bundle}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        temperature: 0.25,
        system,
        messages: [{ role: "user", content: userPrompt }]
      })
    });

    const data = (await res.json()) as AnthropicMessageResponse;
    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error?.message ?? "Anthropic request failed." },
        { status: 502 }
      );
    }

    const out = data.content?.find((c) => c.type === "text")?.text ?? "";
    const parsed = parseJsonObject(out);
    if (!parsed) {
      return NextResponse.json(
        { error: "AI could not extract structured segments/profile. Try again." },
        { status: 502 }
      );
    }

    const rawSegments = parsed.segments;
    const rawPP = parsed.product_profile;

    if (!Array.isArray(rawSegments) || rawSegments.length === 0) {
      return NextResponse.json({ error: "No segments returned." }, { status: 400 });
    }

    const ppObj = rawPP && typeof rawPP === "object" ? (rawPP as Record<string, unknown>) : {};

    const incomingProfile = {
      name: asStr(ppObj.name) || productName,
      website_url: asStr(ppObj.website_url) || baseUrl,
      category: asStr(ppObj.category),
      icp_summary: asStr(ppObj.icp_summary),
      positioning_summary: asStr(ppObj.positioning_summary)
    };

    const current = product as Record<string, unknown>;
    const pick = (incoming: string, existing: unknown): string | null => {
      if (incoming.trim().length) return incoming.trim();
      if (typeof existing === "string" && existing.trim()) return existing.trim();
      return null;
    };

    const updatedProduct = {
      name: incomingProfile.name.trim(),
      website_url: pick(incomingProfile.website_url, current.website_url),
      category: pick(incomingProfile.category, current.category),
      icp_summary: pick(incomingProfile.icp_summary, current.icp_summary),
      positioning_summary: pick(incomingProfile.positioning_summary, current.positioning_summary)
    };

    if (!updatedProduct.name.trim()) {
      return NextResponse.json({ error: "Product name could not be determined." }, { status: 400 });
    }

    // Insert segments only if the environment is empty, unless caller forces replacement.
    const { count } = await supabase
      .from("segments")
      .select("id", { count: "exact", head: true })
      .eq("environment_id", env.environmentId);

    const shouldInsertSegments = replaceSegments || !count || Number(count) === 0;

    if (shouldInsertSegments) {
      if (replaceSegments && count && Number(count) > 0) {
        await supabase.from("segments").delete().eq("environment_id", env.environmentId);
      }
      const segments: SegmentDraft[] = rawSegments
        .map((item) => {
          const o = item as Record<string, unknown>;
          const pnf = clamp0to100(o.pnf_score, 50);
          const painPoints = asPainPoints(o.pain_points);
          return {
            name: asStr(o.name),
            pnf_score: pnf,
            pain_points: painPoints.length ? painPoints : ["—"],
            urgency: clamp0to100(o.urgency, pnf),
            budget_fit: clamp0to100(o.budget_fit, pnf),
            acv_potential: clamp0to100(o.acv_potential, pnf),
            retention_potential: clamp0to100(o.retention_potential, pnf),
            icp_profile: asStr(o.icp_profile),
            notes: asStr(o.notes) || null
          };
        })
        .filter((s) => s.name.length > 0)
        .slice(0, 30);

      if (segments.length) {
        const rows = segments.map((s) => ({
          environment_id: env.environmentId,
          name: s.name,
          pnf_score: s.pnf_score,
          pain_points: s.pain_points,
          notes: s.notes,
          details: {
            urgency: s.urgency,
            budget_fit: s.budget_fit,
            acv_potential: s.acv_potential,
            retention_potential: s.retention_potential,
            icp_profile: s.icp_profile
          }
        }));
        await supabase.from("segments").insert(rows);
      }
    }

    // Merge product profile fields (avoid overwriting existing non-empty values).
    await supabase.from("products").update({
      name: updatedProduct.name,
      website_url: updatedProduct.website_url ?? null,
      category: updatedProduct.category ?? null,
      icp_summary: updatedProduct.icp_summary ?? null,
      positioning_summary: updatedProduct.positioning_summary ?? null
    });

    return NextResponse.json({
      ok: true,
      filled: {
        category: Boolean(updatedProduct.category),
        icp_summary: Boolean(updatedProduct.icp_summary),
        positioning_summary: Boolean(updatedProduct.positioning_summary),
        segments_inserted: shouldInsertSegments
      }
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

