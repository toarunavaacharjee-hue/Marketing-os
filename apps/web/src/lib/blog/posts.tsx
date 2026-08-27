import type { ReactNode } from "react";

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  tags: string[];
  render: () => ReactNode;
};

function H2({ children }: { children: ReactNode }) {
  return (
    <h2 className="mt-10 text-xl font-semibold tracking-tight text-text sm:text-2xl" style={{ fontFamily: "var(--font-heading)" }}>
      {children}
    </h2>
  );
}

function P({ children }: { children: ReactNode }) {
  return <p className="mt-4 text-sm leading-relaxed text-text2 sm:text-[15px]">{children}</p>;
}

function Li({ children }: { children: ReactNode }) {
  return <li className="text-sm leading-relaxed text-text2 sm:text-[15px]">{children}</li>;
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "b2b-go-to-market-strategy-template",
    title: "B2B Go-to-Market Strategy Template (2026): a practical, execution-ready plan",
    description:
      "A clear GTM strategy template for B2B SaaS teams: ICP, positioning, channels, launch plan, and metrics—built to ship in 30 days.",
    date: "2026-04-13",
    tags: ["GTM", "Strategy", "B2B SaaS"],
    render: () => (
      <>
        <P>
          A GTM “strategy” only matters if it turns into weekly execution. This template is designed to be filled in quickly,
          reviewed with cross-functional partners, and used as the backbone for campaign, sales enablement, and measurement loops.
        </P>
        <H2>1) Define the ICP you can actually win</H2>
        <P>
          Start with evidence (closed-won + churn + expansion), not opinions. Use firmographics (industry, size, geo) and
          technographics (stack, data maturity) but anchor the ICP in a repeatable “job” you solve.
        </P>
        <ul className="mt-4 list-disc space-y-2 pl-5">
          <Li>Who converts fastest and expands most?</Li>
          <Li>What problem triggers buying right now?</Li>
          <Li>What disqualifiers reliably predict churn?</Li>
        </ul>
        <H2>2) Write positioning as a constraint</H2>
        <P>
          Strong positioning is a constraint that makes decisions easier: which customers, which use cases, which proof, which
          alternatives. If you can’t say “no” to a segment or use case, you don’t have positioning yet.
        </P>
        <H2>3) Choose a GTM motion based on ACV + sales cycle</H2>
        <P>
          Sales-led vs product-led isn’t ideology—it’s unit economics and complexity. Pick one “primary” motion and build the
          system around it, then layer the rest later.
        </P>
        <H2>4) Build a 30-day execution plan</H2>
        <P>
          Translate strategy into a sprint: one offer, one audience, one primary channel, one measurable outcome. Ship assets,
          run the campaign, review results, iterate.
        </P>
        <ul className="mt-4 list-disc space-y-2 pl-5">
          <Li>Week 1: ICP + message map + landing page</Li>
          <Li>Week 2: campaign build + sales enablement + tracking</Li>
          <Li>Week 3: launch + pipeline review + objections</Li>
          <Li>Week 4: optimize + document learnings + next sprint</Li>
        </ul>
        <H2>5) Track the smallest set of GTM metrics</H2>
        <P>
          Keep metrics tied to decisions. A good default is: traffic → conversion → pipeline → win rate → payback. Add depth
          only when it changes action.
        </P>
      </>
    )
  },
  {
    slug: "ideal-customer-profile-icp-framework",
    title: "ICP Framework: how to build an Ideal Customer Profile that drives pipeline",
    description:
      "A practical ICP framework for B2B teams: evidence-based signals, segment scoring, disqualifiers, and a simple ICP one-pager.",
    date: "2026-04-13",
    tags: ["ICP", "Segmentation", "Revenue"],
    render: () => (
      <>
        <P>
          Most ICPs fail because they describe “who we want” instead of “who reliably succeeds.” The goal is a profile that
          improves targeting, messaging, qualification, and retention.
        </P>
        <H2>Start with evidence</H2>
        <P>
          Pull a sample of closed-won, churned, and expanded accounts. Look for patterns you can act on: size bands, buyer role,
          integration needs, urgency triggers, and procurement friction.
        </P>
        <H2>Define signals and disqualifiers</H2>
        <ul className="mt-4 list-disc space-y-2 pl-5">
          <Li>Signals: fast time-to-value, strong activation, repeatable use case</Li>
          <Li>Disqualifiers: low urgency, heavy customization, mismatched compliance requirements</Li>
        </ul>
        <H2>Score segments (simple, not perfect)</H2>
        <P>
          Use a lightweight score: value (LTV potential), velocity (sales cycle), and fit (success likelihood). Rank the top 3
          segments and pick one to operationalize first.
        </P>
        <H2>Ship an ICP one-pager</H2>
        <P>
          Put the ICP where teams work: marketing briefs, sales sequences, onboarding checklists. Include “who it’s for,” “who
          it’s not for,” triggers, proof points, and objection angles.
        </P>
      </>
    )
  },
  {
    slug: "positioning-vs-messaging",
    title: "Positioning vs Messaging: what’s the difference (and why your GTM needs both)",
    description:
      "Positioning is the strategy; messaging is the expression. Learn how to align both so your site, ads, and sales calls stay consistent.",
    date: "2026-04-13",
    tags: ["Positioning", "Messaging", "PMM"],
    render: () => (
      <>
        <P>
          Teams often rewrite messaging when the real issue is positioning. Messaging can’t fix an unclear competitive stance.
          This post gives you a quick way to tell which problem you have.
        </P>
        <H2>Positioning is the strategy</H2>
        <P>
          Positioning answers: For whom? For what job? Why you? Compared to what? With what proof? It shapes what you build and
          what you say no to.
        </P>
        <H2>Messaging is the expression</H2>
        <P>
          Messaging turns positioning into language: value props, headlines, proof points, and objection handling. Messaging
          varies by channel; positioning should not.
        </P>
        <H2>How to align them</H2>
        <ul className="mt-4 list-disc space-y-2 pl-5">
          <Li>Write one positioning statement (internal) and one “message map” (external)</Li>
          <Li>Choose 3 proof points you can defend</Li>
          <Li>Define the top 5 objections and your answers</Li>
        </ul>
      </>
    )
  },
  {
    slug: "product-messaging-framework",
    title: "Product Messaging Framework: a message map you can use across website, ads, and sales",
    description:
      "Build a simple messaging framework: core narrative, value props, proof, use cases, and objections—designed for consistent GTM execution.",
    date: "2026-04-13",
    tags: ["Messaging", "Website", "Sales Enablement"],
    render: () => (
      <>
        <P>
          A message map is the fastest way to keep your website, outbound, ads, and sales decks consistent. If you can’t reuse
          your messaging across channels, it’s not a framework—it’s copy.
        </P>
        <H2>The 6-block message map</H2>
        <ul className="mt-4 list-disc space-y-2 pl-5">
          <Li>Audience + trigger: who is this for and what changed?</Li>
          <Li>Primary promise: the main outcome you deliver</Li>
          <Li>3 value props: the “how” behind the promise</Li>
          <Li>Proof: metrics, case studies, demos, comparisons</Li>
          <Li>Use cases: the top workflows people buy for</Li>
          <Li>Objections: “why now,” “why you,” “why not X”</Li>
        </ul>
        <H2>Make it operational</H2>
        <P>
          Put the map into templates: landing page sections, email sequences, sales talk tracks, and battlecards. Review it
          monthly with the latest wins and losses.
        </P>
      </>
    )
  },
  {
    slug: "product-launch-checklist",
    title: "Product Launch Checklist: the lean GTM launch plan for B2B teams",
    description:
      "A lean product launch checklist for B2B SaaS: positioning, assets, enablement, channel plan, and measurement—without the bloat.",
    date: "2026-04-13",
    tags: ["Launch", "GTM Planner", "Checklists"],
    render: () => (
      <>
        <P>
          Launches slip when responsibilities are unclear and assets aren’t reusable. This checklist is intentionally lean: it
          focuses on the smallest set of steps that reliably produce pipeline and adoption.
        </P>
        <H2>Pre-launch (1–2 weeks)</H2>
        <ul className="mt-4 list-disc space-y-2 pl-5">
          <Li>Finalize ICP + positioning + message map</Li>
          <Li>Create 1 landing page + 1 demo narrative</Li>
          <Li>Ship sales enablement: talk track + FAQ + objection notes</Li>
          <Li>Set tracking: events, UTMs, and a weekly review dashboard</Li>
        </ul>
        <H2>Launch week</H2>
        <ul className="mt-4 list-disc space-y-2 pl-5">
          <Li>Run one primary campaign (email, outbound, or paid) and one secondary amplifier</Li>
          <Li>Hold a daily 15-min standup for blockers</Li>
          <Li>Capture objections + questions for the next iteration</Li>
        </ul>
        <H2>Post-launch (weeks 2–4)</H2>
        <ul className="mt-4 list-disc space-y-2 pl-5">
          <Li>Review performance weekly and update messaging</Li>
          <Li>Turn learnings into repeatable templates and playbooks</Li>
          <Li>Document the next sprint: new audience, new angle, or new channel</Li>
        </ul>
      </>
    )
  },
  {
    slug: "what-is-a-marketing-operating-system",
    title: "What is a Marketing Operating System? (The complete guide for GTM teams)",
    description:
      "A marketing operating system is the connected layer that turns strategy into repeatable execution. Here's what it is, why PMM and GTM teams need one, and how AI changes the equation.",
    date: "2026-07-17",
    tags: ["Marketing OS", "GTM", "PMM"],
    render: () => (
      <>
        <P>
          Most marketing teams don't have a system problem — they have a <em>fragmentation</em> problem. Strategy lives in a deck.
          ICP lives in a spreadsheet. Messaging lives in a doc nobody updates. Campaign briefs live in someone's inbox. The output
          is inconsistent positioning, slow launches, and sales teams ignoring the content marketing produces.
        </P>
        <P>
          A marketing operating system (marketing OS) fixes this by connecting the inputs — research, ICP, positioning — to the
          outputs — campaigns, battlecards, launch plans — inside one working layer.
        </P>
        <H2>What a marketing OS actually is</H2>
        <P>
          A marketing operating system is the set of connected workflows, templates, and tools that converts raw market context
          into repeatable GTM execution. It's not a CRM. It's not a project management tool. It sits between strategy and
          execution: it holds your ICP definition, your positioning canvas, your message map, and your launch playbooks — and it
          connects them so changing one updates the others.
        </P>
        <ul className="mt-4 list-disc space-y-2 pl-5">
          <Li>Strategy layer: ICP segments, positioning, competitive landscape</Li>
          <Li>Content layer: message maps, battlecards, sales enablement</Li>
          <Li>Execution layer: campaigns, GTM plans, launch playbooks</Li>
          <Li>Intelligence layer: market research, customer insights, analytics</Li>
        </ul>
        <H2>Why most GTM teams don't have one</H2>
        <P>
          The pieces exist — they're just not connected. Positioning is defined once, lives in a Google Doc, and drifts as the
          product evolves. ICP is "whoever buys." Campaign briefs reference messaging from two launches ago. Sales enablement is
          built from scratch each quarter.
        </P>
        <P>
          The result: each launch takes as long as the last one, each new hire reinvents the wheel, and the marketing function
          can't demonstrate a direct line from its work to pipeline.
        </P>
        <H2>How AI changes the marketing OS</H2>
        <P>
          The original promise of a marketing OS was documentation and process. AI makes it generative: instead of filling in
          templates manually, the system reads your ICP, your positioning, and your market research and produces a first draft
          of the message map, the launch brief, and the battlecard.
        </P>
        <P>
          This compresses the time from "we have a new product" to "we have a go-to-market plan" from weeks to hours. More
          importantly, it keeps the outputs consistent — every artifact comes from the same source of truth, not from whoever
          wrote it last.
        </P>
        <H2>The 5 modules every marketing OS needs</H2>
        <ul className="mt-4 list-disc space-y-2 pl-5">
          <Li><strong>ICP Segmentation</strong> — evidence-based profiles that define who you're targeting and why</Li>
          <Li><strong>Positioning Studio</strong> — a living canvas that defines your competitive stance for each segment</Li>
          <Li><strong>Messaging & Artifacts</strong> — message maps, value props, and proof points derived from positioning</Li>
          <Li><strong>GTM Planner</strong> — a timeline and checklist that ties to the message map, not a generic project plan</Li>
          <Li><strong>Launch Playbook</strong> — a repeatable workflow that generates positioning guides, message maps, GTM plans, and sales enablement from a single brief</Li>
        </ul>
        <H2>Who needs a marketing OS</H2>
        <P>
          Any team that launches more than once a year, maintains more than one ICP segment, or has more than one person
          involved in GTM decisions. In practice: product marketing teams at B2B SaaS companies from Series A through public.
        </P>
        <P>
          The cost of not having one scales with headcount and product complexity. At two people it's inefficiency. At ten it's
          incoherence. At fifty it's a positioning crisis.
        </P>
      </>
    )
  },
  {
    slug: "saas-messaging-framework",
    title: "SaaS Messaging Framework: how to build one that scales across channels",
    description:
      "A SaaS messaging framework that keeps your website, ads, sales, and product consistent — without a 40-page brand doc nobody reads.",
    date: "2026-07-17",
    tags: ["Messaging", "SaaS", "Positioning"],
    render: () => (
      <>
        <P>
          The average B2B SaaS company has four versions of its value proposition: one on the homepage, one in the sales deck,
          one in the outbound sequence, and one in the founder's head. None of them match. A messaging framework fixes this —
          not by writing more copy, but by building a shared source of truth that makes the copy obvious.
        </P>
        <H2>What a SaaS messaging framework is (and isn't)</H2>
        <P>
          A messaging framework is a structured document that defines your core narrative, value propositions, proof points, use
          cases, and objection responses — at a level of abstraction that lets any team member adapt it to their channel without
          changing the underlying meaning.
        </P>
        <P>
          It's not a brand bible. It's not a tagline. It's the working layer between positioning (what you believe about your
          market) and copy (what you publish). It's designed to be used, not filed.
        </P>
        <H2>The 6-part SaaS messaging framework</H2>
        <ul className="mt-4 list-disc space-y-2 pl-5">
          <Li><strong>Primary promise:</strong> the single outcome you deliver, in plain language. One sentence. No jargon.</Li>
          <Li><strong>Audience + trigger:</strong> who this is for and what event or pain is driving them to look now.</Li>
          <Li><strong>3 value propositions:</strong> the three "how we deliver the promise" pillars. Each has a one-line claim and two proof points.</Li>
          <Li><strong>Proof layer:</strong> metrics, customer quotes, case study hooks, and demo moments that make each value prop believable.</Li>
          <Li><strong>Use cases:</strong> the 2-4 specific jobs people hire your product for. These map to landing pages, outbound sequences, and sales plays.</Li>
          <Li><strong>Objection map:</strong> "why now," "why us over X," "why not build it," and "why not wait." One clear answer per objection.</Li>
        </ul>
        <H2>How to adapt it by channel</H2>
        <P>
          The framework is fixed; the expression varies. The homepage leads with the primary promise and the proof layer. Paid
          ads lead with the trigger and a single value prop. Outbound email leads with the use case most relevant to the
          recipient's role. Sales decks weave all six parts in sequence.
        </P>
        <P>
          If a team member has to rewrite the framework to write an email, the framework is too abstract. If the email sounds
          nothing like the homepage, the framework isn't being used. The goal is recognizable consistency, not identical copy.
        </P>
        <H2>When to update your messaging framework</H2>
        <ul className="mt-4 list-disc space-y-2 pl-5">
          <Li>A new ICP segment becomes primary — the trigger and use cases change</Li>
          <Li>A competitor repositions and steals a claim you relied on — the objection map and differentiation change</Li>
          <Li>You ship a major feature that changes the primary promise — review all six parts</Li>
          <Li>Win rate drops below baseline — usually a proof or objection problem</Li>
        </ul>
        <H2>The most common messaging mistakes in B2B SaaS</H2>
        <ul className="mt-4 list-disc space-y-2 pl-5">
          <Li>Leading with features instead of outcomes — buyers buy results, not capabilities</Li>
          <Li>Writing for one persona when you sell to a buying committee — each member needs a different angle</Li>
          <Li>Proof points that are vague ("saves time") instead of specific ("reduces campaign setup from 3 days to 4 hours")</Li>
          <Li>Updating the website without updating sales — messaging breaks at the handoff</Li>
        </ul>
      </>
    )
  },
  {
    slug: "b2b-go-to-market-plan",
    title: "B2B Go-to-Market Plan: step-by-step template with examples",
    description:
      "A practical B2B go-to-market plan template: how to define your ICP, build your launch sequence, align sales and marketing, and track what matters.",
    date: "2026-07-17",
    tags: ["GTM", "B2B SaaS", "Launch"],
    render: () => (
      <>
        <P>
          A GTM strategy answers "who, what, and why." A GTM plan answers "what, by whom, and by when." Most teams have a
          strategy. Few have a plan. The difference shows up at launch: instead of a coordinated motion, you get a scramble —
          assets not ready, sales not briefed, no shared definition of what success looks like.
        </P>
        <P>
          This template is built for B2B teams shipping to a defined ICP. It's lean by design: every section has a decision, not
          just a description.
        </P>
        <H2>Step 1: Define the launch scope</H2>
        <P>
          Before anything else, make three decisions explicit:
        </P>
        <ul className="mt-4 list-disc space-y-2 pl-5">
          <Li><strong>What are you launching?</strong> New product, major feature, or segment expansion. Each has a different motion.</Li>
          <Li><strong>Who is the primary ICP for this launch?</strong> One segment. You can expand later.</Li>
          <Li><strong>What does success look like in 30 days?</strong> Pipeline created, trials started, or seats activated — pick one primary metric.</Li>
        </ul>
        <H2>Step 2: Lock positioning and message map</H2>
        <P>
          No campaign, no sales call, no landing page should go out before positioning is agreed. Write one positioning statement
          (internal) and one message map (external). The message map has: primary promise, three value props, top proof points,
          and answers to the three most common objections.
        </P>
        <P>
          If you skip this step, every team member will improvise. The improvised versions won't match.
        </P>
        <H2>Step 3: Build the asset list (minimum viable)</H2>
        <ul className="mt-4 list-disc space-y-2 pl-5">
          <Li>1 landing page or updated product page</Li>
          <Li>1 email sequence (3 emails: announcement, value, proof)</Li>
          <Li>1 sales talk track with objection responses</Li>
          <Li>1 one-pager or battlecard for the sales team</Li>
        </ul>
        <P>
          That's the floor. Add a case study, a demo video, or a paid campaign if you have the runway. Cut everything else until
          after you've validated the core message.
        </P>
        <H2>Step 4: Set the GTM timeline</H2>
        <P>
          A standard B2B GTM plan runs 4 weeks from asset-complete to post-launch review:
        </P>
        <ul className="mt-4 list-disc space-y-2 pl-5">
          <Li><strong>Week –2:</strong> Positioning locked, assets briefed, tracking set up</Li>
          <Li><strong>Week –1:</strong> Assets complete, sales briefed, campaign QA'd</Li>
          <Li><strong>Week 0:</strong> Launch — primary campaign live, sales outreach starts</Li>
          <Li><strong>Week +1:</strong> Objection capture, pipeline review, message iteration</Li>
          <Li><strong>Week +2:</strong> First learnings into updated talk track and next campaign</Li>
        </ul>
        <H2>Step 5: Assign owners, not just tasks</H2>
        <P>
          Every deliverable needs one owner (not "marketing" or "the team") and a hard date. Use a simple table: asset, owner,
          due date, status. Review it in a 15-minute weekly standup until launch week, then daily.
        </P>
        <H2>Step 6: Define the GTM metrics</H2>
        <P>
          Agree on the metrics before launch, not after. A minimal set for a B2B launch:
        </P>
        <ul className="mt-4 list-disc space-y-2 pl-5">
          <Li>Pipeline created (primary)</Li>
          <Li>Qualified leads or trials from the launch campaign</Li>
          <Li>Sales cycle length vs baseline</Li>
          <Li>Top 3 objections heard in calls (qualitative signal)</Li>
        </ul>
        <P>
          If the metrics don't exist in your CRM or analytics before launch, set them up first. You can't iterate on data you
          didn't collect.
        </P>
        <H2>Common GTM plan failures</H2>
        <ul className="mt-4 list-disc space-y-2 pl-5">
          <Li>Launching to every segment at once — dilutes the message and the budget</Li>
          <Li>Treating the GTM plan as a one-time doc — it should be updated weekly during the launch window</Li>
          <Li>Sales briefed at launch instead of two weeks before — they need time to internalize and practice</Li>
          <Li>No post-launch review scheduled — the learnings that improve the next launch never get captured</Li>
        </ul>
      </>
    )
  }
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

