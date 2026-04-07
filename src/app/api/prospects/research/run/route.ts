import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import { type GenInput } from "@/lib/prospectResearch/generateProspectMemo";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const selected = await getDefaultEnvironmentIdForSelectedProduct();
    if (!selected) return NextResponse.json({ error: "No product selected." }, { status: 400 });
    const { environmentId, productId } = selected;

    const body = (await req.json()) as {
      accountName?: string;
      companyName?: string;
      websiteUrl?: string;
      dealStage?: string;
      preparedFor?: string;
      demoOrMeetingDate?: string;
      sellerName?: string;
      additionalContext?: string;
    };

    const accountName = (body.accountName ?? "").trim();
    if (!accountName) {
      return NextResponse.json({ error: "Account name (or opportunity name) is required." }, { status: 400 });
    }

    const input: GenInput = {
      accountName,
      companyName: body.companyName?.trim(),
      websiteUrl: body.websiteUrl?.trim(),
      dealStage: body.dealStage?.trim(),
      preparedFor: body.preparedFor?.trim(),
      demoOrMeetingDate: body.demoOrMeetingDate?.trim(),
      sellerName: body.sellerName?.trim(),
      additionalContext: body.additionalContext?.trim()
    };

    const { data, error } = await supabase
      .from("prospect_research_jobs")
      .insert({
        environment_id: environmentId,
        product_id: productId,
        created_by: user.id,
        status: "queued",
        input_json: input
      })
      .select("id")
      .single();

    if (error || !data?.id) {
      console.error("[prospects/research/run] enqueue failed:", error);
      return NextResponse.json({ error: "Failed to start research job." }, { status: 500 });
    }

    return NextResponse.json({ jobId: data.id }, { status: 202 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[prospects/research/run] uncaught:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
