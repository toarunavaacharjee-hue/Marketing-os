import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSelectedProductId } from "@/lib/productContext";
import { effectiveProductsAllowed, getEntitlements } from "@/lib/planEntitlements";

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
      return NextResponse.json({ error: selErr?.message ?? "Selected product not found." }, { status: 404 });
    }

    const companyId = String(selectedProduct.company_id);

    const { data: cmRow, error: cmErr } = await supabase
      .from("company_members")
      .select("role")
      .eq("company_id", companyId)
      .eq("user_id", user.id)
      .maybeSingle<{ role: string }>();
    const role = (cmRow?.role ?? "").toLowerCase();
    if (cmErr || (role !== "owner" && role !== "admin")) {
      return NextResponse.json({ error: "Only workspace admins can create products." }, { status: 403 });
    }

    const [{ count: productCount }, { data: subRow }] = await Promise.all([
      supabase.from("products").select("id", { count: "exact", head: true }).eq("company_id", companyId),
      supabase
        .from("company_subscriptions")
        .select("plan,products_included,products_addon,status")
        .eq("company_id", companyId)
        .maybeSingle()
    ]);

    const status = String((subRow as any)?.status ?? "active").toLowerCase();
    if (status === "canceled") {
      return NextResponse.json({ error: "Subscription canceled." }, { status: 402 });
    }

    const planRaw = String((subRow as any)?.plan ?? "starter");
    const productsIncluded = Number.isFinite((subRow as any)?.products_included)
      ? Number((subRow as any)?.products_included)
      : 1;
    const productsAddon = Number.isFinite((subRow as any)?.products_addon)
      ? Number((subRow as any)?.products_addon)
      : 0;
    const productsAllowed = effectiveProductsAllowed(planRaw, productsIncluded, productsAddon);
    const planCap = getEntitlements(planRaw).productsMax;

    const currentProducts = productCount ?? 0;
    if (currentProducts >= productsAllowed) {
      const capHint =
        planCap !== null
          ? ` Your plan allows up to ${planCap} product${planCap === 1 ? "" : "s"}.`
          : "";
      return NextResponse.json(
        {
          error: `Product limit reached (${currentProducts}/${productsAllowed}).${capHint} Add a product add-on or upgrade for more.`
        },
        { status: 402 }
      );
    }

    const { data: product, error: pErr } = await supabase
      .from("products")
      .insert({
        company_id: companyId,
        name,
        website_url: websiteUrl || null
      })
      .select("id,company_id")
      .single();
    if (pErr || !product?.id) {
      return NextResponse.json({ error: pErr?.message ?? "Could not create product." }, { status: 500 });
    }

    const { error: envErr } = await supabase.from("product_environments").insert({ product_id: product.id, name: "Default" });
    if (envErr) {
      return NextResponse.json({ error: envErr.message ?? "Could not create product environment." }, { status: 500 });
    }

    const { error: pmErr } = await supabase.from("product_members").insert({
      product_id: product.id,
      user_id: user.id,
      role: "admin"
    });
    if (pmErr) {
      return NextResponse.json({ error: pmErr.message ?? "Could not grant product access." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, product: { id: product.id, company_id: product.company_id } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}

