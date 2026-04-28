"use client";

import { useEffect, useState } from "react";

type Health = {
  queued: number | null;
  running: number | null;
  failed: number | null;
  oldestQueuedCreatedAt: string | null;
  oldestQueuedAgeMs: number | null;
};

function fmtAge(ms: number | null): string {
  if (ms == null) return "—";
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h`;
}

export default function OperatorToolHealthClient() {
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/operator/health/prospect-research", { cache: "no-store" });
      const data = (await res.json()) as { ok?: boolean; error?: string; health?: Health };
      if (!res.ok) throw new Error(data.error ?? "Failed to load health.");
      setHealth(data.health ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load health.");
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function runWorkerNow() {
    const r = reason.trim();
    if (!r) {
      setError("Reason is required to run the worker manually.");
      return;
    }
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const res = await fetch("/api/operator/health/prospect-research/run-worker", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: r })
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; processed?: number };
      if (!res.ok) throw new Error(data.error ?? "Worker run failed.");
      setOk(`Worker completed (processed ${data.processed ?? 0}).`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Worker run failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]">
        {error ? (
          <div className="border-b border-[var(--border)] bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>
        ) : null}
        {ok ? (
          <div className="border-b border-[var(--border)] bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{ok}</div>
        ) : null}

        <div className="border-b border-[var(--border)] px-3 py-3">
          <div className="text-sm font-semibold text-[var(--text)]">Prospect Research queue</div>
          <div className="mt-1 text-xs text-[var(--text2)]">Counts are best-effort and refresh on load.</div>
        </div>

        <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface2)] p-3">
            <div className="text-[10px] font-semibold uppercase text-[var(--text3)]">Queued</div>
            <div className="mt-1 text-2xl font-bold text-[var(--text)]">{loading ? "…" : health?.queued ?? "—"}</div>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface2)] p-3">
            <div className="text-[10px] font-semibold uppercase text-[var(--text3)]">Running</div>
            <div className="mt-1 text-2xl font-bold text-[var(--text)]">{loading ? "…" : health?.running ?? "—"}</div>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface2)] p-3">
            <div className="text-[10px] font-semibold uppercase text-[var(--text3)]">Failed</div>
            <div className="mt-1 text-2xl font-bold text-[var(--text)]">{loading ? "…" : health?.failed ?? "—"}</div>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface2)] p-3">
            <div className="text-[10px] font-semibold uppercase text-[var(--text3)]">Oldest queued</div>
            <div className="mt-1 text-2xl font-bold text-[var(--text)]">
              {loading ? "…" : fmtAge(health?.oldestQueuedAgeMs ?? null)}
            </div>
            <div className="mt-1 text-[11px] text-[var(--text3)]">
              {health?.oldestQueuedCreatedAt ? new Date(health.oldestQueuedCreatedAt).toLocaleString() : "—"}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] px-3 py-3">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for manual run (required)"
            className="w-full max-w-[520px] flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-3 py-2 text-sm text-[var(--text)]"
          />
          <button
            type="button"
            onClick={() => void load()}
            disabled={busy}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-3 py-2 text-sm font-semibold text-[var(--text)] hover:bg-[var(--surface3)] disabled:opacity-60"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => void runWorkerNow()}
            disabled={busy}
            className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/15 disabled:opacity-60"
          >
            {busy ? "Running…" : "Run worker now"}
          </button>
        </div>
      </div>
    </div>
  );
}

