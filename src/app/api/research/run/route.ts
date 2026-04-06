import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import { runResearchScanJob } from "@/lib/research/runResearchScanJob";

export const runtime = "nodejs";
export const maxDuration = 90;

function normalizeUrl(u: string) {
  const raw = (u ?? "").trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return `https://${raw}`;
}

export async function POST() {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const selected = await getDefaultEnvironmentIdForSelectedProduct();
    if (!selected) return NextResponse.json({ error: "No product selected." }, { status: 400 });
    const productId = selected.productId;
    const environmentId = selected.environmentId;

    const anthropicKey = (process.env.ANTHROPIC_API_KEY || "").trim();
    if (!anthropicKey) {
      return NextResponse.json(
        {
          error:
            "Missing Anthropic API key on the server. Set ANTHROPIC_API_KEY in your deployment environment."
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
      return NextResponse.json({ error: pErr?.message ?? "Product not found." }, { status: 404 });
    }

    const p = product as Record<string, string | null>;
    const g2Url = normalizeUrl(p.g2_review_url ?? "");
    const capterraUrl = normalizeUrl(p.capterra_review_url ?? "");
    const rssUrl = normalizeUrl(p.news_rss_url ?? "");

    const { data: competitors, error: cErr } = await supabase
      .from("product_competitors")
      .select("id,name,website_url")
      .eq("product_id", productId)
      .order("created_at", { ascending: true });
    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

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

    const job = runResearchScanJob({
      supabase,
      productId,
      environmentId,
      scanId,
      anthropicKey
    });

    if (process.env.VERCEL) {
      waitUntil(job);
      return NextResponse.json(
        {
          scan_id: scanId,
          status: "running",
          message: "Scan started. Poll /api/research/latest until status is completed."
        },
        { status: 202 }
      );
    }

    await job;
    const { data: finalScan, error: finalErr } = await supabase
      .from("research_scans")
      .select("id,status,summary,result_json")
      .eq("id", scanId)
      .maybeSingle();
    if (finalErr) {
      return NextResponse.json({ error: finalErr.message }, { status: 500 });
    }
    return NextResponse.json({
      scan_id: scanId,
      status: finalScan?.status ?? "unknown",
      summary: finalScan?.summary ?? null,
      result_json: finalScan?.result_json ?? null
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
