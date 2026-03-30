"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  aggregateWorkFromSettings,
  workSourcesSummary,
  type WorkItem
} from "@/lib/aggregateWorkspaceWork";

export function AllWorkClient({ environmentId }: { environmentId: string }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [items, setItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<string>("all");
  const [hideDone, setHideDone] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: qErr } = await supabase
      .from("module_settings")
      .select("module, key, value_json")
      .eq("environment_id", environmentId);
    if (qErr) {
      setError(qErr.message);
      setItems([]);
      setLoading(false);
      return;
    }
    const rows = (data ?? []) as { module: string; key: string; value_json: unknown }[];
    setItems(aggregateWorkFromSettings(rows));
    setLoading(false);
  }, [environmentId, supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => workSourcesSummary(items), [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      if (hideDone && it.done) return false;
      if (source !== "all" && it.source !== source) return false;
      if (!q) return true;
      const blob = `${it.title} ${it.subtitle ?? ""} ${it.status ?? ""} ${it.owner ?? ""} ${it.category} ${it.sourceLabel} ${(it.tags ?? []).join(" ")}`.toLowerCase();
      return blob.includes(q);
    });
  }, [items, query, source, hideDone]);

  const openCount = items.filter((i) => !i.done).length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl text-[#f0f0f8]" style={{ fontFamily: "var(--font-heading)" }}>
          All work
        </h1>
        <p className="mt-1 text-sm text-[#9090b0]">
          One view of tasks, queues, campaigns, and milestones from across modules for this product. Edit in each module
          — this page is read-only aggregation.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#2a2e3f] bg-[#141420] p-3">
        <span className="text-xs text-[#9090b0]">
          {loading ? "Loading…" : `${items.length} rows · ${openCount} open`}
        </span>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-[#2a2e3f] px-2 py-1 text-xs text-[#f0f0f8] hover:bg-white/5"
        >
          Refresh
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-[200px] flex-1">
          <div className="mb-1 text-[10px] uppercase text-[#9090b0]">Search</div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Title, owner, module, tag…"
            className="w-full rounded-lg border border-[#2a2e3f] bg-[#141420] px-3 py-2 text-sm text-[#f0f0f8]"
          />
        </div>
        <div className="min-w-[160px]">
          <div className="mb-1 text-[10px] uppercase text-[#9090b0]">Module</div>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="w-full rounded-lg border border-[#2a2e3f] bg-[#141420] px-3 py-2 text-sm text-[#f0f0f8]"
          >
            <option value="all">All modules</option>
            {summary.map((s) => (
              <option key={s.source} value={s.source}>
                {s.label} ({s.count})
              </option>
            ))}
          </select>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-[#9090b0]">
          <input
            type="checkbox"
            checked={hideDone}
            onChange={(e) => setHideDone(e.target.checked)}
            className="rounded border-[#2a2e3f]"
          />
          Hide done / live
        </label>
      </div>

      {!loading && filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#2a2e3f] bg-[#141420]/60 p-8 text-center text-sm text-[#9090b0]">
          No matching items. Add work in{" "}
          <Link href="/dashboard/gtm-planner" className="text-[#c4b8ff] hover:underline">
            GTM
          </Link>
          ,{" "}
          <Link href="/dashboard/events" className="text-[#c4b8ff] hover:underline">
            Events
          </Link>
          ,{" "}
          <Link href="/dashboard/content-studio" className="text-[#c4b8ff] hover:underline">
            Content Studio
          </Link>
          , or{" "}
          <Link href="/dashboard/campaigns" className="text-[#c4b8ff] hover:underline">
            Campaigns
          </Link>
          .
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-[#2a2e3f] bg-[#141420]">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-[#2a2e3f] text-[10px] font-medium uppercase text-[#9090b0]">
            <tr>
              <th className="px-3 py-2">Item</th>
              <th className="px-3 py-2">Module</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Owner</th>
              <th className="px-3 py-2">Due / timeline</th>
              <th className="px-3 py-2 w-24" />
            </tr>
          </thead>
          <tbody className="text-[#f0f0f8]">
            {filtered.map((it) => (
              <tr key={it.id} className="border-t border-[#2a2e3f] align-top">
                <td className="px-3 py-2">
                  <div className="font-medium">{it.title}</div>
                  {it.subtitle ? <div className="mt-0.5 text-xs text-[#9090b0]">{it.subtitle}</div> : null}
                  {it.timeline ? (
                    <div className="mt-1 line-clamp-2 text-xs text-[#707090]">{it.timeline}</div>
                  ) : null}
                  {it.tags?.length ? (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {it.tags.map((t) => (
                        <span key={t} className="rounded bg-black/30 px-1.5 py-0.5 text-[10px] text-[#9090b0]">
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-xs text-[#c4b8ff]">{it.sourceLabel}</td>
                <td className="px-3 py-2 text-xs text-[#9090b0]">{it.category}</td>
                <td className="px-3 py-2">
                  <span
                    className={
                      it.done
                        ? "text-emerald-300/90"
                        : it.status === "Reference"
                          ? "text-[#9090b0]"
                          : "text-[#f0f0f8]"
                    }
                  >
                    {it.status ?? "—"}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-[#9090b0]">{it.owner ?? "—"}</td>
                <td className="px-3 py-2 text-xs text-[#9090b0]">{it.due ?? "—"}</td>
                <td className="px-3 py-2">
                  <Link
                    href={it.href}
                    className="text-xs font-medium text-[#7c6cff] hover:text-[#a39cff] hover:underline"
                  >
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
