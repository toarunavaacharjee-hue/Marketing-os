# Marketing OS — Full Product Spec

## Stack
- Next.js 14, TypeScript, Tailwind CSS
- Supabase (auth + database)
- Stripe (subscriptions: Starter $49/mo, Growth $99/mo, Enterprise $299/mo)
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

## AI Copilot rules
- Uses claude-sonnet-4-6
- Starter plan: 100 queries/month limit
- Growth + Enterprise: unlimited
- Show upgrade prompt when limit hit
- Store conversation history in Supabase
