/**
 * User prompt + system strings for PMM one-shot generators (module-generate).
 * Keep outputs plain text; product/ICP context is appended server-side.
 */

export type CampaignNarrativeInput = {
  productOrFeature: string;
  segment: string;
  seasonOrMoment: string;
  tension?: string;
};

export function buildCampaignNarrativePrompt(input: CampaignNarrativeInput): string {
  const t = (input.tension ?? "").trim();
  return `Write a campaign concept for this initiative.

Product or feature: ${input.productOrFeature}
Target segment: ${input.segment}
Season or moment (timing hook): ${input.seasonOrMoment}
${t ? `Competitive or market tension (optional): ${t}\n` : ""}
Return sections with these headings (plain text):
1) Core theme — one line
2) Hero message — one or two sentences
3) Three content or channel formats — for each, name the format and one line on what it does in this campaign.

Be specific to the segment and moment. No JSON.`;
}

export const CAMPAIGN_NARRATIVE_SYSTEM =
  "You are a senior B2B demand generation strategist. Be concrete and channel-ready. Output plain text with the requested section headings.";

export type PricingNarrativeInput = {
  planName: string;
  price: string;
  persona: string;
  proof?: string;
  positioningCanvasText: string;
};

export function buildPricingNarrativePrompt(input: PricingNarrativeInput): string {
  const proof = (input.proof ?? "").trim();
  return `Draft pricing narrative and customer-facing talking points.

Offer / plan name: ${input.planName}
Price (as stated): ${input.price}
Primary buyer or persona: ${input.persona}
${proof ? `Proof points / outcomes we can cite: ${proof}\n` : ""}

--- Positioning canvas (align narrative with this; do not contradict) ---
${input.positioningCanvasText || "(No canvas text provided.)"}
--- End positioning ---

Return sections:
1) Value story — why this price matches outcomes (not feature count)
2) Talk track — 5–7 bullets a seller can say on a call
3) Objections — brief responses for "too expensive" and "need more seats/features"

Plain text only.`;
}

export const PRICING_NARRATIVE_SYSTEM =
  "You are a B2B product marketing and value consultant. Anchor on business value and risk reduction, not feature lists. Plain text only.";

export type EnablementBriefInput = {
  feature: string;
  buyer: string;
  objections?: string;
  segmentName?: string;
};

export function buildEnablementBriefPrompt(input: EnablementBriefInput): string {
  const obj = (input.objections ?? "").trim();
  const seg = (input.segmentName ?? "").trim();
  return `Write a one-page sales enablement brief.

Feature or initiative: ${input.feature}
Primary buyer / persona: ${input.buyer}
${seg ? `Segment context: ${seg}\n` : ""}
${obj ? `Known objections or friction to address: ${obj}\n` : ""}

Use these sections (plain text, concise):
- What it is
- Who it's for
- Pain it solves
- How to pitch it (short talk track)
- Objection handling — exactly 3 lines (label each objection)

Keep it one page when printed. No JSON.`;
}

export const ENABLEMENT_BRIEF_SYSTEM =
  "You are a B2B sales enablement writer. Crisp, confident, honest about scope. Plain text only.";
