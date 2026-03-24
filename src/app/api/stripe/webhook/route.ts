import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { env, requireEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStripeServer } from "@/lib/stripe/server";

function planFromPriceId(priceId: string) {
  if (priceId === env.STRIPE_PRICE_STARTER_MONTHLY) return "starter";
  if (priceId === env.STRIPE_PRICE_GROWTH_MONTHLY) return "growth";
  if (priceId === env.STRIPE_PRICE_ENTERPRISE_MONTHLY) return "enterprise";
  return null;
}

export async function POST(req: Request) {
  const stripe = getStripeServer();
  const sig = (await headers()).get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const webhookSecret = env.STRIPE_WEBHOOK_SECRET ?? requireEnv("STRIPE_WEBHOOK_SECRET");

  let event: Stripe.Event;
  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid webhook" },
      { status: 400 }
    );
  }

  const supabase = createSupabaseAdminClient();

  try {
    if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
      const sub = event.data.object as Stripe.Subscription;
      const userId = (sub.metadata?.user_id ?? "").trim();
      const firstItem = sub.items.data[0];
      const priceId = typeof firstItem?.price?.id === "string" ? firstItem.price.id : "";
      const plan = planFromPriceId(priceId) ?? (sub.metadata?.plan as string | undefined) ?? null;

      if (userId && plan) {
        await supabase
          .from("profiles")
          .update({ plan })
          .eq("id", userId);
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      const userId = (sub.metadata?.user_id ?? "").trim();
      if (userId) {
        await supabase
          .from("profiles")
          .update({ plan: "free" })
          .eq("id", userId);
      }
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Webhook handler failed" },
      { status: 500 }
    );
  }
}

