import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";

type BattlecardUpsert = {
  competitor_id: string;
  strengths?: string;
  weaknesses?: string;
  why_we_win?: string;
  objection_handling?: string;
};

function asText(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

export async function GET() {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const selected = await getDefaultEnvironmentIdForSelectedProduct();
    if (!selected) return NextResponse.json({ error: "No product selected." }, { status: 400 });
    const { productId, environmentId } = selected;

    const { data: competitors, error: cErr } = await supabase
      .from("product_competitors")
      .select("id,name,website_url,created_at")
      .eq("product_id", productId)
      .order("created_at", { ascending: true });
    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

    const { data: cards, error: bErr } = await supabase
      .from("battlecards")
      .select("id,competitor_id,strengths,weaknesses,why_we_win,objection_handling,updated_at")
      .eq("environment_id", environmentId)
      .order("updated_at", { ascending: false });
    if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 });

    return NextResponse.json({
      competitors: competitors ?? [],
      battlecards: cards ?? []
    });
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
    const { productId, environmentId } = selected;

    const body = (await req.json()) as BattlecardUpsert;
    const competitorId = (body.competitor_id ?? "").trim();
    if (!competitorId) {
      return NextResponse.json({ error: "competitor_id is required." }, { status: 400 });
    }

    const upsert = {
      environment_id: environmentId,
      product_id: productId,
      competitor_id: competitorId,
      strengths: asText(body.strengths),
      weaknesses: asText(body.weaknesses),
      why_we_win: asText(body.why_we_win),
      objection_handling: asText(body.objection_handling),
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from("battlecards").upsert(upsert, {
      onConflict: "environment_id,competitor_id"
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

