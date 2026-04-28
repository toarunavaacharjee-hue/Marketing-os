export type Plan = "starter" | "growth" | "enterprise" | "free";

export function normalizePlan(raw: string | null | undefined): Plan {
  const p = String(raw ?? "").toLowerCase();
  if (p === "growth" || p === "enterprise" || p === "starter") return p;
  if (p === "free") return "free";
  return "starter";
}

/** Starter, free, and growth workspaces may use the operator's ANTHROPIC_API_KEY when no BYOK is set. Enterprise must BYOK. */
export function planEligibleForPlatformAnthropicDefault(plan: Plan): boolean {
  return plan === "starter" || plan === "free" || plan === "growth";
}

export type Entitlements = {
  plan: Plan;
  allowedDashboardSlugs: Set<string>; // "" means /dashboard home; "*" = all modules
  supportTier: "standard" | "priority" | "dedicated";
  /**
   * Max company members + pending invites (team / “workspace seats”).
   * Enterprise: 5 seats OR 30 products — whichever quota you hit first blocks scaling.
   */
  seatsMax: number | null; // null = unlimited (unused tier)
  /** Max products (brands) for the company. Clamps subscription totals. */
  productsMax: number | null;
  /** AI workflow runs (Copilot + module generators) per user per month; null = unlimited. */
  aiQueriesPerMonth: number | null;
};

/** Starter / free monthly cap; must match marketing + enforcement in /api/ai/*. */
export const STARTER_AI_QUERIES_PER_MONTH = 100;

const ALL_MODULES = new Set<string>(["*"]);

export function getEntitlements(rawPlan: string | null | undefined): Entitlements {
  const plan = normalizePlan(rawPlan);
  if (plan === "starter" || plan === "free") {
    return {
      plan,
      allowedDashboardSlugs: ALL_MODULES,
      supportTier: "standard",
      seatsMax: 1,
      productsMax: 2,
      aiQueriesPerMonth: STARTER_AI_QUERIES_PER_MONTH
    };
  }
  if (plan === "growth") {
    return {
      plan,
      allowedDashboardSlugs: ALL_MODULES,
      supportTier: "priority",
      seatsMax: 3,
      productsMax: 10,
      aiQueriesPerMonth: null
    };
  }
  return {
    plan: "enterprise",
    allowedDashboardSlugs: ALL_MODULES,
    supportTier: "dedicated",
    seatsMax: 5,
    productsMax: 30,
    aiQueriesPerMonth: null
  };
}

export function isAiMonthlyQuotaExceeded(ent: Entitlements, aiQueriesUsed: number): boolean {
  const cap = ent.aiQueriesPerMonth;
  if (cap === null) return false;
  return aiQueriesUsed >= cap;
}

/**
 * Effective product slots from subscription row, after plan cap (prevents cheap tiers + huge products_addon abuse).
 */
export function effectiveProductsAllowed(
  rawPlan: string | null | undefined,
  productsIncluded: number,
  productsAddon: number
): number {
  const included = Number.isFinite(productsIncluded) ? Math.max(0, Math.floor(productsIncluded)) : 1;
  const addon = Number.isFinite(productsAddon) ? Math.max(0, Math.floor(productsAddon)) : 0;
  const dbTotal = included + addon;
  const cap = getEntitlements(rawPlan).productsMax;
  if (cap === null) return dbTotal;
  return Math.min(dbTotal, cap);
}

export function isSlugAllowed(ent: Entitlements, slug: string) {
  if (ent.allowedDashboardSlugs.has("*")) return true;
  return ent.allowedDashboardSlugs.has(slug);
}

