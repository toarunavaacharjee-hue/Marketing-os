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

// ─── Channel-specific campaign asset prompts ──────────────────────────────────

export type ChannelAssetInput = {
  campaignTheme: string;
  heroMessage: string;
  segment: string;
  productOrFeature: string;
  season: string;
  tension?: string;
};

export function buildEmailSinglePrompt(input: ChannelAssetInput): string {
  return `Write a single B2B marketing email for this campaign.

Campaign theme: ${input.campaignTheme}
Hero message: ${input.heroMessage}
Target segment: ${input.segment}
Product / feature: ${input.productOrFeature}
Timing hook: ${input.season}
${input.tension ? `Market tension: ${input.tension}\n` : ""}
Return exactly:
Subject line: [subject under 50 chars]
Preview text: [preview under 90 chars]

[Email body — 120–180 words, opens with the pain or trigger, connects to hero message, ends with one CTA]

Plain text only. No markdown headers.`;
}

export function buildEmailSequencePrompt(input: ChannelAssetInput): string {
  return `Write a 3-email nurture sequence for this campaign.

Campaign theme: ${input.campaignTheme}
Hero message: ${input.heroMessage}
Target segment: ${input.segment}
Product / feature: ${input.productOrFeature}
Timing hook: ${input.season}
${input.tension ? `Market tension: ${input.tension}\n` : ""}
Return three emails, each with:
--- Email 1: [purpose] ---
Subject: ...
Preview: ...
Body (100–150 words):
...

--- Email 2: [purpose] ---
Subject: ...
Preview: ...
Body (100–150 words):
...

--- Email 3: [purpose] ---
Subject: ...
Preview: ...
Body (80–120 words, urgency/CTA focused):
...

Plain text only.`;
}

export function buildLinkedInCompanyPrompt(input: ChannelAssetInput): string {
  return `Write a LinkedIn company page post for this campaign.

Campaign theme: ${input.campaignTheme}
Hero message: ${input.heroMessage}
Target segment: ${input.segment}
Product / feature: ${input.productOrFeature}
Timing hook: ${input.season}
${input.tension ? `Market tension: ${input.tension}\n` : ""}
Rules:
- Company voice: authoritative, value-led, no hype
- 150–220 words
- Open with the insight or problem, not a question
- No hashtag spam — max 2 relevant hashtags at the end
- End with one soft CTA (visit link, comment, or DM)
- No markdown headers or bullets — flowing paragraphs

Plain text only.`;
}

export function buildLinkedInPersonalPrompt(input: ChannelAssetInput): string {
  return `Write a LinkedIn personal post for a PMM or marketing leader to publish about this campaign.

Campaign theme: ${input.campaignTheme}
Hero message: ${input.heroMessage}
Target segment: ${input.segment}
Product / feature: ${input.productOrFeature}
Timing hook: ${input.season}
${input.tension ? `Market tension: ${input.tension}\n` : ""}
Rules:
- First-person voice, practitioner tone — like a smart colleague sharing a hard-won lesson
- Hook in line 1 (bold claim, counterintuitive stat, or tension-setting statement)
- 100–160 words — tight, no filler
- 2–5 short punchy paragraphs or a short story arc
- End with a question or low-friction CTA ("What's your experience with this?")
- 1–3 hashtags only, at the very end
- No corporate speak, no "I'm excited to share"

Plain text only.`;
}

export function buildMetaAdPrompt(input: ChannelAssetInput): string {
  return `Write a Meta (Facebook/Instagram) ad for this campaign.

Campaign theme: ${input.campaignTheme}
Hero message: ${input.heroMessage}
Target segment: ${input.segment}
Product / feature: ${input.productOrFeature}
Timing hook: ${input.season}
${input.tension ? `Market tension: ${input.tension}\n` : ""}
Return exactly:
Headline: [under 40 chars, bold claim or outcome]
Primary text: [60–90 words, pain → solution → outcome, conversational]
CTA button label: [4–6 words, e.g. "See how it works"]

Plain text only.`;
}

export function buildBlogOutlinePrompt(input: ChannelAssetInput): string {
  return `Write a blog post outline for this campaign.

Campaign theme: ${input.campaignTheme}
Hero message: ${input.heroMessage}
Target segment: ${input.segment}
Product / feature: ${input.productOrFeature}
Timing hook: ${input.season}
${input.tension ? `Market tension: ${input.tension}\n` : ""}
Return:
Title: [SEO-friendly, under 65 chars]
Intro hook (2 sentences): ...
Target word count: ...

Sections (6–8 H2 headings, each with a 1-line description of what it covers):
H2: ...
H2: ...
...

CTA section: [what the post drives the reader to do]

Plain text only.`;
}

