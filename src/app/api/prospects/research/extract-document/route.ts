import { NextResponse } from "next/server";
import { resolveWorkspaceAnthropicKey } from "@/lib/anthropic/resolveWorkspaceAnthropicKey";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import { extractTextFromBuffer } from "@/lib/extractDocumentText";
import { parseJsonObject } from "@/lib/extractJsonObject";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AnthropicMessageResponse = {
  content?: Array<{ type?: string; text?: string }>;
  error?: { message?: string };
};

const MAX_BYTES = 8 * 1024 * 1024;

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
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 8 MB)." }, { status: 400 });
    }

    const fname = file.name || "upload";
    const buffer = Buffer.from(await file.arrayBuffer());

    let text: string;
    try {
      text = await extractTextFromBuffer(buffer, fname);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Could not read file." },
        { status: 400 }
      );
    }

    if (!text.trim()) {
      return NextResponse.json({ error: "No readable text in this file." }, { status: 400 });
    }

    const keyRes = await resolveWorkspaceAnthropicKey();
    if (!keyRes.ok) {
      return NextResponse.json({ error: keyRes.error }, { status: keyRes.status });
    }

    const system = `Extract prospect-research hints from the document. Output ONLY valid JSON (no prose, no markdown fences).
Keys exactly:
- company_name (string, may be "")
- website_url (string, may be "")
- key_decision_makers_markdown (string, GitHub-flavored Markdown; include at least one small table; use TBD names if not given)
- notes (string, concise bullet list of useful facts, pains, initiatives, tools, competitors; 6-12 bullets)`;

    const userPrompt = `Filename: ${fname}

Document text:
${text}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": keyRes.key,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 900,
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
    const parsed = parseJsonObject(out);
    if (!parsed) {
      return NextResponse.json({ error: "AI could not extract usable data from this file." }, { status: 502 });
    }

    const result = {
      companyName: asStr((parsed as any).company_name),
      websiteUrl: asStr((parsed as any).website_url),
      keyDecisionMakersMarkdown: asStr((parsed as any).key_decision_makers_markdown),
      notes: asStr((parsed as any).notes)
    };

    if (!result.notes && !result.keyDecisionMakersMarkdown) {
      return NextResponse.json(
        { error: "No usable notes could be extracted. Try a more specific document." },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

