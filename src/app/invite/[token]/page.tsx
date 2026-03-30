"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function InviteAcceptPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = useMemo(() => String(params?.token ?? ""), [params]);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [status, setStatus] = useState<"working" | "ok" | "error">("working");
  const [message, setMessage] = useState<string>("Accepting invite…");

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const { data } = await supabase.auth.getUser();
        if (!data.user) {
          setStatus("error");
          setMessage("Please sign in first, then open the invite link again.");
          return;
        }

        const res = await fetch("/api/team/invites", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token })
        });
        const dataRes = (await res.json()) as { ok?: boolean; error?: string; code?: string };
        if (!res.ok) throw new Error(dataRes.error ?? "Failed to accept invite.");
        if (cancelled) return;
        setStatus("ok");
        setMessage("Invite accepted. Redirecting…");
        setTimeout(() => router.push("/dashboard"), 700);
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
    <div className="min-h-screen bg-[#08080c] text-[#f0f0f8]">
      <div className="mx-auto max-w-xl px-4 py-16">
        <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-6">
          <div className="text-2xl" style={{ fontFamily: "var(--font-heading)" }}>
            Team invite
          </div>
          <div className="mt-2 text-sm text-[#9090b0]">{message}</div>
          {status === "error" ? (
            <div className="mt-4 text-sm text-[#9090b0]">
              Tip: make sure you’re logged in with the same email the invite was created for.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

