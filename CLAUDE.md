# Marketing OS — Full Product Spec

## Stack
- Next.js 14, TypeScript, Tailwind CSS
- Supabase (auth + database)
- Stripe (subscriptions: Starter $99/mo, Growth $299/mo, Enterprise list $999/mo cap; above that custom / talk to sales; internal model ~$99 base + ~$10/product for packaging)
- Anthropic API (claude-sonnet-4-6 model) for AI features
- Vercel for deployment

## Design system
- Dark background: #08080c
- Surface cards: #141420
- Purple accent: #7c6cff
- Lime CTA buttons: #b8ff6c
- Heading font: Instrument Serif
- Body font: Bricolage Grotesque
- All pages dark themed, mobile responsive

## 18 app modules
Command Centre (home dashboard)
Market Research
ICP Segmentation  
Positioning Studio
Messaging & Artifacts
Campaigns (Kanban board)
GTM Planner (checklist + timeline)
Events
Content Studio
Social Media
Design & Assets
Presentations
Website & Pages
Analytics (GA4 + LinkedIn + Meta)
Battlecards
Sales Intelligence
Customer Insights
AI Copilot (full chat interface)

## Auth
- Supabase email/password auth
- All /dashboard/* routes require login
- User profile: name, company, plan tier, ai_queries_used

## Plans (entitlements)
- One subscription per workspace; tiers differ by **product cap**, **AI usage**, **seats**, **support** — **all dashboard modules are included on every paid tier** (no module paywalls).
- Product caps: Starter/Free **2**, Growth **10**, Enterprise **30** (`planEntitlements.productsMax`).
- Team seats (members + invites): Starter/Free **1**, Growth **3**, Enterprise **5** (`planEntitlements.seatsMax`). Enterprise scales until **either** the seat cap **or** product cap is reached.
- **Anthropic:** Starter/Growth may use **platform** `ANTHROPIC_API_KEY` or **BYOK** (`company_ai_keys`). **Enterprise requires BYOK** — list/subscription price is for the app; **Anthropic token usage** is billed by Anthropic to the customer when using their key (stated on `/pricing` FAQ).

## AI Copilot rules
- Uses claude-sonnet-4-6
- Starter + Free: 100 AI workflow runs/month per user (`ai_queries_used`; Copilot + module generators)
- Growth + Enterprise: unlimited
- Show upgrade prompt when limit hit
- Store conversation history in Supabase
