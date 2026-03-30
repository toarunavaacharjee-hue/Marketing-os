import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import {
  extractFirstJsonObjectString,
  parseJsonObject,
  stripCodeFences
} from "@/lib/extractJsonObject";

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

/** Accepts compact or legacy shapes; fills gaps so DB/UI always get a consistent structure. */
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

function asQuestions(v: unknown): string[] {
  const arr = asStringArray(v);
  return arr.slice(0, 6).map((q) => q.replace(/\s+/g, " ").trim()).filter(Boolean);
}

/** Build markdown from structured fields only (no model prose) — minimal display tokens. */
function structuredPitchToMarkdown(pitch: {
  title?: unknown;
  positioning?: unknown;
  talk_track?: unknown;
  landmines?: unknown;
  objections?: unknown;
  next_steps?: unknown;
}): string {
  const title = String(pitch.title ?? "Pitch battlecard").trim() || "Pitch battlecard";
  const lines: string[] = [`# ${title}`, ""];
  const pos = asStringArray(pitch.positioning);
  const tt = asStringArray(pitch.talk_track);
  const lm = asStringArray(pitch.landmines);
  const obj = asObjectionArray(pitch.objections);
  const ns = asStringArray(pitch.next_steps);

  if (pos.length) {
    lines.push("## Positioning", ...pos.map((x) => `- ${x}`), "");
  }
  if (tt.length) {
    lines.push("## Talk track", ...tt.map((x) => `- ${x}`), "");
  }
  if (lm.length) {
    lines.push("## Landmines", ...lm.map((x) => `- ${x}`), "");
  }
  if (obj.length) {
    lines.push("## Objections");
    for (const o of obj) {
      lines.push(`- **${o.objection}** — ${o.response}`);
    }
    lines.push("");
  }
  if (ns.length) {
    lines.push("## Next steps", ...ns.map((x) => `- ${x}`), "");
  }
  return lines.join("\n").trim();
}