export function buildCreativeBriefPrompt(input: ChannelAssetInput): string {
  return `Write a creative brief for a design team for this campaign.

Campaign theme: ${input.campaignTheme}
Hero message: ${input.heroMessage}
Target segment: ${input.segment}
Product / feature: ${input.productOrFeature}
Timing hook: ${input.season}
${input.tension ? `Market tension: ${input.tension}\n` : ""}
Return:
Objective: [one sentence — what this creative needs to achieve]
Audience: [who sees it, what they care about]
Key message: [the single most important thing the creative must communicate]
Tone & mood: [3–4 adjectives or a reference]
Mandatory elements: [logo, CTA, legal, product UI, etc.]
Format suggestions: [2–3 specific format ideas with dimensions or specs]
What to avoid: [1–2 things this creative should NOT do]

Plain text only.`;
}

export const CHANNEL_ASSET_SYSTEM =
  "You are a senior B2B demand generation strategist and copywriter. Write copy that is specific, concrete, and channel-ready. No generic placeholders. Plain text only.";

// ─── Messaging Pillars ────────────────────────────────────────────────────────

export type MessagingPillarsInput = {
  productOrFeature: string;
  segmentName: string;
  segmentPains?: string;
  positioningContext?: string;
};

export function buildMessagingPillarsPrompt(input: MessagingPillarsInput): string {
  return `Generate a complete messaging pillar set for this segment.

Product / feature: ${input.productOrFeature}
Segment: ${input.segmentName}
${input.segmentPains ? `Key pains / urgency for this segment: ${input.segmentPains}\n` : ""}
${input.positioningContext ? `Positioning context (align with this, do not contradict):\n${input.positioningContext}\n` : ""}
Return exactly this structure (plain text, labelled):

Headline: [under 10 words, outcome-led, no hype]
Sub-headline: [1 sentence expanding the headline — who it's for and what changes]
Value prop 1: [outcome, not feature — 1 sentence]
Value prop 2: [outcome, not feature — 1 sentence]
Value prop 3: [outcome, not feature — 1 sentence]
Proof point: [1 specific, credible proof — stat, customer result, or named example]
Objection 1: [common objection] | Response: [1-sentence reframe]
Objection 2: [common objection] | Response: [1-sentence reframe]
Objection 3: [common objection] | Response: [1-sentence reframe]

Plain text only. Follow the labels exactly.`;
}

export const MESSAGING_PILLARS_SYSTEM =
  "You are a B2B positioning and messaging specialist. Write for a PMM audience. Be specific and concrete — no generic copy. Plain text, follow the label format exactly.";

// ─── Event campaign assets ────────────────────────────────────────────────────

export type EventCampaignInput = {
  eventName: string;
  eventDate: string;
  location: string;
  productOrFeature: string;
  segment: string;
  goals?: string;
};

export function buildEventCampaignPrompt(input: EventCampaignInput): string {
  return `Generate a full set of campaign assets for this event.

Event: ${input.eventName}
Date: ${input.eventDate || "TBD"}
Location: ${input.location || "TBD"}
Product / feature to promote: ${input.productOrFeature}
Target segment at this event: ${input.segment}
${input.goals ? `Goals: ${input.goals}\n` : ""}
Return exactly these sections (plain text, use the labels):

--- Pre-event LinkedIn post ---
[80–120 words, first-person, hook in line 1, announces attendance, soft CTA to connect at the event]

--- Attendee outreach email ---
Subject: [under 50 chars]
Body: [60–90 words, personalised to event context, clear ask to meet]

--- On-site conversation opener ---
[3–4 sentences a team member can say when meeting a prospect at the booth or session — natural, not scripted-sounding]

--- Post-event follow-up email ---
Subject: [under 50 chars]
Body: [80–100 words, references the conversation/event, clear next step]

--- Post-event LinkedIn recap post ---
[100–140 words, first-person, key insight or takeaway from the event, tags the community, ends with question or CTA]

Plain text only.`;
}

export const EVENT_CAMPAIGN_SYSTEM =
  "You are a senior B2B field marketing and demand generation specialist. Write event assets that feel human and specific, not templated. Plain text only, use the section labels exactly.";

