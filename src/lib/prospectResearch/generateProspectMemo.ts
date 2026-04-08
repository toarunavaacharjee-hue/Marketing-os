import { parseJsonObject, parseJsonObjectLenient } from "@/lib/extractJsonObject";
import {
  PROSPECT_MEMO_KEYS,
  emptyProspectMemo,
  normalizeProspectMemo,
  type ProspectIntelligenceMemo
} from "@/lib/prospectIntelligenceTypes";

const MODEL = process.env.ANTHROPIC_MARKET_RESEARCH_MODEL?.trim() || "claude-sonnet-4-6";
// Generation runs via worker/waitUntil, so we can allow longer than client-facing HTTP timeouts.
const TIMEOUT_MS = 120_000;

type AnthropicContentBlock =
  | { type: "text"; text?: string }
  | { type: "tool_use"; id?: string; name?: string; input?: Record<string, unknown> };

type AnthropicMessageResponse = {
  content?: AnthropicContentBlock[];
  error?: { message?: string };
};

export type GenInput = {
  accountName: string;
  companyName?: string;
  websiteUrl?: string;
  dealStage?: string;
  /** Recipient(s) of the memo, e.g. "Andrew Toppin & Marketing Team" */
  preparedFor?: string;
  /** Demo or meeting line, e.g. "April 17, 2026, 10:00–11:00 AM PT" */
  demoOrMeetingDate?: string;
  /** Seller / AE name for "Sales Strategy Notes for {seller}" framing */
  sellerName?: string;
  additionalContext?: string;
};

const MEMO_TOOL = {
  name: "prospect_intelligence_memo",
  description:
    "Return the full 8-section prospect intelligence memo. Each field is GitHub-flavored Markdown. Use TBD where facts are unknown. Do not invent URLs."
} as const;

const MEMO_TOOL_SCHEMA = {
  type: "object",
  properties: {
    executive_summary: {
      type: "string",
      description: "Title block, 2–3 short paragraphs, tiny deal-meta table."
    },
    what_theyre_looking_for: { type: "string", description: "Bullets on pains, outcomes, buying triggers." },
    key_decision_makers: {
      type: "string",
      description: "2–4 stakeholder groups with small markdown tables; TBD names if unknown."
    },
    organizational_context: { type: "string", description: "Structure, priorities, constraints." },
    sales_strategy_notes: { type: "string", description: "How to win; tailored to seller/AE if named." },
    open_intelligence_gaps: {
      type: "string",
      description: "Table: Gap | Why it matters | How to close."
    },
    meeting_demo_prep: { type: "string", description: "Agenda, discovery questions, demo angles." },
    research_sources: { type: "string", description: "Honest sources only; no fake URLs." }
  },
  required: [...PROSPECT_MEMO_KEYS],
  additionalProperties: false
} as const;

function buildUserMessage(input: GenInput): string {
  const preparedFor = input.preparedFor?.trim() || "(not provided)";
  const demo = input.demoOrMeetingDate?.trim() || "(not provided)";
  const seller = input.sellerName?.trim() || "(not provided — use generic seller-facing notes)";
  const additional = (input.additionalContext ?? "").trim();
  const clippedAdditional = additional.length > 1200 ? `${additional.slice(0, 1200)}…(truncated)` : additional;
  return `# PROSPECT INTELLIGENCE MEMO (inputs)

Account / opportunity name: ${input.accountName}
Company name: ${input.companyName?.trim() || "(same as account or unknown)"}
Website: ${input.websiteUrl?.trim() || "(not provided)"}
Deal stage: ${input.dealStage?.trim() || "(not provided)"}
Prepared for: ${preparedFor}
Demo / meeting: ${demo}
Seller / AE name (for sales notes section): ${seller}

Additional context from seller:
${clippedAdditional || "(none)"}`;
}

