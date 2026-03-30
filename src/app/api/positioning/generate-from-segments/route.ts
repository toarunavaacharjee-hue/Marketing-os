import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import { parseJsonObject } from "@/lib/extractJsonObject";
import {
  POSITIONING_KEY,
  POSITIONING_MODULE,
  type PositioningCanvasValue,
  type PositioningHealth
} from "@/lib/positioningStudio";

type AnthropicMessageResponse = {
  content?: Array<{ type?: string; text?: string }>;
  error?: { message?: string };
};

type HistoryItem = { version: string; label: string };

function clamp0to100(n: unknown): number {
  if (typeof n !== "number" || Number.isNaN(n)) return 70;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function asStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function buildSegmentBrief(rows: Array<Record<string, unknown>>): string {
  const lines: string[] = [];
  for (const r of rows) {
    const name = asStr(r.name);
    const pnf = typeof r.pnf_score === "number" ? r.pnf_score : 0;
    const pains = Array.isArray(r.pain_points)
      ? (r.pain_points as unknown[]).map((p) => asStr(p)).filter(Boolean)
      : [];
    const notes = asStr(r.notes);
    const details = r.details && typeof r.details === "object" ? (r.details as Record<string, unknown>) : {};
    const profile = asStr(details.icp_profile);
    lines.push(
      `### ${name} (PNF ${pnf})\n` +
        `- Pain points: ${pains.join("; ") || "—"}\n` +
        (profile ? `- ICP profile: ${profile}\n` : "") +
        (notes ? `- Notes: ${notes}\n` : "")
    );
  }
  return lines.join("\n");
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

    const { data: segments, error: segErr } = await supabase
      .from("segments")
      .select("name,pnf_score,pain_points,notes,details")
      .eq("environment_id", ctx.environmentId)
      .order("created_at", { ascending: false });

    if (segErr) {
      return NextResponse.json({ error: segErr.message }, { status: 400 });
    }

    const rows = (segments ?? []) as Array<Record<string, unknown>>;
    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No ICP segments yet. Import an ICP document in ICP Segmentation first." },
        { status: 400 }
      );
    }

    const { data: product } = await supabase
      .from("products")
      .select("name,category,icp_summary,positioning_summary")
      .eq("id", ctx.productId)
      .maybeSingle();

    const headerKey = req.headers.get("x-anthropic-key")?.trim() ?? "";
    const anthropicKey = (headerKey || process.env.ANTHROPIC_API_KEY || "").trim();
    if (!anthropicKey) {
      return NextResponse.json(
        { error: "Missing Anthropic API key. Add your key in the sidebar or Settings." },
        { status: 400 }
      );
    }

    const productBrief = product
      ? `Product name: ${asStr(product.name)}
Category: ${asStr(product.category)}
Existing ICP summary: ${asStr(product.icp_summary)}
Existing positioning summary: ${asStr(product.positioning_summary)}`
      : "";

    const segmentBrief = buildSegmentBrief(rows);

    const system = `You are a B2B positioning strategist. Given ICP segments (from an uploaded document flow), produce a coherent positioning canvas for the product.

Output ONLY one JSON object (no markdown fences, no prose).

Keys exactly:
{
  "category": string (short category frame, e.g. "AI-powered GTM OS for B2B SaaS"),
  "target": string (who we win with — synthesize segments),
  "problem": string (core pains from segments),
  "solution": string (how we fix it — concrete),
  "diff": string (differentiation vs status quo / alternatives),
  "wedge": string (narrow entry / first value),
  "health": {
    "clarity": number 0-100,
    "differentiation": number 0-100,
    "credibility": number 0-100,
    "message_market_fit": number 0-100
  }
}

Infer health scores from how clear, differentiated, credible, and segment-aligned the resulting statements are.`;

    const userPrompt = `${productBrief}

ICP segments (from document / segmentation):
${segmentBrief}

Write concise lines (1-2 sentences each for category/target/problem; 2-3 short clauses for solution/diff/wedge where appropriate).`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        temperature: 0.25,
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
        { error: "AI could not produce positioning JSON. Try again." },
        { status: 502 }
      );
    }

    const hRaw = parsed.health && typeof parsed.health === "object" ? (parsed.health as Record<string, unknown>) : {};
    const health: PositioningHealth = {
      clarity: clamp0to100(hRaw.clarity),
      differentiation: clamp0to100(hRaw.differentiation),
      credibility: clamp0to100(hRaw.credibility),
      message_market_fit: clamp0to100(hRaw.message_market_fit)
    };

    const doc = {
      category: asStr(parsed.category),
      target: asStr(parsed.target),
      problem: asStr(parsed.problem),
      solution: asStr(parsed.solution),
      diff: asStr(parsed.diff),
      wedge: asStr(parsed.wedge)
    };

    if (!doc.category && !doc.target) {
      return NextResponse.json(
        { error: "Could not derive positioning from segments." },
        { status: 400 }
      );
    }

    const { data: existing } = await supabase
      .from("module_settings")
      .select("value_json")
      .eq("environment_id", ctx.environmentId)
      .eq("module", POSITIONING_MODULE)
      .eq("key", POSITIONING_KEY)
      .maybeSingle();

    const prev = (existing?.value_json ?? null) as Partial<PositioningCanvasValue> | null;
    const prevRevision = typeof prev?.revision === "number" ? prev.revision : 0;
    const revision = prevRevision + 1;
    const prevHistory = Array.isArray(prev?.history) ? (prev.history as HistoryItem[]) : [];
    const history: HistoryItem[] = [
      { version: `v1.${revision}`, label: "Generated from ICP segments" },
      ...prevHistory.filter((x) => x && typeof x.label === "string").slice(0, 9)
    ];

    const value: PositioningCanvasValue = {
      doc,
      health,
      revision,
      history
    };

    const { error: upErr } = await supabase.from("module_settings").upsert({
      environment_id: ctx.environmentId,
      module: POSITIONING_MODULE,
      key: POSITIONING_KEY,
      value_json: value
    });

    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, canvas: value });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
