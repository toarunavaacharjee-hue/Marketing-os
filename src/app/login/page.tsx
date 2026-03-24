"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button, Card, Container, Input, Label, TextLink } from "@/lib/ui";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard/settings";

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

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push(next);
  }

  return (
    <Container>
      <div className="mx-auto max-w-md">
        <div
          className="mb-6 text-3xl"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Log in
        </div>

        <Card className="p-6">
          <form onSubmit={onSubmit} className="space-y-4">
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
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {error ? (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            <Button disabled={loading} className="w-full">
              {loading ? "Logging in..." : "Log in"}
            </Button>
          </form>

          <div className="mt-5 text-sm text-white/70">
            Don&apos;t have an account?{" "}
            <TextLink href="/signup">Create one</TextLink>
          </div>
        </Card>
      </div>
    </Container>
  );
}

