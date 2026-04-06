"use client";

import { useCallback, useEffect, useState } from "react";
import { AiProgressBar, AI_PROGRESS_ESTIMATE } from "@/app/dashboard/_components/AiProgressBar";
import { Markdown } from "@/lib/Markdown";
import {
  PROSPECT_MEMO_KEYS,
  PROSPECT_MEMO_LABELS,
  emptyProspectMemo,
  normalizeProspectMemo,
  type ProspectIntelligenceMemo
} from "@/lib/prospectIntelligenceTypes";

type ProspectRow = {
  id: string;
  name: string;
  company_name: string | null;
  website_url: string | null;
  deal_stage: string | null;
  updated_at: string;
  created_at: string;
};

function isLikelyNetworkFailure(e: unknown): boolean {
  if (e instanceof TypeError) {
    const m = e.message.toLowerCase();
    return m.includes("failed to fetch") || m.includes("network") || m.includes("load failed");
  }
  if (e instanceof Error && e.message === "Failed to fetch") return true;
  return false;
}

/** User-facing fetch errors. Use `list` when the saved-prospects list failed (non-blocking for memo generation). */
function formatProspectFetchError(e: unknown, context: "list" | "default" = "default"): string {
  if (isLikelyNetworkFailure(e)) {
    if (context === "list") {
      return "Saved prospects could not be loaded (network or server). You can still generate a memo below. Use Retry when your connection is back.";
    }
    return "Could not reach the server. Check your connection and try again. If you run the app locally, ensure the dev server is running.";
  }
  if (e instanceof Error) return e.message;
  return "Something went wrong.";
}

async function readApiJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text.trim()) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      !res.ok
        ? `Request failed (${res.status}). The server returned a non-JSON response — check logs or env (e.g. Supabase).`
        : "The server returned an invalid response."
    );
  }
}

