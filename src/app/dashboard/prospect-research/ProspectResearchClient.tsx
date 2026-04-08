"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

function isLocalLoopbackHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "[::1]"
  );
}

function networkErrorHintForEnv(): string {
  if (typeof window === "undefined") {
    return "Check your connection and try again.";
  }
  // If you're on loopback, the most common cause is the local server not running or crashing.
  // This applies to both `next dev` and `next start`.
  if (isLocalLoopbackHost(window.location.hostname)) {
    return "Check your connection, or confirm the app server is running (npm run dev or npm run start).";
  }
  return "Check your connection and try again. If this keeps happening, the service may be temporarily unavailable.";
}

/** User-facing fetch errors. Use `list` when the saved-prospects list failed (non-blocking for memo generation). */
function formatProspectFetchError(e: unknown, context: "list" | "default" = "default"): string {
  if (isLikelyNetworkFailure(e)) {
    if (context === "list") {
      return "Saved prospects could not be loaded (network or server). You can still generate a memo below. Use Retry when your connection is back.";
    }
    return `Could not reach the server. ${networkErrorHintForEnv()}`;
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
  const uploadRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [publicAutofilling, setPublicAutofilling] = useState(false);

  const [industrySubvertical, setIndustrySubvertical] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [geography, setGeography] = useState("");
  const [businessModel, setBusinessModel] = useState("");
  const [techStack, setTechStack] = useState("");
  const [fundingOwnership, setFundingOwnership] = useState("");
  const [recentNewsEvents, setRecentNewsEvents] = useState("");

  function publicInfoBlock(): string {
    const rows: Array<[string, string]> = [
      ["Industry (sub-vertical)", industrySubvertical.trim()],
      ["Company size", companySize.trim()],
      ["Geography", geography.trim()],
      ["Business model", businessModel.trim()],
      ["Tech stack", techStack.trim()],
      ["Funding/ownership", fundingOwnership.trim()],
      ["Recent news/events", recentNewsEvents.trim()]
    ];
    const nonEmpty = rows.filter(([, v]) => v.length > 0);
    if (nonEmpty.length === 0) return "";
    return [
      "### Public info (AI autofill)",
      "",
      "| Field | Value |",
      "| --- | --- |",
      ...nonEmpty.map(([k, v]) => `| ${k} | ${v.replace(/\\n/g, "<br/>")} |`)
    ].join("\n");
  }

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
          additionalContext:
            [publicInfoBlock(), additionalContext.trim()].filter(Boolean).join("\n\n---\n\n") || undefined
        })
      });
      const data = await readApiJson<{ jobId?: string; error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? "Failed to start research.");
      if (!data.jobId) throw new Error("Missing jobId.");

      const startedAt = Date.now();
      const maxWaitMs = 2 * 60_000;
      let transientNetworkFailures = 0;
      while (true) {
        await new Promise((r) => setTimeout(r, 1000));
        let stRes: Response;
        try {
          stRes = await fetch(`/api/prospects/research/status?jobId=${encodeURIComponent(data.jobId)}`);
        } catch (e) {
          // If the connection hiccups mid-poll, keep trying briefly before failing the whole run.
          if (isLikelyNetworkFailure(e) && transientNetworkFailures < 3) {
            transientNetworkFailures++;
            continue;
          }
          throw e;
        }
        const stData = await readApiJson<{
          status?: "queued" | "running" | "completed" | "failed";
          memo?: ProspectIntelligenceMemo;
          error?: string;
        }>(stRes);
        if (!stRes.ok) throw new Error(stData.error ?? "Research status failed.");

        if (stData.status === "completed") {
          setDraftMemo(normalizeProspectMemo(stData.memo));
          break;
        }
        if (stData.status === "failed") {
          throw new Error(stData.error ?? "Research failed.");
        }
        if (Date.now() - startedAt > maxWaitMs) {
          throw new Error("Research is taking longer than expected. Please retry in a moment.");
        }
      }
    } catch (e) {
      setError(formatProspectFetchError(e));
    } finally {
      setGenerating(false);
    }
  }

  async function extractFromUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/prospects/research/extract-document", { method: "POST", body: fd });
      const data = await readApiJson<{
        ok?: boolean;
        result?: {
          companyName?: string;
          websiteUrl?: string;
          keyDecisionMakersMarkdown?: string;
          notes?: string;
        };
        error?: string;
      }>(res);
      if (!res.ok) throw new Error(data.error ?? "Failed to extract from document.");

      const r = data.result ?? {};
      if (!companyName.trim() && r.companyName?.trim()) setCompanyName(r.companyName.trim());
      if (!websiteUrl.trim() && r.websiteUrl?.trim()) setWebsiteUrl(r.websiteUrl.trim());

      const parts: string[] = [];
      if (r.notes?.trim()) parts.push(`### Uploaded notes\n${r.notes.trim()}`);
      if (r.keyDecisionMakersMarkdown?.trim()) {
        parts.push(`### Key decision makers (from uploaded info)\n${r.keyDecisionMakersMarkdown.trim()}`);
      }
      if (parts.length) {
        const next = [additionalContext.trim(), parts.join("\n\n")].filter(Boolean).join("\n\n---\n\n");
        setAdditionalContext(next);
      }
    } catch (e) {
      setError(formatProspectFetchError(e));
    } finally {
      setUploading(false);
      if (uploadRef.current) uploadRef.current.value = "";
    }
  }

  async function autofillFromPublicInfo() {
    setPublicAutofilling(true);
    setError(null);
    try {
      const res = await fetch("/api/prospects/research/autofill-public", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ companyName: companyName.trim(), websiteUrl: websiteUrl.trim() })
      });
      const data = await readApiJson<{
        ok?: boolean;
        result?: {
          industrySubvertical?: string;
          companySize?: string;
          geography?: string;
          businessModel?: string;
          techStack?: string;
          fundingOwnership?: string;
          recentNewsEvents?: string;
        };
        error?: string;
      }>(res);
      if (!res.ok) throw new Error(data.error ?? "Failed to autofill.");
      const r = data.result ?? {};
      setIndustrySubvertical(r.industrySubvertical ?? "");
      setCompanySize(r.companySize ?? "");
      setGeography(r.geography ?? "");
      setBusinessModel(r.businessModel ?? "");
      setTechStack(r.techStack ?? "");
      setFundingOwnership(r.fundingOwnership ?? "");
      setRecentNewsEvents(r.recentNewsEvents ?? "");
    } catch (e) {
      setError(formatProspectFetchError(e));
    } finally {
      setPublicAutofilling(false);
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
    setIndustrySubvertical("");
    setCompanySize("");
    setGeography("");
    setBusinessModel("");
    setTechStack("");
    setFundingOwnership("");
    setRecentNewsEvents("");
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
              <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2">
                <div className="text-xs text-text3">
                  Auto-fill company basics (public knowledge) from Company name / Website.
                </div>
                <button
                  type="button"
                  onClick={autofillFromPublicInfo}
                  disabled={publicAutofilling || (!companyName.trim() && !websiteUrl.trim())}
                  className="rounded-[var(--radius2)] bg-accent px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#5b52ee] disabled:opacity-60"
                >
                  {publicAutofilling ? "Auto-filling…" : "Auto-fill from public info"}
                </button>
              </div>
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
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="block text-sm">
                <span className="text-text2">Industry (specific sub-vertical)</span>
                <input
                  value={industrySubvertical}
                  onChange={(e) => setIndustrySubvertical(e.target.value)}
                  className="mt-1 w-full rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-sm text-text"
                />
              </label>
              <label className="block text-sm">
                <span className="text-text2">Company size</span>
                <input
                  value={companySize}
                  onChange={(e) => setCompanySize(e.target.value)}
                  className="mt-1 w-full rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-sm text-text"
                />
              </label>
              <label className="block text-sm">
                <span className="text-text2">Geography</span>
                <input
                  value={geography}
                  onChange={(e) => setGeography(e.target.value)}
                  className="mt-1 w-full rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-sm text-text"
                />
              </label>
              <label className="block text-sm">
                <span className="text-text2">Business model</span>
                <input
                  value={businessModel}
                  onChange={(e) => setBusinessModel(e.target.value)}
                  className="mt-1 w-full rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-sm text-text"
                />
              </label>
              <label className="block text-sm">
                <span className="text-text2">Tech stack</span>
                <input
                  value={techStack}
                  onChange={(e) => setTechStack(e.target.value)}
                  className="mt-1 w-full rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-sm text-text"
                />
              </label>
              <label className="block text-sm">
                <span className="text-text2">Funding/ownership</span>
                <input
                  value={fundingOwnership}
                  onChange={(e) => setFundingOwnership(e.target.value)}
                  className="mt-1 w-full rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-sm text-text"
                />
              </label>
              <label className="block text-sm md:col-span-2">
                <span className="text-text2">Recent news/events</span>
                <input
                  value={recentNewsEvents}
                  onChange={(e) => setRecentNewsEvents(e.target.value)}
                  className="mt-1 w-full rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-sm text-text"
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
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                ref={uploadRef}
                type="file"
                accept=".pdf,.docx,.xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void extractFromUpload(f);
                }}
              />
              <button
                type="button"
                onClick={() => uploadRef.current?.click()}
                disabled={uploading}
                className="rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-sm font-semibold text-text transition hover:bg-surface3 disabled:opacity-50"
              >
                {uploading ? "Extracting…" : "Upload info (PDF/DOCX/XLSX/CSV)"}
              </button>
              <div className="text-xs text-text3">
                Upload call notes, an org chart, a LinkedIn export, or any internal doc. We’ll extract key details and
                append them into Additional context.
              </div>
            </div>
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
