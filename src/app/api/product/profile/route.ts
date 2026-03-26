import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSelectedProductId } from "@/lib/productContext";

type CompetitorInput = { id?: string; name: string; website_url: string };

function asText(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export async function GET() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const productId = await getSelectedProductId();
  if (!productId) return NextResponse.json({ error: "No product selected." }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { data: product, error: pErr } = await admin
    .from("products")
    .select("id,company_id,name,website_url,category,icp_summary,positioning_summary")
    .eq("id", productId)
    .maybeSingle();
  if (pErr || !product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  const { data: membership } = await admin
    .from("company_members")
    .select("company_id")
    .eq("user_id", user.id)
    .eq("company_id", product.company_id as string)
    .maybeSingle();
  if (!membership) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { data: competitors } = await admin
    .from("product_competitors")
    .select("id,name,website_url,created_at")
    .eq("product_id", productId)
    .order("created_at", { ascending: true });

  return NextResponse.json({
    product: {
      id: product.id,
      name: product.name,
      website_url: product.website_url,
      category: product.category,
      icp_summary: product.icp_summary,
      positioning_summary: product.positioning_summary
    },
    competitors: competitors ?? []
  });
}

export async function POST(req: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const productId = await getSelectedProductId();
  if (!productId) return NextResponse.json({ error: "No product selected." }, { status: 400 });

  const body = (await req.json()) as {
    name?: string;
    website_url?: string;
    category?: string;
    icp_summary?: string;
    positioning_summary?: string;
    competitors?: CompetitorInput[];
  };

  const admin = createSupabaseAdminClient();
  const { data: product, error: pErr } = await admin
    .from("products")
    .select("id,company_id")
    .eq("id", productId)
    .maybeSingle();
  if (pErr || !product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  const { data: membership } = await admin
    .from("company_members")
    .select("company_id")
    .eq("user_id", user.id)
    .eq("company_id", product.company_id as string)
    .maybeSingle();
  if (!membership) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const update = {
    name: asText(body.name) || undefined,
    website_url: asText(body.website_url) || null,
    category: asText(body.category) || null,
    icp_summary: asText(body.icp_summary) || null,
    positioning_summary: asText(body.positioning_summary) || null
  };

  const upd = await admin.from("products").update(update).eq("id", productId);
  if (upd.error) return NextResponse.json({ error: upd.error.message }, { status: 500 });

  const competitors = Array.isArray(body.competitors) ? body.competitors : [];
  // Replace competitors list (simple + deterministic)
  const del = await admin.from("product_competitors").delete().eq("product_id", productId);
  if (del.error) return NextResponse.json({ error: del.error.message }, { status: 500 });

  const cleaned = competitors
    .map((c) => ({
      product_id: productId,
      name: asText(c.name).trim(),
      website_url: asText(c.website_url).trim()
    }))
    .filter((c) => c.name && c.website_url);

  if (cleaned.length) {
    const ins = await admin.from("product_competitors").insert(cleaned);
    if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

