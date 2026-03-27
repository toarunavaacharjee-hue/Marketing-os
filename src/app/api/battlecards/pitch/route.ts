import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";

type AnthropicMessageResponse = {
  content?: Array<{ type?: string; text?: string }>;
  error?: { message?: string };
};

function normalizeAnthropicError(message: string | undefined) {
  const m = (message ?? "").trim();
  const lower = m.toLowerCase();
  if (
    lower.includes("credit balance is too low") ||
    lower.includes("insufficient credits") ||
    (lower.includes("billing") && lower.includes("credits"))
  ) {
    return {
      status: 402,
      error: "Insufficient Anthropic API credits. Add credits / enable billing in Anthropic Console."
    };
  }
  return { status: 502, error: m || "Anthropic request failed." };
}

/** First balanced `{ ... }` outside of JSON strings (handles nested objects/arrays). */
function extractFirstJsonObjectString(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (c === "\\" && inString) {
      escape = true;
      continue;
    }
    if (c === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function stripCodeFences(raw: string) {
  const mJson = raw.match(/```json\s*([\s\S]*?)```/i);
  if (mJson?.[1]) return mJson[1].trim();
  const m = raw.match(/```\s*([\s\S]*?)```/);
  return m?.[1]?.trim() ?? raw;
}

function extractJsonObject(text: string) {
  const cleaned = stripCodeFences(text);
  const blob = extractFirstJsonObjectString(cleaned) ?? extractFirstJsonObjectString(text);
  if (!blob) return null;
  try {
    return JSON.parse(blob) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function asStringArray(v: unknown): string[] {
  if (v === null || v === undefined) return [];
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === "string" && v.trim()) return [v.trim()];
  return [];
}

function asObjectionArray(v: unknown): Array<{ objection: string; response: string }> {
  if (!Array.isArray(v)) return [];
  const out: Array<{ objection: string; response: string }> = [];
  for (const item of v) {
    if (item && typeof item === "object" && "objection" in item && "response" in item) {
      out.push({
        objection: String((item as { objection: unknown }).objection ?? ""),
        response: String((item as { response: unknown }).response ?? "")
      });
    }
  }
  return out;
}

/** Accepts snake_case or camelCase from the model; fills gaps so DB/UI never see empty structure. */
function normalizePitchJson(raw: Record<string, unknown> | null, markdownFallback: string) {
  const r = raw ?? {};
  const positioning = asStringArray(
    r.positioning ?? (r as { positioningLines?: unknown }).positioningLines
  );
  let talkTrack = asStringArray(
    r.talk_track ?? (r as { talkTrack?: unknown }).talkTrack ?? (r as { talktrack?: unknown }).talktrack
  );
  const landmines = asStringArray(r.landmines);
  let objections = asObjectionArray(r.objections);
  const nextSteps = asStringArray(r.next_steps ?? (r as { nextSteps?: unknown }).nextSteps);

  const md = markdownFallback.trim();
  if (talkTrack.length === 0 && md.length > 0) {
    const bullets = md
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => /^[-*•]/.test(l) || /^\d+\./.test(l))
      .map((l) => l.replace(/^[-*•]\s*/, "").replace(/^\d+\.\s*/, ""))
      .filter(Boolean)
      .slice(0, 12);
    if (bullets.length) talkTrack = bullets;
  }
  if (positioning.length === 0 && md.length > 0) {
    const heading = md.match(/^#\s+(.+)$/m);
    if (heading?.[1]) positioning.push(heading[1].trim());
    else positioning.push("Positioning (see markdown battlecard)");
  }
  if (talkTrack.length === 0 && md.length > 80) {
    talkTrack = ["Use the sections in the markdown battlecard as your talk track."];
  }

  return {
    positioning,
    talk_track: talkTrack,
    landmines: landmines.length ? landmines : ["Confirm stakeholder map before claiming ROI."],
    objections,
    next_steps: nextSteps.length ? nextSteps : ["Schedule discovery", "Send relevant proof", "Align on success criteria"]
  };
}

function extractMarkdownBody(full: string, jsonBlob: string | null) {
  const t = full.trim();
  const fenceIdx = t.search(/```(?:json)?/i);
  if (fenceIdx > 0) return t.slice(0, fenceIdx).trim();
  if (jsonBlob) {
    const i = t.indexOf(jsonBlob);
    if (i > 0) return t.slice(0, i).trim();
  }
  const brace = t.indexOf("{");
  if (brace > 0) return t.slice(0, brace).trim();
  return t;
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

    const body = (await req.json()) as { competitor_id?: string; persona_id?: string };
    const competitorId = (body.competitor_id ?? "").trim();
    const personaId = (body.persona_id ?? "").trim();
    if (!competitorId || !personaId) {
      return NextResponse.json(
        { error: "competitor_id and persona_id are required." },
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

    const { data: persona, error: perr } = await supabase
      .from("customer_personas")
      .select(
        "id,kind,name,website_url,industry,segment,company_size,buyer_roles,pains,current_stack,decision_criteria,notes"
      )
      .eq("id", personaId)
      .eq("environment_id", ctx.environmentId)
      .maybeSingle();
    if (perr || !persona) {
      return NextResponse.json({ error: perr?.message ?? "Persona not found." }, { status: 404 });
    }

    const missing: string[] = [];
    if (!persona.industry) missing.push("industry");
    if (!persona.pains) missing.push("pains");
    if (!persona.buyer_roles) missing.push("buyer roles");
    if (!persona.decision_criteria) missing.push("decision criteria");
    if (missing.length) {
      return NextResponse.json(
        {
          error: "Missing persona details: " + missing.join(", ") + ".",
          missing_fields: missing,
          questions: [
            "What is the buyer’s #1 business outcome they care about?",
            "What’s the current solution and why are they unhappy?",
            "Who are the decision makers and influencers?",
            "What are the top 3 objections we must overcome?"
          ]
        },
        { status: 400 }
      );
    }

    const { data: competitor, error: cerr } = await supabase
      .from("product_competitors")
      .select("id,name,website_url")
      .eq("id", competitorId)
      .eq("product_id", ctx.productId)
      .maybeSingle();
    if (cerr || !competitor) {
      return NextResponse.json(
        { error: cerr?.message ?? "Competitor not found for this product." },
        { status: 404 }
      );
    }

    const { data: product } = await supabase
      .from("products")
      .select("id,name,website_url,category,icp_summary,positioning_summary")
      .eq("id", ctx.productId)
      .maybeSingle();

    const { data: baseCard } = await supabase
      .from("battlecards")
      .select("strengths,weaknesses,why_we_win,objection_handling,updated_at")
      .eq("environment_id", ctx.environmentId)
      .eq("competitor_id", competitorId)
      .maybeSingle();

    const { data: scan } = await supabase
      .from("research_scans")
      .select("id,summary,created_at")
      .eq("environment_id", ctx.environmentId)
      .eq("product_id", ctx.productId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: snaps } = scan?.id
      ? await supabase
          .from("research_snapshots")
          .select("source_type,url,title,text_content,competitor_id")
          .eq("scan_id", scan.id)
          .order("fetched_at", { ascending: true })
          .limit(12)
      : { data: [] as any[] };

    const snapshotContext = (snaps ?? [])
      .map((s, idx) => {
        const title = s.title ? `Title: ${s.title}\n` : "";
        return `#${idx + 1} ${String(s.source_type).toUpperCase()}\nURL: ${s.url}\n${title}${String(
          s.text_content ?? ""
        ).slice(0, 2200)}\n`;
      })
      .join("\n---\n");

    const targetKind = (persona as { kind?: string }).kind === "account" ? "account" : "icp";
    const targetLabel =
      targetKind === "account"
        ? "NAMED ACCOUNT / PROSPECT (company-specific talk track, stakeholders, and proof)."
        : "ICP / SEGMENT PERSONA (repeatable positioning for this buyer segment).";

    const system = `You generate sales battlecards for a specific target customer.
The target type is provided (ICP vs named account). Match the depth: account-level specifics vs segment-level patterns.
Return TWO things:
1) A markdown pitch battlecard (well-formatted, headings + bullets). No tables.
2) A JSON object with this schema:
{
  "positioning": ["...","...","..."],
  "talk_track": ["...","...","...","..."],
  "landmines": ["...","...","..."],
  "objections": [{"objection":"...","response":"..."}],
  "next_steps": ["...","...","..."]
}
Output markdown first, blank line, then the JSON object.
The JSON must be valid, include "positioning" and "talk_track" as arrays of strings, and must not be truncated.`;

    const prompt = `Base product:
Name: ${(product?.name as string) ?? "(unknown)"}
Website: ${(product?.website_url as string) ?? "(unknown)"}
Category: ${(product?.category as string) ?? "(unknown)"}
ICP: ${(product?.icp_summary as string) ?? "(unknown)"}
Positioning: ${(product?.positioning_summary as string) ?? "(unknown)"}

Competitor:
Name: ${competitor.name}
Website: ${competitor.website_url}

Existing battlecard notes (if any):
Strengths: ${baseCard?.strengths ?? "(none)"}
Weaknesses: ${baseCard?.weaknesses ?? "(none)"}
Why we win: ${baseCard?.why_we_win ?? "(none)"}
Objections: ${baseCard?.objection_handling ?? "(none)"}

Target type: ${targetLabel}

Target customer (persona):
Name: ${persona.name}
Website: ${persona.website_url ?? "(none)"}
Industry: ${persona.industry}
Segment: ${persona.segment ?? "(none)"}
Company size: ${persona.company_size ?? "(none)"}
Buyer roles: ${persona.buyer_roles}
Pains: ${persona.pains}
Current stack: ${persona.current_stack ?? "(unknown)"}
Decision criteria: ${persona.decision_criteria}
Notes: ${persona.notes ?? "(none)"}

Latest research scan summary (if available):
${scan?.summary ?? "(none)"}

Snapshots (if available):
${snapshotContext || "(none)"}

Now write a pitch battlecard vs this competitor tailored to this persona.
Be specific and actionable; include value props, proof placeholders, talk track, and objection handling.`;

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
        temperature: 0.3,
        system,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = (await res.json()) as AnthropicMessageResponse;
    if (!res.ok) {
      const normalized = normalizeAnthropicError(data?.error?.message);
      return NextResponse.json({ error: normalized.error }, { status: normalized.status });
    }

    const text = data.content?.find((c) => c.type === "text")?.text ?? "";
    const rawParsed = extractJsonObject(text);
    const jsonBlob =
      extractFirstJsonObjectString(stripCodeFences(text)) ?? extractFirstJsonObjectString(text);
    let markdown = extractMarkdownBody(text, jsonBlob).trim();
    if (!markdown) {
      let t2 = text.trim().replace(/```json[\s\S]*?```/gi, "").trim();
      if (jsonBlob) t2 = t2.replace(jsonBlob, "").trim();
      markdown = t2 || "No narrative output — see structured fields below.";
    }
    const parsed = normalizePitchJson(rawParsed, markdown);

    const upsert = {
      environment_id: ctx.environmentId,
      product_id: ctx.productId,
      competitor_id: competitorId,
      persona_id: personaId,
      pitch_markdown: markdown,
      pitch_json: parsed,
      updated_at: new Date().toISOString()
    };

    await supabase.from("battlecard_pitches").upsert(upsert, {
      onConflict: "environment_id,competitor_id,persona_id"
    });

    return NextResponse.json({ ok: true, markdown, pitch_json: parsed });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

