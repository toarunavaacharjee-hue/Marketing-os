import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import { enrichAttendeesWithPdl } from "@/lib/prospectResearch/attendeeEnrichment";
import { normalizeEmailList } from "@/lib/prospectResearch/stakeholderTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const ctx = await getDefaultEnvironmentIdForSelectedProduct();
    if (!ctx) return NextResponse.json({ error: "No product selected." }, { status: 400 });

    const body = (await req.json()) as { emails?: string[]; raw?: string };
    const emails =
      Array.isArray(body.emails) && body.emails.length
        ? body.emails.map((e) => String(e).trim().toLowerCase()).filter(Boolean)
        : normalizeEmailList(String(body.raw ?? ""));

    if (!emails.length) return NextResponse.json({ error: "Provide at least one attendee email." }, { status: 400 });
    if (emails.length > 20) return NextResponse.json({ error: "Max 20 attendee emails at a time." }, { status: 400 });

    const stakeholders = await enrichAttendeesWithPdl(emails);
    return NextResponse.json({ ok: true, stakeholders });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

