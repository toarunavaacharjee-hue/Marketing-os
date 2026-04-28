"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { AuthShell } from "@/components/marketing/AuthShell";
import { Button, TextLink } from "@/lib/ui";

const primaryCta =
  "w-full !bg-[#b8ff6c] !text-[#0a0a0c] shadow-lg shadow-[#b8ff6c]/15 hover:!bg-[#c8ff7c]";

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
      <div className="mx-auto w-full max-w-md">
        <div className="saas-pill mb-4">Verify your email</div>
        <h1
          className="text-3xl font-semibold tracking-tight text-[#fafafc] sm:text-4xl"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Check your inbox
        </h1>
        <p className="mt-2 text-sm text-[#9090b0]">
          We sent a confirmation link to finish setting up your account. You need to verify before you can open the
          dashboard.
        </p>

        <div className="saas-card mt-8 space-y-5 p-6 sm:p-8">
          {hasSession ? (
            <p className="text-sm text-[#c4c4d8]">
              Signed in as <span className="font-mono text-[#f0f0f8]">{initialEmail || email}</span>
            </p>
          ) : (
            <p className="text-sm text-[#9090b0]">
              If you closed the tab before confirming, enter your email below to resend the link.
            </p>
          )}

          {!hasSession ? (
            <div>
              <label className="mb-1 block text-xs text-[#9090b0]">Email</label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full rounded-xl border border-white/[0.08] bg-[#0c0c12] px-3 py-2 text-sm text-[#f0f0f8] placeholder:text-[#5c6278] focus:border-[#7c6cff]/50 focus:outline-none focus:ring-2 focus:ring-[#7c6cff]/25"
              />
            </div>
          ) : null}

          {error ? (
            <div className="rounded-lg border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}
          {status ? (
            <div className="rounded-lg border border-[#7c6cff]/30 bg-[#7c6cff]/10 px-4 py-3 text-sm text-[#e8e4ff]">
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
                  className="text-center text-sm text-[#9090b0] underline-offset-4 hover:text-[#f0f0f8] hover:underline"
                >
                  Sign out
                </button>
              </>
            ) : (
              <div className="text-center text-sm text-[#9090b0]">
                Already verified? <TextLink href={`/login?next=${encodeURIComponent(next)}`}>Log in</TextLink>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-[#6c7088]">
            Wrong inbox? Use resend, or sign out and sign up again with the correct email.
          </p>
        </div>
      </div>
    </AuthShell>
  );
}