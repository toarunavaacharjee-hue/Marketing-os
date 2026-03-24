import Stripe from "stripe";
import { env, requireEnv } from "@/lib/env";

export function getStripeServer() {
  const key = env.STRIPE_SECRET_KEY ?? requireEnv("STRIPE_SECRET_KEY");
  return new Stripe(key, { apiVersion: "2024-06-20" });
}

export function getPriceIdForPlan(plan: "starter" | "growth" | "enterprise") {
  if (plan === "starter")
    return (
      env.STRIPE_PRICE_STARTER_MONTHLY ??
      requireEnv("STRIPE_PRICE_STARTER_MONTHLY")
    );
  if (plan === "growth")
    return (
      env.STRIPE_PRICE_GROWTH_MONTHLY ??
      requireEnv("STRIPE_PRICE_GROWTH_MONTHLY")
    );
  return (
    env.STRIPE_PRICE_ENTERPRISE_MONTHLY ??
    requireEnv("STRIPE_PRICE_ENTERPRISE_MONTHLY")
  );
}

