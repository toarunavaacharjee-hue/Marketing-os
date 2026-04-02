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
      // Skip obvious non-site links.
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
    const replaceCompetitors = Boolean(body?.replaceCompetitors);

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
    // Candidate competitor URLs: only use external links that appear on the crawled product pages.
    // Then the model picks likely competitors from this constrained candidate set.
    const competitorCandidatesSet = new Set<string>();
    const candidateHtmlPages: Array<{ html?: string; url: string }> = [
      { html: home.html, url: home.url },
      ...distinctExtra.map((p) => ({ html: p.html, url: p.url }))
    ];
    for (const page of candidateHtmlPages) {
      if (!page.html) continue;
      for (const u of extractExternalLinksFromHtml(page.html, baseUrl, 20)) competitorCandidatesSet.add(u);
      if (competitorCandidatesSet.size >= 60) break;
    }
    const competitorCandidates = Array.from(competitorCandidatesSet).slice(0, 60);

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

    // The initial extraction prompt allows the model to return empty strings ("")
    // when it thinks the website doesn't contain enough basis. If that happens and
    // the current DB fields are empty too, we would otherwise keep the fields blank.
    //
    // To keep the product page "auto-filled" (Required fields), do a best-effort
    // follow-up only for missing fields.
    const needsCategory = !incomingProfile.category.trim();
    const needsIcp = !incomingProfile.icp_summary.trim();
    const needsPositioning = !incomingProfile.positioning_summary.trim();
    if (needsCategory || needsIcp || needsPositioning) {
      const followupSystem = `You fill missing product profile fields from website content for a B2B marketing product.
Output ONLY valid JSON (no prose, no markdown fences).

Schema exactly:
{
  "category": string,
  "icp_summary": string,
  "positioning_summary": string
}

Rules:
- Do NOT return empty strings. Provide best-effort summaries using the provided text.
- Do not invent review URLs or competitor URLs.`;

      const missingUser = `Product name: ${productName}
Website: ${baseUrl}

Missing fields:
- category: ${needsCategory ? "YES" : "NO"}
- icp_summary: ${needsIcp ? "YES" : "NO"}
- positioning_summary: ${needsPositioning ? "YES" : "NO"}

Website pages text (condensed):
${bundle}`;

      const followupRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 900,
          temperature: 0.25,
          system: followupSystem,
          messages: [{ role: "user", content: missingUser }]
        })
      });

      if (followupRes.ok) {
        const followupData = (await followupRes.json()) as AnthropicMessageResponse;
        const followupOutText = followupData.content?.find((c) => c.type === "text")?.text ?? "";
        const followupParsed = parseJsonObject(followupOutText);
        const followupPP = followupParsed && typeof followupParsed === "object" ? (followupParsed as Record<string, unknown>) : {};

        const fbCategory = asStr(followupPP["category"]);
        const fbIcp = asStr(followupPP["icp_summary"]);
        const fbPositioning = asStr(followupPP["positioning_summary"]);

        incomingProfile.category = needsCategory ? fbCategory : incomingProfile.category;
        incomingProfile.icp_summary = needsIcp ? fbIcp : incomingProfile.icp_summary;
        incomingProfile.positioning_summary = needsPositioning ? fbPositioning : incomingProfile.positioning_summary;
      }
    }

    // Final guard: these fields are Required in the UI. If the model still returns blanks
    // (or parsing fails), fill with conservative, editable drafts so the flow isn't blocked.
    let host = "";
    try {
      host = new URL(baseUrl).host.replace(/^www\./, "");
    } catch {
      host = "";
    }
    if (!incomingProfile.category.trim()) {
      incomingProfile.category = "B2B SaaS Marketing Platform";
    }
    if (!incomingProfile.icp_summary.trim()) {
      incomingProfile.icp_summary =
        `Best-fit customers are mid-market B2B teams evaluating ${productName} at ${host || "the product website"}. ` +
        `Typical buyers include Marketing, Growth, and RevOps leaders looking to improve pipeline and automate go-to-market workflows.`;
    }
    if (!incomingProfile.positioning_summary.trim()) {
      incomingProfile.positioning_summary =
        `${productName} is positioned as an end-to-end platform to help teams plan, execute, and measure marketing initiatives more efficiently. ` +
        `It aims to replace fragmented tools and manual processes with a single workflow, improving speed-to-impact and reporting clarity.`;
    }

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
    const updProduct = await supabase
      .from("products")
      .update({
        name: updatedProduct.name,
        website_url: updatedProduct.website_url ?? null,
        category: updatedProduct.category ?? null,
        icp_summary: updatedProduct.icp_summary ?? null,
        positioning_summary: updatedProduct.positioning_summary ?? null
      })
      .eq("id", productId);
    if (updProduct.error) {
      return NextResponse.json({ error: updProduct.error.message }, { status: 500 });
    }

    // Competitors: fill only if we currently have none (or if replaceCompetitors was requested).
    const { count: competitorCount } = await supabase
      .from("product_competitors")
      .select("id", { count: "exact", head: true })
      .eq("product_id", productId);

    const shouldInsertCompetitors =
      replaceCompetitors || !competitorCount || Number(competitorCount) === 0;
    let competitorsInserted = 0;
    let competitor_generation_available = true;

    if (shouldInsertCompetitors) {
      if (!competitorCandidates.length) {
        competitor_generation_available = true;
      } else {
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
              const derived = website_url.replace(/^https?:\/\//, "").split("/")[0] ?? "";
              return { name: name || derived, website_url };
            })
            .filter(Boolean) as Array<{ name: string; website_url: string }>;

          const uniqueByUrl = new Map<string, { name: string; website_url: string }>();
          for (const c of validated) uniqueByUrl.set(c.website_url, c);

          const toInsert = Array.from(uniqueByUrl.values()).slice(0, 5);

          if (replaceCompetitors) {
            await supabase.from("product_competitors").delete().eq("product_id", productId);
          }

          if (toInsert.length) {
            const rows = toInsert
              .filter((c) => c.name.trim() && c.website_url.trim())
              .map((c) => ({
                product_id: productId,
                name: c.name.trim(),
                website_url: c.website_url.trim()
              }));
            if (rows.length) {
              const ins = await supabase.from("product_competitors").insert(rows);
              if (!ins.error) competitorsInserted = rows.length;
            }
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      filled: {
        category: Boolean(updatedProduct.category),
        icp_summary: Boolean(updatedProduct.icp_summary),
        positioning_summary: Boolean(updatedProduct.positioning_summary),
        segments_inserted: shouldInsertSegments,
        competitors_inserted: competitorsInserted,
        competitor_generation_available
      }
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

