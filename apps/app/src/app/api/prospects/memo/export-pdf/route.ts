import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { renderProspectMemoPdf, type ProspectMemoPdfContext } from "@/lib/prospectResearch/prospectMemoPdf";

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

    const body = (await req.json()) as ProspectMemoPdfContext;
    if (!body?.memo || typeof body?.accountName !== "string" || !body.accountName.trim()) {
      return NextResponse.json({ error: "Missing memo/accountName." }, { status: 400 });
    }

    const buf = await renderProspectMemoPdf({
      ...body,
      accountName: body.accountName.trim(),
      generatedAtIso: new Date().toISOString()
    });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "cache-control": "no-store"
      }
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

