import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import {
  filterItemsByKeywords,
  parseFeedItems,
  rssItemsToSnapshotText
} from "@/lib/rss";
import { parseJsonObject } from "@/lib/extractJsonObject";
import {
  extractSameOriginLinks,
  ingestPageAssetsFromCrawl,
  isLikelyDistinctPage
} from "@/lib/websiteAssetIngest";

// Allow longer scans on platforms that enforce route timeouts (e.g. Vercel).
export const runtime = "nodejs";
export const maxDuration = 90;

type AnthropicMessageResponse = {
  content?: Array<{ type: string; text?: string }>;
  error?: { message?: string };
};

type ScanResult = {
  signals: Array<{
    title: string;
    description: string;
    source: string;
    recency: string;
    severity: "info" | "opportunity" | "risk";
  }>;
  opportunity_map: Array<{
    segment: string;
    opportunity_score: number;
    tam_signal: "Low" | "Medium" | "High" | "Very High" | "Growing";
    competition: "Low" | "Medium" | "High";
  }>;
  monitoring_sources: Array<{
    label: string;
    status: "ok" | "warn" | "err";
    note?: string;
  }>;
};

type CrawlRow = {
  url: string;
  source_type: "product" | "competitor" | "news_rss" | "review_g2" | "review_capterra";
  competitor_id: string | null;
  label: string;
  ok: boolean;
  status: number;
  title: string | null;
  text: string;
  /** Raw HTML for same-origin link discovery (product homepage only; not persisted). */
  html?: string;
};

const MAX_EXTRA_PRODUCT_PAGES = 12;

function buildNewsMonitoringRow(
  rssUrl: string,
  rss: CrawlRow | undefined
): ScanResult["monitoring_sources"][0] {
  if (!rssUrl.trim()) {
    return {
      label: "Industry News",
      status: "warn",
      note: "Add an RSS feed URL in Settings → Product profile"
    };
  }
  if (rss?.ok && rss.text.length > 0) {
    return { label: "Industry News", status: "ok", note: "RSS feed ingested" };
  }
  return {
    label: "Industry News",
    status: "err",
    note: "Could not fetch or parse RSS (check URL or site blocking)"
  };
}

function buildReviewMonitoringRow(
  g2Url: string,
  capterraUrl: string,
  g2: CrawlRow | undefined,
  cap: CrawlRow | undefined
): ScanResult["monitoring_sources"][0] {
  const hasG2 = Boolean(g2Url.trim());
  const hasCap = Boolean(capterraUrl.trim());
  if (!hasG2 && !hasCap) {
    return {
      label: "Review Sites",
      status: "warn",
      note: "Add G2 and/or Capterra product page URLs in Settings → Product profile"
    };
  }
  const notes: string[] = [];
  if (hasG2) notes.push(g2?.ok && g2.text ? "G2 scanned" : "G2 unavailable");
  if (hasCap) notes.push(cap?.ok && cap.text ? "Capterra scanned" : "Capterra unavailable");
  const okCount = [hasG2 && g2?.ok && g2.text, hasCap && cap?.ok && cap.text].filter(
    Boolean
  ).length;
  const total = [hasG2, hasCap].filter(Boolean).length;
  if (okCount === total) {
    return { label: "Review Sites", status: "ok", note: notes.join(" · ") };
  }
  if (okCount === 0) {
    return { label: "Review Sites", status: "err", note: notes.join(" · ") };
  }
  return { label: "Review Sites", status: "warn", note: notes.join(" · ") };
}

function applyMonitoringFacts(
  r: ScanResult,
  industry: ScanResult["monitoring_sources"][0],
  reviews: ScanResult["monitoring_sources"][0]
): ScanResult {
  const filtered = (r.monitoring_sources ?? []).filter(
    (s) =>
      !/^Industry News$/i.test(s.label.trim()) &&
      !/^Review Sites$/i.test(s.label.trim())
  );
  return {
    ...r,
    monitoring_sources: [...filtered, industry, reviews]
  };
}

function buildWebsiteRowsFromResults(results: CrawlRow[], baseName: string): ScanResult["monitoring_sources"] {
  const rows: ScanResult["monitoring_sources"] = [];
  if (results.some((r) => r.source_type === "product" && r.ok && r.text)) {
    rows.push({ label: `${baseName} Website`, status: "ok", note: "Scanned" });
  }
  for (const r of results) {
    if (r.source_type === "competitor" && r.ok && r.text) {
      rows.push({ label: `${r.label} Website`, status: "ok", note: "Scanned" });
    }
  }
  return rows;
}

