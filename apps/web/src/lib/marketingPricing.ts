/**
 * Public marketing prices (Stripe checkout should mirror these when wired).
 * Annual values are effective $/month when billed annually (~20% off monthly).
 *
 * {@link MAX_SELF_SERVE_LIST_PRICE_USD} is the top published list price; above that → custom / talk to sales.
 */
export const marketingPlanPrices = {
  starter: { monthly: 99, annualMonthlyEquivalent: 79 },
  growth: { monthly: 299, annualMonthlyEquivalent: 239 },
  enterprise: { monthly: 999, annualMonthlyEquivalent: 799 }
} as const;

/** Highest list price shown on the site; larger deals, SSO, or higher limits → sales-assisted. */
export const MAX_SELF_SERVE_LIST_PRICE_USD = marketingPlanPrices.enterprise.monthly;

/**
 * Internal unit economics (not customer-facing copy): workspace base + incremental product cost
 * used to shape packaged tiers; entitlements caps live in planEntitlements.
 */
export const pricingEconomicsModel = {
  baseWorkspaceUsd: 99,
  perProductUsd: 10
} as const;

/** Published list prices for the workspace plan (Stripe should mirror when wired). */
/**
 * One-line summary of published **monthly list** prices (same figures as `/pricing` cards).
 * Use in dashboard alerts and support tickets so copy never drifts from `marketingPlanPrices`.
 */
export function publishedSelfServeMonthlyListSummary(): string {
  const { starter, growth, enterprise } = marketingPlanPrices;
  return `Published monthly list: Starter $${starter.monthly}/mo · Growth $${growth.monthly}/mo · Enterprise up to $${enterprise.monthly}/mo (annual billing lowers effective $/mo — see /pricing).`;
}

export function listPriceForWorkspacePlan(
  rawPlan: string | null | undefined
): { monthly: number; annualMonthlyEquivalent: number } | null {
  const p = String(rawPlan ?? "starter").toLowerCase();
  if (p === "starter" || p === "free") {
    return {
      monthly: marketingPlanPrices.starter.monthly,
      annualMonthlyEquivalent: marketingPlanPrices.starter.annualMonthlyEquivalent
    };
  }
  if (p === "growth") {
    return {
      monthly: marketingPlanPrices.growth.monthly,
      annualMonthlyEquivalent: marketingPlanPrices.growth.annualMonthlyEquivalent
    };
  }
  if (p === "enterprise") {
    return {
      monthly: marketingPlanPrices.enterprise.monthly,
      annualMonthlyEquivalent: marketingPlanPrices.enterprise.annualMonthlyEquivalent
    };
  }
  return null;
}
