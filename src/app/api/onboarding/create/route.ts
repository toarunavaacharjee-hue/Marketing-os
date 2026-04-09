import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole";

function asStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function normalizeUrl(u: string): string | null {
  const raw = (u ?? "").trim();
  if (!raw) return null;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return `https://${raw}`;
}

export async function POST(req: Request) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as {
      companyName?: unknown;
      productName?: unknown;
      websiteUrl?: unknown;
    };

    const companyName = asStr(body.companyName);
    const productName = asStr(body.productName);
    const websiteUrl = normalizeUrl(asStr(body.websiteUrl));

    if (!companyName || !productName) {
      return NextResponse.json({ error: "Workspace name and product name are required." }, { status: 400 });
    }

    // Use service role to avoid client-side RLS edge cases during bootstrap.
    const admin = createSupabaseServiceRoleClient();

    const { data: company, error: companyErr } = await admin
      .from("companies")
      .insert({ name: companyName, created_by: user.id })
      .select("id")
      .single<{ id: string }>();
    if (companyErr || !company?.id) {
      return NextResponse.json({ error: companyErr?.message ?? "Could not create workspace." }, { status: 400 });
    }

    const { error: memberErr } = await admin.from("company_members").insert({
      company_id: company.id,
      user_id: user.id,
      role: "owner"
    });
    if (memberErr) {
      return NextResponse.json({ error: memberErr.message ?? "Could not add you to the workspace." }, { status: 400 });
    }

    const { error: subErr } = await admin.from("company_subscriptions").insert({
      company_id: company.id,
      plan: "starter",
      status: "active",
      seats_included: 1,
      seats_addon: 0,
      products_included: 1,
      products_addon: 0
    });
    if (subErr) {
      return NextResponse.json({ error: subErr.message ?? "Could not create subscription row." }, { status: 400 });
    }

    const { data: product, error: productErr } = await admin
      .from("products")
      .insert({
        company_id: company.id,
        name: productName,
        website_url: websiteUrl
      })
      .select("id")
      .single<{ id: string }>();
    if (productErr || !product?.id) {
      return NextResponse.json({ error: productErr?.message ?? "Could not create product." }, { status: 400 });
    }

    const { error: envErr } = await admin.from("product_environments").insert({
      product_id: product.id,
      name: "Default"
    });
    if (envErr) {
      return NextResponse.json({ error: envErr.message ?? "Could not create product environment." }, { status: 400 });
    }

    const { error: pmErr } = await admin.from("product_members").insert({
      product_id: product.id,
      user_id: user.id,
      role: "owner"
    });
    if (pmErr) {
      return NextResponse.json({ error: pmErr.message ?? "Could not grant you access to the product." }, { status: 400 });
    }

    return NextResponse.json({ ok: true, companyId: company.id, productId: product.id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}

