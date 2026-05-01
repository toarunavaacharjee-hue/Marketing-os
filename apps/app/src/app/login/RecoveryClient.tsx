"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { AuthShell } from "@/components/marketing/AuthShell";
import { Button, Input, Label, TextLink } from "@/lib/ui";
import { PASSWORD_MIN_LENGTH } from "@/lib/signup/passwordPolicy";

const inputClass =
  "border border-input-border bg-surface text-text placeholder:text-text3 focus:border-primary focus:shadow-focus";

const primaryCta =
  "w-full !bg-amber !text-heading shadow-card hover:!bg-amber-hover disabled:pointer-events-none disabled:opacity-60";

export default function RecoveryClient() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!cancelled) setHasSession(Boolean(session));
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const pwdOk = password.length >= PASSWORD_MIN_LENGTH;
  const matchOk = password === confirm && confirm.length > 0;
  const submitDisabled = busy || !pwdOk || !matchOk || hasSession !== true;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus(null);
    setBusy(true);
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session) {
        setError("This link is no longer valid. Request a new reset email from the login page.");
        setBusy(false);
        return;
      }
      const { error: updErr } = await supabase.auth.updateUser({ password });
      if (updErr) {
        setError(updErr.message);
        setBusy(false);
        return;
      }
      setStatus("Password updated. Redirecting…");
      window.location.href = "/dashboard";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <div className="mx-auto w-full max-w-md">
        <div className="saas-pill mb-4">Password reset</div>
        <h1
          className="text-3xl font-semibold tracking-tight text-heading sm:text-4xl"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Choose a new password
        </h1>
        <p className="mt-2 text-sm text-text2">After using the email link, set a new password to get back into your workspace.</p>

        <div className="saas-card mt-8 p-6 sm:p-8">
          {hasSession === null ? (
            <div className="text-sm text-text2">Checking your session…</div>
          ) : hasSession === false ? (
            <div className="space-y-4 text-sm text-text2">
              <p>
                No active recovery session found. Open the reset link from your email, or go back to{" "}
                <TextLink href="/login">Log in</TextLink>.
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-5" noValidate>
              <div>
                <Label>New password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`${inputClass} pr-24`}
                    required
                    minLength={PASSWORD_MIN_LENGTH}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-[11px] font-semibold text-text3 hover:bg-surface2 hover:text-text"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] text-text3">At least {PASSWORD_MIN_LENGTH} characters.</p>
              </div>

              <div>
                <Label>Confirm new password</Label>
                <div className="relative">
                  <Input
                    type={showConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repeat password"
                    className={`${inputClass} pr-24`}
                    required
                    minLength={PASSWORD_MIN_LENGTH}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-[11px] font-semibold text-text3 hover:bg-surface2 hover:text-text"
                    onClick={() => setShowConfirm((v) => !v)}
                  >
                    {showConfirm ? "Hide" : "Show"}
                  </button>
                </div>
                {confirm.length > 0 && password !== confirm ? (
                  <p className="mt-1.5 text-xs text-red">Passwords do not match.</p>
                ) : null}
              </div>

              {error ? (
                <div className="rounded-lg border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              ) : null}
              {status ? (
                <div className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-text">
                  {status}
                </div>
              ) : null}

              <Button type="submit" disabled={submitDisabled} className={primaryCta} aria-busy={busy}>
                {busy ? "Saving…" : "Update password"}
              </Button>
            </form>
          )}

          <div className="mt-6 border-t border-border pt-6 text-sm text-text2">
            <Link href="/login" className="font-medium text-link hover:underline">
              ← Back to log in
            </Link>
          </div>
        </div>
      </div>
    </AuthShell>
  );
}
