import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSelectedProductId } from "@/lib/productContext";

function asText(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export async function POST(req: Request) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const selectedProductId = await getSelectedProductId();
    if (!selectedProductId) {
      return NextResponse.json({ error: "No product selected." }, { status: 400 });
    }

    const body = (await req.json()) as { name?: string; website_url?: string };
    const name = asText(body.name).trim();
    const websiteUrl = asText(body.website_url).trim();
    if (!name) {
      return NextResponse.json({ error: "Product name is required." }, { status: 400 });
    }

    const { data: selectedProduct, error: selErr } = await supabase
      .from("products")
      .select("id,company_id")
      .eq("id", selectedProductId)
      .maybeSingle();
    if (selErr || !selectedProduct?.company_id) {
      return NextResponse.json(
        { error: selErr?.message ?? "Selected product not found." },
        { status: 404 }
      );
    }

    const { data: product, error: pErr } = await supabase
      .from("products")
      .insert({
        company_id: selectedProduct.company_id,
        name,
        website_url: websiteUrl || null
      })
      .select("id,company_id")
      .single();
    if (pErr || !product?.id) {
      return NextResponse.json(
        { error: pErr?.message ?? "Could not create product." },
        { status: 500 }
      );
    }

    const { error: envErr } = await supabase
      .from("product_environments")
      .insert({ product_id: product.id, name: "Default" });
    if (envErr) {
      return NextResponse.json(
        { error: envErr.message ?? "Could not create product environment." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      product: { id: product.id, company_id: product.company_id }
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