const SYSTEM = `You are a B2B sales intelligence analyst.
Use only reasonable inference from the provided inputs; do not invent facts. If unknown, use "TBD".
Prefer details explicitly present in Additional context (including pasted LinkedIn/Google snippets or uploaded-doc extracts).
Each section is concise GitHub-flavored Markdown (bullets/tables OK).

Guidance:
- executive_summary: short title block + 2–3 paragraphs + tiny deal-meta table.
- key_decision_makers: 2–4 stakeholder groups with small tables (use TBD names).
- open_intelligence_gaps: table Gap | Why | How to close.
- meeting_demo_prep: demo agenda + discovery questions.
- research_sources: be honest; no fake URLs.`;

const SYSTEM_TOOL = `${SYSTEM}

Call the tool ${MEMO_TOOL.name} exactly once with all eight string fields filled. Do not reply with plain text or JSON outside the tool.`;

async function callProspectMemoTool(args: {
  apiKey: string;
  system: string;
  user: string;
  maxTokens: number;
  temperature: number;
  signal?: AbortSignal;
}): Promise<{ ok: true; input: Record<string, unknown> } | { ok: false }> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal: args.signal,
    headers: {
      "content-type": "application/json",
      "x-api-key": args.apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: args.maxTokens,
      temperature: args.temperature,
      system: args.system,
      tools: [
        {
          name: MEMO_TOOL.name,
          description: MEMO_TOOL.description,
          input_schema: MEMO_TOOL_SCHEMA
        }
      ],
      tool_choice: { type: "tool", name: MEMO_TOOL.name },
      messages: [{ role: "user", content: args.user }]
    })
  });

  const data = (await res.json()) as AnthropicMessageResponse;
  if (!res.ok) return { ok: false };
  const block = data.content?.find((c) => c.type === "tool_use" && c.name === MEMO_TOOL.name) as
    | { type: "tool_use"; input?: Record<string, unknown> }
    | undefined;
  const input = block?.input;
  if (!input || typeof input !== "object") return { ok: false };
  return { ok: true, input };
}

async function callProspectMemoText(args: {
  apiKey: string;
  system: string;
  user: string;
  maxTokens: number;
  temperature: number;
  signal?: AbortSignal;
}): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal: args.signal,
    headers: {
      "content-type": "application/json",
      "x-api-key": args.apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: args.maxTokens,
      temperature: args.temperature,
      system: args.system,
      messages: [{ role: "user", content: args.user }]
    })
  });
  const data = (await res.json()) as AnthropicMessageResponse;
  if (!res.ok) {
    return { ok: false, error: data?.error?.message ?? "Anthropic request failed." };
  }
  const text = data.content?.find((c) => c.type === "text")?.text ?? "";
  return { ok: true, text };
}

export async function generateProspectMemo(
  anthropicKey: string,
  input: GenInput,
  opts?: { signal?: AbortSignal }
): Promise<{ ok: true; memo: ProspectIntelligenceMemo } | { ok: false; error: string }> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const user = buildUserMessage(input);
  const outerSignal = opts?.signal;
  const onOuterAbort = () => controller.abort();
  if (outerSignal) {
    if (outerSignal.aborted) controller.abort();
    else outerSignal.addEventListener("abort", onOuterAbort, { once: true });
  }

  const textSystem = `${SYSTEM}

Return JSON ONLY (no markdown fences). Return exactly this JSON shape (no extra keys):
{"executive_summary":"","what_theyre_looking_for":"","key_decision_makers":"","organizational_context":"","sales_strategy_notes":"","open_intelligence_gaps":"","meeting_demo_prep":"","research_sources":""}`;

  try {
    const tool = await callProspectMemoTool({
      apiKey: anthropicKey,
      system: SYSTEM_TOOL,
      user,
      maxTokens: 8192,
      temperature: 0.35,
      signal: controller.signal
    });
    if (tool.ok) {
      const memo = normalizeProspectMemo(tool.input);
      return { ok: true, memo };
    }

    const text = await callProspectMemoText({
      apiKey: anthropicKey,
      system: textSystem,
      user,
      maxTokens: 8192,
      temperature: 0.35,
      signal: controller.signal
    });
    if (!text.ok) return { ok: false, error: text.error };

    let parsed = parseJsonObjectLenient(text.text);
    if (!parsed) parsed = parseJsonObject(text.text);
    if (parsed) return { ok: true, memo: normalizeProspectMemo(parsed) };

    return {
      ok: false,
      error: "AI returned an unreadable memo. Try shortening Additional context or retry."
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.toLowerCase().includes("abort")) {
      return { ok: false, error: "AI request timed out. Try again with a shorter context or retry." };
    }
    return { ok: false, error: msg || "Network error." };
  } finally {
    clearTimeout(t);
    if (outerSignal) outerSignal.removeEventListener("abort", onOuterAbort);
  }
}

