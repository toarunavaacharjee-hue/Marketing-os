import { NextResponse } from "next/server";
import { resolveWorkspaceAnthropicKey } from "@/lib/anthropic/resolveWorkspaceAnthropicKey";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import { extractTextFromBuffer } from "@/lib/extractDocumentText";
import { parseJsonObjectLenient } from "@/lib/extractJsonObject";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AnthropicMessageResponse = {
  content?: Array<{ type?: string; text?: string }>;
  error?: { message?: string };
};

const MAX_BYTES = 8 * 1024 * 1024;
const MAX_AI_INPUT_CHARS = 14_000;

function asStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function trimForAi(raw: string): string {
  const text = raw.replace(/\u0000/g, "").trim();
  if (text.length <= MAX_AI_INPUT_CHARS) return text;
  const head = text.slice(0, Math.floor(MAX_AI_INPUT_CHARS * 0.7));
  const tail = text.slice(-Math.floor(MAX_AI_INPUT_CHARS * 0.3));
  return `${head}\n\n[...snip...]\n\n${tail}`;
}

async function callAnthropicJsonOnly(args: {
  apiKey: string;
  system: string;
  userPrompt: string;
  maxTokens: number;
}): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": args.apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: args.maxTokens,
      temperature: 0,
      system: args.system,
      messages: [{ role: "user", content: args.userPrompt }]
    })
  });

  const data = (await res.json()) as AnthropicMessageResponse;
  if (!res.ok) return { ok: false, error: data?.error?.message ?? "Anthropic request failed." };
  const out = data.content?.find((c) => c.type === "text")?.text ?? "";
  return { ok: true, text: out };
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

    const system = `Extract prospect-research hints from the document. Output ONLY a valid JSON object (no prose, no markdown fences, no extra keys).
Keys exactly:
- company_name (string, may be "")
- website_url (string, may be "")
- key_decision_makers_markdown (string, GitHub-flavored Markdown; include at least one small table; use TBD names if not given)
- notes (string, concise bullet list of useful facts, pains, initiatives, tools, competitors; 6-12 bullets)`;

    const userPrompt = `Filename: ${fname}

Document text:
${trimForAi(text)}`;

    const first = await callAnthropicJsonOnly({
      apiKey: keyRes.key,
      system,
      userPrompt,
      maxTokens: 1200
    });
    if (!first.ok) return NextResponse.json({ error: first.error }, { status: 502 });

    let parsed = parseJsonObjectLenient(first.text);
    if (!parsed) {
      const retrySystem = `${system}\n\nIf you are missing fields, still output them as empty strings. Return ONLY the JSON object.`;
      const retryPrompt = `${userPrompt}\n\nIMPORTANT: Output ONLY a single JSON object.`;
      const second = await callAnthropicJsonOnly({
        apiKey: keyRes.key,
        system: retrySystem,
        userPrompt: retryPrompt,
        maxTokens: 1200
      });
      if (!second.ok) return NextResponse.json({ error: second.error }, { status: 502 });
      parsed = parseJsonObjectLenient(second.text);
    }
    if (!parsed) {
      return NextResponse.json(
        {
          error:
            "AI returned an invalid response for this document. Try a smaller / more specific file, or paste the key sections into Additional context."
        },
        { status: 502 }
      );
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
