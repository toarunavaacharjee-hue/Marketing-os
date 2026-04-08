import { parseJsonObject } from "@/lib/extractJsonObject";
import {
  emptyProspectMemo,
  normalizeProspectMemo,
  type ProspectIntelligenceMemo
} from "@/lib/prospectIntelligenceTypes";

const MODEL = process.env.ANTHROPIC_MARKET_RESEARCH_MODEL?.trim() || "claude-sonnet-4-6";
// Generation runs via worker/waitUntil, so we can allow longer than client-facing HTTP timeouts.
const TIMEOUT_MS = 120_000;

type AnthropicMessageResponse = {
  content?: Array<{ type: string; text?: string }>;
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

const SYSTEM = `You are a B2B sales intelligence analyst. Return JSON ONLY (no markdown fences).
Use only reasonable inference from the provided inputs; do not invent facts. If unknown, use "TBD".
Each value is concise GitHub-flavored Markdown (bullets/tables OK).

Return exactly this JSON shape (no extra keys):
{"executive_summary":"","what_theyre_looking_for":"","key_decision_makers":"","organizational_context":"","sales_strategy_notes":"","open_intelligence_gaps":"","meeting_demo_prep":"","research_sources":""}

Guidance:
- executive_summary: short title block + 2–3 paragraphs + tiny deal-meta table.
- key_decision_makers: 2–4 stakeholder groups with small tables (use TBD names).
- open_intelligence_gaps: table Gap | Why | How to close.
- meeting_demo_prep: demo agenda + discovery questions.
- research_sources: be honest; no fake URLs.`;

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

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: MODEL,
        // Reducing tokens improves latency and reduces timeouts in serverless environments.
        max_tokens: 2500,
        temperature: 0.35,
        system: SYSTEM,
        messages: [{ role: "user", content: user }]
      })
    });
    const data = (await res.json()) as AnthropicMessageResponse;
    if (!res.ok) {
      return {
        ok: false,
        error: data?.error?.message ?? "Anthropic request failed."
      };
    }
    const text = data.content?.find((c) => c.type === "text")?.text ?? "";
    const parsed = parseJsonObject(text);
    if (!parsed) {
      return { ok: false, error: "AI returned invalid JSON. Try again with more context." };
    }
    const memo = normalizeProspectMemo(parsed);
    return { ok: true, memo };
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
  const strict = `${SYSTEM}

STRICT: Return ONLY minified JSON. No markdown fences. All 8 string keys must be non-empty (use "TBD" if needed).`;

  const user = buildUserMessage(input);
  const outerSignal = opts?.signal;
  const onOuterAbort = () => controller.abort();
  if (outerSignal) {
    if (outerSignal.aborted) controller.abort();
    else outerSignal.addEventListener("abort", onOuterAbort, { once: true });
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 3000,
        temperature: 0.2,
        system: strict,
        messages: [{ role: "user", content: user }]
      })
    });
    const data = (await res.json()) as AnthropicMessageResponse;
    if (!res.ok) {
      return { ok: false, error: data?.error?.message ?? "Anthropic request failed." };
    }
    const text = data.content?.find((c) => c.type === "text")?.text ?? "";
    const parsed = parseJsonObject(text);
    if (!parsed) {
      return { ok: false, error: "AI returned invalid JSON." };
    }
    return { ok: true, memo: normalizeProspectMemo(parsed) };
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

