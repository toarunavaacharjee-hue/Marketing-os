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
  }
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

