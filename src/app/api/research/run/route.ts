import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import {
  filterItemsByKeywords,
  parseFeedItems,
  rssItemsToSnapshotText
} from "@/lib/rss";

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
};

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

function buildFallbackResult(args: {
  summary: string;
  baseName: string;
  results: CrawlRow[];
}): ScanResult {
  const { summary, baseName, results } = args;
  const lines = summary
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const bullets = lines
    .filter((l) => l.startsWith("-") || /^\d+[\).\s]/.test(l))
    .map((l) => l.replace(/^[-\d\).\s]+/, "").trim())
    .filter(Boolean);

  const signals = (bullets.slice(0, 4).length ? bullets.slice(0, 4) : lines.slice(0, 4))
    .map((t, i) => ({
      title: t.slice(0, 90),
      description: t,
      source: i === 0 ? "Website scan" : "AI scan synthesis",
      recency: "Latest scan",
      severity: (i === 0 ? "risk" : i === 1 ? "opportunity" : "info") as
        | "risk"
        | "opportunity"
        | "info"
    }));

  const defaultSegments = [
    "Mid-Market SaaS",
    "Enterprise FinTech",
    "SMB e-Commerce",
    "Healthcare SaaS",
    "Agency Teams"
  ];
  const opportunity_map = defaultSegments.map((segment, idx) => ({
    segment,
    opportunity_score: Math.max(40, 90 - idx * 10),
    tam_signal: (idx === 1
      ? "Very High"
      : idx < 3
        ? "High"
        : idx === 3
          ? "Medium"
          : "Growing") as "Low" | "Medium" | "High" | "Very High" | "Growing",
    competition: (idx === 0 ? "Medium" : idx === 1 ? "High" : idx === 2 ? "High" : "Low") as
      | "Low"
      | "Medium"
      | "High"
  }));

  const monitoring_sources = buildWebsiteRowsFromResults(results, baseName);

  return { signals, opportunity_map, monitoring_sources };
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

function extractJsonObject(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as any;
  } catch {
    return null;
  }
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

async function fetchPage(url: string) {
  const res = await fetch(url, {
    method: "GET",
    redirect: "follow",
    headers: {
      "user-agent":
        "MarketingOSResearchBot/1.0 (+https://example.local; contact: support)"
    }
  });
  const html = await res.text();
  const title = titleFromHtml(html);
  const text = stripHtmlToText(html);
  return { ok: res.ok, status: res.status, url: res.url, title, text };
}

async function fetchRssSnapshot(
  feedUrl: string,
  keywords: string | null
): Promise<CrawlRow> {
  try {
    const res = await fetch(feedUrl, {
      method: "GET",
      redirect: "follow",
      headers: {
        "user-agent":
          "MarketingOSResearchBot/1.0 (+https://example.local; contact: support)",
        accept: "application/rss+xml, application/xml, text/xml, */*"
      }
    });
    const xml = await res.text();
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

    const htmlResults: CrawlRow[] = await Promise.all(
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
            text: page.text
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

    const baseName = (product.name as string) || "Base product";

    let summary = "";
    let resultJson: ScanResult | null = null;

    if (!anthropicKey) {
      summary =
        "Demo summary (no Anthropic key provided):\n" +
        "- Your positioning appears focused on speed/time-to-value.\n" +
        "- Competitors emphasize either breadth (integrations) or enterprise credibility.\n" +
        "- Next: tighten your headline, add proof points, and create a battlecard per competitor.\n";
      resultJson = {
        signals: [
          {
            title: "Competitor messaging shift detected",
            description:
              "One competitor is leaning harder into automation + AI claims. Consider refreshing your hero and proof points.",
            source: "Competitor homepage (demo)",
            recency: "This week",
            severity: "risk"
          }
        ],
        opportunity_map: [
          {
            segment: "Mid-Market SaaS",
            opportunity_score: 92,
            tam_signal: "High",
            competition: "Medium"
          }
        ],
        monitoring_sources: buildWebsiteRowsFromResults(results, baseName)
      };
    } else {
      const system = `You are Market Research inside Marketing OS.
You will be given snapshots of the base product website, competitor websites, optional G2/Capterra review pages, and/or an industry news RSS digest.

Return TWO things:
1) A concise markdown report (headings + bullets) for the founder to read.
2) A JSON object for the UI widgets.

The JSON MUST match exactly this schema:
{
  "signals": [{"title":"...", "description":"...", "source":"...", "recency":"...", "severity":"info|opportunity|risk"}],
  "opportunity_map": [{"segment":"...", "opportunity_score": 0-100, "tam_signal":"Low|Medium|High|Very High|Growing", "competition":"Low|Medium|High"}],
  "monitoring_sources": [{"label":"...", "status":"ok|warn|err", "note":"optional"}]
}

Rules:
- Use only what is supported by the snapshots; if uncertain, mark status warn and explain in note.
- When RSS or review pages are present, cite them in signals where relevant.
- Do not use markdown tables in the report. Use headings + bullet points only.
- Ensure the report is complete and avoid cut-off lines.
- Keep signals to 4-6 items.
- opportunity_map: 5 rows.
- monitoring_sources: list scanned websites plus Industry News and Review Sites rows consistent with what was actually fetched (the server will reconcile the last two).
- Output the markdown report first, then a blank line, then the JSON object.`;

      const snapshotBlobs = results
        .filter((r) => r.ok && r.text)
        .map((r) => {
          const title = r.title ? `Title: ${r.title}\n` : "";
          return `SOURCE: ${r.label}\nTYPE: ${r.source_type}\nURL: ${r.url}\n${title}TEXT:\n${r.text.slice(0, 6000)}\n`;
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

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1400,
          temperature: 0.35,
          system,
          messages: [{ role: "user", content: prompt }]
        })
      });

      const data = (await res.json()) as AnthropicMessageResponse;
      if (!res.ok) {
        const normalized = normalizeAnthropicError(data?.error?.message);
        await supabase.from("research_scans").update({ status: "failed" }).eq("id", scanId);
        return NextResponse.json({ error: normalized.error }, { status: normalized.status });
      }

      const text = data.content?.find((c) => c.type === "text")?.text ?? "";
      const parsed = extractJsonObject(text);
      const jsonStart = text.indexOf("{");
      summary =
        (jsonStart > 0 ? text.slice(0, jsonStart).trim() : text.trim()) || "No summary returned.";

      if (parsed?.signals && parsed?.opportunity_map && parsed?.monitoring_sources) {
        resultJson = parsed as ScanResult;
      } else {
        resultJson = buildFallbackResult({
          summary,
          baseName,
          results
        });
      }
    }

    if (!resultJson) {
      resultJson = buildFallbackResult({
        summary: summary || "No summary.",
        baseName,
        results
      });
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
