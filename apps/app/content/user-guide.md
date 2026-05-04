# Marketing OS — User Guide

This guide describes **AI Marketing Workbench / Marketing OS**: what each area is for, how to use it, why it matters, how modules connect, and **industry best practices** product marketers follow.

---

## 1. How the workspace is organized

### Company, product, and environment

- You work inside a **company** subscription. You pick a **product** (your offer or SKU line) from the tenant switcher in the header.
- Most strategy and planning data is stored **per product environment** (your default environment for that product). Switching product switches context so drafts, segments, and boards stay aligned to one narrative.

### The PMM spine (recommended order)

The product follows a single **strategy → planning → creation → intelligence** spine. The **Module flow** bar at the top of dashboard pages highlights where you are and suggests next steps.

**Canonical journey** (also reflected in product flow logic):

1. Market Research → 2. ICP Segmentation → 3. Positioning Studio → 4. Messaging & Artifacts → 5. Marketing Workbench → 6. Campaigns → 7. GTM Planner → 8. Events → 9. Content Studio → … → Analytics → Battlecards → Prospect Research → Sales Intelligence → Customer Insights → AI Copilot.

Use this order when you want **one story** from research to revenue; jump in anywhere when you are only refreshing one layer.

### AI usage

- **AI Copilot** (full chat) and **module generators** (e.g. content drafts, positioning from segments) consume **AI workflow runs** according to your plan.
- **Starter** tiers have a **monthly cap**; **Growth/Enterprise** are unlimited for app workflow limits (see your plan and `/pricing`).
- **Anthropic**: Starter/Growth may use the platform key or **bring your own key (BYOK)**; Enterprise typically uses **BYOK** for Anthropic billing.

### Settings (foundation)

Under **Settings**, keep **product profile**, **segments**, **integrations**, **analytics keys**, and **learning & health** current. Good settings reduce rework everywhere else.

---

## 2. Home

### Command Centre (`/dashboard`)

**What it is:** Your home dashboard: priorities, digest, and links into the journey.

**How to use it:** Start each week here; open the next module in the spine or jump to a module that needs an update.

**Benefits:** One place to see “where we are” and avoid working in a silo.

**Connects to:** All modules; **Settings** for profile completeness.

**Best practices:** Run a **Monday 15-minute** pass: confirm product context, one ICP/positioning truth, and the top campaign or launch in motion.

---

## 3. Strategy

### Market Research (`/dashboard/market-research`)

**What it is:** Structured space to capture **category, competition, and market** context for the selected product.

**How to use it:** Record sources, claims, and signals you trust. Revisit when the category shifts or before a major launch.

**Benefits:** Stops “random acts of marketing” by anchoring the team in the same market reality.

**Connects to:** **ICP Segmentation** (who to win in that market) → **Positioning Studio** (how you win) → **Battlecards** (competitive reality in sales).

**Best practices:** Prefer **three cited insights** over thirty opinions; refresh quarterly or when a large competitor moves.

### ICP Segmentation (`/dashboard/icp-segmentation`)

**What it is:** Define and prioritize **segments** (fit, pain, urgency). Often fed by uploaded material (e.g. doc-derived segments).

**How to use it:** Name segments, tune scores, and align pains to reality. Regenerate downstream artifacts after major edits.

**Benefits:** Focus spend and messaging on accounts you can actually win.

**Connects to:** **Positioning Studio** (“Regenerate from ICP segments”), **Messaging & Artifacts**, **Campaigns** (who you target).

**Best practices:** Keep **one primary segment** per major initiative; avoid defining twelve equal “ICPs.”

### Positioning Studio (`/dashboard/positioning-studio`)

**What it is:** A **positioning canvas** (category, target, problem, solution, differentiation, wedge) plus **health scores** and optional **governed positioning versions** (draft → review → approve).

**How to use it:** Edit fields manually or regenerate from **ICP**. Save edits; use **snapshots** when you need governance. Approved positioning becomes the **spine** referenced elsewhere (e.g. battlecards).

