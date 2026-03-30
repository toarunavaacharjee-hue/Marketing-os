export type Plan = "starter" | "growth" | "enterprise" | "free";

export function normalizePlan(raw: string | null | undefined): Plan {
  const p = String(raw ?? "").toLowerCase();
  if (p === "growth" || p === "enterprise" || p === "starter") return p;
  if (p === "free") return "free";
  return "starter";
}

export type Entitlements = {
  plan: Plan;
  allowedDashboardSlugs: Set<string>; // "" means /dashboard home
  supportTier: "standard" | "priority" | "dedicated";
};

// Slugs correspond to /dashboard/<slug>
const STARTER_ALLOWED = new Set<string>([
  "",
  "work",
  "getting-started",
  "icp-segmentation",
  "positioning-studio",
  "messaging-artifacts",
  "copilot",
  "settings",
  "support",
  "upgrade"
]);

export function getEntitlements(rawPlan: string | null | undefined): Entitlements {
  const plan = normalizePlan(rawPlan);
  if (plan === "starter" || plan === "free") {
    return {
      plan,
      allowedDashboardSlugs: STARTER_ALLOWED,
      supportTier: "standard"
    };
  }
  if (plan === "growth") {
    return {
      plan,
      allowedDashboardSlugs: new Set<string>(["*"]),
      supportTier: "priority"
    };
  }
  return {
    plan: "enterprise",
    allowedDashboardSlugs: new Set<string>(["*"]),
    supportTier: "dedicated"
  };
}

export function isSlugAllowed(ent: Entitlements, slug: string) {
  if (ent.allowedDashboardSlugs.has("*")) return true;
  return ent.allowedDashboardSlugs.has(slug);
}

