"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { AuthShell } from "@/components/marketing/AuthShell";
import { Button, Input, Label, TextLink } from "@/lib/ui";
import { listPriceForWorkspacePlan } from "@/lib/marketingPricing";
import { legalPrivacyUrl, legalTermsUrl, marketingSiteBase } from "@/lib/marketingUrls";
import {
  evaluatePassword,
  isValidEmail,
  PASSWORD_MIN_LENGTH,
  type PasswordChecklist
} from "@/lib/signup/passwordPolicy";

type Plan = "starter" | "growth" | "enterprise" | "free";

function normalizePlan(raw: string | null): Plan {
  const p = (raw ?? "").toLowerCase();
  if (p === "starter" || p === "growth" || p === "enterprise") return p;
  return "starter";
}

const inputClass =
  "border border-input-border bg-surface text-text placeholder:text-text3 focus:border-primary focus:shadow-focus";

const primaryCta =
  "w-full !bg-amber !text-heading shadow-card hover:!bg-amber-hover disabled:pointer-events-none disabled:opacity-60";

function checklistLabel(key: keyof PasswordChecklist): string {
  switch (key) {
    case "minLen":
      return `At least ${PASSWORD_MIN_LENGTH} characters`;
    case "upper":
      return "One uppercase letter";
    case "lower":
      return "One lowercase letter";
    case "digit":
      return "One number";
    case "symbol":
      return "One symbol";
    default:
      return "";
  }
}

function StrengthMeter({ strength }: { strength: "weak" | "fair" | "good" | "strong" }) {
  const idx = strength === "weak" ? 1 : strength === "fair" ? 2 : strength === "good" ? 3 : 4;
  const label =
    strength === "weak"
      ? "Weak"
      : strength === "fair"
        ? "Fair"
        : strength === "good"
          ? "Good"
          : "Strong";
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((n) => (
          <span
            key={n}
            className={`h-1 flex-1 rounded-full ${n <= idx ? "bg-primary" : "bg-white/[0.08]"}`}
          />
        ))}
      </div>
      <div className="text-[11px] text-[#9090b0]">
        Strength: <span className="font-medium text-[#e8e4ff]">{label}</span>
      </div>
    </div>
  );
}

