"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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

function SetupItem({ title, ok, subtitle }: { title: string; ok: boolean; subtitle: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface2 p-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="font-medium text-text">{title}</div>
        <span
          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
            ok ? "bg-teal/15 text-teal" : "bg-amber/15 text-amber"
          }`}
          aria-label={ok ? "OK" : "Needs attention"}
        >
          {ok ? "✓" : "!"}
        </span>
      </div>
      <div className="mt-1 text-xs text-text2">{subtitle}</div>
    </div>
  );
}

export default function WorkspaceAiSettingsClient({ email }: { email: string }) {
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
        <div className="text-sm font-medium text-text">Workspace AI</div>
        <div className="mt-1 text-sm text-text2">Copilot and generators use Anthropic (Claude).</div>
        <div className="mt-3 text-xs text-text3">Signed in as {email}</div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <SetupItem title="Auth" ok subtitle="Signed-in access enabled" />
          <SetupItem title="Billing" ok={true} subtitle="Plan is workspace-scoped" />
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

      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="text-sm font-medium text-text">AI integration</div>
        <p className="mt-1 text-sm text-text2">
          Starter/Free/Growth can use platform AI when enabled. Enterprise requires a workspace key. A workspace key
          always overrides platform AI.
        </p>

        {workspaceMeta?.warning ? (
          <div className="mt-3 rounded-xl border border-amber/30 bg-amber/10 px-3 py-2 text-xs text-amber">
            {workspaceMeta.warning}
          </div>
        ) : null}

        {workspaceMeta?.error ? (
          <div className="mt-3 rounded-xl border border-red/30 bg-red/10 px-3 py-2 text-xs text-red">
            {workspaceMeta.error}
          </div>
        ) : null}

        {!metaLoading && !canManage ? (
          <div className="mt-4 rounded-xl border border-border bg-surface2 px-3 py-2 text-sm text-text2">
            {configured
              ? "A workspace AI key is configured. Only owners and admins can change it."
              : anthropicReady
                ? "AI is available via platform defaults for this plan, or a workspace key if your admin added one."
                : workspaceMeta?.platform_ai_eligible
                  ? "Platform AI is not enabled yet. Ask an owner/admin to add a workspace key here."
                  : "This workspace needs an AI key. Ask an owner/admin to add one."}
          </div>
        ) : null}

        {canManage ? (
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between">
              <div className="text-xs text-text2">Anthropic API key</div>
              <div className={`h-2 w-2 rounded-full ${anthropicReady ? "bg-teal" : "bg-text3/40"}`} />
            </div>
            {configured ? (
              <div className="mb-2 text-xs text-text2">
                A key is on file{workspaceMeta?.updated_at ? ` (updated ${new Date(workspaceMeta.updated_at).toLocaleString()})` : ""}.
              </div>
            ) : null}
            <input
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="sk-ant-..."
              type="password"
              autoComplete="off"
              className="w-full rounded-sm border border-input-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text3 transition-[border-color,box-shadow] duration-200 ease-aimw-out focus:border-primary focus:outline-none focus:shadow-focus"
            />

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void saveWorkspaceKey()}
                disabled={savingKey || !keyLooksValid || !byokStorageReady}
                className="rounded-sm bg-primary px-4 py-2.5 text-sm font-semibold text-on-dark transition-[background-color,box-shadow,transform] duration-200 ease-aimw-out hover:bg-primary-dark active:scale-[0.98] disabled:opacity-60 motion-reduce:active:scale-100"
              >
                {savingKey ? "Saving…" : configured ? "Replace key" : "Save key"}
              </button>
              {configured ? (
                <button
                  type="button"
                  onClick={() => void removeWorkspaceKey()}
                  disabled={savingKey}
                  className="rounded-sm border border-input-border bg-surface px-4 py-2.5 text-sm font-semibold text-text transition-[background-color,border-color] duration-200 ease-aimw-out hover:bg-surface2 disabled:opacity-60"
                >
                  Remove key
                </button>
              ) : null}
            </div>

            {keyError ? (
              <div className="mt-3 rounded-xl border border-red/30 bg-red/10 px-3 py-2 text-xs text-red">
                {keyError}
              </div>
            ) : null}
            {keyMessage ? (
              <div className="mt-3 rounded-xl border border-teal/30 bg-teal/10 px-3 py-2 text-xs text-teal">
                {keyMessage}
              </div>
            ) : null}

            {anthropicReady ? (
              <div className="mt-3 rounded-xl border border-border bg-surface2 px-3 py-2 text-xs text-text2">
                {aiStatus === "checking" ? (
                  <span>Checking connection…</span>
                ) : aiStatus === "connected" ? (
                  <span className="text-teal">Connected</span>
                ) : aiStatus === "error" ? (
                  <span className="text-red">Not connected{aiError ? ` — ${aiError}` : ""}</span>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