// ─── Strategy feedback (Intelligence → Strategy loop) ─────────────────────────

export type StrategyFeedbackInput = {
  variant: "sales" | "customer";
  insight: string;
  productOrFeature: string;
};

export function buildStrategyFeedbackPrompt(input: StrategyFeedbackInput): string {
  const context =
    input.variant === "sales"
      ? "sales intelligence (objections heard in calls, win/loss signals, competitive mentions)"
      : "customer insights (NPS themes, support feedback, customer success observations)";

  return `Analyse this ${context} insight and extract actionable strategy updates.

Product / feature: ${input.productOrFeature}
Insight: ${input.insight}

Return exactly:
ICP update: [one sentence — what this tells us about who our best/worst customers are, or leave blank if not relevant]
Messaging update: [one sentence — what to change in how we talk about the product, or leave blank if not relevant]
Positioning signal: [one sentence — does this challenge or validate our positioning? or leave blank]
Priority: [High / Medium / Low — how urgently should this be acted on?]
Suggested action: [one concrete next step — e.g. "Update objection handling in Messaging Pillars", "Add trigger signal to ICP", "Flag to Positioning Studio"]

Plain text only. Follow labels exactly.`;
}

export const STRATEGY_FEEDBACK_SYSTEM =
  "You are a senior B2B product marketing strategist. Extract clear, actionable strategy signals from raw field intelligence. Be specific and direct. Plain text only.";

// ─── Pricing narrative ────────────────────────────────────────────────────────

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

// ─── Sales enablement brief ───────────────────────────────────────────────────

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

// ─── GTM launch plan ──────────────────────────────────────────────────────────

export type GtmPlanInput = {
  productOrFeature: string;
  segment: string;
  launchDate?: string;
  goals?: string;
};

export function buildGtmPlanPrompt(input: GtmPlanInput): string {
  return `Generate a launch GTM checklist for this product or feature launch.

Product / feature: ${input.productOrFeature}
Primary ICP segment: ${input.segment}
${input.launchDate ? `Target launch date: ${input.launchDate}\n` : ""}
${input.goals ? `Launch goals: ${input.goals}\n` : ""}
Return exactly this format. No markdown. Follow the format precisely.

PHASE: Strategy & Prep | T-8 to T-4 weeks
TASK: [Owner] | [specific task — 5-10 words, action-led]
(6-8 tasks)

PHASE: Production & Enablement | T-4 to T-1 week
TASK: [Owner] | [specific task]
(6-8 tasks)

PHASE: Launch Week | T-0
TASK: [Owner] | [specific task]
(5-7 tasks)

PHASE: Post-Launch | T+30
TASK: [Owner] | [specific task]
(4-6 tasks)

Owner must be one of: Marketing, Sales, Product, RevOps, Design.
Tasks must be specific to the product and segment, not generic placeholders.
No extra text before or after.`;
}

export const GTM_PLAN_SYSTEM =
  "You are a B2B product marketing and GTM launch specialist. Generate specific, actionable launch checklists tailored to the product and segment. Follow the output format exactly. Plain text only.";

// ─── Positioning health re-score ─────────────────────────────────────────────

export type PositioningHealthInput = {
  category: string;
  target: string;
  problem: string;
  solution: string;
  diff: string;
  wedge: string;
};

export function buildPositioningHealthPrompt(input: PositioningHealthInput): string {
  return `Score this B2B positioning canvas on four dimensions. Each score is 0–100.

Category: ${input.category || "(not set)"}
Target: ${input.target || "(not set)"}
Problem: ${input.problem || "(not set)"}
Solution: ${input.solution || "(not set)"}
Differentiation: ${input.diff || "(not set)"}
Wedge: ${input.wedge || "(not set)"}

Scoring criteria:
- Clarity (0-100): Is each field specific and jargon-free? Can a prospect instantly understand it?
- Differentiation (0-100): Is the differentiation claim concrete and defensible vs. the likely alternatives?
- Credibility (0-100): Does the solution/wedge statement feel grounded and believable, or vague and aspirational?
- Message-market fit (0-100): Does the target + problem + solution form a coherent story for a real buyer segment?

Return exactly four lines, nothing else:
Clarity: [number]
Differentiation: [number]
Credibility: [number]
Message-market fit: [number]`;
}

export const POSITIONING_HEALTH_SYSTEM =
  "You are a B2B positioning evaluator. Score objectively based on specificity, credibility, and market fit. Return only the four score lines in the exact format requested.";
