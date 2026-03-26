import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getDefaultEnvironmentIdForSelectedProduct, getSelectedProductId } from "@/lib/productContext";

type AnthropicMessageResponse = {
  content?: Array<{ type: string; text?: string }>;
  error?: { message?: string };
};

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

export async function POST(req: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const selected = await getDefaultEnvironmentIdForSelectedProduct();
  if (!selected) return NextResponse.json({ error: "No product selected." }, { status: 400 });
  const productId = selected.productId;
  const environmentId = selected.environmentId;

  const headerKey = req.headers.get("x-anthropic-key")?.trim() ?? "";
  const anthropicKey = (headerKey || process.env.ANTHROPIC_API_KEY || "").trim();

  const admin = createSupabaseAdminClient();

  // Membership guard
  const { data: product } = await admin
    .from("products")
    .select("id,company_id,name,website_url,category,icp_summary,positioning_summary")
    .eq("id", productId)
    .maybeSingle();
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  const { data: membership } = await admin
    .from("company_members")
    .select("company_id")
    .eq("user_id", user.id)
    .eq("company_id", product.company_id as string)
    .maybeSingle();
  if (!membership) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { data: competitors } = await admin
    .from("product_competitors")
    .select("id,name,website_url")
    .eq("product_id", productId)
    .order("created_at", { ascending: true });

  const baseUrl = normalizeUrl((product.website_url as string | null) ?? "");
  const competitorUrls =
    (competitors ?? [])
      .map((c) => ({
        id: c.id as string,
        name: c.name as string,
        url: normalizeUrl(c.website_url as string)
      }))
      .filter((c) => c.url) ?? [];

  if (!baseUrl && competitorUrls.length === 0) {
    return NextResponse.json(
      { error: "Add your website URL or at least one competitor URL in Product profile first." },
      { status: 400 }
    );
  }

  // Create scan
  const { data: scanRow, error: scanErr } = await admin
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

  // Fetch pages (light crawl = homepage only for now)
  const targets: Array<{
    url: string;
    source_type: "product" | "competitor";
    competitor_id: string | null;
    label: string;
  }> = [];
  if (baseUrl) targets.push({ url: baseUrl, source_type: "product", competitor_id: null, label: "Your site" });
  competitorUrls.forEach((c) =>
    targets.push({ url: c.url, source_type: "competitor", competitor_id: c.id, label: c.name })
  );

  const results = await Promise.all(
    targets.map(async (t) => {
      try {
        const page = await fetchPage(t.url);
        return { ...t, ...page };
      } catch (e) {
        return {
          ...t,
          ok: false,
          status: 0,
          title: null,
          text: "",
          url: t.url,
          error: e instanceof Error ? e.message : "Fetch failed"
        };
      }
    })
  );

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
    const ins = await admin.from("research_snapshots").insert(snapshotsToInsert);
    if (ins.error) {
      await admin.from("research_scans").update({ status: "failed" }).eq("id", scanId);
      return NextResponse.json({ error: ins.error.message }, { status: 500 });
    }
  }

  // Generate summary + comparison
  let summary = "";
  if (!anthropicKey) {
    summary =
      "Demo summary (no Anthropic key provided):\n" +
      "- Your positioning appears focused on speed/time-to-value.\n" +
      "- Competitors emphasize either breadth (integrations) or enterprise credibility.\n" +
      "- Next: tighten your headline, add proof points, and create a battlecard per competitor.\n";
  } else {
    const system = `You are Market Research inside Marketing OS.
Use the provided website snapshots to summarize competitor positioning and compare against the base product.
Return concise, actionable output.

Output format:
- 3 key market signals
- Competitor positioning bullets (per competitor)
- How we differ (3 bullets)
- Recommendations (5 bullets)`;

    const snapshotBlobs = results
      .filter((r) => r.ok && r.text)
      .map((r) => {
        const title = r.title ? `Title: ${r.title}\n` : "";
        return `SOURCE: ${r.label}\nURL: ${r.url}\n${title}TEXT:\n${r.text.slice(0, 6000)}\n`;
      })
      .join("\n---\n");

    const prompt = `Base product:
Name: ${(product.name as string) ?? "Unknown"}
Website: ${baseUrl || "N/A"}
Category: ${(product.category as string | null) ?? "N/A"}
ICP: ${(product.icp_summary as string | null) ?? "N/A"}
Positioning: ${(product.positioning_summary as string | null) ?? "N/A"}

Competitors:
${competitorUrls.map((c) => `- ${c.name}: ${c.url}`).join("\n")}

Website snapshots:
${snapshotBlobs}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 700,
        temperature: 0.35,
        system,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = (await res.json()) as AnthropicMessageResponse;
    if (!res.ok) {
      const normalized = normalizeAnthropicError(data?.error?.message);
      await admin.from("research_scans").update({ status: "failed" }).eq("id", scanId);
      return NextResponse.json({ error: normalized.error }, { status: normalized.status });
    }

    summary = data.content?.find((c) => c.type === "text")?.text ?? "No summary returned.";
  }

  await admin
    .from("research_scans")
    .update({ status: "completed", summary })
    .eq("id", scanId);

  return NextResponse.json({
    scan_id: scanId,
    status: "completed",
    summary,
    fetched: results.map((r) => ({
      url: r.url,
      ok: r.ok,
      status: r.status,
      source_type: r.source_type
    }))
  });
}

