import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";

function asText(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t : null;
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const selected = await getDefaultEnvironmentIdForSelectedProduct();
    if (!selected) return NextResponse.json({ error: "No product selected." }, { status: 400 });

    const { id } = await ctx.params;
    const personaId = (id ?? "").trim();
    if (!personaId) return NextResponse.json({ error: "Invalid persona id." }, { status: 400 });

    const body = (await req.json()) as Record<string, unknown>;
    const kindRaw = typeof body.kind === "string" ? body.kind.toLowerCase().trim() : "";
    const kind = kindRaw === "account" ? "account" : kindRaw === "icp" ? "icp" : undefined;

    const update = {
      ...(kind ? { kind } : {}),
      name: asText(body.name) ?? undefined,
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

    const { error } = await supabase
      .from("customer_personas")
      .update(update)
      .eq("id", personaId)
      .eq("environment_id", selected.environmentId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

