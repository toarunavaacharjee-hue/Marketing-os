import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import { extractTextFromBuffer } from "@/lib/extractDocumentText";

type AnthropicMessageResponse = {
  content?: Array<{ type?: string; text?: string }>;
  error?: { message?: string };
};

const MAX_BYTES = 8 * 1024 * 1024;

function extractJsonObject(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
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

    const form = await req.formData();
    const file = form.get("file");
    const kindRaw = String(form.get("kind") ?? "icp").toLowerCase();
    const kind = kindRaw === "account" ? "account" : "icp";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file." }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 8 MB)." }, { status: 400 });
    }

    const name = file.name || "upload";
    const ab = await file.arrayBuffer();
    const buffer = Buffer.from(ab);

    let text: string;
    try {
      text = await extractTextFromBuffer(buffer, name);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Could not read file." },
        { status: 400 }
      );
    }

    if (!text.trim()) {
      return NextResponse.json(
        { error: "No readable text found in this file." },
        { status: 400 }
      );
    }

    const headerKey = req.headers.get("x-anthropic-key")?.trim() ?? "";
    const anthropicKey = (headerKey || process.env.ANTHROPIC_API_KEY || "").trim();
    if (!anthropicKey) {
      return NextResponse.json(
        { error: "Missing Anthropic API key. Add your key in the sidebar or Settings." },
        { status: 400 }
      );
    }

    const system = `You extract structured customer profile fields from business documents.
Return ONLY valid JSON (no markdown fences). Keys must be exactly:
name, website_url, industry, segment, company_size, buyer_roles, pains, current_stack, decision_criteria, notes
All values must be strings. Use empty string "" when unknown. No nulls.`;

    const userPrompt =
      kind === "account"
        ? `This document describes a specific ACCOUNT / named prospect company (not a broad ICP segment).
Infer: company name as "name", and fill other fields from context (buyer roles, pains, stack, criteria, notes).

Document filename: ${name}

Document text:
${text}`
        : `This document describes an IDEAL CUSTOMER PROFILE (ICP) — a segment, not one named account unless clearly an example.
Set "name" to a short descriptive ICP label (e.g. "Mid-market B2B SaaS RevOps").

Document filename: ${name}

Document text:
${text}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1200,
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
    const parsed = extractJsonObject(out);
    if (!parsed) {
      return NextResponse.json({ error: "AI could not extract structured fields. Try a clearer document." }, { status: 502 });
    }

    const fields = {
      name: asStr(parsed.name),
      website_url: asStr(parsed.website_url),
      industry: asStr(parsed.industry),
      segment: asStr(parsed.segment),
      company_size: asStr(parsed.company_size),
      buyer_roles: asStr(parsed.buyer_roles),
      pains: asStr(parsed.pains),
      current_stack: asStr(parsed.current_stack),
      decision_criteria: asStr(parsed.decision_criteria),
      notes: asStr(parsed.notes),
      kind
    };

    if (!fields.name) {
      return NextResponse.json(
        { error: "Could not infer a name/label from the document. Add a title or company name and try again." },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, fields });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
