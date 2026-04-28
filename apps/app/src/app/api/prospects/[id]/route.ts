import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import { normalizeProspectMemo } from "@/lib/prospectIntelligenceTypes";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const selected = await getDefaultEnvironmentIdForSelectedProduct();
    if (!selected) return NextResponse.json({ error: "No product selected." }, { status: 400 });

    const { data: row, error } = await supabase
      .from("prospect_intelligence")
      .select("*")
      .eq("id", id)
      .eq("environment_id", selected.environmentId)
      .eq("product_id", selected.productId)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 });

    return NextResponse.json({ prospect: row });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const selected = await getDefaultEnvironmentIdForSelectedProduct();
    if (!selected) return NextResponse.json({ error: "No product selected." }, { status: 400 });

    const body = (await req.json()) as {
      name?: string;
      company_name?: string | null;
      website_url?: string | null;
      deal_stage?: string | null;
      memo_json?: unknown;
    };

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.name != null) patch.name = String(body.name).trim();
    if (body.company_name !== undefined) patch.company_name = (body.company_name ?? "").trim() || null;
    if (body.website_url !== undefined) patch.website_url = (body.website_url ?? "").trim() || null;
    if (body.deal_stage !== undefined) patch.deal_stage = (body.deal_stage ?? "").trim() || null;
    if (body.memo_json !== undefined) patch.memo_json = normalizeProspectMemo(body.memo_json);

    const { data: row, error } = await supabase
      .from("prospect_intelligence")
      .update(patch)
      .eq("id", id)
      .eq("environment_id", selected.environmentId)
      .eq("product_id", selected.productId)
      .select()
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 });

    return NextResponse.json({ prospect: row });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const selected = await getDefaultEnvironmentIdForSelectedProduct();
    if (!selected) return NextResponse.json({ error: "No product selected." }, { status: 400 });

    const { error } = await supabase
      .from("prospect_intelligence")
      .delete()
      .eq("id", id)
      .eq("environment_id", selected.environmentId)
      .eq("product_id", selected.productId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
