import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getStripeServer } from "@/lib/stripe/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const stripe = getStripeServer();
  const customers = await stripe.customers.list({ email: user.email, limit: 1 });
  const customer = customers.data[0];

  if (!customer) {
    return NextResponse.json(
      { error: "No Stripe customer found for this email yet." },
      { status: 400 }
    );
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customer.id,
    return_url: `${env.NEXT_PUBLIC_SITE_URL}/dashboard/settings`
  });

  return NextResponse.json({ url: session.url });
}

