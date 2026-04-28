import { NextResponse } from "next/server";
import { resolveWorkspaceAnthropicKey } from "@/lib/anthropic/resolveWorkspaceAnthropicKey";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import { POSITIONING_KEY, POSITIONING_MODULE, type PositioningCanvasValue } from "@/lib/positioningStudio";

type AnthropicMessageResponse = {
  content?: Array<{ type?: string; text?: string }>;
  error?: { message?: string };
};

function normalizeError(message: string | undefined) {
  const m = (message ?? "").trim();
  return m || "Anthropic request failed.";
}

function stripFences(raw: string) {
  const m = raw.match(/```json\s*([\s\S]*?)```/i);
  if (m?.[1]) return m[1].trim();
  const m2 = raw.match(/```\s*([\s\S]*?)```/);
  if (m2?.[1]) return m2[1].trim();
  return raw.trim();
}

function parseJsonObject(text: string): Record<string, unknown> | null {
  const cleaned = stripFences(text);
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  const blob = cleaned.slice(start, end + 1);
  try {
    return JSON.parse(blob) as Record<string, unknown>;
  } catch {
    return null;
  }
}

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

    const keyRes = await resolveWorkspaceAnthropicKey();
    if (!keyRes.ok) {
      return NextResponse.json({ error: keyRes.error }, { status: keyRes.status });
    }
    const anthropicKey = keyRes.key;

    const positioning = await supabase
      .from("module_settings")
      .select("value_json")
      .eq("environment_id", ctx.environmentId)
      .eq("module", POSITIONING_MODULE)
      .eq("key", POSITIONING_KEY)
      .maybeSingle();

    const value = (positioning.data?.value_json ?? null) as Partial<PositioningCanvasValue> | null;
    const doc = (value?.doc ?? null) as PositioningCanvasValue["doc"] | null;
    if (!doc) {
      return NextResponse.json({ error: "Positioning canvas not found." }, { status: 400 });
    }

    const system = `You generate an ICP persona for B2B battlecards.
Return ONLY valid JSON (no markdown fences). Keep fields concise (short strings, no paragraphs).`;

    const prompt = `Positioning canvas:
Category: ${doc.category}
Target: ${doc.target}
Problem: ${doc.problem}
Solution: ${doc.solution}
Differentiation (diff): ${doc.diff}
Wedge: ${doc.wedge}

Generate ONE ICP persona with this schema:
{
  "name": string (short persona label),
  "industry": string,
  "segment": string,
  "buyer_roles": string,
  "pains": string,
  "decision_criteria": string,
  "current_stack": string,
  "notes": string
}

Rules:
- buyer_roles must be 1-3 roles as a single string (newline or semicolon separated is OK).
- pains must be 3-5 short lines.
- decision_criteria must be 2-4 short lines.
- Do not include any extra keys.
- If target/problem is too thin, still infer carefully but keep conservative.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 900,
        temperature: 0.25,
        system,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = (await res.json()) as AnthropicMessageResponse;
    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error?.message ?? normalizeError(data?.error?.message) },
        { status: 502 }
      );
    }

    const text = data.content?.find((c) => c.type === "text")?.text ?? "";
    const parsed = parseJsonObject(text);
    if (!parsed) {
      return NextResponse.json({ error: "Could not parse persona JSON from AI output." }, { status: 502 });
    }

    const industry = asStr(parsed.industry);
    const pains = asStr(parsed.pains);
    const buyer_roles = asStr(parsed.buyer_roles);
    const decision_criteria = asStr(parsed.decision_criteria);

    const missing: string[] = [];
    if (!industry) missing.push("industry");
    if (!pains) missing.push("pains");
    if (!buyer_roles) missing.push("buyer_roles");
    if (!decision_criteria) missing.push("decision_criteria");

    if (missing.length) {
      return NextResponse.json({
        ok: true,
        needs_input: true,
        missing_fields: missing
      });
    }

    const insert = {
      environment_id: ctx.environmentId,
      product_id: ctx.productId,
      kind: "icp",
      name: asStr(parsed.name) || asStr(doc.target) || "ICP persona",
      industry,
      segment: asStr(parsed.segment) || asStr(doc.target),
      buyer_roles,
      pains,
      current_stack: asStr(parsed.current_stack) || "",
      decision_criteria,
      notes: asStr(parsed.notes) || `${asStr(doc.diff).slice(0, 250)} ${asStr(doc.wedge).slice(0, 250)}`.trim(),
      updated_at: new Date().toISOString()
    };

    const { data: ins, error: insErr } = await supabase
      .from("customer_personas")
      .insert(insert)
      .select("id")
      .single();

    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, persona_id: ins?.id as string });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