**Benefits:** One canonical story marketing and sales can repeat without drift.

**Connects to:** **ICP Segmentation**, **Messaging & Artifacts**, **Battlecards** (ties to approved positioning where configured), **GTM Planner** narrative.

**Pricing narrative (in-product):** Fill plan/SKU, price, persona, optional proof → **Generate** uses your **canvas text** as guardrails → **Save narrative** stores value-based pricing talk tracks separately from the canvas.

**Best practices:** Good positioning is **narrow** (who + why now), **specific** (problem language), and **defensible** (proof). Avoid rewriting weekly—use **versions** for intentional changes.

### Messaging & Artifacts (`/dashboard/messaging-artifacts`)

**What it is:** Track **artifacts** (copy packs, angles) by segment and tone; **artifact generator** for quick drafts.

**How to use it:** Pick type, segment, tone → **Generate**; push titles into the table for tracking.

**Benefits:** Keeps messaging **consistent** with segments and speeds iteration.

**Connects to:** **Positioning Studio**, **Content Studio**, **Campaigns**, **Social Media**.

**Sales enablement brief (same page, dedicated block):** Feature, buyer, segment, objections → **Generate enablement brief** for a **one-pager** reps can use (saved per product).

**Best practices:** One **pillar message** per primary segment; reuse labels across web, sales decks, and campaigns.

### Artifact Library (`/dashboard/artifacts`)

**What it is:** Library-style view of **artifacts** and outputs tied to your workspace (detail views for saved items).

**How to use it:** Browse and open items produced in workflows; use as the single **repository** for approved vs draft assets where your team adopts it.

**Benefits:** Reduces Slack/email drift (“which PDF is final?”).

**Connects to:** **Messaging & Artifacts**, **Launch Playbook**, **Content Studio**.

**Best practices:** Name artifacts with **audience + format + date**; align status (Draft/Review/Approved) with your marketing ops ritual.

---

## 4. Planning

### Marketing Workbench (`/dashboard/work`)

**What it is:** Operational **workbench** for ongoing marketing work items (your “desk” for execution tracking).

**How to use it:** Capture and move work that does not fit a single campaign card or launch checklist.

**Benefits:** Separates **strategy** docs from **weekly execution**.

**Connects to:** **Campaigns**, **GTM Planner**, **Content Studio**.

**Best practices:** Limit WIP (work in progress)—fewer items done beats many items started.

### Launch Playbook (`/dashboard/launch-playbook`)

**What it is:** **Launch-specific** planning and artifact flows (including structured kinds and a **Final Launch Pack** view where implemented).

**How to use it:** Walk the playbook for a dated launch; export or copy outputs into **Artifact Library** or **Campaigns**.

**Benefits:** Repeatable launches reduce last-minute gaps (enablement, analytics, web).

**Connects to:** **GTM Planner**, **Messaging & Artifacts**, **Events**, **Content Studio**.

**Best practices:** Define **launch tiers** (even informally): what must ship vs nice-to-have for this release.

### Campaigns (`/dashboard/campaigns`)

**What it is:** **Kanban** board (Planning → Live) per product for campaign initiatives.

**How to use it:** Add cards, drag across stages. Open **Campaign narrative** on a card to generate **theme, hero message, and three activation formats** (saved on the card).

**Benefits:** Visibility for marketing leadership; narrative ties **creative** to **segment + timing**.

**Connects to:** **Messaging & Artifacts**, **Content Studio**, **Social Media**, **Analytics**.

**Best practices:** Start from **one measurable objective** per card; align the narrative to **one primary segment** and **one moment** (fiscal year, event, product moment).

### GTM Planner (`/dashboard/gtm-planner`)

**What it is:** **Launch readiness** checklist, **timeline** text, and **stakeholders**—saved per environment.

**How to use it:** Check off readiness items; keep the timeline as the single source for “what happens when.”

