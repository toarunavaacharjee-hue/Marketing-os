"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { AuthShell } from "@/components/marketing/AuthShell";

export default function InviteAcceptPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = useMemo(() => String(params?.token ?? ""), [params]);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [status, setStatus] = useState<"working" | "ok" | "error">("working");
  const [message, setMessage] = useState<string>("Accepting invite...");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const { data } = await supabase.auth.getUser();
        if (!data.user) {
          const next = `/invite/${token}`;
          setStatus("working");
          setMessage("Redirecting you to sign in...");
          router.replace(`/login?next=${encodeURIComponent(next)}`);
          return;
        }

        const res = await fetch("/api/team/invites", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token })
        });
        const dataRes = (await res.json()) as {
          ok?: boolean;
          error?: string;
          code?: string;
          companyId?: string | null;
          productId?: string | null;
        };
        if (!res.ok) throw new Error(dataRes.error ?? "Failed to accept invite.");
        if (cancelled) return;

        setStatus("ok");
        setMessage("Invite accepted. Redirecting...");
        const destination = dataRes.productId ? "/dashboard" : "/dashboard/settings/team";
        setTimeout(() => {
          window.location.href = destination;
        }, 700);
      } catch (e) {
        if (cancelled) return;
        setStatus("error");
        setMessage(e instanceof Error ? e.message : "Failed to accept invite.");
      }
    }

    if (token) void run();
    return () => {
      cancelled = true;
    };
  }, [router, supabase, token]);

  return (
    <AuthShell>
      <div className="mx-auto w-full max-w-md">
        <div className="saas-pill mb-4">Team</div>
        <h1
          className="text-3xl font-semibold tracking-tight text-[#fafafc] sm:text-4xl"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Invite
        </h1>
        <p className="mt-2 text-sm text-[#9090b0]">Join your company workspace.</p>

        <div className="saas-card mt-8 p-6 sm:p-8">
          <div className="text-sm leading-relaxed text-[#9090b0]">{message}</div>
          {status === "working" || status === "ok" ? (
            <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className={`h-full rounded-full bg-gradient-to-r from-[#7c6cff] to-[#5a4fd4] transition-all duration-700 ${
                  status === "ok" ? "w-full" : "w-1/3 animate-pulse"
                }`}
              />
            </div>
          ) : null}
          {status === "error" ? (
            <div className="mt-4 rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-[#9090b0]">
              Tip: make sure you are logged in with the same email the invite was created for.
            </div>
          ) : null}
        </div>
      </div>
    </AuthShell>
  );
}