import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getPriceIdForPlan, getStripeServer } from "@/lib/stripe/server";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      plan?: "starter" | "growth" | "enterprise";
      userId?: string | null;
      email?: string | null;
    };

    const plan = body.plan;
    if (!plan || !["starter", "growth", "enterprise"].includes(plan)) {
      return NextResponse.json(
        { error: "Missing or invalid plan." },
        { status: 400 }
      );
    }

    const stripe = getStripeServer();
    const priceId = getPriceIdForPlan(plan);

    const siteUrl = env.NEXT_PUBLIC_SITE_URL;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/dashboard/settings?checkout=success`,
      cancel_url: `${siteUrl}/dashboard/settings?checkout=cancel`,
      customer_email: body.email ?? undefined,
      client_reference_id: body.userId ?? undefined,
      subscription_data: {
        metadata: {
          user_id: body.userId ?? "",
          plan
        }
      },
      metadata: {
        user_id: body.userId ?? "",
        plan
      },
      allow_promotion_codes: true
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