**Benefits:** Surfaces cross-functional risk early (sales enablement, web, creative).

**Connects to:** **Launch Playbook**, **Campaigns**, **Events**, **Positioning / Messaging**.

**Best practices:** Include explicit **sales enablement** and **analytics readiness** lines—most late launches miss one of these.

### Events (`/dashboard/events`)

**What it is:** Event planning workspace (logistics, goals, tasks); **AI assist** and optional **document import** where enabled.

**How to use it:** One row per event; track prep progress and notes; link to **battlecards** or campaigns for field teams.

**Benefits:** Pipeline and brand moments stay coordinated.

**Connects to:** **Campaigns**, **Sales Intelligence**, **Battlecards**, **Analytics**.

**Best practices:** Define **success metrics** before the booth order (meetings, influenced pipeline, list growth).

---

## 5. Creation

### Content Studio (`/dashboard/content-studio`)

**What it is:** **Creation workbench** to plan content pieces and generate drafts with AI using product + segment context.

**How to use it:** Describe the piece; generate; iterate in editing outside or inside your CMS.

**Benefits:** Faster first drafts grounded in **your** ICP and positioning.

**Connects to:** **Messaging & Artifacts**, **Campaigns**, **Website & Pages**, **Analytics** (measure what you publish).

**Best practices:** One **job-to-be-done** per asset; match **funnel stage** (awareness vs evaluation).

### Social Media (`/dashboard/social-media`)

**What it is:** Planning and drafting support for **social** channels in product context.

**How to use it:** Align posts to pillars from messaging; schedule execution in your scheduler of choice if you paste exports.

**Benefits:** Keeps social on-message vs randomHotTake.gif.

**Connects to:** **Content Studio**, **Campaigns**, **Analytics** (paid/organic).

**Best practices:** **80/20**—most posts reinforce pillars; few posts test new angles.

### Design & Assets (`/dashboard/design-assets`)

**What it is:** House **creative** and asset tracking for the product.

**How to use it:** Centralize links and notes so campaigns and sales pull approved visuals.

**Benefits:** Avoids off-brand screenshots in outbound.

**Connects to:** **Campaigns**, **Presentations**, **Website & Pages**.

**Best practices:** Version assets with **semantic names**; archive superseded hero images.

### Presentations (`/dashboard/presentations`)

**What it is:** Build and track **slides** and narrative for internal/external decks.

**How to use it:** Align storyline to positioning; export or present per your workflow.

**Benefits:** One narrative from **Positioning** into **sales** and **field** decks.

**Connects to:** **Battlecards**, **Messaging**, **Sales Intelligence**.

**Best practices:** **One idea per slide**; proof slides after claim slides.

### Website & Pages (`/dashboard/website-pages`)

**What it is:** Planning and tracking for **site** and **landing** experiences.

**How to use it:** Map pages to segments and campaigns; keep messaging aligned with **Positioning Studio**.

**Benefits:** Search and paid traffic land on **consistent** stories.

**Connects to:** **Content Studio**, **Campaigns**, **Analytics**.

**Best practices:** **Message match**—ad/placement promise matches the hero line above the fold.

---

## 6. Intelligence

### Analytics (`/dashboard/analytics`)

**What it is:** Connect and review performance (**GA4**, **LinkedIn**, **Meta** where configured).

**How to use it:** Verify integrations under Settings; review trends after campaigns and content pushes.

**Benefits:** Closes the loop from **creative** to **outcomes**.

**Connects to:** **Campaigns**, **Content Studio**, **Website & Pages**, **Customer Insights**.

**Best practices:** Fewer KPIs, reviewed weekly; tie metrics to **campaign objectives**, not vanity counts alone.

### Battlecards (`/dashboard/battlecards`)

**What it is:** **Competitive** battlecards and related persona/context for sales.

**How to use it:** Maintain competitors, strengths/weaknesses, objections; link to **approved positioning** when your team uses governed versions.

