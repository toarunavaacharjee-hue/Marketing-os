"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { AuthShell } from "@/components/marketing/AuthShell";
import { Button, TextLink } from "@/lib/ui";

const primaryCta =
  "w-full !bg-amber !text-heading shadow-card hover:!bg-amber-hover disabled:pointer-events-none disabled:opacity-60";

const inputClass =
  "w-full rounded-lg border border-input-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text3 transition-[border-color,box-shadow] focus:border-primary focus:outline-none focus:shadow-focus";

type Props = {
  initialEmail: string;
  hasSession: boolean;
  next: string;
};

export function VerifyEmailClient({ initialEmail, hasSession, next }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [email, setEmail] = useState(initialEmail);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function resend() {
    setError(null);
    setStatus(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter the email you used to sign up.");
      return;
    }
    setBusy(true);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { error: resendErr } = await supabase.auth.resend({
      type: "signup",
      email: trimmed,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`
      }
    });
    setBusy(false);
    if (resendErr) {
      setError(resendErr.message);
      return;
    }
    setStatus("Verification email sent. Check your inbox (and spam).");
  }

  async function signOut() {
    setBusy(true);
    await supabase.auth.signOut();
    router.push(`/login?next=${encodeURIComponent(next)}`);
  }

  async function refreshAndContinue() {
    setBusy(true);
    setError(null);
    const {
      data: { user }
    } = await supabase.auth.getUser();
    setBusy(false);
    if (user?.email_confirmed_at) {
      window.location.href = next;
      return;
    }
    setError("Not verified yet. Open the link in your email, then try again.");
  }

  return (
    <AuthShell>
      <div className="relative z-10 mx-auto w-full max-w-md">
        <div className="saas-pill mb-4">Verify your email</div>
        <h1
          className="text-3xl font-semibold tracking-tight text-heading sm:text-4xl"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Check your inbox
        </h1>
        <p className="mt-2 text-sm text-text2">
          We sent a confirmation link to finish setting up your account. You need to verify before you can open the
          dashboard.
        </p>

        <div className="saas-card mt-8 space-y-5 p-6 sm:p-8">
          {hasSession ? (
            <p className="text-sm text-text2">
              Signed in as <span className="font-mono text-text">{initialEmail || email}</span>
            </p>
          ) : (
            <p className="text-sm text-text2">
              If you closed the tab before confirming, enter your email below to resend the link.
            </p>
          )}

          {!hasSession ? (
            <div>
              <label className="mb-1 block text-xs font-semibold text-text2">Email</label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className={inputClass}
              />
            </div>
          ) : null}

          {error ? (
            <div className="rounded-lg border border-red/30 bg-red/10 px-4 py-3 text-sm text-red">{error}</div>
          ) : null}
          {status ? (
            <div className="rounded-lg border border-primary/25 bg-primary-light/40 px-4 py-3 text-sm text-primary-dark">
              {status}
            </div>
          ) : null}

          <div className="flex flex-col gap-3">
            <Button type="button" disabled={busy} className={primaryCta} onClick={() => void resend()}>
              {busy ? "Sending..." : "Resend verification email"}
            </Button>
            {hasSession ? (
              <>
                <Button
                  type="button"
                  disabled={busy}
                  variant="secondary"
                  className="w-full"
                  onClick={() => void refreshAndContinue()}
                >
                  I&apos;ve verified - continue
                </Button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void signOut()}
                  className="text-center text-sm text-text2 underline-offset-4 hover:text-text hover:underline"
                >
                  Sign out
                </button>
              </>
            ) : (
              <div className="text-center text-sm text-text2">
                Already verified? <TextLink href={`/login?next=${encodeURIComponent(next)}`}>Log in</TextLink>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-text3">
            Wrong inbox? Use resend, or sign out and sign up again with the correct email.
          </p>
        </div>
      </div>
    </AuthShell>
  );
}
