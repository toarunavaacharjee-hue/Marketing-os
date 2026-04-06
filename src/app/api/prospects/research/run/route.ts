import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import { resolveWorkspaceAnthropicKey } from "@/lib/anthropic/resolveWorkspaceAnthropicKey";
import {
  generateProspectMemo,
  retryProspectMemoStrict
} from "@/lib/prospectResearch/generateProspectMemo";

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

    const keyRes = await resolveWorkspaceAnthropicKey();
    if (!keyRes.ok) {
      return NextResponse.json({ error: keyRes.error }, { status: keyRes.status });
    }

    const input = {
      accountName,
      companyName: body.companyName?.trim(),
      websiteUrl: body.websiteUrl?.trim(),
      dealStage: body.dealStage?.trim(),
      preparedFor: body.preparedFor?.trim(),
      demoOrMeetingDate: body.demoOrMeetingDate?.trim(),
      sellerName: body.sellerName?.trim(),
      additionalContext: body.additionalContext?.trim()
    };

    let gen = await generateProspectMemo(keyRes.key, input);
    if (!gen.ok) {
      const retry = await retryProspectMemoStrict(keyRes.key, input);
      if (retry.ok) gen = retry;
    }

    if (!gen.ok) {
      // Use 503 (not 502) so Vercel logs distinguish app-level AI failures from edge/gateway 502s.
      console.error("[prospects/research/run] generation failed:", gen.error);
      return NextResponse.json({ error: gen.error }, { status: 503 });
    }

    return NextResponse.json({ memo: gen.memo });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[prospects/research/run] uncaught:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
