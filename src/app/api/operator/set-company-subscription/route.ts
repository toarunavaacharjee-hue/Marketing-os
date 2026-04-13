import { NextResponse } from "next/server";
import { getOperatorGate } from "@/lib/platformAdmin";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { writeOperatorAuditLog } from "@/lib/operator/operatorAuditLog";
import { getEntitlements } from "@/lib/planEntitlements";

const PLANS = ["starter", "growth", "enterprise"] as const;

function seatsIncludedFor(plan: (typeof PLANS)[number]) {
  if (plan === "starter") return 1;
  if (plan === "growth") return 3;
  return 5;
}

function productsIncludedFor(_plan: (typeof PLANS)[number]) {
  // Pricing model: every company gets 1 included product, then pays via products_addon.
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
    reason?: string;
  };

  const companyId = (body.company_id ?? "").trim();
  const reason = (body.reason ?? "").trim();
  const planRaw = (body.plan ?? "").trim().toLowerCase();
  const status = (body.status ?? "active").trim().toLowerCase();
  const seatsAddon = Number.isFinite(body.seats_addon as any) ? Math.max(0, Math.floor(body.seats_addon as any)) : 0;
  const productsAddon = Number.isFinite(body.products_addon as any)
    ? Math.max(0, Math.floor(body.products_addon as any))
    : 0;

  const plan = (PLANS as readonly string[]).includes(planRaw) ? (planRaw as any) : null;
  if (!companyId) return NextResponse.json({ error: "company_id is required." }, { status: 400 });
  if (!reason) return NextResponse.json({ error: "reason is required." }, { status: 400 });
  if (!plan) return NextResponse.json({ error: "plan must be starter|growth|enterprise." }, { status: 400 });
  if (!["trialing", "active", "past_due", "canceled"].includes(status)) {
    return NextResponse.json({ error: "status must be trialing|active|past_due|canceled." }, { status: 400 });
  }

  const seatsIncluded = seatsIncludedFor(plan);
  const productsIncluded = productsIncludedFor(plan);
  const ent = getEntitlements(plan);
  const productsMax = ent.productsMax;
  const seatsMax = ent.seatsMax;
  let productsAddonClamped = productsAddon;
  if (productsMax !== null) {
    const maxAddon = Math.max(0, productsMax - productsIncluded);
    productsAddonClamped = Math.min(productsAddon, maxAddon);
  }
  let seatsAddonClamped = seatsAddon;
  if (seatsMax !== null) {
    const maxSeatAddon = Math.max(0, seatsMax - seatsIncluded);
    seatsAddonClamped = Math.min(seatsAddon, maxSeatAddon);
  }

  const { data: before } = await admin
    .from("company_subscriptions")
    .select("company_id,plan,status,seats_included,seats_addon,products_included,products_addon")
    .eq("company_id", companyId)
    .maybeSingle();

  const nextRow = {
    company_id: companyId,
    plan,
    status,
    seats_included: seatsIncluded,
    seats_addon: seatsAddonClamped,
    products_included: productsIncluded,
    products_addon: productsAddonClamped
  };

  const { error } = await admin.from("company_subscriptions").upsert(nextRow);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { data: after } = await admin
    .from("company_subscriptions")
    .select("company_id,plan,status,seats_included,seats_addon,products_included,products_addon")
    .eq("company_id", companyId)
    .maybeSingle();

  await writeOperatorAuditLog({
    admin,
    req,
    operatorUserId: gate.userId,
    action: "company.subscription.set",
    targetType: "company_subscription",
    targetId: companyId,
    before: before ?? null,
    after: after ?? nextRow,
    metadata: { company_id: companyId, reason }
  });

  return NextResponse.json({ ok: true });
}

