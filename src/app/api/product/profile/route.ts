import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSelectedProductId } from "@/lib/productContext";

type CompetitorInput = { id?: string; name: string; website_url: string };

function asText(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export async function GET() {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const productId = await getSelectedProductId();
    if (!productId) return NextResponse.json({ error: "No product selected." }, { status: 400 });

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

    const { data: competitors, error: cErr } = await supabase
      .from("product_competitors")
      .select("id,name,website_url,created_at")
      .eq("product_id", productId)
      .order("created_at", { ascending: true });

    if (cErr) {
      return NextResponse.json({ error: cErr.message }, { status: 500 });
    }

    const p = product as Record<string, unknown>;
    return NextResponse.json({
      product: {
        id: product.id,
        name: product.name,
        website_url: product.website_url,
        category: p.category ?? null,
        icp_summary: p.icp_summary ?? null,
        positioning_summary: p.positioning_summary ?? null,
        g2_review_url: p.g2_review_url ?? null,
        capterra_review_url: p.capterra_review_url ?? null,
        news_rss_url: p.news_rss_url ?? null,
        news_keywords: p.news_keywords ?? null
      },
      competitors: competitors ?? []
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
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

    const { data: pmRow, error: pmErr } = await supabase
      .from("product_members")
      .select("role")
      .eq("product_id", productId)
      .eq("user_id", user.id)
      .maybeSingle<{ role: string }>();
    const role = (pmRow?.role ?? "").toLowerCase();
    if (pmErr || (role !== "owner" && role !== "admin")) {
      return NextResponse.json({ error: "Only product admins can edit the product profile." }, { status: 403 });
    }

    const body = (await req.json()) as {
      name?: string;
      website_url?: string;
      category?: string;
      icp_summary?: string;
      positioning_summary?: string;
      g2_review_url?: string;
      capterra_review_url?: string;
      news_rss_url?: string;
      news_keywords?: string;
      competitors?: CompetitorInput[];
    };

    const update = {
      name: asText(body.name) || undefined,
      website_url: asText(body.website_url) || null,
      category: asText(body.category) || null,
      icp_summary: asText(body.icp_summary) || null,
      positioning_summary: asText(body.positioning_summary) || null,
      g2_review_url: asText(body.g2_review_url) || null,
      capterra_review_url: asText(body.capterra_review_url) || null,
      news_rss_url: asText(body.news_rss_url) || null,
      news_keywords: asText(body.news_keywords) || null
    };

    const upd = await supabase.from("products").update(update).eq("id", productId);
    if (upd.error) return NextResponse.json({ error: upd.error.message }, { status: 500 });

    const competitors = Array.isArray(body.competitors) ? body.competitors : [];

    const del = await supabase.from("product_competitors").delete().eq("product_id", productId);
    if (del.error) return NextResponse.json({ error: del.error.message }, { status: 500 });

    const cleaned = competitors
      .map((c) => ({
        product_id: productId,
        name: asText(c.name).trim(),
        website_url: asText(c.website_url).trim()
      }))
      .filter((c) => c.name && c.website_url);

    if (cleaned.length) {
      const ins = await supabase.from("product_competitors").insert(cleaned);
      if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}