export async function retryProspectMemoStrict(
  anthropicKey: string,
  input: GenInput,
  opts?: { signal?: AbortSignal }
): Promise<{ ok: true; memo: ProspectIntelligenceMemo } | { ok: false; error: string }> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const user = buildUserMessage(input);
  const outerSignal = opts?.signal;
  const onOuterAbort = () => controller.abort();
  if (outerSignal) {
    if (outerSignal.aborted) controller.abort();
    else outerSignal.addEventListener("abort", onOuterAbort, { once: true });
  }

  const strictTool = `${SYSTEM}

STRICT: Call ${MEMO_TOOL.name} once. Every string field must be non-empty (use "TBD" where needed).`;

  const strictText = `${SYSTEM}

STRICT: Return ONLY minified JSON. No markdown fences. All 8 string keys must be non-empty (use "TBD" if needed).
Shape: {"executive_summary":"","what_theyre_looking_for":"","key_decision_makers":"","organizational_context":"","sales_strategy_notes":"","open_intelligence_gaps":"","meeting_demo_prep":"","research_sources":""}`;

  try {
    const tool = await callProspectMemoTool({
      apiKey: anthropicKey,
      system: strictTool,
      user,
      maxTokens: 8192,
      temperature: 0.2,
      signal: controller.signal
    });
    if (tool.ok) {
      return { ok: true, memo: normalizeProspectMemo(tool.input) };
    }

    const text = await callProspectMemoText({
      apiKey: anthropicKey,
      system: strictText,
      user,
      maxTokens: 8192,
      temperature: 0.2,
      signal: controller.signal
    });
    if (!text.ok) return { ok: false, error: text.error };

    let parsed = parseJsonObjectLenient(text.text);
    if (!parsed) parsed = parseJsonObject(text.text);
    if (parsed) return { ok: true, memo: normalizeProspectMemo(parsed) };

    return { ok: false, error: "AI returned invalid JSON." };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.toLowerCase().includes("abort")) {
      return { ok: false, error: "AI request timed out." };
    }
    return { ok: false, error: msg || "Network error." };
  } finally {
    clearTimeout(t);
    if (outerSignal) outerSignal.removeEventListener("abort", onOuterAbort);
  }
}

export function memoToMarkdownContext(memo: ProspectIntelligenceMemo): string {
  const m = memo ?? emptyProspectMemo();
  return [
    "## Executive Summary\n\n" + m.executive_summary,
    "## What They're Looking For\n\n" + m.what_theyre_looking_for,
    "## Key Decision Makers\n\n" + m.key_decision_makers,
    "## Organizational Context\n\n" + m.organizational_context,
    "## Sales Strategy Notes\n\n" + m.sales_strategy_notes,
    "## Open Intelligence Gaps\n\n" + m.open_intelligence_gaps,
    "## Meeting / Demo Prep\n\n" + m.meeting_demo_prep,
    "## Research Sources\n\n" + m.research_sources
  ].join("\n\n---\n\n");
}
