import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import { extractTextFromBuffer } from "@/lib/extractDocumentText";
import { parseJsonObject } from "@/lib/extractJsonObject";

type AnthropicMessageResponse = {
  content?: Array<{ type?: string; text?: string }>;
  error?: { message?: string };
};

const MAX_BYTES = 8 * 1024 * 1024;

function clamp0to100(n: unknown, fallback: number): number {
  if (typeof n !== "number" || Number.isNaN(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function asStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function asPainPoints(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => asStr(x)).filter(Boolean).slice(0, 12);
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

    const system = `You extract ICP (ideal customer profile) segments AND a product profile from a document for a B2B marketing product.
Output ONLY one JSON object (no prose, no markdown fences).

Schema exactly:
{
  "segments": [ {
    "name": string,
    "pnf_score": number (0-100 product-needs fit for this segment),
    "pain_points": string[] (2-6 short bullets),
    "urgency": number (0-100),
    "budget_fit": number (0-100),
    "acv_potential": number (0-100),
    "retention_potential": number (0-100),
    "icp_profile": string (one paragraph, 2-5 sentences describing firmographics, motion, budget signals),
    "notes": string (optional, one line)
  } ],
  "product_profile": {
    "name": string,
    "website_url": string,
    "category": string,
    "icp_summary": string,
    "positioning_summary": string
  }
}

Rules for "segments":
- If the document describes one ICP, return one object in "segments".
- If it clearly lists multiple distinct segments, return multiple.
- Infer scores from context; use mid values when unknown.
- pain_points must be specific phrases, not paragraphs.

Rules for "product_profile" (the vendor / offering being sold to those ICPs):
- "name": product or company name if clearly stated; else "".
- "website_url": domain or URL if stated (e.g. app.example.com or https://...); else "".
- "category": short market category (e.g. "Data integration for insurers"); infer from context if implied; else "".
- "icp_summary": one paragraph synthesizing WHO you sell to across segments (size, roles, pains, buying motion).
- "positioning_summary": one paragraph on how the product positions and the core value vs alternatives; use doc language when possible.
- Use "" for any field with no basis in the document (do not invent URLs).`;

    const userPrompt = `Filename: ${name}

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
        max_tokens: 4096,
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
      return NextResponse.json(
        { error: "AI could not extract structured segments. Try a clearer document." },
        { status: 502 }
      );
    }

    const rawList = parsed.segments;
    if (!Array.isArray(rawList) || rawList.length === 0) {
      return NextResponse.json(
        { error: "No segments found in the document. Add segment definitions and try again." },
        { status: 400 }
      );
    }

    const segments = rawList.map((item) => {
      const row = item as Record<string, unknown>;
      const pnf = clamp0to100(row.pnf_score, 70);
      return {
        name: asStr(row.name),
        pnf_score: pnf,
        pain_points: asPainPoints(row.pain_points),
        urgency: clamp0to100(row.urgency, pnf),
        budget_fit: clamp0to100(row.budget_fit, pnf),
        acv_potential: clamp0to100(row.acv_potential, pnf),
        retention_potential: clamp0to100(row.retention_potential, pnf),
        icp_profile: asStr(row.icp_profile),
        notes: asStr(row.notes) || null
      };
    });

    const valid = segments.filter((s) => s.name.length > 0);
    if (valid.length === 0) {
      return NextResponse.json(
        { error: "Could not infer segment names. Add titles or labels in the document." },
        { status: 400 }
      );
    }

    const ppRaw =
      parsed.product_profile && typeof parsed.product_profile === "object"
        ? (parsed.product_profile as Record<string, unknown>)
        : {};
    const productProfile = {
      name: asStr(ppRaw.name),
      website_url: asStr(ppRaw.website_url),
      category: asStr(ppRaw.category),
      icp_summary: asStr(ppRaw.icp_summary),
      positioning_summary: asStr(ppRaw.positioning_summary)
    };

    return NextResponse.json({
      ok: true,
      environmentId: ctx.environmentId,
      draft: { segments: valid, productProfile }
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
