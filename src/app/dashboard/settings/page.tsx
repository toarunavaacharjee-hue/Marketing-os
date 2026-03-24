import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card, Container } from "@/lib/ui";
import { ManageBillingButton } from "@/app/dashboard/settings/ManageBillingButton";

type Profile = {
  id: string;
  name: string | null;
  company: string | null;
  plan: string | null;
  ai_queries_used: number | null;
};

export default async function SettingsPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,name,company,plan,ai_queries_used")
    .eq("id", user.id)
    .single();

  const p = (profile ?? null) as Profile | null;
  const plan = p?.plan ?? "free";

  return (
    <Container>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="text-4xl" style={{ fontFamily: "var(--font-heading)" }}>
            Settings
          </div>
          <div className="mt-2 text-sm text-white/70">
            Signed in as <span className="text-white">{user.email}</span>
          </div>
        </div>
        <Link
          href="/pricing"
          className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-medium text-white hover:bg-white/15"
        >
          See pricing
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <div className="text-sm text-white/70">Current plan</div>
          <div className="mt-2 text-2xl" style={{ fontFamily: "var(--font-heading)" }}>
            {plan}
          </div>

          <div className="mt-4 text-sm text-white/70">
            AI queries used: <span className="text-white">{p?.ai_queries_used ?? 0}</span>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/pricing"
              className="rounded-xl bg-cta px-4 py-3 text-sm font-medium text-black"
            >
              Upgrade
            </Link>

            <ManageBillingButton />
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-sm text-white/70">Profile</div>
          <div className="mt-3 space-y-1 text-sm text-white/75">
            <div>
              Name: <span className="text-white">{p?.name ?? "—"}</span>
            </div>
            <div>
              Company: <span className="text-white">{p?.company ?? "—"}</span>
            </div>
          </div>
        </Card>
      </div>
    </Container>
  );
}

