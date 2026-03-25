"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button, Card, Container, Input, Label, TextLink } from "@/lib/ui";

type Plan = "starter" | "growth" | "enterprise" | "free";

function normalizePlan(raw: string | null): Plan {
  const p = (raw ?? "").toLowerCase();
  if (p === "starter" || p === "growth" || p === "enterprise") return p;
  return "starter";
}

export default function SignupPage() {
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const origin =
      typeof window !== "undefined" ? window.location.origin : "";

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
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

    // Free access mode: skip payment and let users in directly.
    setLoading(false);
    router.push("/dashboard/settings");
  }

  return (
    <Container>
      <div className="mx-auto max-w-md">
        <div
          className="mb-2 text-3xl"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Create your account
        </div>
        <div className="mb-6 text-sm text-white/70">
          You selected the <span className="text-white">{plan}</span> plan.
        </div>

        <Card className="p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label>Your name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Arunava"
                required
              />
            </div>
            <div>
              <Label>Company</Label>
              <Input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Marketing OS Inc."
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
                placeholder="Create a strong password"
                required
                minLength={8}
              />
            </div>

            {error ? (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            <Button disabled={loading} className="w-full">
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </form>

          <div className="mt-5 text-sm text-white/70">
            Already have an account? <TextLink href="/login">Log in</TextLink>
          </div>
        </Card>
      </div>
    </Container>
  );
}

