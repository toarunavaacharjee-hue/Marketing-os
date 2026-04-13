"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Props = {
  initialName: string;
  initialCompany: string;
  email: string;
};

type WorkspaceKeyMeta = {
  configured: boolean;
  canManage: boolean;
  updated_at?: string | null;
  error?: string;
  warning?: string;
  workspace_key_storage_ready?: boolean;
  plan?: string;
  platform_ai_eligible?: boolean;
  platform_ai_configured?: boolean;
  key_source?: "workspace" | "platform" | "none";
  anthropic_ready?: boolean;
};

export default function SettingsClient({ initialName, initialCompany, email }: Props) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [name, setName] = useState(initialName);
  const [company, setCompany] = useState(initialCompany);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [workspaceMeta, setWorkspaceMeta] = useState<WorkspaceKeyMeta | null>(null);
  const [metaLoading, setMetaLoading] = useState(true);
  const [keyInput, setKeyInput] = useState("");
  const [savingKey, setSavingKey] = useState(false);
  const [keyMessage, setKeyMessage] = useState<string | null>(null);
  const [keyError, setKeyError] = useState<string | null>(null);

  const keyLooksValid = keyInput.trim().startsWith("sk-ant-");
  const [aiStatus, setAiStatus] = useState<"idle" | "checking" | "connected" | "error">("idle");
  const [aiError, setAiError] = useState<string | null>(null);

  const refreshWorkspaceMeta = useCallback(async () => {
    setMetaLoading(true);
    try {
      const res = await fetch("/api/settings/workspace-ai-key", { method: "GET" });
      const data = (await res.json()) as WorkspaceKeyMeta & { error?: string };
      setWorkspaceMeta({
        configured: Boolean(data.configured),
        canManage: Boolean(data.canManage),
        updated_at: data.updated_at ?? null,
        error: typeof data.error === "string" ? data.error : undefined,
        warning: typeof data.warning === "string" ? data.warning : undefined,
        workspace_key_storage_ready: data.workspace_key_storage_ready !== false,
        plan: typeof data.plan === "string" ? data.plan : undefined,
        platform_ai_eligible: Boolean(data.platform_ai_eligible),
        platform_ai_configured: Boolean(data.platform_ai_configured),
        key_source: data.key_source,
        anthropic_ready: Boolean(data.anthropic_ready)
      });
    } catch {
      setWorkspaceMeta({
        configured: false,
        canManage: false,
        anthropic_ready: false,
        error: "Could not load workspace key status."
      });
    } finally {
      setMetaLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshWorkspaceMeta();
  }, [refreshWorkspaceMeta]);

  useEffect(() => {
    let cancelled = false;

    async function ping() {
      if (!workspaceMeta?.anthropic_ready) {
        setAiStatus("idle");
        setAiError(null);
        return;
      }

      setAiStatus("checking");
      setAiError(null);

      try {
        const res = await fetch("/api/ai/ping", {
          method: "POST",
          headers: { "content-type": "application/json" }
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

    const t = window.setTimeout(ping, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [workspaceMeta?.anthropic_ready]);

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

  async function saveWorkspaceKey() {
    setKeyMessage(null);
    setKeyError(null);
    const apiKey = keyInput.trim();
    if (!apiKey.startsWith("sk-ant-")) {
      setKeyError("Key must start with sk-ant-.");
      return;
    }
    setSavingKey(true);
    try {
      const res = await fetch("/api/settings/workspace-ai-key", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ apiKey })
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setKeyError(data.error ?? "Could not save key.");
        return;
      }
      setKeyInput("");
      setKeyMessage("Workspace Anthropic key saved.");
      await refreshWorkspaceMeta();
    } catch (e) {
      setKeyError(e instanceof Error ? e.message : "Could not save key.");
    } finally {
      setSavingKey(false);
    }
  }

  async function removeWorkspaceKey() {
    setKeyMessage(null);
    setKeyError(null);
    setSavingKey(true);
    try {
      const res = await fetch("/api/settings/workspace-ai-key", { method: "DELETE" });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setKeyError(data.error ?? "Could not remove key.");
        return;
      }
      setKeyMessage("Workspace key removed.");
      await refreshWorkspaceMeta();
    } catch (e) {
      setKeyError(e instanceof Error ? e.message : "Could not remove key.");
    } finally {
      setSavingKey(false);
    }
  }

  const configured = workspaceMeta?.configured ?? false;
  const canManage = workspaceMeta?.canManage ?? false;
  const anthropicReady = workspaceMeta?.anthropic_ready ?? false;
  const keySource = workspaceMeta?.key_source ?? "none";
  const byokStorageReady = workspaceMeta?.workspace_key_storage_ready !== false;

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
            title="Anthropic / AI"
            ok={anthropicReady}
            subtitle={
              metaLoading
                ? "Checking…"
                : keySource === "workspace"
                  ? "Workspace key (BYOK)"
                  : keySource === "platform"
                    ? "Platform AI (no BYOK)"
                    : "Not configured"
            }
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
          <p className="mt-1 text-sm text-text2">
            Copilot and module generators use the{" "}
            <span className="font-medium text-text">Anthropic API</span> only (Claude). OpenAI and other providers are not
            supported yet.
          </p>
          <p className="mt-2 text-sm text-text2">
            <span className="font-medium text-text">Starter, Free, and Growth</span> can use{" "}
            <span className="font-medium text-text">platform AI</span> when your operator sets{" "}
            <span className="font-mono text-xs">ANTHROPIC_API_KEY</span>.{" "}
            <span className="font-medium text-text">Enterprise</span> must add a workspace key below.
          </p>
          <p className="mt-2 text-sm text-text2">
            <span className="font-medium text-text">Bring your own key (BYOK):</span> optional on any plan. Your key bills
            to your Anthropic account and always overrides platform AI. Keys are encrypted server-side; we never store them
            in the browser.
          </p>

          <details className="group mt-4 rounded-xl border border-border bg-surface2 px-4 py-3 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium text-text">
              <span>When should I add my own API key?</span>
              <span className="text-text3 transition group-open:rotate-90" aria-hidden>
                ›
              </span>
            </summary>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-xs leading-relaxed text-text2">
              <li>
                <span className="font-medium text-text">Enterprise:</span> required — your subscription expects this
                workspace to use your Anthropic contract and limits.
              </li>
              <li>
                <span className="font-medium text-text">Cost &amp; volume:</span> add a key when you want usage to bill
                directly to you (e.g. heavy Copilot or module runs beyond Starter&apos;s monthly workflow cap).
              </li>
              <li>
                <span className="font-medium text-text">Security &amp; policy:</span> when your team needs the key under
                your control for audit or data-handling review.
              </li>
              <li>
                <span className="font-medium text-text">Reliability:</span> a dedicated key can avoid shared platform
                rate limits during peak use.
              </li>
              <li>
                <span className="font-medium text-text">Not required</span> for small teams getting started — use platform
                AI when available until one of the above applies.
              </li>
            </ul>
          </details>

          {workspaceMeta?.warning ? (
            <div className="mt-3 rounded-xl border border-sky-500/35 bg-sky-500/10 px-3 py-2 text-xs text-sky-100">
              {workspaceMeta.warning}
            </div>
          ) : null}

          {workspaceMeta?.error ? (
            <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
              {workspaceMeta.error}
            </div>
          ) : null}

          {!metaLoading && !canManage ? (
            <div className="mt-4 rounded-xl border border-border bg-surface2 px-3 py-2 text-sm text-text2">
              {configured
                ? "A workspace Anthropic key is configured (BYOK). Only owners and admins can change it."
                : anthropicReady
                  ? "AI is available via platform defaults for this plan, or a workspace key if your admin added one."
                  : workspaceMeta?.platform_ai_eligible
                    ? "Platform AI is not enabled by your operator yet. Ask an owner or admin to add a workspace key here, or contact support."
                    : "This workspace needs an Anthropic key. Ask a workspace owner or admin to add one under AI integration."}
            </div>
          ) : null}

          {canManage ? (
            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between">
                <div className="text-xs text-text2">Anthropic API key</div>
                <div
                  className={`h-2 w-2 rounded-full ${anthropicReady ? "bg-[#b8ff6c]" : "bg-white/20"}`}
                />
              </div>
              {configured ? (
                <div className="mb-2 text-xs text-text2">
                  A key is on file for this workspace
                  {workspaceMeta?.updated_at
                    ? ` (updated ${new Date(workspaceMeta.updated_at).toLocaleString()})`
                    : ""}
                  . Paste a new key below to replace it.
                </div>
              ) : null}
              <input
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="sk-ant-..."
                type="password"
                autoComplete="off"
                className="w-full rounded-xl border border-border bg-surface2 px-3 py-2 text-sm text-text placeholder:text-text3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              />

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void saveWorkspaceKey()}
                  disabled={savingKey || !keyLooksValid || !byokStorageReady}
                  className="rounded-xl bg-[#b8ff6c] px-4 py-2 text-sm font-medium text-black disabled:opacity-60"
                >
                  {savingKey ? "Saving…" : configured ? "Replace key" : "Save key"}
                </button>
                {configured ? (
                  <button
                    type="button"
                    onClick={() => void removeWorkspaceKey()}
                    disabled={savingKey}
                    className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-text2 hover:bg-surface2 disabled:opacity-60"
                  >
                    Remove key
                  </button>
                ) : null}
              </div>

              {keyError ? (
                <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                  {keyError}
                </div>
              ) : null}
              {keyMessage ? (
                <div className="mt-3 rounded-xl border border-[rgba(184,255,108,0.35)] bg-[rgba(184,255,108,0.12)] px-3 py-2 text-xs text-[rgb(22,163,74)]">
                  {keyMessage}
                </div>
              ) : null}

              {anthropicReady ? (
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
              ) : null}
            </div>
          ) : null}

          <div className="mt-3 text-xs text-text2">
            Tip: open <span className="font-medium text-text">AI Copilot</span> once AI is available for this workspace.
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
