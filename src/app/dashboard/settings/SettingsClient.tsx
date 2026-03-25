"use client";

import { useMemo, useState } from "react";
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
      <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-6">
        <div className="text-sm text-[#f0f0f8]">System setup</div>
        <div className="mt-2 text-sm text-[#9090b0]">
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
        <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-6">
          <div className="text-sm text-[#f0f0f8]">Profile</div>
          <div className="mt-1 text-sm text-[#9090b0]">Signed in as {email}</div>

          <div className="mt-4 space-y-3">
            <div>
              <div className="mb-1 text-xs text-[#9090b0]">Name</div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-[#2a2e3f] bg-black/20 px-3 py-2 text-sm text-[#f0f0f8] placeholder:text-[#9090b0]"
                placeholder="Your name"
              />
            </div>
            <div>
              <div className="mb-1 text-xs text-[#9090b0]">Company</div>
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full rounded-xl border border-[#2a2e3f] bg-black/20 px-3 py-2 text-sm text-[#f0f0f8] placeholder:text-[#9090b0]"
                placeholder="Company"
              />
            </div>

            {error ? (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            ) : null}
            {saved ? (
              <div className="rounded-xl border border-[#b8ff6c]/30 bg-[#b8ff6c]/10 px-3 py-2 text-sm text-[#b8ff6c]">
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

        <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-6">
          <div className="text-sm text-[#f0f0f8]">AI integration</div>
          <div className="mt-1 text-sm text-[#9090b0]">
            Paste your Anthropic API key here. It’s saved in this browser (localStorage).
          </div>

          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between">
              <div className="text-xs text-[#9090b0]">Anthropic API key</div>
              <div
                className={`h-2 w-2 rounded-full ${
                  anthropicKey.trim().length > 0 ? "bg-[#b8ff6c]" : "bg-white/20"
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
              className="w-full rounded-xl border border-[#2a2e3f] bg-black/20 px-3 py-2 text-sm text-[#f0f0f8] placeholder:text-[#9090b0] focus:border-[#7c6cff] focus:outline-none focus:ring-2 focus:ring-[#7c6cff]/30"
            />

            <div className="mt-3 text-xs text-[#9090b0]">
              Tip: once set, open <span className="text-[#f0f0f8]">AI Copilot</span> to start chatting.
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
    <div className="rounded-2xl border border-[#2a2e3f] bg-black/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-[#f0f0f8]">{title}</div>
          <div className="mt-1 text-sm text-[#9090b0]">{subtitle}</div>
        </div>
        <div
          className={`mt-1 h-2.5 w-2.5 rounded-full ${
            ok ? "bg-[#b8ff6c]" : "bg-white/20"
          }`}
          aria-label={ok ? "OK" : "Not set"}
        />
      </div>
    </div>
  );
}

