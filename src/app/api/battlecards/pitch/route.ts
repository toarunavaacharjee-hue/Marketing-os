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

function extractJsonObject(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as any;
  } catch {
    return null;
  }
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
        "id,name,website_url,industry,segment,company_size,buyer_roles,pains,current_stack,decision_criteria,notes"
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

    const system = `You generate sales battlecards for a specific target customer.
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
Output markdown first, blank line, then the JSON object.`;

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
        max_tokens: 1200,
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
    const parsed = extractJsonObject(text);
    const jsonStart = text.indexOf("{");
    const markdown = (jsonStart > 0 ? text.slice(0, jsonStart).trim() : text.trim()) || "No output.";

    if (!parsed?.positioning || !parsed?.talk_track) {
      return NextResponse.json(
        { error: "AI returned incomplete pitch structure. Try again." },
        { status: 502 }
      );
    }

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

