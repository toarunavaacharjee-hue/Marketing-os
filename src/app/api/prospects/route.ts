import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import { normalizeProspectMemo } from "@/lib/prospectIntelligenceTypes";

export async function GET() {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const selected = await getDefaultEnvironmentIdForSelectedProduct();
    if (!selected) return NextResponse.json({ error: "No product selected." }, { status: 400 });

    const { data: rows, error } = await supabase
      .from("prospect_intelligence")
      .select("id,name,company_name,website_url,deal_stage,updated_at,created_at")
      .eq("environment_id", selected.environmentId)
      .eq("product_id", selected.productId)
      .order("updated_at", { ascending: false });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("relation") && msg.includes("does not exist")) {
        return NextResponse.json(
          {
            error:
              "Prospect Intelligence table is not installed. Run supabase/prospect_intelligence.sql in the Supabase SQL editor."
          },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ prospects: rows ?? [] });
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

    const selected = await getDefaultEnvironmentIdForSelectedProduct();
    if (!selected) return NextResponse.json({ error: "No product selected." }, { status: 400 });

    const body = (await req.json()) as {
      name?: string;
      company_name?: string | null;
      website_url?: string | null;
      deal_stage?: string | null;
      memo_json?: unknown;
    };
    const name = (body.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });

    const memo_json = normalizeProspectMemo(body.memo_json);

    const { data: row, error } = await supabase
      .from("prospect_intelligence")
      .insert({
        environment_id: selected.environmentId,
        product_id: selected.productId,
        name,
        company_name: (body.company_name ?? "").trim() || null,
        website_url: (body.website_url ?? "").trim() || null,
        deal_stage: (body.deal_stage ?? "").trim() || null,
        memo_json,
        updated_at: new Date().toISOString()
      })
      .select("id,name,company_name,website_url,deal_stage,memo_json,created_at,updated_at")
      .single();

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("relation") && msg.includes("does not exist")) {
        return NextResponse.json(
          {
            error:
              "Prospect Intelligence table is not installed. Run supabase/prospect_intelligence.sql in the Supabase SQL editor."
          },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ prospect: row });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
