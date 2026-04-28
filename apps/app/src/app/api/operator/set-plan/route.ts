import { NextResponse } from "next/server";
import { getOperatorGate } from "@/lib/platformAdmin";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

export async function POST(req: Request) {
  const gate = await getOperatorGate();
  if (!gate.ok) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  // Deprecated: plan is workspace-scoped and stored in company_subscriptions.
  // This endpoint used to mutate profiles.plan (legacy, per-user).
  return NextResponse.json(
    {
      error:
        "Deprecated endpoint. Plans are workspace-scoped. Use /api/operator/set-company-subscription (company_subscriptions) instead."
    },
    { status: 410 }
  );
}

