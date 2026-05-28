export type GlossaryTerm = {
  slug: string;
  term: string;
  shortDef: string;
  definition: string;
  example?: string;
  related: string[];
  tags: string[];
};

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    slug: "ideal-customer-profile",
    term: "Ideal Customer Profile (ICP)",
    shortDef: "A detailed description of the type of company most likely to buy, succeed with, and expand your product.",
    definition:
      "An Ideal Customer Profile (ICP) defines the firmographic, technographic, and behavioural attributes of the companies that are the best fit for your product. Unlike a persona (which describes an individual), an ICP describes an organisation. A strong ICP includes company size, industry, revenue range, growth stage, tech stack, and the trigger events that create urgency. Teams use ICPs to focus outbound prospecting, score inbound leads, and ensure messaging is built for the right buyer.",
    example:
      "ICP: B2B SaaS companies with 50–500 employees, Series A–C, with an active GTM motion and a product marketing hire in the last 12 months.",
    related: ["customer-persona", "market-segmentation", "jobs-to-be-done"],
    tags: ["Research", "Segmentation"]
  },
  {
    slug: "positioning-statement",
    term: "Positioning Statement",
    shortDef: "An internal document that defines how you want your product to be perceived relative to alternatives.",
    definition:
      "A positioning statement is a strategic internal document — not marketing copy — that anchors all downstream messaging, content, and sales materials. It defines: who you're for, what problem you solve, what category you're in, and why you're meaningfully different from the alternatives. The classic format (Geoffrey Moore) is: 'For [target] who [need], [product] is a [category] that [benefit]. Unlike [alternative], our product [differentiation].' Positioning should be set before messaging, before campaigns, and before any launch.",
    example:
      "For product marketing teams who struggle to keep positioning and messaging consistent across launches, AI Marketing Workbench is an operating system that connects ICP → Positioning → Messaging → Campaigns. Unlike Notion or HubSpot, it generates and maintains consistency automatically.",
    related: ["messaging-framework", "value-proposition", "category-creation"],
    tags: ["Positioning", "PMM"]
  },
  {
    slug: "messaging-framework",
    term: "Messaging Framework",
    shortDef: "A structured document that translates positioning into segment-specific headlines, value props, and objection responses.",
    definition:
      "A messaging framework turns your positioning into the actual language used in emails, landing pages, sales decks, and conversations. It is built per ICP segment and typically includes: a headline, sub-headline, three value pillars (each with a claim and proof point), top objections and responses, and channel-specific variants. The goal is to ensure every team member — marketing, sales, CS — is using the same language and making the same claims when talking to a specific buyer type.",
    related: ["positioning-statement", "value-proposition", "sales-enablement"],
    tags: ["Messaging", "PMM"]
  },
  {
    slug: "go-to-market-strategy",
    term: "Go-to-Market Strategy (GTM)",
    shortDef: "The plan that defines how a company will launch a product or enter a market — including audience, messaging, channels, and motion.",
    definition:
      "A go-to-market strategy is the full plan for how you bring a product, feature, or company to market. It covers: who you're selling to (ICP and segments), what you're saying (positioning and messaging), how you're reaching them (channels and tactics), what motion you're using (sales-led, product-led, or hybrid), and how you'll measure success. A GTM strategy is built before campaigns begin — it's the upstream document that all execution flows from.",
    related: ["product-market-fit", "ideal-customer-profile", "gtm-motion"],
    tags: ["GTM", "Strategy"]
  },
  {
    slug: "product-market-fit",
    term: "Product-Market Fit (PMF)",
    shortDef: "The degree to which a product satisfies a strong market demand — the point where growth becomes pull-based rather than push-based.",
    definition:
      "Product-market fit is the state in which a product meets the needs of a market so well that customers are actively pulling it — recommending it, returning to it, and being retained without aggressive intervention. Sean Ellis popularised the '40% test': if 40% or more of your users would be 'very disappointed' if your product disappeared, you likely have PMF. For B2B SaaS, PMF indicators include low churn, strong expansion revenue, organic referrals, and deals that close faster than average.",
    related: ["go-to-market-strategy", "ideal-customer-profile", "churn-rate"],
    tags: ["Strategy", "PMM"]
  },
  {
    slug: "sales-enablement",
    term: "Sales Enablement",
    shortDef: "The process of equipping sales teams with the content, tools, and training they need to engage buyers effectively.",
    definition:
      "Sales enablement is a PMM function that bridges strategy and execution — ensuring reps have the right message, the right assets, and the right knowledge to win deals. It includes: battlecards, talk tracks, objection handling guides, sales decks, one-pagers, demo scripts, and email templates. Strong sales enablement is segment-specific (different content for different ICPs), updated with each launch, and measured by adoption — not just creation.",
    related: ["battlecard", "win-loss-analysis", "messaging-framework"],
    tags: ["Sales Enablement", "PMM"]
  },
  {
    slug: "competitive-intelligence",
    term: "Competitive Intelligence (CI)",
    shortDef: "The ongoing practice of monitoring competitors to inform positioning, messaging, and sales strategy.",
    definition:
      "Competitive intelligence is the systematic collection and analysis of information about competitors — their products, pricing, messaging, positioning, and market moves. For PMMs, CI informs battlecard content, positioning differentiation, and win/loss analysis. Sources include: competitor websites, G2/Capterra reviews, job postings, press releases, LinkedIn activity, customer interviews, and sales call recordings. CI should be an ongoing process, not a one-time audit.",
    related: ["battlecard", "win-loss-analysis", "positioning-statement"],
    tags: ["Competitive Intelligence", "PMM"]
  },
  {
    slug: "battlecard",
    term: "Battlecard",
    shortDef: "A one-page competitive reference document reps use in live deals to handle objections and position against a specific competitor.",
    definition:
      "A battlecard is a concise, scannable document designed to be read in 60 seconds before or during a sales call. A strong battlecard includes: competitor strengths (honest), competitor weaknesses, why you win in specific situations, landmine questions to ask, objection responses, and a 30-second talk track. Battlecards should be segment-specific where relevant — the competitive dynamic in an enterprise deal may differ from an SMB deal. They should be updated after every major deal cycle.",
    related: ["competitive-intelligence", "sales-enablement", "win-loss-analysis"],
    tags: ["Battlecards", "Sales Enablement"]
  },
  {
    slug: "win-loss-analysis",
    term: "Win/Loss Analysis",
    shortDef: "A structured research process of interviewing buyers after deals to understand why you won or lost — and what to change.",
    definition:
      "Win/loss analysis involves conducting structured interviews with buyers after deals close (or are lost) to understand the real reasons behind the decision. It is one of the most reliable sources of messaging and positioning feedback available to PMMs. A good win/loss programme runs quarterly, covers a mix of wins and losses, and synthesises findings into actionable updates to messaging, battlecards, and sales training. The insight is most valuable when captured directly from buyers — not filtered through sales.",
    related: ["competitive-intelligence", "sales-enablement", "battlecard"],
    tags: ["Research", "Sales Intelligence"]
  },
  {
    slug: "value-proposition",
    term: "Value Proposition",
    shortDef: "A clear statement of the specific value a product delivers to a particular customer — the benefit that makes it worth buying.",
    definition:
      "A value proposition is the answer to 'why should I buy this, from you, now?' It is more specific than a tagline and more concise than a positioning statement. A strong value proposition combines: the outcome the customer achieves, the speed or ease with which they achieve it, and the proof that it works. Value propositions are segment-specific — what matters to an enterprise VP of Marketing is different from what matters to a solo PMM. They form the building blocks of messaging frameworks.",
    related: ["messaging-framework", "positioning-statement", "jobs-to-be-done"],
    tags: ["Messaging", "Positioning"]
  },
  {
    slug: "market-segmentation",
    term: "Market Segmentation",
    shortDef: "The process of dividing a broad target market into subgroups with shared characteristics, needs, or behaviours.",
    definition:
      "Market segmentation is the strategic act of splitting your addressable market into distinct groups that can be prioritised and addressed differently. For B2B SaaS, common segmentation dimensions include: company size, industry, buyer role, GTM motion (PLG vs. sales-led), tech stack, and growth stage. Good segmentation leads to better ICPs, sharper messaging, and higher conversion — because you're making specific promises to specific people instead of generic promises to everyone.",
    related: ["ideal-customer-profile", "customer-persona", "total-addressable-market"],
    tags: ["Research", "Segmentation"]
  },
  {
    slug: "total-addressable-market",
    term: "Total Addressable Market (TAM)",
    shortDef: "The total revenue opportunity available if a product achieved 100% market share of its target market.",
    definition:
      "TAM (Total Addressable Market) represents the full revenue opportunity if you captured every potential customer in your target market. SAM (Serviceable Addressable Market) is the portion you can realistically reach given your go-to-market model. SOM (Serviceable Obtainable Market) is what you can actually win in the near term given competitors and constraints. TAM is used in investor pitches and strategic planning — SOM is what matters for GTM planning.",
    related: ["market-segmentation", "ideal-customer-profile", "go-to-market-strategy"],
    tags: ["Strategy", "Research"]
  },
  {
    slug: "customer-persona",
    term: "Customer Persona",
    shortDef: "A semi-fictional representation of a specific buyer type — their role, goals, pains, and decision-making context.",
    definition:
      "A customer persona describes an individual buyer — their title, goals, day-to-day pains, how they discover solutions, and what they need to feel confident making a purchase. Unlike an ICP (which describes companies), a persona describes people. For B2B SaaS, you typically need 2–4 personas per ICP: a champion (who drives the deal), an economic buyer (who approves budget), and often a technical evaluator or end user. Personas are used to personalise messaging, tailor demos, and build sales enablement content.",
    related: ["ideal-customer-profile", "jobs-to-be-done", "messaging-framework"],
    tags: ["Research", "Segmentation"]
  },
  {
    slug: "jobs-to-be-done",
    term: "Jobs to Be Done (JTBD)",
    shortDef: "A framework for understanding why customers buy — focused on the 'job' they're trying to accomplish, not their demographic attributes.",
    definition:
      "Jobs to Be Done (JTBD) is a customer research framework that focuses on the progress a customer is trying to make, rather than who they are. The insight is that customers 'hire' products to do a job — and understanding that job (functional, social, and emotional dimensions) reveals what messaging will resonate and what features truly matter. In practice, JTBD interviews ask: 'Walk me through the last time you encountered this problem. What were you trying to accomplish? What did you try before?' The output shapes messaging and positioning more reliably than demographic research.",
    related: ["customer-persona", "ideal-customer-profile", "value-proposition"],
    tags: ["Research", "PMM"]
  },
  {
    slug: "product-led-growth",
    term: "Product-Led Growth (PLG)",
    shortDef: "A GTM strategy where the product itself is the primary driver of acquisition, conversion, and expansion.",
    definition:
      "Product-led growth (PLG) is a go-to-market motion where the product drives user acquisition (free trial or freemium), conversion (in-product upgrade prompts), and expansion (viral loops or seat expansion). PLG companies include Slack, Figma, Notion, and Calendly. For PMMs at PLG companies, the key challenges are: writing messaging that converts self-serve users, creating activation content (onboarding emails, in-app tooltips), and building enterprise sales content as the company moves upmarket.",
    related: ["go-to-market-strategy", "gtm-motion", "annual-recurring-revenue"],
    tags: ["GTM", "Strategy"]
  },
  {
    slug: "annual-recurring-revenue",
    term: "Annual Recurring Revenue (ARR)",
    shortDef: "The predictable, recurring revenue a SaaS business earns annually from active subscriptions.",
    definition:
      "ARR is the normalised annual value of all active subscription contracts. It is the primary health metric for B2B SaaS companies. ARR growth is driven by new business (new logos), expansion (upsells and cross-sells), and reduced by churn (cancellations and downgrades). For PMMs, ARR impacts campaign prioritisation: high-ARR segments get more investment, and expansion plays are often more cost-effective than new business.",
    related: ["churn-rate", "net-revenue-retention", "lifetime-value"],
    tags: ["Metrics", "SaaS"]
  },
  {
    slug: "customer-acquisition-cost",
    term: "Customer Acquisition Cost (CAC)",
    shortDef: "The total cost of acquiring a new customer, including marketing and sales spend.",
    definition:
      "CAC is calculated by dividing total sales and marketing spend in a period by the number of new customers acquired. A healthy CAC:LTV ratio for B2B SaaS is typically 1:3 or better — meaning you recover the acquisition cost within a reasonable payback period. PMMs influence CAC by improving conversion rates at the top and middle of the funnel, reducing sales cycle length through better enablement, and increasing qualified traffic through organic and brand channels.",
    related: ["lifetime-value", "annual-recurring-revenue", "product-market-fit"],
    tags: ["Metrics", "SaaS"]
  },
  {
    slug: "lifetime-value",
    term: "Customer Lifetime Value (LTV)",
    shortDef: "The total revenue a company can expect from a single customer account over the life of the relationship.",
    definition:
      "LTV (sometimes CLV) is calculated as average revenue per account divided by churn rate, or more precisely as the sum of all future revenue discounted to present value. For B2B SaaS, LTV is primarily driven by retention (low churn) and expansion (net revenue retention above 100%). PMMs influence LTV through: better ICP targeting (higher-fit customers churn less), customer marketing that drives product adoption, and expansion campaigns that grow account revenue.",
    related: ["customer-acquisition-cost", "churn-rate", "net-revenue-retention"],
    tags: ["Metrics", "SaaS"]
  },
  {
    slug: "churn-rate",
    term: "Churn Rate",
    shortDef: "The percentage of customers or revenue lost over a given period.",
    definition:
      "Churn rate measures customer (logo) or revenue loss in a period. Logo churn = customers lost / customers at start of period. Revenue churn = revenue lost / ARR at start of period. Net revenue retention (NRR) accounts for both churn and expansion — if expansion from existing customers exceeds lost revenue, NRR exceeds 100%. High churn is often a signal of ICP misfit, onboarding gaps, or unmet expectations set during the sales process — all areas where PMM has direct influence.",
    related: ["net-revenue-retention", "lifetime-value", "product-market-fit"],
    tags: ["Metrics", "SaaS"]
  },
  {
    slug: "net-revenue-retention",
    term: "Net Revenue Retention (NRR)",
    shortDef: "A metric that measures revenue from existing customers including expansion, contraction, and churn.",
    definition:
      "NRR (also called Net Dollar Retention or NDR) measures the percentage of revenue retained from existing customers over a period, including upsells and expansions but accounting for churn and downgrades. NRR > 100% means existing customers are growing faster than they churn — the business can grow even without new logos. Best-in-class B2B SaaS companies target NRR of 120%+. PMMs drive NRR through expansion messaging, customer marketing, and ensuring onboarding leads to deep product adoption.",
    related: ["churn-rate", "lifetime-value", "annual-recurring-revenue"],
    tags: ["Metrics", "SaaS"]
  },
  {
    slug: "gtm-motion",
    term: "GTM Motion",
    shortDef: "The primary way a company acquires customers — sales-led, product-led, community-led, or a hybrid.",
    definition:
      "GTM motion describes the primary mechanism through which a company acquires and expands customers. Sales-led: outbound and inbound sales teams drive deals. Product-led: the product itself drives acquisition and conversion. Community-led: a network of users drives awareness and referrals. Channel-led: partners and resellers drive distribution. Most companies use a hybrid — but the dominant motion shapes everything from messaging to content to hiring. PMMs must adapt their work to the motion: sales-led requires more enablement, PLG requires more activation content.",
    related: ["go-to-market-strategy", "product-led-growth", "sales-enablement"],
    tags: ["GTM", "Strategy"]
  },
  {
    slug: "category-creation",
    term: "Category Creation",
    shortDef: "A positioning strategy where a company defines a new market category rather than competing in an existing one.",
    definition:
      "Category creation is a high-risk, high-reward positioning strategy where a company doesn't compete in an existing category — it names and claims a new one. Examples: Salesforce created 'cloud CRM', Drift created 'conversational marketing', Gainsight created 'customer success'. The advantage: if you name the category, you own it. The risk: educating the market is expensive and slow. Category creation requires sustained investment in thought leadership, analyst relations, and community building — it's rarely appropriate for early-stage companies without a distinctive point of view.",
    related: ["positioning-statement", "go-to-market-strategy", "competitive-intelligence"],
    tags: ["Positioning", "Strategy"]
  },
  {
    slug: "product-launch",
    term: "Product Launch",
    shortDef: "The coordinated effort to bring a new product or feature to market — including positioning, messaging, channels, and sales enablement.",
    definition:
      "A product launch is a time-bounded, cross-functional effort to take a product or feature from 'built' to 'in-market'. A strong launch includes: a positioning brief, messaging framework, updated sales enablement, content (blog, email, social, landing page), and a clear measurement plan. Launches are tiered by impact: Tier 1 (major product) gets full cross-functional investment; Tier 2 (significant feature) gets a focused campaign; Tier 3 (minor update) gets a changelog and targeted communication. The biggest launch failure is shipping great features with generic messaging.",
    related: ["go-to-market-strategy", "messaging-framework", "sales-enablement"],
    tags: ["Launch", "PMM"]
  },
  {
    slug: "pipeline-coverage",
    term: "Pipeline Coverage",
    shortDef: "The ratio of sales pipeline to quota — typically expressed as 3x or 4x — used to assess whether enough deals exist to hit targets.",
    definition:
      "Pipeline coverage is the ratio of total pipeline value to the revenue target for a period. A 3x coverage ratio means you have three times as much pipeline as you need to hit quota, accounting for expected close rates. PMMs influence pipeline coverage through demand generation campaigns, content that generates inbound interest, and enablement that improves close rates. Marketing-sourced pipeline and marketing-influenced pipeline are the two common metrics for tracking PMM's contribution.",
    related: ["go-to-market-strategy", "sales-enablement", "annual-recurring-revenue"],
    tags: ["Metrics", "GTM"]
  },
  {
    slug: "analyst-relations",
    term: "Analyst Relations (AR)",
    shortDef: "The practice of building relationships with industry analysts at firms like Gartner, Forrester, and IDC to influence how they categorise and evaluate your product.",
    definition:
      "Analyst relations involves regularly briefing and engaging industry analysts — at firms like Gartner, Forrester, G2, IDC — so they understand your product, strategy, and positioning. When enterprises buy software, they often consult analyst reports (Magic Quadrant, Wave, etc.) as part of their evaluation. Being included and well-positioned in analyst reports drives inbound credibility. AR is a long-term investment: relationships take 12–18 months to yield meaningful placement in reports. PMMs own AR at most mid-market SaaS companies.",
    related: ["competitive-intelligence", "category-creation", "go-to-market-strategy"],
    tags: ["PMM", "Strategy"]
  }
];

export function getTermBySlug(slug: string): GlossaryTerm | undefined {
  return GLOSSARY_TERMS.find((t) => t.slug === slug);
}

export function getRelatedTerms(term: GlossaryTerm): GlossaryTerm[] {
  return term.related
    .map((slug) => getTermBySlug(slug))
    .filter((t): t is GlossaryTerm => t !== undefined);
}
