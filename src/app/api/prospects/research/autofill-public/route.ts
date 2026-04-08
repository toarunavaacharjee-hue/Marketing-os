import { NextResponse } from "next/server";
import { resolveWorkspaceAnthropicKey } from "@/lib/anthropic/resolveWorkspaceAnthropicKey";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import { parseJsonObject } from "@/lib/extractJsonObject";

type AnthropicMessageResponse = {
  content?: Array<{ type?: string; text?: string }>;
  error?: { message?: string };
};

function asStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
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

    const body = (await req.json()) as {
      companyName?: string;
      websiteUrl?: string;
    };
    const companyName = asStr(body.companyName);
    const websiteUrl = asStr(body.websiteUrl);
    if (!companyName && !websiteUrl) {
      return NextResponse.json({ error: "Company name or website is required." }, { status: 400 });
    }

    const keyRes = await resolveWorkspaceAnthropicKey();
    if (!keyRes.ok) return NextResponse.json({ error: keyRes.error }, { status: keyRes.status });

    const system = `You are a B2B company research assistant.
Using only general, publicly-known information and reasonable inference, fill these fields for the company.
If you are not confident, use "TBD" (do not fabricate specifics).
Output ONLY valid JSON (no prose, no markdown fences) with exactly these keys:
{
  "industry_subvertical": string,
  "company_size": string,
  "geography": string,
  "business_model": string,
  "tech_stack": string,
  "funding_ownership": string,
  "recent_news_events": string
}
Values should be concise (1-3 lines each).`;

    const userPrompt = `Company name: ${companyName || "(not provided)"}
Website: ${websiteUrl || "(not provided)"}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": keyRes.key,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 700,
        temperature: 0.2,
        system,
        messages: [{ role: "user", content: userPrompt }]
      })
    });

    const data = (await res.json()) as AnthropicMessageResponse;
    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error?.message ?? "Anthropic request failed." },
        { status: 502 }
      );
    }

    const out = data.content?.find((c) => c.type === "text")?.text ?? "";
    const parsed = parseJsonObject(out) as Record<string, unknown> | null;
    if (!parsed) {
      return NextResponse.json({ error: "AI returned invalid JSON." }, { status: 502 });
    }

    const result = {
      industrySubvertical: asStr(parsed.industry_subvertical),
      companySize: asStr(parsed.company_size),
      geography: asStr(parsed.geography),
      businessModel: asStr(parsed.business_model),
      techStack: asStr(parsed.tech_stack),
      fundingOwnership: asStr(parsed.funding_ownership),
      recentNewsEvents: asStr(parsed.recent_news_events)
    };

    return NextResponse.json({ ok: true, result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

