import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";

function asText(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t : null;
}

export async function GET() {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const ctx = await getDefaultEnvironmentIdForSelectedProduct();
    if (!ctx) return NextResponse.json({ error: "No product selected." }, { status: 400 });

    const { data, error } = await supabase
      .from("customer_personas")
      .select(
        "id,name,website_url,industry,segment,company_size,buyer_roles,pains,current_stack,decision_criteria,notes,updated_at"
      )
      .eq("environment_id", ctx.environmentId)
      .order("updated_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ personas: data ?? [] });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const ctx = await getDefaultEnvironmentIdForSelectedProduct();
    if (!ctx) return NextResponse.json({ error: "No product selected." }, { status: 400 });

    const body = (await req.json()) as Record<string, unknown>;
    const name = asText(body.name);
    if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });

    const row = {
      environment_id: ctx.environmentId,
      product_id: ctx.productId,
      name,
      website_url: asText(body.website_url),
      industry: asText(body.industry),
      segment: asText(body.segment),
      company_size: asText(body.company_size),
      buyer_roles: asText(body.buyer_roles),
      pains: asText(body.pains),
      current_stack: asText(body.current_stack),
      decision_criteria: asText(body.decision_criteria),
      notes: asText(body.notes),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from("customer_personas")
      .insert(row)
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, id: data?.id ?? null });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

