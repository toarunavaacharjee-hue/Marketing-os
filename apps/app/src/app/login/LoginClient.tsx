"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { AuthShell } from "@/components/marketing/AuthShell";
import { Button, Input, Label, TextLink } from "@/lib/ui";
import { isValidEmail } from "@/lib/signup/passwordPolicy";
import { sanitizeAppNextPath } from "@/lib/auth/safeRedirect";

const inputClass =
  "border border-input-border bg-surface text-text placeholder:text-text3 focus:border-primary focus:shadow-focus";

const primaryCta =
  "w-full !bg-amber !text-heading shadow-card hover:!bg-amber-hover disabled:pointer-events-none disabled:opacity-60";

const FORGOT_COOLDOWN_MS = 60_000;

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = sanitizeAppNextPath(searchParams.get("next"), "/dashboard");

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetStatus, setResetStatus] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [, bumpCooldownUi] = useState(0);

  useEffect(() => {
    if (!cooldownUntil || Date.now() >= cooldownUntil) return;
    const id = window.setInterval(() => bumpCooldownUi((n) => n + 1), 1000);
    const stop = window.setTimeout(() => {
      window.clearInterval(id);
      bumpCooldownUi((n) => n + 1);
    }, Math.max(0, cooldownUntil - Date.now()));
    return () => {
      window.clearInterval(id);
      window.clearTimeout(stop);
    };
  }, [cooldownUntil]);

  const emailTrim = email.trim();
  const emailOk = emailTrim.length === 0 || isValidEmail(emailTrim);
  const canSubmit = Boolean(emailTrim && isValidEmail(emailTrim) && password.length > 0 && !loading);

  const cooldownLeftSec = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isValidEmail(emailTrim)) {
      setEmailError("Enter a valid email address.");
      return;
    }
    setLoading(true);

    const { error: signErr } = await supabase.auth.signInWithPassword({
      email: emailTrim,
      password
    });

    if (signErr) {
      setLoading(false);
      setError(signErr.message);
      return;
    }

    const {
      data: { user }
    } = await supabase.auth.getUser();
    setLoading(false);

    if (user?.email && !user.email_confirmed_at) {
      router.push(`/verify-email?email=${encodeURIComponent(user.email)}&next=${encodeURIComponent(next)}`);
      return;
    }

    window.location.href = next;
  }

  async function sendReset() {
    setResetError(null);
    setResetStatus(null);
    const t = email.trim();
    if (!isValidEmail(t)) {
      setResetError("Enter a valid email address above, then send the reset link.");
      return;
    }
    if (Date.now() < cooldownUntil) return;

    setResetBusy(true);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const nextPath = "/login/recovery";
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(t, {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`
    });
    setResetBusy(false);

    if (resetErr) {
      setResetError(resetErr.message);
      return;
    }

    setResetStatus("If an account exists for that email, you will receive a reset link shortly.");
    setCooldownUntil(Date.now() + FORGOT_COOLDOWN_MS);
  }

  return (
    <AuthShell>
      <div className="relative z-10 mx-auto w-full max-w-md">
        <div className="saas-pill mb-4">Welcome back</div>
        <h1
          className="text-3xl font-semibold tracking-tight text-heading sm:text-4xl"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Log in
        </h1>
        <p className="mt-2 text-sm text-text2">Sign in to your workspace to continue.</p>

        <div className="saas-card mt-8 p-6 sm:p-8">
          <form onSubmit={onSubmit} className="space-y-5" noValidate>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(undefined);
                }}
                onBlur={() => {
                  const t = email.trim();
                  if (t && !isValidEmail(t)) setEmailError("Enter a valid email address.");
                }}
                placeholder="you@company.com"
                className={`${inputClass} ${emailError || (!emailOk && emailTrim.length > 0) ? "border-red-500/50" : ""}`}
                required
              />
              {emailError ? <p className="mt-1.5 text-xs text-red">{emailError}</p> : null}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <Label>Password</Label>
                <button
                  type="button"
                  className="text-[11px] font-semibold text-link hover:underline"
                  onClick={() => setForgotOpen((v) => !v)}
                >
                  {forgotOpen ? "Hide" : "Forgot password?"}
                </button>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`${inputClass} pr-24`}
                  required
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-[11px] font-semibold text-text3 hover:bg-surface2 hover:text-text"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {forgotOpen ? (
              <div className="rounded-xl border border-border bg-surface2/60 px-4 py-3 text-sm text-text2">
                <p className="text-[13px] leading-relaxed">
                  We&apos;ll email you a link to reset your password. Use the email you sign in with above.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={resetBusy || cooldownLeftSec > 0}
                    onClick={() => void sendReset()}
                  >
                    {resetBusy ? "Sending…" : cooldownLeftSec > 0 ? `Resend in ${cooldownLeftSec}s` : "Email reset link"}
                  </Button>
                </div>
                {resetError ? (
                  <p className="mt-2 text-xs text-red">{resetError}</p>
                ) : null}
                {resetStatus ? (
                  <p className="mt-2 text-xs text-text">{resetStatus}</p>
                ) : null}
              </div>
            ) : null}

            {error ? (
              <div className="rounded-lg border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            <Button type="submit" disabled={!canSubmit} className={primaryCta} aria-busy={loading}>
              {loading ? "Logging in…" : "Log in"}
            </Button>
          </form>

          <div className="mt-6 border-t border-border pt-6 text-sm text-text2">
            Don&apos;t have an account? <TextLink href={`/signup?next=${encodeURIComponent(next)}`}>Create one</TextLink>
          </div>
        </div>
      </div>
    </AuthShell>
  );
}
