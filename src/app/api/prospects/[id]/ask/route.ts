import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import { resolveWorkspaceAnthropicKey } from "@/lib/anthropic/resolveWorkspaceAnthropicKey";
import { memoToMarkdownContext } from "@/lib/prospectResearch/generateProspectMemo";
import { normalizeProspectMemo } from "@/lib/prospectIntelligenceTypes";
import { parseJsonObject } from "@/lib/extractJsonObject";

function sliceText(s: string | null | undefined, max: number) {
  const t = (s ?? "").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

type AnthropicMessageResponse = {
  content?: Array<{ type: string; text?: string }>;
  error?: { message?: string };
};

const MODEL = process.env.ANTHROPIC_MARKET_RESEARCH_MODEL?.trim() || "claude-sonnet-4-6";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const selected = await getDefaultEnvironmentIdForSelectedProduct();
    if (!selected) return NextResponse.json({ error: "No product selected." }, { status: 400 });

    const body = (await req.json()) as { question?: string };
    const question = (body.question ?? "").trim();
    if (!question) return NextResponse.json({ error: "Question is required." }, { status: 400 });

    const { data: row, error } = await supabase
      .from("prospect_intelligence")
      .select("id,name,memo_json")
      .eq("id", id)
      .eq("environment_id", selected.environmentId)
      .eq("product_id", selected.productId)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!row) return NextResponse.json({ error: "Prospect not found." }, { status: 404 });

    const memo = normalizeProspectMemo(row.memo_json);
    const context = memoToMarkdownContext(memo);

    const keyRes = await resolveWorkspaceAnthropicKey();
    if (!keyRes.ok) {
      return NextResponse.json({ error: keyRes.error }, { status: keyRes.status });
    }

    const system = `You are a Prospect Intelligence assistant. Answer using ONLY the prospect memo below.
If the memo does not contain enough detail, say what is missing and suggest what to research or add.
Output ONLY valid JSON:
{"status":"ok"|"needs_input","answer":"markdown allowed; concise","message":"optional"}`;

    const prompt = `Prospect: ${row.name as string}\n\nMemo:\n${sliceText(context, 24_000)}\n\nQuestion:\n${sliceText(question, 2000)}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": keyRes.key,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1200,
        temperature: 0.25,
        system,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = (await res.json()) as AnthropicMessageResponse;
    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error?.message ?? "Anthropic request failed." },
        { status: 502 }
      );
    }

    const text = data.content?.find((c) => c.type === "text")?.text ?? "";
    const raw = parseJsonObject(text);
    const answer =
      typeof raw?.answer === "string" && raw.answer.trim()
        ? raw.answer.trim()
        : text.trim() || "No answer.";
    const needs_input = String(raw?.status ?? "").toLowerCase() === "needs_input";

    return NextResponse.json({ answer, needs_input });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
