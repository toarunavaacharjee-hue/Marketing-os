"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { AuthShell } from "@/components/marketing/AuthShell";
import { Button, Input, Label, TextLink } from "@/lib/ui";

type Plan = "starter" | "growth" | "enterprise" | "free";

function normalizePlan(raw: string | null): Plan {
  const p = (raw ?? "").toLowerCase();
  if (p === "starter" || p === "growth" || p === "enterprise") return p;
  return "starter";
}

const inputClass =
  "border-white/[0.08] bg-[#0c0c12] text-[#f0f0f8] placeholder:text-[#5c6278] focus:border-[#7c6cff]/50 focus:ring-[#7c6cff]/25";

const primaryCta =
  "w-full !bg-[#b8ff6c] !text-[#0a0a0c] shadow-lg shadow-[#b8ff6c]/15 hover:!bg-[#c8ff7c]";

export default function SignupClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const plan = normalizePlan(sp.get("plan"));

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signUpWithOAuth(provider: "google" | "azure") {
    setError(null);
    setLoading(true);
    const origin = typeof window !== "undefined" ? window.location.origin : "";

    const { error: oauthErr } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/dashboard")}`,
        data: { name, company, plan }
      }
    });

    if (oauthErr) {
      setLoading(false);
      setError(oauthErr.message);
      return;
    }
    // Redirect handled by Supabase.
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const origin = typeof window !== "undefined" ? window.location.origin : "";

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/dashboard")}`,
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
      await supabase.from("profiles").upsert({
        id: userId,
        name,
        company,
        plan,
        ai_queries_used: 0
      });
    }

    setLoading(false);
    // Email confirmation is required before /dashboard. Onboarding starts after they verify.
    router.push(`/verify-email?email=${encodeURIComponent(email)}`);
  }

  return (
    <AuthShell>
      <div className="mx-auto w-full max-w-md">
        <div className="saas-pill mb-4">Get started</div>
        <h1
          className="text-3xl font-semibold tracking-tight text-[#fafafc] sm:text-4xl"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Create your account
        </h1>
        <p className="mt-2 text-sm text-[#9090b0]">
          You&apos;re on the <span className="font-semibold text-[#c4b8ff]">{plan}</span> plan. Set up your workspace in
          minutes.
        </p>

        <div className="saas-card mt-8 p-6 sm:p-8">
          <div className="space-y-3">
            <Button
              type="button"
              variant="secondary"
              disabled={loading}
              className="w-full"
              onClick={() => void signUpWithOAuth("google")}
            >
              Continue with Google
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={loading}
              className="w-full"
              onClick={() => void signUpWithOAuth("azure")}
            >
              Continue with Microsoft
            </Button>
          </div>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/[0.06]" />
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[#9090b0]">or</div>
            <div className="h-px flex-1 bg-white/[0.06]" />
          </div>

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
            Already have an account? <TextLink href="/login">Log in</TextLink>
          </div>
        </div>
      </div>
    </AuthShell>
  );
}
