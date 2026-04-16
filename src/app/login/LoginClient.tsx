"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { AuthShell } from "@/components/marketing/AuthShell";
import { Button, Input, Label, TextLink } from "@/lib/ui";

const inputClass =
  "border-white/[0.08] bg-[#0c0c12] text-[#f0f0f8] placeholder:text-[#5c6278] focus:border-[#7c6cff]/50 focus:ring-[#7c6cff]/25";

const primaryCta =
  "w-full !bg-[#b8ff6c] !text-[#0a0a0c] shadow-lg shadow-[#b8ff6c]/15 hover:!bg-[#c8ff7c]";

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }

    const {
      data: { user }
    } = await supabase.auth.getUser();
    setLoading(false);

    if (user?.email && !user.email_confirmed_at) {
      router.push(`/verify-email?email=${encodeURIComponent(user.email)}`);
      return;
    }

    // Use a full navigation so server components/middleware see the fresh auth cookies immediately.
    window.location.href = next;
  }

  return (
    <AuthShell>
      <div className="mx-auto w-full max-w-md">
        <div className="saas-pill mb-4">Welcome back</div>
        <h1
          className="text-3xl font-semibold tracking-tight text-[#fafafc] sm:text-4xl"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Log in
        </h1>
        <p className="mt-2 text-sm text-[#9090b0]">Sign in to your workspace to continue.</p>

        <div className="saas-card mt-8 p-6 sm:p-8">
          <form onSubmit={onSubmit} className="space-y-5">
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
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={inputClass}
                required
              />
            </div>

            {error ? (
              <div className="rounded-lg border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            <Button disabled={loading} className={primaryCta}>
              {loading ? "Logging in…" : "Log in"}
            </Button>
          </form>

          <div className="mt-6 border-t border-white/[0.06] pt-6 text-sm text-[#9090b0]">
            Don&apos;t have an account? <TextLink href={`/signup?next=${encodeURIComponent(next)}`}>Create one</TextLink>
          </div>
        </div>
      </div>
    </AuthShell>
  );
}
