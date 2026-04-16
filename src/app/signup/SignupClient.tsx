"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { AuthShell } from "@/components/marketing/AuthShell";
import { Button, Input, Label, TextLink } from "@/lib/ui";
import { listPriceForWorkspacePlan } from "@/lib/marketingPricing";

type Plan = "starter" | "growth" | "enterprise" | "free";

function normalizePlan(raw: string | null): Plan {
  const p = (raw ?? "").toLowerCase();
  if (p === "starter" || p === "growth" || p === "enterprise") return p;
  return "starter";
}

const inputClass =
  "border border-input-border bg-surface text-text placeholder:text-text3 focus:border-primary focus:shadow-focus";

const primaryCta =
  "w-full !bg-amber !text-heading shadow-card hover:!bg-amber-hover";

export default function SignupClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const plan = normalizePlan(sp.get("plan"));
  const next = sp.get("next") ?? "/dashboard";

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const signupListPrices = useMemo(() => listPriceForWorkspacePlan(plan), [plan]);

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const origin = typeof window !== "undefined" ? window.location.origin : "";

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
          data: { name, company, plan }
        }
      });

      if (error) {
        setLoading(false);
        setError(error.message);
        return;
      }

      const userId = data.user?.id;
      if (userId) {
        // Best-effort: onboarding/create will also bootstrap missing profile rows.
        await supabase.from("profiles").upsert({
          id: userId,
          name,
          company,
          plan,
          ai_queries_used: 0
        });
      }

      setLoading(false);

      // If email confirmations are disabled, Supabase can immediately create a session.
      // In that case, go straight into the app with a full navigation so server components see cookies.
      if (data.session && data.user?.email_confirmed_at) {
        window.location.href = next;
        return;
      }

      // Email confirmation is required before /dashboard.
      router.push(`/verify-email?email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`);
    } catch (e) {
      setLoading(false);
      setError(e instanceof Error ? e.message : "Sign up failed.");
    }
  }

  return (
    <AuthShell>
      <div className="mx-auto w-full max-w-md">
        <div className="saas-pill mb-4">Get started</div>
        <h1
          className="text-3xl font-semibold tracking-tight text-heading sm:text-4xl"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Create your account
        </h1>
        <p className="mt-2 text-sm text-text2">
          You&apos;re on the <span className="font-semibold text-primary">{plan}</span> plan. Set up your workspace in
          minutes.
        </p>
        {signupListPrices ? (
          <p className="mt-2 text-xs leading-relaxed text-[#9090b0]">
            When billing ships, published monthly list for this path is{" "}
            <span className="font-medium text-[#f0f0f8]">${signupListPrices.monthly}/mo</span> (
            <span className="font-medium text-[#f0f0f8]">${signupListPrices.annualMonthlyEquivalent}/mo</span> effective
            on annual billing). See <TextLink href="/pricing">pricing</TextLink>.
          </p>
        ) : null}

        <div className="saas-card mt-8 p-6 sm:p-8">
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <Label>Your name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jordan Chen"
                className={inputClass}
                required
              />
            </div>
            <div>
              <Label>Company</Label>
              <Input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Acme Inc."
                className={inputClass}
                required
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className={inputClass}
                required
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={inputClass}
                required
                minLength={8}
              />
            </div>

            {error ? (
              <div className="rounded-lg border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            <Button disabled={loading} className={primaryCta}>
              {loading ? "Creating account…" : "Create account"}
            </Button>
          </form>

          <div className="mt-6 border-t border-white/[0.06] pt-6 text-sm text-[#9090b0]">
            Already have an account? <TextLink href={`/login?next=${encodeURIComponent(next)}`}>Log in</TextLink>
          </div>
        </div>
      </div>
    </AuthShell>
  );
}
