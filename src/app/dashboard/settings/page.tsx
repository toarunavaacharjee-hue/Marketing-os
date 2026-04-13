import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { ManageBillingButton } from "@/app/dashboard/settings/ManageBillingButton";
import SettingsClient from "@/app/dashboard/settings/SettingsClient";
import { TENANT_COOKIE } from "@/lib/tenant";
import { getEntitlements } from "@/lib/planEntitlements";
import { listPriceForWorkspacePlan } from "@/lib/marketingPricing";

type Profile = {
  id: string;
  name: string | null;
  company: string | null;
  plan: string | null;
  ai_queries_used: number | null;
  is_platform_admin?: boolean | null;
};

export default async function SettingsPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const companyId = cookieStore.get(TENANT_COOKIE.companyId)?.value ?? null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,name,company,plan,ai_queries_used,is_platform_admin")
    .eq("id", user.id)
    .single();

  const p = (profile ?? null) as Profile | null;

  const { data: subscription } = companyId
    ? await supabase
        .from("company_subscriptions")
        .select("plan,status")
        .eq("company_id", companyId)
        .maybeSingle()
    : { data: null as any };

  const plan = (subscription as any)?.plan ?? p?.plan ?? "free";
  const status = (subscription as any)?.status ?? null;
  const ent = getEntitlements(plan);
  const listPrices = listPriceForWorkspacePlan(plan);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-text2">
            <Link href="/dashboard" className="text-accent hover:underline">
              ← Command Centre
            </Link>
            <span className="text-text3">|</span>
            <span>
              Workspace setup for the <span className="text-text">selected product</span> in the header
              switcher
            </span>
          </div>
          <div className="mt-2 text-3xl sm:text-4xl" style={{ fontFamily: "var(--font-heading)" }}>
            Settings
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text2">
            <span>
              Signed in as <span className="text-text">{user.email}</span>
            </span>
            {p?.is_platform_admin ? (
              <Link
                href="/operator"
                className="text-xs font-medium text-accent hover:underline"
              >
                Operator console
              </Link>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text2 shadow-sm">
            Plan: <span className="text-text">{plan}</span>
            {status ? (
              <>
                {" "}
                • Status: <span className="text-text">{String(status)}</span>
              </>
            ) : null}{" "}
            • AI used:{" "}
            <span className="text-text">{p?.ai_queries_used ?? 0}</span>
          </div>
          <ManageBillingButton />
          <form action="/logout" method="post">
            <button className="rounded-xl border border-border bg-surface2 px-3 py-2 text-sm text-text hover:bg-surface3">
              Log out
            </button>
          </form>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-text">Plan &amp; limits (this workspace)</div>
            <p className="mt-2 text-sm text-text2">
              Entitlements follow <span className="text-text">{ent.plan}</span> on{" "}
              <code className="rounded bg-surface2 px-1 py-0.5 text-xs text-text">company_subscriptions</code> when a
              workspace is selected; otherwise your profile plan is shown.
            </p>
            <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-text2">
              <li>
                Seats (members + pending invites):{" "}
                <span className="text-text">{ent.seatsMax === null ? "Unlimited" : ent.seatsMax}</span>
              </li>
              <li>
                Products:{" "}
                <span className="text-text">{ent.productsMax === null ? "Unlimited" : ent.productsMax}</span>
              </li>
              <li>
                AI runs / month:{" "}
                <span className="text-text">
                  {ent.aiQueriesPerMonth === null ? "Unlimited" : ent.aiQueriesPerMonth}
                </span>
              </li>
              <li>
                Support:{" "}
                <span className="text-text">
                  {ent.supportTier === "dedicated"
                    ? "Dedicated onboarding"
                    : ent.supportTier === "priority"
                      ? "Priority"
                      : "Standard"}
                </span>
              </li>
            </ul>
          </div>
          <div className="min-w-[200px] rounded-xl border border-border bg-surface2 p-4 text-sm text-text2">
            <div className="font-medium text-text">Published list prices</div>
            {listPrices ? (
              <ul className="mt-2 space-y-1">
                <li>
                  Monthly: <span className="text-text">${listPrices.monthly}</span>/mo
                </li>
                <li>
                  Annual (effective): <span className="text-text">${listPrices.annualMonthlyEquivalent}</span>/mo
                </li>
              </ul>
            ) : (
              <p className="mt-2">No list price mapping for this plan label.</p>
            )}
            <Link href="/pricing" className="mt-3 inline-block text-xs font-medium text-accent hover:underline">
              View pricing page →
            </Link>
          </div>
        </div>
      </div>

      <SettingsClient
        initialName={p?.name ?? ""}
        initialCompany={p?.company ?? ""}
        email={user.email ?? ""}
      />

      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="text-sm font-medium text-text">Module settings</div>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          <Link
            href="/dashboard/settings/team"
            className="rounded-xl border border-border bg-surface2 px-4 py-3 text-sm text-text hover:bg-surface3"
          >
            Team & roles → members, permissions, governance
          </Link>
          <Link
            href="/dashboard/support"
            className="rounded-xl border border-border bg-surface2 px-4 py-3 text-sm text-text hover:bg-surface3"
          >
            Support → submit tickets (tier-aware)
          </Link>
          <Link
            href="/dashboard/settings/product"
            className="rounded-xl border border-border bg-surface2 px-4 py-3 text-sm text-text hover:bg-surface3"
          >
            Product profile → base product + competitors
          </Link>
          <Link
            href="/dashboard/settings/learning"
            className="rounded-xl border border-border bg-surface2 px-4 py-3 text-sm text-text hover:bg-surface3"
          >
            Learning & health → sync status + coverage
          </Link>
          <Link
            href="/dashboard/settings/integrations"
            className="rounded-xl border border-border bg-surface2 px-4 py-3 text-sm text-text hover:bg-surface3"
          >
            Integrations → GA4 / HubSpot / LinkedIn / Meta
          </Link>
          <Link
            href="/dashboard/settings/segments"
            className="rounded-xl border border-border bg-surface2 px-4 py-3 text-sm text-text hover:bg-surface3"
          >
            Segments → configure ICP segments
          </Link>
          <Link
            href="/dashboard/settings/analytics"
            className="rounded-xl border border-border bg-surface2 px-4 py-3 text-sm text-text hover:bg-surface3"
          >
            Analytics → configure GA4/LinkedIn/Meta placeholders
          </Link>
        </div>
      </div>
    </div>
  );
}

