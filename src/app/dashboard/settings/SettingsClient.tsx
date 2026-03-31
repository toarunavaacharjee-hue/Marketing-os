"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Props = {
  initialName: string;
  initialCompany: string;
  email: string;
};

const ANTHROPIC_KEY_STORAGE = "marketing_os_anthropic_api_key";

export default function SettingsClient({ initialName, initialCompany, email }: Props) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [name, setName] = useState(initialName);
  const [company, setCompany] = useState(initialCompany);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [anthropicKey, setAnthropicKey] = useState(
    typeof window !== "undefined"
      ? window.localStorage.getItem(ANTHROPIC_KEY_STORAGE) ?? ""
      : ""
  );
  const keyLooksValid = anthropicKey.trim().startsWith("sk-ant-");
  const [aiStatus, setAiStatus] = useState<
    "idle" | "checking" | "connected" | "error"
  >("idle");
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function ping() {
      if (!keyLooksValid) {
        setAiStatus("idle");
        setAiError(null);
        return;
      }

      setAiStatus("checking");
      setAiError(null);

      try {
        const res = await fetch("/api/ai/ping", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-anthropic-key": anthropicKey.trim()
          }
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (cancelled) return;

        if (!res.ok || !data.ok) {
          setAiStatus("error");
          setAiError(data.error ?? "Could not connect.");
          return;
        }

        setAiStatus("connected");
      } catch (e) {
        if (cancelled) return;
        setAiStatus("error");
        setAiError(e instanceof Error ? e.message : "Could not connect.");
      }
    }

    const t = window.setTimeout(ping, 600);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [anthropicKey, keyLooksValid]);

  async function saveProfile() {
    setSaving(true);
    setSaved(null);
    setError(null);
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) {
      setSaving(false);
      setError("You are not logged in.");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ name, company })
      .eq("id", user.id);

    setSaving(false);
    if (error) setError(error.message);
    else setSaved("Saved.");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="text-sm font-medium text-text">System setup</div>
        <div className="mt-2 text-sm text-text2">
          This is where you configure the basics so the dashboard and AI features work.
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <SetupItem title="Supabase connected" ok subtitle="Auth + profiles enabled" />
          <SetupItem title="Billing" ok={false} subtitle="Free mode (enable later)" />
          <SetupItem
            title="Anthropic key"
            ok={anthropicKey.trim().length > 0}
            subtitle="Needed for AI Copilot"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="text-sm font-medium text-text">Profile</div>
          <div className="mt-1 text-sm text-text2">Signed in as {email}</div>

          <div className="mt-4 space-y-3">
            <div>
              <div className="mb-1 text-xs text-text2">Name</div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface2 px-3 py-2 text-sm text-text placeholder:text-text3 focus:border-accent focus:outline-none"
                placeholder="Your name"
              />
            </div>
            <div>
              <div className="mb-1 text-xs text-text2">Company</div>
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface2 px-3 py-2 text-sm text-text placeholder:text-text3 focus:border-accent focus:outline-none"
                placeholder="Company"
              />
            </div>

            {error ? (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            ) : null}
            {saved ? (
              <div className="rounded-xl border border-[rgba(184,255,108,0.35)] bg-[rgba(184,255,108,0.12)] px-3 py-2 text-sm text-[rgb(22,163,74)]">
                {saved}
              </div>
            ) : null}

            <button
              onClick={saveProfile}
              disabled={saving}
              className="rounded-xl bg-[#b8ff6c] px-4 py-2 text-sm font-medium text-black disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save profile"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="text-sm font-medium text-text">AI integration</div>
          <div className="mt-1 text-sm text-text2">
            Paste your Anthropic API key here. It’s saved in this browser (localStorage).
          </div>

          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between">
              <div className="text-xs text-text2">Anthropic API key</div>
              <div
                className={`h-2 w-2 rounded-full ${
                  keyLooksValid ? "bg-[#b8ff6c]" : "bg-white/20"
                }`}
              />
            </div>
            <input
              value={anthropicKey}
              onChange={(e) => {
                const v = e.target.value;
                setAnthropicKey(v);
                window.localStorage.setItem(ANTHROPIC_KEY_STORAGE, v);
              }}
              placeholder="sk-ant-..."
              className="w-full rounded-xl border border-border bg-surface2 px-3 py-2 text-sm text-text placeholder:text-text3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />

            {keyLooksValid ? (
              <div className="mt-3 rounded-xl border border-border bg-surface2 px-3 py-2 text-xs text-text2">
                {aiStatus === "checking" ? (
                  <span>Checking connection…</span>
                ) : aiStatus === "connected" ? (
                  <span className="text-[#b8ff6c]">Connected to Anthropic</span>
                ) : aiStatus === "error" ? (
                  <span className="text-red-200">
                    Not connected{aiError ? ` — ${aiError}` : ""}
                  </span>
                ) : (
                  <span>—</span>
                )}
              </div>
            ) : anthropicKey.trim().length ? (
              <div className="mt-3 rounded-xl border border-border bg-surface2 px-3 py-2 text-xs text-text2">
                Key format looks wrong. It should start with <span className="font-medium text-text">sk-ant-</span>.
              </div>
            ) : null}

            <div className="mt-3 text-xs text-text2">
              Tip: once set, open <span className="font-medium text-text">AI Copilot</span> to start chatting.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SetupItem({
  title,
  ok,
  subtitle
}: {
  title: string;
  ok: boolean;
  subtitle: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface2 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-text">{title}</div>
          <div className="mt-1 text-sm text-text2">{subtitle}</div>
        </div>
        <div
          className={`mt-1 h-2.5 w-2.5 rounded-full ${
            ok ? "bg-[#b8ff6c]" : "bg-border"
          }`}
          aria-label={ok ? "OK" : "Not set"}
        />
      </div>
    </div>
  );
}