export default function SignupEnhanced() {
  const router = useRouter();
  const sp = useSearchParams();
  const plan = normalizePlan(sp.get("plan"));
  const next = sp.get("next") ?? "/dashboard";
  const pricingHref = `${marketingSiteBase()}/pricing`;

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const signupListPrices = useMemo(() => listPriceForWorkspacePlan(plan), [plan]);

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [hpWebsite, setHpWebsite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    company?: string;
    email?: string;
    password?: string;
    confirm?: string;
    terms?: string;
  }>({});
  const [loading, setLoading] = useState(false);

  const pwdEval = useMemo(() => evaluatePassword(password), [password]);

  function validateForm(): boolean {
    const nextErrors: typeof fieldErrors = {};
    const tName = name.trim();
    const tCompany = company.trim();
    const tEmail = email.trim();

    if (!tName) nextErrors.name = "Enter your name.";
    if (!tCompany) nextErrors.company = "Enter your company.";

    if (!tEmail) nextErrors.email = "Email is required.";
    else if (!isValidEmail(tEmail)) nextErrors.email = "Enter a valid email address.";

    if (!pwdEval.meetsBaseline) {
      nextErrors.password = "Choose a stronger password (see checklist).";
    }
    if (confirmPassword !== password) {
      nextErrors.confirm = "Passwords do not match.";
    }
    if (!acceptedTerms) {
      nextErrors.terms = "Accept the Terms and Privacy Policy to continue.";
    }

    setFieldErrors(nextErrors);
    return (
      Boolean(tName && tCompany && tEmail && isValidEmail(tEmail)) &&
      pwdEval.meetsBaseline &&
      confirmPassword === password &&
      acceptedTerms &&
      Object.keys(nextErrors).length === 0
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (hpWebsite.trim()) {
      setLoading(true);
      await new Promise((r) => setTimeout(r, 900));
      setLoading(false);
      router.push(`/verify-email?email=${encodeURIComponent(email.trim())}&next=${encodeURIComponent(next)}`);
      return;
    }

    if (!validateForm()) {
      setError("Fix the highlighted fields and try again.");
      return;
    }

    setLoading(true);

    const origin = typeof window !== "undefined" ? window.location.origin : "";

    try {
      const { data, error: signErr } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
          data: { name: name.trim(), company: company.trim(), plan }
        }
      });

      if (signErr) {
        setLoading(false);
        setError(signErr.message);
        return;
      }

      const userId = data.user?.id;
      if (userId) {
        await supabase.from("profiles").upsert({
          id: userId,
          name: name.trim(),
          company: company.trim(),
          plan,
          ai_queries_used: 0
        });
      }

      setLoading(false);

      if (data.session && data.user?.email_confirmed_at) {
        window.location.href = next;
        return;
      }

      router.push(`/verify-email?email=${encodeURIComponent(email.trim())}&next=${encodeURIComponent(next)}`);
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "Sign up failed.");
    }
  }

  const submitDisabled =
    loading ||
    !name.trim() ||
    !company.trim() ||
    !email.trim() ||
    !password ||
    !confirmPassword ||
    !acceptedTerms ||
    !pwdEval.meetsBaseline ||
    confirmPassword !== password;

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
            on annual billing). See{" "}
            <a href={pricingHref} className="font-medium text-link hover:underline" target="_blank" rel="noreferrer">
              pricing
            </a>
            .
          </p>
        ) : null}

        <div className="saas-card mt-8 p-6 sm:p-8">
          <form onSubmit={onSubmit} className="relative space-y-5" noValidate>
            <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0" aria-hidden="true">
              <label htmlFor="signup-hp-website">Company website</label>
              <input
                id="signup-hp-website"
                tabIndex={-1}
                autoComplete="off"
                value={hpWebsite}
                onChange={(e) => setHpWebsite(e.target.value)}
              />
            </div>

            <div>
              <Label>Your name</Label>
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (fieldErrors.name) setFieldErrors((f) => ({ ...f, name: undefined }));
                }}
                placeholder="Jordan Chen"
                className={`${inputClass} ${fieldErrors.name ? "border-red-500/50" : ""}`}
                required
                autoComplete="name"
              />
              {fieldErrors.name ? <p className="mt-1.5 text-xs text-red-300">{fieldErrors.name}</p> : null}
            </div>
            <div>
              <Label>Company</Label>
              <Input
                value={company}
                onChange={(e) => {
                  setCompany(e.target.value);
                  if (fieldErrors.company) setFieldErrors((f) => ({ ...f, company: undefined }));
                }}
                placeholder="Acme Inc."
                className={`${inputClass} ${fieldErrors.company ? "border-red-500/50" : ""}`}
                required
                autoComplete="organization"
              />
              {fieldErrors.company ? <p className="mt-1.5 text-xs text-red-300">{fieldErrors.company}</p> : null}
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors((f) => ({ ...f, email: undefined }));
                }}
                onBlur={() => {
                  const t = email.trim();
                  if (t && !isValidEmail(t)) setFieldErrors((f) => ({ ...f, email: "Enter a valid email address." }));
                }}
                placeholder="you@company.com"
                className={`${inputClass} ${fieldErrors.email ? "border-red-500/50 focus:border-red-500/60" : ""}`}
                required
              />
              {fieldErrors.email ? (
                <p className="mt-1.5 text-xs text-red-300">{fieldErrors.email}</p>
              ) : null}
            </div>

            <div>
              <Label>Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((f) => ({ ...f, password: undefined }));
                  }}
                  placeholder="••••••••"
                  className={`${inputClass} pr-24 ${fieldErrors.password ? "border-red-500/50" : ""}`}
                  required
                  minLength={PASSWORD_MIN_LENGTH}
                  aria-invalid={Boolean(fieldErrors.password)}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-[11px] font-semibold text-[#9090b0] hover:bg-white/[0.06] hover:text-[#f0f0f8]"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-[#9090b0]">
                Use at least {PASSWORD_MIN_LENGTH} characters with uppercase, lowercase, a number, and a symbol.
              </p>
              <StrengthMeter strength={pwdEval.strength} />
              <ul className="mt-3 grid gap-1.5 text-[11px] text-[#a8a8bc]">
                {(Object.keys(pwdEval.checklist) as (keyof PasswordChecklist)[]).map((key) => (
                  <li key={key} className="flex items-center gap-2">
                    <span
                      className={`inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border text-[9px] ${
                        pwdEval.checklist[key]
                          ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-200"
                          : "border-white/[0.12] bg-white/[0.03] text-[#6c7088]"
                      }`}
                    >
                      {pwdEval.checklist[key] ? "✓" : ""}
                    </span>
                    <span>{checklistLabel(key)}</span>
                  </li>
                ))}
              </ul>
              {fieldErrors.password ? (
                <p className="mt-2 text-xs text-red-300">{fieldErrors.password}</p>
              ) : null}
            </div>

            <div>
              <Label>Confirm password</Label>
              <div className="relative">
                <Input
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirm) setFieldErrors((f) => ({ ...f, confirm: undefined }));
                  }}
                  placeholder="Repeat password"
                  className={`${inputClass} pr-24 ${fieldErrors.confirm ? "border-red-500/50" : ""}`}
                  required
                  minLength={PASSWORD_MIN_LENGTH}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-[11px] font-semibold text-[#9090b0] hover:bg-white/[0.06] hover:text-[#f0f0f8]"
                  onClick={() => setShowConfirm((v) => !v)}
                >
                  {showConfirm ? "Hide" : "Show"}
                </button>
              </div>
              {fieldErrors.confirm ? (
                <p className="mt-1.5 text-xs text-red-300">{fieldErrors.confirm}</p>
              ) : null}
            </div>

            <label className="flex cursor-pointer items-start gap-3 text-[13px] leading-snug text-[#c4c4d8]">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => {
                  setAcceptedTerms(e.target.checked);
                  if (fieldErrors.terms) setFieldErrors((f) => ({ ...f, terms: undefined }));
                }}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border border-white/[0.15] bg-[#0c0c12] text-primary focus:ring-primary"
              />
              <span>
                I agree to the{" "}
                <a
                  href={legalTermsUrl()}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-link underline-offset-4 hover:underline"
                >
                  Terms
                </a>{" "}
                and{" "}
                <a
                  href={legalPrivacyUrl()}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-link underline-offset-4 hover:underline"
                >
                  Privacy Policy
                </a>
                .
              </span>
            </label>
            {fieldErrors.terms ? <p className="text-xs text-red-300">{fieldErrors.terms}</p> : null}

            {error ? (
              <div className="rounded-lg border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            <Button type="submit" disabled={submitDisabled} className={primaryCta} aria-busy={loading}>
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
