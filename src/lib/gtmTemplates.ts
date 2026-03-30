export type TemplateTarget =
  | { kind: "gtm_planner" }
  | { kind: "campaigns" }
  | { kind: "content_studio" }
  | { kind: "events" }
  | { kind: "segments" };

export type GtmTemplate = {
  id: string;
  name: string;
  description: string;
  targets: TemplateTarget[];
  payload: Record<string, unknown>;
};

export const GTM_TEMPLATES: GtmTemplate[] = [
  {
    id: "launch-checklist-lite",
    name: "Launch checklist (lite)",
    description:
      "A practical 1-week launch checklist + milestone timeline. Seeds GTM Planner, Campaigns, and Content Studio.",
    targets: [{ kind: "gtm_planner" }, { kind: "campaigns" }, { kind: "content_studio" }],
    payload: {
      gtm_planner: {
        tasks: [
          { id: "t1", label: "ICP finalized", done: false },
          { id: "t2", label: "Positioning + wedge approved", done: false },
          { id: "t3", label: "Messaging artifacts created", done: false },
          { id: "t4", label: "Launch page + tracking QA", done: false },
          { id: "t5", label: "Sales enablement shipped", done: false },
          { id: "t6", label: "Launch comms scheduled", done: false },
          { id: "t7", label: "Day-0 monitoring + fixes", done: false },
          { id: "t8", label: "Week-1 report + next iteration", done: false }
        ],
        timeline:
          "Mon: creative lock\nTue: tracking + landing QA\nWed: internal enablement\nThu: soft launch\nFri: full push\nNext Tue: retro + iteration",
        stakeholders: "Marketing — R\nSales — A\nRevOps — C\nDesign — R\nProduct — C"
      },
      campaigns: {
        columns: {
          planning: [
            { id: "c1", title: "Launch narrative + audience", tags: ["GTM"] },
            { id: "c2", title: "Paid test: 2 audiences, 3 angles", tags: ["Paid"] }
          ],
          "in-progress": [{ id: "c3", title: "Website launch page update", tags: ["Web"] }],
          "in-review": [{ id: "c4", title: "Email announcement + nurture", tags: ["Email"] }],
          live: []
        }
      },
      content_studio: {
        queue: [
          {
            id: "cs1",
            title: "Launch announcement post",
            status: "Planned",
            contentType: "Social post",
            channel: "LinkedIn",
            audience: "Primary ICP",
            owner: "",
            reviewer: "",
            dueDate: "",
            draftUrl: "",
            publishedUrl: "",
            description: "Hook → pain → wedge → proof → CTA"
          },
          {
            id: "cs2",
            title: "Launch email (customers + prospects)",
            status: "Planned",
            contentType: "Email",
            channel: "Newsletter",
            audience: "Primary ICP",
            owner: "",
            reviewer: "",
            dueDate: "",
            draftUrl: "",
            publishedUrl: "",
            description: "Segmented version: existing vs new. One clear CTA."
          }
        ],
        calendar: "Mon: draft\nTue: review\nWed: schedule\nThu: publish\nFri: repurpose",
        notes: ""
      }
    }
  },
  {
    id: "event-playbook",
    name: "Event playbook (booth + meetings)",
    description:
      "Seeds an event checklist and prep timeline. Designed to work with Match prep to tasks.",
    targets: [{ kind: "events" }],
    payload: {
      events: {
        events: [
          {
            id: "e1",
            name: "",
            prepPct: 0,
            eventUrl: "",
            eventDate: "",
            location: "",
            boothOrTrack: "",
            attendees: "",
            timeline:
              "T-6w: register + hotel\nT-4w: collateral lock\nT-2w: meetings booked\nT-1w: ship + booth ops\nShow days: booth schedule\nT+2d: lead upload + follow-up",
            logistics: "",
            commercialNotes: "",
            leadCaptureNotes: "",
            speakingNotes: "",
            meetingsNotes: "",
            competitorNotes: "",
            followUpNotes: "",
            goals: "Target meetings, pipeline, and post-event follow-up plan.",
            tasks: [
              { id: "et1", label: "Register passes + finalize attendees", done: false },
              { id: "et2", label: "Book travel + hotel", done: false },
              { id: "et3", label: "Define meeting target list + outreach copy", done: false },
              { id: "et4", label: "Finalize booth needs (power, internet, furniture)", done: false },
              { id: "et5", label: "Prep collateral + one-pager", done: false },
              { id: "et6", label: "Lead capture plan + scanner access", done: false },
              { id: "et7", label: "Booth duty schedule", done: false },
              { id: "et8", label: "Post-event follow-up SLA + nurture path", done: false }
            ]
          }
        ],
        pastNotes: ""
      }
    }
  },
  {
    id: "segments-starter-pack",
    name: "ICP segments starter pack (B2B SaaS)",
    description:
      "Creates 4 starter ICP segments in your workspace so you can generate positioning quickly. Edit after import.",
    targets: [{ kind: "segments" }],
    payload: {
      segments: [
        {
          name: "Mid-market ops leaders (fast time-to-value)",
          pnf_score: 70,
          pain_points: ["Manual reporting", "Tool sprawl", "Slow campaign shipping"],
          notes: "Start here if you sell to lean teams."
        },
        {
          name: "Growth teams (pipeline + experimentation)",
          pnf_score: 65,
          pain_points: ["Attribution uncertainty", "Content velocity", "Limited headcount"],
          notes: "Best for demand gen-led motion."
        },
        {
          name: "Enterprise PMM (consistency + enablement)",
          pnf_score: 55,
          pain_points: ["Messaging consistency", "Stakeholder alignment", "Enablement packaging"],
          notes: "Best for multi-team orgs."
        },
        {
          name: "RevOps partner (integrations + governance)",
          pnf_score: 50,
          pain_points: ["Data hygiene", "Workflow approvals", "Integration reliability"],
          notes: "Use for internal buyer/partner motion."
        }
      ]
    }
  }
];