function normalizeAnthropicError(message: string | undefined) {
  const m = (message ?? "").trim();
  const lower = m.toLowerCase();
  if (
    lower.includes("credit balance is too low") ||
    lower.includes("insufficient credits") ||
    (lower.includes("billing") && lower.includes("credits"))
  ) {
    return {
      status: 402,
      error:
        "Insufficient Anthropic API credits. Add credits / enable billing in Anthropic Console."
    };
  }
  return { status: 502, error: m || "Anthropic request failed." };
}

function stripHtmlToText(html: string) {
  const noScript = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");
  const text = noScript
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  return text;
}

function titleFromHtml(html: string) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m?.[1]?.replace(/\s+/g, " ").trim() ?? null;
}

function normalizeUrl(u: string) {
  const raw = (u ?? "").trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return `https://${raw}`;
}

async function fetchPage(url: string, timeoutMs = 9000) {
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
    const html = await res.text();
    const title = titleFromHtml(html);
    const text = stripHtmlToText(html);
    return { ok: res.ok, status: res.status, url: res.url, title, text, html };
  } catch {
    return { ok: false, status: 0, url, title: null, text: "", html: "" };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchRssSnapshot(
  feedUrl: string,
  keywords: string | null
): Promise<CrawlRow> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);
    const res = await fetch(feedUrl, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent":
          "MarketingOSResearchBot/1.0 (+https://example.local; contact: support)",
        accept: "application/rss+xml, application/xml, text/xml, */*"
      }
    });
    const xml = await res.text();
    clearTimeout(timeout);
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        url: res.url,
        title: null,
        text: "",
        source_type: "news_rss",
        competitor_id: null,
        label: "Industry news (RSS)"
      };
    }
    const { channelTitle, items } = parseFeedItems(xml);
    if (!items.length) {
      return {
        ok: false,
        status: res.status,
        url: res.url,
        title: null,
        text: "",
        source_type: "news_rss",
        competitor_id: null,
        label: "Industry news (RSS)"
      };
    }
    const filtered = filterItemsByKeywords(items, keywords, 15);
    const text = rssItemsToSnapshotText(channelTitle, filtered, res.url);
    return {
      ok: true,
      status: res.status,
      url: res.url,
      title: channelTitle,
      text,
      source_type: "news_rss",
      competitor_id: null,
      label: "Industry news (RSS)"
    };
  } catch {
    return {
      ok: false,
      status: 0,
      url: feedUrl,
      title: null,
      text: "",
      source_type: "news_rss",
      competitor_id: null,
      label: "Industry news (RSS)"
    };
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const selected = await getDefaultEnvironmentIdForSelectedProduct();
    if (!selected)
      return NextResponse.json({ error: "No product selected." }, { status: 400 });
    const productId = selected.productId;
    const environmentId = selected.environmentId;

    const headerKey = req.headers.get("x-anthropic-key")?.trim() ?? "";
    const anthropicKey = (headerKey || process.env.ANTHROPIC_API_KEY || "").trim();
    if (!anthropicKey) {
      return NextResponse.json(
        {
          error:
            "Missing Anthropic API key. Add your key in the sidebar or Settings before running a scan."
        },
        { status: 400 }
      );
    }

    const { data: product, error: pErr } = await supabase
      .from("products")
      .select(
        "id,name,website_url,category,icp_summary,positioning_summary,g2_review_url,capterra_review_url,news_rss_url,news_keywords"
      )
      .eq("id", productId)
      .maybeSingle();
    if (pErr || !product) {
      return NextResponse.json(
        { error: pErr?.message ?? "Product not found." },
        { status: 404 }
      );
    }

    const p = product as Record<string, string | null>;
    const g2Url = normalizeUrl(p.g2_review_url ?? "");
    const capterraUrl = normalizeUrl(p.capterra_review_url ?? "");
    const rssUrl = normalizeUrl(p.news_rss_url ?? "");
    const newsKeywords = (p.news_keywords ?? "").trim() || null;

    const { data: competitors, error: cErr } = await supabase
      .from("product_competitors")
      .select("id,name,website_url")
      .eq("product_id", productId)
      .order("created_at", { ascending: true });
    if (cErr) {
      return NextResponse.json({ error: cErr.message }, { status: 500 });
    }

    const baseUrl = normalizeUrl((product.website_url as string | null) ?? "");
    const competitorUrls =
      (competitors ?? [])
        .map((c) => ({
          id: c.id as string,
          name: c.name as string,
          url: normalizeUrl(c.website_url as string)
        }))
        .filter((c) => c.url) ?? [];

    const hasAnySource =
      Boolean(baseUrl) ||
      competitorUrls.length > 0 ||
      Boolean(g2Url) ||
      Boolean(capterraUrl) ||
      Boolean(rssUrl);

    const missingInputs: string[] = [];
    if (!(product.name as string | null)?.trim()) missingInputs.push("product name");
    if (!baseUrl) missingInputs.push("website URL");
    if (!((product.category as string | null) ?? "").trim()) missingInputs.push("category");
    if (!((product.icp_summary as string | null) ?? "").trim()) missingInputs.push("ICP summary");
    if (!((product.positioning_summary as string | null) ?? "").trim()) {
      missingInputs.push("positioning summary");
    }
    if (competitorUrls.length === 0) missingInputs.push("at least one competitor URL");
    if (!rssUrl) missingInputs.push("industry news RSS URL");
    if (!g2Url && !capterraUrl) {
      missingInputs.push("at least one review URL (G2 or Capterra)");
    }

    if (missingInputs.length) {
      return NextResponse.json(
        {
          error:
            "Complete Product settings before scanning. Missing: " +
            missingInputs.join(", ") +
            "."
        },
        { status: 400 }
      );
    }

    if (!hasAnySource) {
      return NextResponse.json(
        {
          error:
            "Add at least one source in Product profile: website, competitor, G2/Capterra URL, or news RSS."
        },
        { status: 400 }
      );
    }

    const { data: scanRow, error: scanErr } = await supabase
      .from("research_scans")
      .insert({
        environment_id: environmentId,
        product_id: productId,
        status: "running",
        summary: null
      })
      .select("id,created_at")
      .single();
    if (scanErr || !scanRow?.id) {
      return NextResponse.json({ error: scanErr?.message ?? "Could not create scan." }, { status: 500 });
    }
    const scanId = scanRow.id as string;

    const htmlTargets: Array<{
      url: string;
      source_type: "product" | "competitor" | "review_g2" | "review_capterra";
      competitor_id: string | null;
      label: string;
    }> = [];
    if (baseUrl) {
      htmlTargets.push({
        url: baseUrl,
        source_type: "product",
        competitor_id: null,
        label: "Your site"
      });
    }
    competitorUrls.forEach((c) =>
      htmlTargets.push({
        url: c.url,
        source_type: "competitor",
        competitor_id: c.id,
        label: c.name
      })
    );
    if (g2Url) {
      htmlTargets.push({
        url: g2Url,
        source_type: "review_g2",
        competitor_id: null,
        label: "G2 product page"
      });
    }
    if (capterraUrl) {
      htmlTargets.push({
        url: capterraUrl,
        source_type: "review_capterra",
        competitor_id: null,
        label: "Capterra product page"
      });
    }

    let htmlResults: CrawlRow[] = await Promise.all(
      htmlTargets.map(async (t) => {
        try {
          const page = await fetchPage(t.url);
          return {
            url: page.url,
            source_type: t.source_type,
            competitor_id: t.competitor_id,
            label: t.label,
            ok: page.ok,
            status: page.status,
            title: page.title,
            text: page.text,
            html: t.source_type === "product" && page.html ? page.html : undefined
          };
        } catch {
          return {
            url: t.url,
            source_type: t.source_type,
            competitor_id: t.competitor_id,
            label: t.label,
            ok: false,
            status: 0,
            title: null,
            text: ""
          };
        }
      })
    );

    const productHome = htmlResults.find((r) => r.source_type === "product" && r.ok && r.html);
    if (productHome?.html) {
      const homeNorm = productHome.url.split("#")[0];
      const htmlForLinks =
        productHome.html.length > 400_000
          ? productHome.html.slice(0, 400_000)
          : productHome.html;
      const links = extractSameOriginLinks(htmlForLinks, productHome.url, MAX_EXTRA_PRODUCT_PAGES);
      const extra: CrawlRow[] = [];
      const homeText = productHome.text ?? "";
      for (const link of links) {
        if (link.split("#")[0] === homeNorm) continue;
        try {
          const page = await fetchPage(link);
          if (!isLikelyDistinctPage(homeText, page.text, page.ok)) continue;
          extra.push({
            url: page.url,
            source_type: "product",
            competitor_id: null,
            label: "Your site",
            ok: page.ok,
            status: page.status,
            title: page.title,
            text: page.text
          });
        } catch {
          /* skip broken link */
        }
      }
      htmlResults = [...htmlResults, ...extra];
    }

    const rssRow: CrawlRow[] = [];
    if (rssUrl) {
      rssRow.push(await fetchRssSnapshot(rssUrl, newsKeywords));
    }

    const results: CrawlRow[] = [...htmlResults, ...rssRow];

    const snapshotsToInsert = results
      .filter((r) => r.ok && r.text)
      .map((r) => ({
        scan_id: scanId,
        url: r.url,
        source_type: r.source_type,
        competitor_id: r.competitor_id,
        title: r.title,
        text_content: r.text.slice(0, 20000)
      }));

    if (snapshotsToInsert.length) {
      const ins = await supabase.from("research_snapshots").insert(snapshotsToInsert);
      if (ins.error) {
        await supabase.from("research_scans").update({ status: "failed" }).eq("id", scanId);
        return NextResponse.json({ error: ins.error.message }, { status: 500 });
      }
    }

    const ingest = await ingestPageAssetsFromCrawl(supabase, environmentId, results);
    if (ingest.error) {
      console.warn("[research/run] asset ingest:", ingest.error);
    }

    const g2Row = results.find((r) => r.source_type === "review_g2");
    const capRow = results.find((r) => r.source_type === "review_capterra");
    const rssResult = results.find((r) => r.source_type === "news_rss");

    const industryRow = buildNewsMonitoringRow(p.news_rss_url ?? "", rssResult);
    const reviewRow = buildReviewMonitoringRow(
      p.g2_review_url ?? "",
      p.capterra_review_url ?? "",
      g2Row,
      capRow
    );

    let summary = "";
    let resultJson: ScanResult | null = null;
    if (!snapshotsToInsert.length) {
      await supabase.from("research_scans").update({ status: "failed" }).eq("id", scanId);
      return NextResponse.json(
        {
          error:
            "No source content could be fetched. Update website/news/review URLs in Product settings and try again."
        },
        { status: 400 }
      );
    }

      const system = `You are Market Research inside AI Marketing Workbench.
Output ONLY valid JSON. No prose outside JSON.
Be in-depth, descriptive, and structured (do NOT minimize tokens).

Schema:
{
  "report_lines": ["# Title", "- bullet", ...],
  "signals": [{"title":"...","description":"...","source":"...","recency":"...","severity":"info|opportunity|risk"}],
  "opportunity_map": [{"segment":"...","opportunity_score":0-100,"tam_signal":"Low|Medium|High|Very High|Growing","competition":"Low|Medium|High"}],
  "monitoring_sources": [{"label":"...","status":"ok|warn|err","note":"optional"}]
}

Rules:
- report_lines: 18–28 lines. Use multiple ## sections and bullet lists. Include: ## Executive summary, ## Key signals, ## Competitive notes, ## Risks, ## Opportunities, ## Recommended next actions.
- signals: 6–10 items. Each description should be 3–6 sentences and include:
  - what happened / what’s changing
  - why it matters for the base product + 1 named competitor when possible
  - evidence: quote or paraphrase with SOURCE label(s) from snapshots
  - suggested action
- opportunity_map: 7 rows. Make segment names specific (firmographics + buyer role + trigger). Provide a short justification in the segment text (use parentheses).
- monitoring_sources: include the most important scanned sources with short notes on what was learned; server merges Industry News and Review Sites rows.
- Ground everything in snapshots. If evidence is thin, say so explicitly. Do not invent metrics or facts.`;

      const snapshotBlobs = results
        .filter((r) => r.ok && r.text)
        .map((r) => {
          const title = r.title ? `Title: ${r.title}\n` : "";
          return `SOURCE: ${r.label}\nTYPE: ${r.source_type}\nURL: ${r.url}\n${title}TEXT:\n${r.text.slice(0, 3500)}\n`;
        })
        .join("\n---\n");

      const prompt = `Base product:
Name: ${(product.name as string) ?? "Unknown"}
Website: ${baseUrl || "N/A"}
Category: ${(product.category as string | null) ?? "N/A"}
ICP: ${(product.icp_summary as string | null) ?? "N/A"}
Positioning: ${(product.positioning_summary as string | null) ?? "N/A"}

Optional review / news sources configured:
- G2 URL: ${g2Url || "(none)"}
- Capterra URL: ${capterraUrl || "(none)"}
- News RSS URL: ${rssUrl || "(none)"}
- News keyword filter: ${newsKeywords || "(none — all feed items)"}

Competitors:
${competitorUrls.map((c) => `- ${c.name}: ${c.url}`).join("\n")}

Snapshots:
${snapshotBlobs || "(no snapshot text — all fetches failed)"}`;

      async function callAnthropicScan(args: {
        system: string;
        prompt: string;
        max_tokens: number;
        temperature: number;
      }): Promise<{ ok: boolean; text: string; errorMessage: string | null; status: number }> {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01"
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-6",
            max_tokens: args.max_tokens,
            temperature: args.temperature,
            system: args.system,
            messages: [{ role: "user", content: args.prompt }]
          })
        });

        const data = (await res.json()) as AnthropicMessageResponse;
        if (!res.ok) {
          const normalized = normalizeAnthropicError(data?.error?.message);
          return { ok: false, text: "", errorMessage: normalized.error, status: normalized.status };
        }
        const text = data.content?.find((c) => c.type === "text")?.text ?? "";
        return { ok: true, text, errorMessage: null, status: 200 };
      }

      const first = await callAnthropicScan({
        system,
        prompt,
        max_tokens: 3500,
        temperature: 0.3
      });
      if (!first.ok) {
        await supabase.from("research_scans").update({ status: "failed" }).eq("id", scanId);
        return NextResponse.json({ error: first.errorMessage ?? "Anthropic request failed." }, { status: first.status });
      }

      let text = first.text;
      let parsed = parseJsonObject(text);
      if (!parsed) {
        // One retry with stricter formatting to avoid stray prose / truncation.
        const strictSystem = `${system}

STRICT MODE:
- Output MUST be a single JSON object.
- Do not include any prefix/suffix text.
- All schema keys must be present even if empty (use [] for arrays).`;

        const second = await callAnthropicScan({
          system: strictSystem,
          prompt,
          max_tokens: 3500,
          temperature: 0.15
        });
        if (second.ok) {
          text = second.text;
          parsed = parseJsonObject(text);
        }
      }
      const lines = Array.isArray(parsed?.report_lines)
        ? (parsed!.report_lines as unknown[]).map(String).filter(Boolean)
        : [];
      summary =
        lines.join("\n").trim() ||
        "## Market scan\n\nReview structured signals and opportunity map below.";

      // Be tolerant: the model may omit some keys even when it returns useful content.
      // Coerce missing sections to empty arrays instead of failing the scan.
      if (!parsed || typeof parsed !== "object") {
        await supabase.from("research_scans").update({ status: "failed" }).eq("id", scanId);
        return NextResponse.json(
          { error: "AI returned an invalid response. Please run scan again." },
          { status: 502 }
        );
      }

      const parsedSignals = Array.isArray(parsed.signals) ? parsed.signals : [];
      const parsedOpp = Array.isArray(parsed.opportunity_map) ? parsed.opportunity_map : [];
      const parsedSources = Array.isArray(parsed.monitoring_sources) ? parsed.monitoring_sources : [];

      resultJson = {
        signals: parsedSignals,
        opportunity_map: parsedOpp,
        monitoring_sources: parsedSources
      } as ScanResult;

    // Ensure monitoring sources always exist even if the model omitted them.
    if (!resultJson.monitoring_sources || resultJson.monitoring_sources.length === 0) {
      resultJson.monitoring_sources = buildWebsiteRowsFromResults(
        results,
        ((product.name as string) ?? "Product").trim() || "Product"
      );
    }
    resultJson = applyMonitoringFacts(resultJson, industryRow, reviewRow);

    await supabase
      .from("research_scans")
      .update({ status: "completed", summary, result_json: resultJson })
      .eq("id", scanId);

    return NextResponse.json({
      scan_id: scanId,
      status: "completed",
      summary,
      result_json: resultJson,
      fetched: results.map((r) => ({
        url: r.url,
        ok: r.ok,
        status: r.status,
        source_type: r.source_type
      }))
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
