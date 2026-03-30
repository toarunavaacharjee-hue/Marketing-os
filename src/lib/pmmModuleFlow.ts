/**
 * Canonical Product Marketing Manager journey — single linear spine through the app.
 * Foundation (settings) is cross-linked; modules follow research → ship → measure.
 */

export type JourneyPhase = "Strategy" | "Planning" | "Creation" | "Intelligence" | "AI";

export type JourneyStep = {
  href: string;
  label: string;
  phase: JourneyPhase;
};

/** Ordered steps a PMM runs through for one product (sidebar order ≈ this flow). */
export const PMM_JOURNEY: JourneyStep[] = [
  { href: "/dashboard/market-research", label: "Market Research", phase: "Strategy" },
  { href: "/dashboard/icp-segmentation", label: "ICP Segmentation", phase: "Strategy" },
  { href: "/dashboard/positioning-studio", label: "Positioning Studio", phase: "Strategy" },
  { href: "/dashboard/messaging-artifacts", label: "Messaging & Artifacts", phase: "Strategy" },
  { href: "/dashboard/work", label: "All work", phase: "Planning" },
  { href: "/dashboard/campaigns", label: "Campaigns", phase: "Planning" },
  { href: "/dashboard/gtm-planner", label: "GTM Planner", phase: "Planning" },
  { href: "/dashboard/events", label: "Events", phase: "Planning" },
  { href: "/dashboard/content-studio", label: "Content Studio", phase: "Creation" },
  { href: "/dashboard/social-media", label: "Social Media", phase: "Creation" },
  { href: "/dashboard/design-assets", label: "Design & Assets", phase: "Creation" },
  { href: "/dashboard/presentations", label: "Presentations", phase: "Creation" },
  { href: "/dashboard/website-pages", label: "Website & Pages", phase: "Creation" },
  { href: "/dashboard/analytics", label: "Analytics", phase: "Intelligence" },
  { href: "/dashboard/battlecards", label: "Battlecards", phase: "Intelligence" },
  { href: "/dashboard/sales-intelligence", label: "Sales Intelligence", phase: "Intelligence" },
  { href: "/dashboard/customer-insights", label: "Customer Insights", phase: "Intelligence" },
  { href: "/dashboard/copilot", label: "AI Copilot", phase: "AI" }
];

export const FOUNDATION_LINKS = [
  { href: "/dashboard/settings/product", label: "Product profile" },
  { href: "/dashboard/settings/segments", label: "Segments" },
  { href: "/dashboard/settings/integrations", label: "Integrations" },
  { href: "/dashboard/settings/analytics", label: "Analytics keys" },
  { href: "/dashboard/settings/learning", label: "Learning & health" }
] as const;

export type FlowContext =
  | { kind: "home" }
  | { kind: "onboarding" }
  | { kind: "settings"; subPath: string }
  | { kind: "journey"; index: number; step: JourneyStep };

function normalizePath(pathname: string): string {
  const p = pathname.split("?")[0] ?? pathname;
  if (p.length > 1 && p.endsWith("/")) return p.slice(0, -1);
  return p || "/dashboard";
}

export function getFlowContext(pathname: string): FlowContext {
  const path = normalizePath(pathname);

  if (path === "/dashboard" || path === "/dashboard/command-centre") {
    return { kind: "home" };
  }

  if (path.startsWith("/dashboard/onboarding")) {
    return { kind: "onboarding" };
  }

  if (path.startsWith("/dashboard/settings")) {
    return { kind: "settings", subPath: path.replace("/dashboard/settings", "") || "/" };
  }

  if (path === "/dashboard/ai-copilot") {
    const i = PMM_JOURNEY.findIndex((s) => s.href === "/dashboard/copilot");
    if (i >= 0) return { kind: "journey", index: i, step: PMM_JOURNEY[i] };
  }

  const i = PMM_JOURNEY.findIndex((s) => path === s.href || path.startsWith(`${s.href}/`));
  if (i >= 0) return { kind: "journey", index: i, step: PMM_JOURNEY[i] };

  return { kind: "home" };
}
