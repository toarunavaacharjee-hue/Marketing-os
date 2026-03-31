import { NextResponse } from "next/server";
import { getOperatorGate } from "@/lib/platformAdmin";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

const PLANS = ["starter", "growth", "enterprise"] as const;

function seatsIncludedFor(plan: (typeof PLANS)[number]) {
  if (plan === "starter") return 1;
  if (plan === "growth") return 5;
  return 10;
}

function productsIncludedFor(_plan: (typeof PLANS)[number]) {
  // Pricing model (per your choice B): every company gets 1 included product,
  // then pays for each additional product via products_addon.
  return 1;
}

export async function POST(req: Request) {
  const gate = await getOperatorGate();
  if (!gate.ok) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const admin = createSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY on server." }, { status: 500 });
  }

  const body = (await req.json()) as {
    company_id?: string;
    plan?: string;
    seats_addon?: number;
    products_addon?: number;
    status?: string;
  };

  const companyId = (body.company_id ?? "").trim();
  const planRaw = (body.plan ?? "").trim().toLowerCase();
  const status = (body.status ?? "active").trim().toLowerCase();
  const seatsAddon = Number.isFinite(body.seats_addon as any) ? Math.max(0, Math.floor(body.seats_addon as any)) : 0;
  const productsAddon = Number.isFinite(body.products_addon as any)
    ? Math.max(0, Math.floor(body.products_addon as any))
    : 0;

  const plan = (PLANS as readonly string[]).includes(planRaw) ? (planRaw as any) : null;
  if (!companyId) return NextResponse.json({ error: "company_id is required." }, { status: 400 });
  if (!plan) return NextResponse.json({ error: "plan must be starter|growth|enterprise." }, { status: 400 });
  if (!["trialing", "active", "past_due", "canceled"].includes(status)) {
    return NextResponse.json({ error: "status must be trialing|active|past_due|canceled." }, { status: 400 });
  }

  const seatsIncluded = seatsIncludedFor(plan);
  const productsIncluded = productsIncludedFor(plan);

  const { error } = await admin.from("company_subscriptions").upsert({
    company_id: companyId,
    plan,
    status,
    seats_included: seatsIncluded,
    seats_addon: seatsAddon,
    products_included: productsIncluded,
    products_addon: productsAddon
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