export default function ProspectResearchClient() {
  const [prospects, setProspects] = useState<ProspectRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  /** List GET failed — shown in sidebar only; does not block memo generation. */
  const [listError, setListError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [accountName, setAccountName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [dealStage, setDealStage] = useState("");
  const [preparedFor, setPreparedFor] = useState("");
  const [demoOrMeetingDate, setDemoOrMeetingDate] = useState("");
  const [sellerName, setSellerName] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");

  const [draftMemo, setDraftMemo] = useState<ProspectIntelligenceMemo | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const [chatQ, setChatQ] = useState("");
  const [chatA, setChatA] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    setListError(null);
    try {
      const res = await fetch("/api/prospects");
      const data = await readApiJson<{ prospects?: ProspectRow[]; error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? "Failed to load prospects.");
      setProspects(data.prospects ?? []);
    } catch (e) {
      setProspects([]);
      setListError(formatProspectFetchError(e, "list"));
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const loadDetail = async (id: string) => {
    setLoadingDetail(true);
    setError(null);
    try {
      const res = await fetch(`/api/prospects/${id}`);
      const data = await readApiJson<{ prospect?: { memo_json: unknown } & ProspectRow; error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? "Failed to load prospect.");
      if (data.prospect) {
        setDraftMemo(normalizeProspectMemo(data.prospect.memo_json));
        setAccountName(data.prospect.name);
        setCompanyName(data.prospect.company_name ?? "");
        setWebsiteUrl(data.prospect.website_url ?? "");
        setDealStage(data.prospect.deal_stage ?? "");
      }
    } catch (e) {
      setError(formatProspectFetchError(e));
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
    else {
      setDraftMemo(null);
      setChatA(null);
    }
  }, [selectedId]);

  async function runResearch() {
    const acc = accountName.trim();
    if (!acc) {
      setError("Enter an account or opportunity name.");
      return;
    }
    setGenerating(true);
    setError(null);
    setChatA(null);
    try {
      const res = await fetch("/api/prospects/research/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          accountName: acc,
          companyName: companyName.trim() || undefined,
          websiteUrl: websiteUrl.trim() || undefined,
          dealStage: dealStage.trim() || undefined,
          preparedFor: preparedFor.trim() || undefined,
          demoOrMeetingDate: demoOrMeetingDate.trim() || undefined,
          sellerName: sellerName.trim() || undefined,
          additionalContext: additionalContext.trim() || undefined
        })
      });
      const data = await readApiJson<{ memo?: ProspectIntelligenceMemo; error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? "Research failed.");
      setDraftMemo(normalizeProspectMemo(data.memo));
    } catch (e) {
      setError(formatProspectFetchError(e));
    } finally {
      setGenerating(false);
    }
  }

  async function saveProspect() {
    if (!draftMemo) {
      setError("Generate a memo first, or select a saved prospect to edit.");
      return;
    }
    const name = accountName.trim();
    if (!name) {
      setError("Name is required to save.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/prospects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          company_name: companyName.trim() || null,
          website_url: websiteUrl.trim() || null,
          deal_stage: dealStage.trim() || null,
          memo_json: draftMemo
        })
      });
      const data = await readApiJson<{ prospect?: { id: string }; error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? "Save failed.");
      await loadList();
      if (data.prospect?.id) {
        setSelectedId(data.prospect.id);
      }
    } catch (e) {
      setError(formatProspectFetchError(e));
    } finally {
      setSaving(false);
    }
  }

  async function updateProspect() {
    if (!selectedId || !draftMemo) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/prospects/${selectedId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: accountName.trim(),
          company_name: companyName.trim() || null,
          website_url: websiteUrl.trim() || null,
          deal_stage: dealStage.trim() || null,
          memo_json: draftMemo
        })
      });
      const data = await readApiJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? "Update failed.");
      await loadList();
    } catch (e) {
      setError(formatProspectFetchError(e));
    } finally {
      setSaving(false);
    }
  }

  async function deleteProspect() {
    if (!selectedId) return;
    if (!window.confirm("Delete this saved prospect?")) return;
    try {
      const res = await fetch(`/api/prospects/${selectedId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await readApiJson<{ error?: string }>(res);
        throw new Error(data.error ?? "Delete failed.");
      }
      setSelectedId(null);
      setDraftMemo(null);
      await loadList();
    } catch (e) {
      setError(formatProspectFetchError(e));
    }
  }

  async function askAgent() {
    if (!selectedId || !chatQ.trim()) return;
    setChatLoading(true);
    setChatA(null);
    setError(null);
    try {
      const res = await fetch(`/api/prospects/${selectedId}/ask`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: chatQ.trim() })
      });
      const data = await readApiJson<{ answer?: string; error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? "Ask failed.");
      setChatA(data.answer ?? "");
    } catch (e) {
      setError(formatProspectFetchError(e));
    } finally {
      setChatLoading(false);
    }
  }

  function newProspect() {
    setSelectedId(null);
    setDraftMemo(null);
    setAccountName("");
    setCompanyName("");
    setWebsiteUrl("");
    setDealStage("");
    setPreparedFor("");
    setDemoOrMeetingDate("");
    setSellerName("");
    setAdditionalContext("");
    setChatA(null);
    setChatQ("");
    setError(null);
  }

  const memo = draftMemo ?? emptyProspectMemo();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div
            className="text-[28px] font-extrabold tracking-[-0.5px] text-text"
            style={{ fontFamily: "var(--font-heading)", lineHeight: 1.1 }}
          >
            Prospect Research <span className="text-[20px]">🧭</span>
          </div>
          <div className="mt-2 max-w-[640px] text-[13px] text-text2">
            Generate an 8-section Prospect Intelligence Memo with AI, save accounts, and ask the agent questions
            grounded in your saved research.
          </div>
        </div>
        <button
          type="button"
          onClick={newProspect}
          className="rounded-[var(--radius2)] border border-border bg-surface2 px-4 py-2 text-sm font-semibold text-text transition hover:bg-surface3 hover:border-border2"
        >
          New prospect
        </button>
      </div>

      {error ? (
        <div className="rounded-[var(--radius)] border border-red bg-[rgba(248,113,113,0.12)] p-4 text-sm text-red">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(200px,260px)_1fr]">
        <div className="rounded-[var(--radius)] border border-border bg-surface p-4">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.5px] text-text3">
            Saved prospects
          </div>
          {listError ? (
            <div className="mb-3 text-xs leading-relaxed text-amber-200/90">
              <p>{listError}</p>
              <button
                type="button"
                onClick={() => void loadList()}
                className="mt-2 rounded-[var(--radius2)] border border-amber-500/40 bg-surface2 px-2 py-1 text-[11px] font-semibold text-text transition hover:bg-surface3"
              >
                Retry
              </button>
            </div>
          ) : null}
          {loadingList ? (
            <div className="text-sm text-text2">Loading…</div>
          ) : listError ? null : prospects.length === 0 ? (
            <div className="text-sm text-text2">None yet. Generate and save below.</div>
          ) : (
            <ul className="space-y-1">
              {prospects.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(p.id)}
                    className={`w-full rounded-[var(--radius2)] px-3 py-2 text-left text-sm transition ${
                      selectedId === p.id
                        ? "bg-accent/15 font-semibold text-text"
                        : "text-text2 hover:bg-surface2"
                    }`}
                  >
                    <div className="truncate">{p.name}</div>
                    {p.deal_stage ? (
                      <div className="truncate text-[11px] text-text3">{p.deal_stage}</div>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
            <div className="mb-4 font-[var(--font-heading)] text-[14px] font-bold text-text">
              Inputs
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-sm">
                <span className="text-text2">Account / opportunity name *</span>
                <input
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="mt-1 w-full rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-sm text-text"
                  placeholder="e.g. Acme Corp — Enterprise renewal"
                />
              </label>
              <label className="block text-sm">
                <span className="text-text2">Company name</span>
                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="mt-1 w-full rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-sm text-text"
                />
              </label>
              <label className="block text-sm">
                <span className="text-text2">Website</span>
                <input
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="mt-1 w-full rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-sm text-text"
                  placeholder="https://"
                />
              </label>
              <label className="block text-sm">
                <span className="text-text2">Deal stage</span>
                <input
                  value={dealStage}
                  onChange={(e) => setDealStage(e.target.value)}
                  className="mt-1 w-full rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-sm text-text"
                  placeholder="e.g. Discovery, Evaluation"
                />
              </label>
              <label className="block text-sm md:col-span-2">
                <span className="text-text2">Prepared for (memo header)</span>
                <input
                  value={preparedFor}
                  onChange={(e) => setPreparedFor(e.target.value)}
                  className="mt-1 w-full rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-sm text-text"
                  placeholder="e.g. Andrew Toppin & Marketing Team"
                />
              </label>
              <label className="block text-sm">
                <span className="text-text2">Demo / meeting</span>
                <input
                  value={demoOrMeetingDate}
                  onChange={(e) => setDemoOrMeetingDate(e.target.value)}
                  className="mt-1 w-full rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-sm text-text"
                  placeholder="e.g. April 17, 2026, 10:00 AM PT"
                />
              </label>
              <label className="block text-sm">
                <span className="text-text2">Seller / AE name</span>
                <input
                  value={sellerName}
                  onChange={(e) => setSellerName(e.target.value)}
                  className="mt-1 w-full rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-sm text-text"
                  placeholder="For sales strategy notes section"
                />
              </label>
            </div>
            <label className="mt-3 block text-sm">
              <span className="text-text2">Additional context (paste notes, news, LinkedIn, etc.)</span>
              <textarea
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                rows={4}
                className="mt-1 w-full rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-sm text-text"
              />
            </label>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={runResearch}
                disabled={generating}
                className="rounded-[var(--radius2)] bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#5b52ee] disabled:opacity-60"
              >
                {generating ? "Generating memo…" : "Generate intelligence memo"}
              </button>
              <button
                type="button"
                onClick={() => (selectedId ? updateProspect() : saveProspect())}
                disabled={saving || !draftMemo}
                className="rounded-[var(--radius2)] border border-border bg-surface2 px-4 py-2 text-sm font-semibold text-text transition hover:bg-surface3 disabled:opacity-50"
              >
                {saving ? "Saving…" : selectedId ? "Save changes" : "Save as prospect"}
              </button>
              {selectedId ? (
                <button
                  type="button"
                  onClick={deleteProspect}
                  className="rounded-[var(--radius2)] border border-red/40 px-4 py-2 text-sm font-semibold text-red transition hover:bg-red/10"
                >
                  Delete
                </button>
              ) : null}
            </div>
            {loadingDetail ? (
              <div className="mt-2 text-xs text-text2">Loading prospect…</div>
            ) : null}
          </div>

          {draftMemo || selectedId ? (
            <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
              <div className="mb-4 font-[var(--font-heading)] text-[14px] font-bold text-text">
                Prospect Intelligence Memo
              </div>
              {generating ? (
                <div className="mb-6">
                  <AiProgressBar
                    active
                    title="Regenerating prospect intelligence memo…"
                    estimate={AI_PROGRESS_ESTIMATE.memo}
                    durationMs={100_000}
                  />
                </div>
              ) : null}
              <div className="space-y-6">
                {PROSPECT_MEMO_KEYS.map((key) => (
                  <section key={key} className="border-t border-border pt-4 first:border-t-0 first:pt-0">
                    <h3 className="mb-2 text-[13px] font-bold text-text">
                      {PROSPECT_MEMO_LABELS[key]}
                    </h3>
                    <div className="prose prose-invert max-w-none text-sm text-text2">
                      {memo[key]?.trim() ? (
                        <Markdown content={memo[key]} />
                      ) : (
                        <div className="text-text3">—</div>
                      )}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          ) : generating ? (
            <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
              <div className="mb-3 font-[var(--font-heading)] text-[14px] font-bold text-text">
                Prospect Intelligence Memo
              </div>
              <AiProgressBar
                active
                title="Generating prospect intelligence memo…"
                estimate={AI_PROGRESS_ESTIMATE.memo}
                durationMs={100_000}
              />
              <p className="mt-3 text-center text-xs text-text3">
                This can take 30 seconds to a few minutes. You can keep this tab open.
              </p>
            </div>
          ) : (
            <div className="rounded-[var(--radius)] border border-dashed border-border bg-surface2/50 p-8 text-center text-sm text-text2">
              Fill inputs and click <strong className="text-text">Generate intelligence memo</strong> to create
              your 8-section memo, then save it as a prospect.
            </div>
          )}

          {selectedId && draftMemo ? (
            <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
              <div className="mb-2 font-[var(--font-heading)] text-[14px] font-bold text-text">
                Prospect agent
              </div>
              {chatLoading ? (
                <div className="mb-4">
                  <AiProgressBar
                    active
                    title="Answering with your saved research…"
                    estimate={AI_PROGRESS_ESTIMATE.short}
                    durationMs={55_000}
                  />
                </div>
              ) : null}
              <p className="mb-3 text-xs text-text2">
                Ask questions about this saved memo. Answers use only the intelligence below unless marked as
                inference.
              </p>
              <div className="flex gap-2">
                <input
                  value={chatQ}
                  onChange={(e) => setChatQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      askAgent();
                    }
                  }}
                  placeholder="e.g. Who is likely the economic buyer?"
                  className="flex-1 rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-sm text-text"
                />
                <button
                  type="button"
                  onClick={askAgent}
                  disabled={chatLoading || !chatQ.trim()}
                  className="rounded-[var(--radius2)] bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {chatLoading ? "…" : "Ask"}
                </button>
              </div>
              {chatA ? (
                <div className="mt-4 rounded-[var(--radius2)] border border-border bg-surface2 p-4 text-sm text-text">
                  <Markdown content={chatA} />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