**Benefits:** Faster, more honest discovery calls; fewer “we’ll get back to you” moments.

**Connects to:** **Positioning Studio**, **Market Research**, **Sales Intelligence**.

**Best practices:** Update within **48 hours** of a major competitor release; focus on **discovery questions**, not trash talk.

### Prospect Research (`/dashboard/prospect-research`)

**What it is:** **Account-level** research workspace to prep outbound and ABM.

**How to use it:** Capture account facts, triggers, and talk tracks before calls.

**Benefits:** Higher reply rates and shorter cycles when messaging fits **their** moment.

**Connects to:** **ICP**, **Battlecards**, **Sales Intelligence**, **Campaigns**.

**Best practices:** Lead with **their** initiative language, not your feature list.

### Sales Intelligence (`/dashboard/sales-intelligence`)

**What it is:** Capture **objection themes**, **win/loss** notes, and **call insights** with optional AI assist.

**How to use it:** Keep qualitative notes current after big deals; scan for patterns quarterly.

**Benefits:** Surfaces reality from the **field** back into **positioning** and **messaging**.

**Connects to:** **Battlecards**, **Customer Insights**, **Positioning Studio** (when you refresh differentiation).

**Best practices:** Tag themes by **segment** and **loss reason** so patterns are actionable.

### Customer Insights (`/dashboard/customer-insights`)

**What it is:** **Voice of customer**—quotes, themes, NPS/CSAT-style fields, summaries.

**How to use it:** Paste VOC; use AI assist to synthesize; feed highlights into **messaging** and **case studies**.

**Benefits:** Grounds external messaging in **real words** customers use.

**Connects to:** **Messaging & Artifacts**, **Content Studio**, **Sales Intelligence**.

**Best practices:** Mine quotes for **headlines**; refresh after every major research round or QBR season.

---

## 7. AI Copilot (`/dashboard/copilot`)

**What it is:** Full **chat** interface for open-ended strategy and execution help (conversation history stored per product rules).

**How to use it:** Ask for refinements, alternate angles, or analysis when a dedicated module is not enough.

**Benefits:** Flexible reasoning across modules without losing workspace context.

**Connects to:** Every module—use it to **stress-test** positioning, draft emails, or summarize long notes.

**Best practices:** Paste **constraints** (segment, tone, taboo claims); ask for **three options** and pick one to ship.

---

## 8. Cross-cutting practices

| Practice | Why it matters |
|----------|----------------|
| **Single source of truth** | Positioning + ICP live in Strategy; downstream modules reference them. |
| **Govern changes** | Use positioning **versions** and artifact **status** when sales relies on your narrative. |
| **Measure closes the loop** | Analytics + VOC + win/loss feed the next quarter’s strategy refresh. |
| **Tier your launches** | Not every release needs a billboard; match effort to revenue impact. |
| **Rep-capable briefs** | If sales cannot repeat your story in two sentences, tighten **Messaging** and **Enablement**. |

---

## 9. Quick reference — where to do common tasks

| I want to… | Go to |
|------------|--------|
| See priorities and start the day | **Command Centre** |
| Upload / refine who we sell to | **ICP Segmentation** |
| Lock our story and pricing talk track | **Positioning Studio** |
| Draft segment copy and a sales one-pager | **Messaging & Artifacts** |
| Plan a timed campaign narrative | **Campaigns** (card → Campaign narrative) |
| Track launch readiness | **GTM Planner** / **Launch Playbook** |
| Draft blogs, emails, longform | **Content Studio** |
| Prep for a competitor call | **Battlecards** |
| Learn why we win or lose | **Sales Intelligence** |
| Pull customer language into messaging | **Customer Insights** |
| Open-ended help | **AI Copilot** |

---

*This guide matches the in-app navigation and journey model as implemented in Marketing OS. Feature names and routes may evolve; when in doubt, use the left sidebar and the **Module flow** bar.*