function sliceText(s: string | null | undefined, max: number) {
  const t = (s ?? "").trim();
  if (!t) return "";
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

/** Map compact API JSON (optional nested pitch) into stored pitch_json + display markdown. */
function pitchEnvelopeToStored(env: Record<string, unknown>): {
  stored: ReturnType<typeof normalizePitchJson>;
  markdownFromStructure: string;
} {
  const pitch =
    env.pitch && typeof env.pitch === "object"
      ? (env.pitch as Record<string, unknown>)
      : env;
  const title = pitch.title ?? pitch.headline ?? env.title;
  const stored = normalizePitchJson(
    {
      positioning: pitch.positioning,
      talk_track: pitch.talk_track ?? pitch.talkTrack,
      landmines: pitch.landmines,
      objections: pitch.objections,
      next_steps: pitch.next_steps ?? pitch.nextSteps
    },
    ""
  );
  const markdownFromStructure = structuredPitchToMarkdown({
    title,
    positioning: stored.positioning,
    talk_track: stored.talk_track,
    landmines: stored.landmines,
    objections: stored.objections,
    next_steps: stored.next_steps
  });
  return { stored, markdownFromStructure };
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
      return NextResponse.json({
        ok: true,
        needs_input: true,
        missing_fields: missing,
        message: `Add: ${missing.join(", ")} — then generate again.`,
        questions: [
          "What is the buyer’s #1 measurable outcome in the next 90 days?",
          "What do they use today and what fails?",
          "Who owns budget vs. who blocks deals?"
        ],
        markdown: null,
        pitch_json: null
      });
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
          .limit(6)
      : { data: [] as any[] };

    const snapshotContext = (snaps ?? [])
      .map((s, idx) => {
        const title = s.title ? `${s.title} ` : "";
        return `[${idx + 1}:${String(s.source_type)}] ${title}${sliceText(String(s.text_content ?? ""), 500)}`;
      })
      .join("\n");

    const targetKind = (persona as { kind?: string }).kind === "account" ? "account" : "icp";
    const targetLabel =
      targetKind === "account" ? "named account" : "ICP segment";

    const system = `You output ONLY valid JSON. No markdown, no commentary outside the JSON object. Minimize tokens: short phrases, no filler.

Schema:
{
  "status": "ok" | "needs_input",
  "questions": ["optional; only if status is needs_input; max 4 items; under 90 chars each"],
  "pitch": {
    "title": "short headline",
    "positioning": ["max 3 bullets"],
    "talk_track": ["max 4 bullets"],
    "landmines": ["max 2"],
    "objections": [{"objection":"short","response":"short"}],
    "next_steps": ["max 3"]
  }
}

Rules:
- If the brief is too thin to produce a credible, specific battlecard vs this competitor, set "status":"needs_input" and put 2–4 concrete questions in "questions". Omit "pitch" or use empty object.
- If "status":"ok", fill "pitch" compactly. Every string must be short.
- Do not repeat the prompt. Do not add keys outside the schema.`;

    const prompt = `Product: ${sliceText(product?.name as string, 80)} | ${sliceText(product?.website_url as string, 60)} | cat:${sliceText(product?.category as string, 40)}
ICP:${sliceText(product?.icp_summary as string, 350)} Pos:${sliceText(product?.positioning_summary as string, 250)}
Competitor: ${competitor.name} ${competitor.website_url}
Our card: S:${sliceText(baseCard?.strengths, 200)} W:${sliceText(baseCard?.weaknesses, 120)} Win:${sliceText(baseCard?.why_we_win, 200)} Obj:${sliceText(baseCard?.objection_handling, 200)}

Persona (${targetLabel}): ${sliceText(persona.name, 80)}
Ind:${sliceText(persona.industry, 80)} Roles:${sliceText(persona.buyer_roles, 200)}
Pains:${sliceText(persona.pains, 350)} Crit:${sliceText(persona.decision_criteria, 250)}
Stack:${sliceText(persona.current_stack, 120)} Notes:${sliceText(persona.notes, 200)}

Research:${sliceText(scan?.summary as string, 900)}
Snaps:${snapshotContext || "none"}

Task: JSON only — battlecard vs competitor for this persona, or needs_input + questions.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1800,
        temperature: 0.25,
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
    const raw = parseJsonObject(text);
    if (!raw) {
      return NextResponse.json(
        { error: "AI did not return valid JSON. Try again.", pitch_json: null },
        { status: 502 }
      );
    }

    const st = String(raw.status ?? "ok").toLowerCase();
    if (st === "needs_input") {
      let questions = asQuestions(raw.questions);
      if (!questions.length) {
        questions = [
          "What single metric does this buyer need to move in 90 days?",
          "What do they use today and what breaks?",
          "Who signs budget and who blocks deals?"
        ];
      }
      return NextResponse.json({
        ok: true,
        needs_input: true,
        questions,
        message: "Add these details to the persona (or ask in chat), then generate again.",
        markdown: null,
        pitch_json: null
      });
    }

    const jsonBlob =
      extractFirstJsonObjectString(stripCodeFences(text)) ?? extractFirstJsonObjectString(text);
    let markdown: string;
    let parsed: ReturnType<typeof normalizePitchJson>;

    if (raw.pitch && typeof raw.pitch === "object") {
      const { stored, markdownFromStructure } = pitchEnvelopeToStored(raw);
      parsed = stored;
      markdown = markdownFromStructure;
    } else if (asStringArray(raw.positioning).length || asStringArray(raw.talk_track).length) {
      const jb =
        extractFirstJsonObjectString(stripCodeFences(text)) ?? extractFirstJsonObjectString(text);
      const mdBody = jb && text.indexOf(jb) > 0 ? text.slice(0, text.indexOf(jb)).trim() : "";
      parsed = normalizePitchJson(raw, mdBody);
      markdown = structuredPitchToMarkdown({
        title: raw.title ?? raw.headline,
        positioning: parsed.positioning,
        talk_track: parsed.talk_track,
        landmines: parsed.landmines,
        objections: parsed.objections,
        next_steps: parsed.next_steps
      });
    } else {
      return NextResponse.json(
        {
          error: "AI response missing pitch data. Try again or add persona details.",
          pitch_json: null
        },
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

    return NextResponse.json({ ok: true, needs_input: false, markdown, pitch_json: parsed });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

