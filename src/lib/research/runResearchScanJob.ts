import type { SupabaseClient } from "@supabase/supabase-js";
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
  html?: string;
};

const MAX_EXTRA_PRODUCT_PAGES = 2;
const FETCH_TIMEOUT_MS = 6000;
const ANTHROPIC_TIMEOUT_MS = 25000;
const MAX_SNAPSHOT_SOURCES_FOR_PROMPT = 6;
const MAX_SNAPSHOT_TEXT_PER_SOURCE = 1600;
const MAX_PROMPT_SNAPSHOT_CHARS = 35_000;

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

function buildWebsiteRowsFromResults(
  results: CrawlRow[],
  baseName: string
): ScanResult["monitoring_sources"] {
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

async function fetchPage(url: string, timeoutMs = FETCH_TIMEOUT_MS) {
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

async function fetchRssSnapshot(feedUrl: string, keywords: string | null): Promise<CrawlRow> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
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

async function callAnthropicScan(args: {
  anthropicKey: string;
  system: string;
  prompt: string;
  max_tokens: number;
  temperature: number;
}): Promise<{ ok: boolean; text: string; errorMessage: string | null; status: number }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ANTHROPIC_TIMEOUT_MS);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": args.anthropicKey,
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
      return {
        ok: false,
        text: "",
        errorMessage: normalized.error,
        status: normalized.status
      };
    }
    const text = data.content?.find((c) => c.type === "text")?.text ?? "";
    return { ok: true, text, errorMessage: null, status: 200 };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (message.toLowerCase().includes("aborted")) {
      return {
        ok: false,
        text: "",
        errorMessage:
          "AI request timed out. Try again, or reduce sources (competitors/news/reviews) to shrink the scan.",
        status: 504
      };
    }
    return {
      ok: false,
      text: "",
      errorMessage: "AI request failed (network error). Please try again.",
      status: 502
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function markFailed(
  supabase: SupabaseClient,
  scanId: string,
  message: string
) {
  await supabase
    .from("research_scans")
    .update({ status: "failed", summary: message })
    .eq("id", scanId);
}

export async function runResearchScanJob(args: {
  supabase: SupabaseClient;
  productId: string;
  environmentId: string;
  scanId: string;
  anthropicKey: string;
}) {
  const { supabase, productId, environmentId, scanId, anthropicKey } = args;

  try {
    const { data: product, error: pErr } = await supabase
      .from("products")
      .select(
        "id,name,website_url,category,icp_summary,positioning_summary,g2_review_url,capterra_review_url,news_rss_url,news_keywords"
      )
      .eq("id", productId)
      .maybeSingle();
    if (pErr || !product) {
      await markFailed(supabase, scanId, pErr?.message ?? "Product not found.");
      return;
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
      await markFailed(supabase, scanId, cErr.message);
      return;
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
      const homeText = productHome.text ?? "";
      const linkTargets = links
        .map((l) => l.split("#")[0])
        .filter((l) => l && l !== homeNorm)
        .slice(0, MAX_EXTRA_PRODUCT_PAGES);

      const fetched = await Promise.all(
        linkTargets.map(async (link) => {
          try {
            const page = await fetchPage(link);
            return { link, page };
          } catch {
            return { link, page: null as any };
          }
        })
      );

      const extra: CrawlRow[] = fetched
        .filter((x) => x.page && isLikelyDistinctPage(homeText, x.page.text, x.page.ok))
        .map((x) => ({
          url: x.page.url,
          source_type: "product" as const,
          competitor_id: null,
          label: "Your site",
          ok: x.page.ok,
          status: x.page.status,
          title: x.page.title,
          text: x.page.text
        }));
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
        text_content: r.text.slice(0, 8000)
      }));

    if (snapshotsToInsert.length) {
      const ins = await supabase.from("research_snapshots").insert(snapshotsToInsert);
      if (ins.error) {
        await markFailed(supabase, scanId, ins.error.message);
        return;
      }
    }

    try {
      const ingest = await ingestPageAssetsFromCrawl(
        supabase,
        environmentId,
        results.filter((r) => r.source_type === "product" || r.source_type === "competitor").slice(0, 8)
      );
      if (ingest.error) {
        const msg = String(ingest.error);
        if (msg.toLowerCase().includes("schema cache") || msg.toLowerCase().includes("could not find")) {
          // ignore
        } else {
          console.warn("[research/run] asset ingest:", ingest.error);
        }
      }
    } catch {
      // ignore
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

    if (!snapshotsToInsert.length) {
      await markFailed(
        supabase,
        scanId,
        "No source content could be fetched. Update website/news/review URLs in Product settings and try again."
      );
      return;
    }

    const system = `You are Market Research inside AI Marketing Workbench.
Output ONLY valid JSON. No prose outside JSON.
Be in-depth, descriptive, and structured.

Use this structure inspired by ZoomInfo's "B2B SaaS GTM Strategy Templates" (framework only; do not copy text verbatim).
Your report MUST be actionable and worksheet-like:
- TAM/SAM/SOM section: include 3 methods (Top-down, Bottom-up, Value theory) with placeholders + assumptions.
- Competitive analysis section: include a 1–10 rating table for 3–5 competitors across Product strength, Pricing, Market position, GTM strategy, Threat level, plus "Our advantages" and "Their advantages".
- Persona/ICP section: 2–3 personas with firmographics, roles, pains, buying behavior, and info sources.
- Pain point assessment: top 5 pains with Severity/Frequency/Urgency (1–10) and Priority score = (S+F+U)/3.
- Positioning + messaging hooks: 1-sentence value prop, 3–4 pillars, proof points needed.
- Next actions: 5 concrete next steps for marketing/sales/product.

Schema:
{
  "report_lines": ["# Title", "- bullet", ...],
  "signals": [{"title":"...","description":"...","source":"...","recency":"...","severity":"info|opportunity|risk"}],
  "opportunity_map": [{"segment":"...","opportunity_score":0-100,"tam_signal":"Low|Medium|High|Very High|Growing","competition":"Low|Medium|High"}],
  "monitoring_sources": [{"label":"...","status":"ok|warn|err","note":"optional"}]
}

Rules:
- report_lines: 30–55 lines. Use multiple ## sections and bullets. Keep each bullet concise but specific.
- Ground claims in the provided snapshots only. If evidence is thin, say so explicitly; do not invent metrics/facts.
- signals: 5–8 items, but deeper. Each description 4–8 sentences with: what changed, why it matters, evidence (SOURCE labels), recommended action.
- opportunity_map: 6–8 rows. Segment names must be specific (firmographics + role + trigger). Put 1 short justification in parentheses.
- monitoring_sources: include the most important scanned sources with short notes; server merges Industry News and Review Sites rows.`;

    const snapshotBlobs = results
      .filter((r) => r.ok && r.text)
      .slice(0, MAX_SNAPSHOT_SOURCES_FOR_PROMPT)
      .map((r) => {
        const title = r.title ? `Title: ${r.title}\n` : "";
        return `SOURCE: ${r.label}\nTYPE: ${r.source_type}\nURL: ${r.url}\n${title}TEXT:\n${r.text.slice(0, MAX_SNAPSHOT_TEXT_PER_SOURCE)}\n`;
      })
      .join("\n---\n");
    const snapshotBlobsCapped =
      snapshotBlobs.length > MAX_PROMPT_SNAPSHOT_CHARS
        ? snapshotBlobs.slice(0, MAX_PROMPT_SNAPSHOT_CHARS)
        : snapshotBlobs;

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
${snapshotBlobsCapped || "(no snapshot text — all fetches failed)"}`;

    const first = await callAnthropicScan({
      anthropicKey,
      system,
      prompt,
      max_tokens: 3000,
      temperature: 0.3
    });
    if (!first.ok) {
      await markFailed(supabase, scanId, first.errorMessage ?? "Anthropic request failed.");
      return;
    }

    let text = first.text;
    let parsed = parseJsonObject(text);
    if (!parsed) {
      const strictSystem = `${system}

STRICT MODE:
- Output MUST be a single JSON object.
- Do not include any prefix/suffix text.
- All schema keys must be present even if empty (use [] for arrays).`;

      const second = await callAnthropicScan({
        anthropicKey,
        system: strictSystem,
        prompt,
        max_tokens: 3000,
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
    const summary =
      lines.join("\n").trim() ||
      "## Market scan\n\nReview structured signals and opportunity map below.";

    if (!parsed || typeof parsed !== "object") {
      await markFailed(supabase, scanId, "AI returned an invalid response. Please run scan again.");
      return;
    }

    const parsedSignals = Array.isArray(parsed.signals) ? parsed.signals : [];
    const parsedOpp = Array.isArray(parsed.opportunity_map) ? parsed.opportunity_map : [];
    const parsedSources = Array.isArray(parsed.monitoring_sources) ? parsed.monitoring_sources : [];

    let resultJson = {
      signals: parsedSignals,
      opportunity_map: parsedOpp,
      monitoring_sources: parsedSources
    } as ScanResult;

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
  } catch (e) {
    await markFailed(
      supabase,
      scanId,
      e instanceof Error ? e.message : "Unknown scan error."
    );
  }
}
