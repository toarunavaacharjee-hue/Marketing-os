"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Markdown } from "@/lib/Markdown";
import { readMrCache, writeMrCache } from "@/lib/marketResearchCache";
import { loadLatestScanOnce } from "@/lib/marketResearchRemote";
import type { MarketResearchScanResult } from "@/lib/marketResearchTypes";
import { downloadMarketResearchPdf } from "@/lib/marketResearchPdf";

const ANTHROPIC_KEY_STORAGE = "marketing_os_anthropic_api_key";

type ProfilePayload = {
  product: {
    id: string;
    name: string | null;
    website_url: string | null;
    category: string | null;
    icp_summary: string | null;
    positioning_summary: string | null;
  };
  competitors: Array<{ id?: string; name: string; website_url: string }>;
};

export default function MarketResearchClient() {
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [resultJson, setResultJson] = useState<MarketResearchScanResult | null>(null);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const key = useMemo(() => {
    if (typeof window === "undefined") return "";
    return (window.localStorage.getItem(ANTHROPIC_KEY_STORAGE) ?? "").trim();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/product/profile");
      const contentType = res.headers.get("content-type") ?? "";
      const raw = await res.text();
      const data = (contentType.includes("application/json")
        ? (JSON.parse(raw) as ProfilePayload & { error?: string })
        : ({ error: raw || "Server error" } as any)) as ProfilePayload & {
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Failed to load product profile.");
      setProfile(data);

      const pid = data.product.id;
      const cached = readMrCache(pid);
      // If we only have cached `summary` but `resultJson` is missing/null,
      // we must still fetch the latest scan so UI sections render.
      if (cached) {
        setSummary(cached.summary);
        if (cached.resultJson) {
          setResultJson(cached.resultJson);
          return;
        }
      }

      const latest = await loadLatestScanOnce(pid);
      if (latest) {
        setSummary(latest.summary);
        setResultJson(latest.resultJson);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }

  async function runScan() {
    setRunning(true);
    setError(null);
    setSummary(null);
    setResultJson(null);
    setAnswer(null);
    try {
      const res = await fetch("/api/research/run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(key ? { "x-anthropic-key": key } : {})
        }
      });
      const contentType = res.headers.get("content-type") ?? "";
      const raw = await res.text();
      const data = (contentType.includes("application/json")
        ? (JSON.parse(raw) as {
            summary?: string;
            result_json?: MarketResearchScanResult | null;
            error?: string;
          })
        : ({ error: raw || "Server error" } as any)) as {
        summary?: string;
        result_json?: MarketResearchScanResult | null;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Scan failed.");
      setSummary(data.summary ?? null);
      setResultJson(data.result_json ?? null);
      if (profile?.product.id) {
        writeMrCache(profile.product.id, {
          summary: data.summary ?? null,
          resultJson: data.result_json ?? null
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed.");
    } finally {
      setRunning(false);
    }
  }

  async function ask() {
    const q = question.trim();
    if (!q) return;
    setAsking(true);
    setError(null);
    setAnswer(null);
    try {
      const res = await fetch("/api/research/ask", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(key ? { "x-anthropic-key": key } : {})
        },
        body: JSON.stringify({ question: q })
      });
      const contentType = res.headers.get("content-type") ?? "";
      const raw = await res.text();
      const data = (contentType.includes("application/json")
        ? (JSON.parse(raw) as { answer?: string; error?: string })
        : ({ error: raw || "Server error" } as any)) as {
        answer?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Failed to answer.");
      setAnswer(data.answer ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to answer.");
    } finally {
      setAsking(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const baseUrl = profile?.product.website_url ?? "";
  const competitors = profile?.competitors ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div
            className="text-[28px] font-extrabold tracking-[-0.5px] text-text"
            style={{ fontFamily: "var(--font-heading)", lineHeight: 1.1 }}
          >
            Market Research <span className="text-[20px]">🔭</span>
          </div>
          <div className="mt-2 text-[13px] text-text2">
            AI-powered intelligence scanning your product + competitors
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/settings/product"
            className="rounded-[var(--radius2)] border border-border bg-surface2 px-4 py-2 text-sm font-semibold text-text transition hover:bg-surface3 hover:border-border2"
          >
            Edit product profile
          </Link>
          <button
            onClick={runScan}
            disabled={running || loading}
            className="inline-flex items-center gap-2 rounded-[var(--radius2)] bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#5b52ee] disabled:opacity-60"
          >
            🧠 {running ? "Running AI Scan…" : "Run AI Scan"}
          </button>
          <button
            type="button"
            onClick={() => setShowReport(true)}
            disabled={!summary}
            className="rounded-[var(--radius2)] border border-border bg-surface2 px-4 py-2 text-sm font-semibold text-text transition hover:bg-surface3 hover:border-border2 disabled:opacity-50"
            title={summary ? "Open latest scan report" : "Run a scan first"}
          >
            View report
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-[var(--radius)] border border-red bg-[rgba(248,113,113,0.12)] p-4 text-sm text-red">
          {error}
        </div>
      ) : null}

      {/* Top row: signals + assistant */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-[var(--radius)] border border-border bg-surface p-5 lg:col-span-2">
          <div className="mb-3 font-[var(--font-heading)] text-[14px] font-bold text-text">
            🔥 Top Market Signals This Week
          </div>

          <div className="space-y-3">
            {resultJson?.signals?.length ? (
              resultJson.signals.slice(0, 6).map((s, idx) => (
                <SignalRow
                  key={`${s.title}-${idx}`}
                  icon={s.severity === "risk" ? "⚠️" : s.severity === "opportunity" ? "📈" : "💡"}
                  iconBg={
                    s.severity === "risk"
                      ? "rgba(248,113,113,0.15)"
                      : s.severity === "opportunity"
                        ? "rgba(52,211,153,0.15)"
                        : "rgba(167,139,250,0.15)"
                  }
                  title={s.title}
                  desc={s.description}
                  meta={`Source: ${s.source} · ${s.recency}`}
                />
              ))
            ) : (
              <div className="rounded-[var(--radius2)] border border-border bg-surface2 p-4 text-sm text-text2">
                Run an AI scan to generate signals.
              </div>
            )}
          </div>

          <div className="mt-4 rounded-[var(--radius2)] border border-border bg-surface2 p-3 text-sm text-text2">
            <div className="text-text">Scan inputs</div>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              <div className="rounded-[var(--radius2)] border border-border bg-surface p-3">
                <div className="text-xs font-semibold uppercase tracking-[0.5px] text-text3">
                  Base product
                </div>
                <div className="mt-1 text-sm text-text">
                  {profile?.product.name ?? "—"}
                </div>
                <div className="mt-1 text-xs text-text2 truncate">
                  {baseUrl || "Website not set"}
                </div>
              </div>
              <div className="rounded-[var(--radius2)] border border-border bg-surface p-3">
                <div className="text-xs font-semibold uppercase tracking-[0.5px] text-text3">
                  Competitors
                </div>
                <div className="mt-2 space-y-1">
                  {competitors.length ? (
                    competitors.slice(0, 4).map((c, i) => (
                      <div key={`${c.website_url}-${i}`} className="flex items-center justify-between gap-3">
                        <div className="truncate text-sm text-text">{c.name || "Competitor"}</div>
                        <div className="truncate text-xs text-text2">{c.website_url}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-text2">No competitors set yet.</div>
                  )}
                </div>
              </div>
            </div>
            {!key ? (
              <div className="mt-2 text-xs text-text2">
                Add your Anthropic key in the sidebar to generate real summaries and answers.
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
            <div className="mb-2 font-[var(--font-heading)] text-[14px] font-bold text-text">
              🤖 AI Research Assistant
            </div>
            <div className="rounded-[var(--radius2)] border border-border bg-surface2 p-3 text-sm text-text2">
              Ask me anything about your market, competitors, or buyer pain points…
            </div>

            <div className="mt-3 flex gap-2">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. What are buyers saying about onboarding?"
                className="w-full rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-sm text-text placeholder:text-text3"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    ask();
                  }
                }}
              />
              <button
                onClick={ask}
                disabled={asking}
                className="rounded-[var(--radius2)] bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#5b52ee] disabled:opacity-60"
              >
                Ask
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {["Buyer pain", "Competitor", "Best segment"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    if (t === "Buyer pain") setQuestion("What do buyers complain about in our category?");
                    if (t === "Competitor") setQuestion("How does our main competitor position against us?");
                    if (t === "Best segment") setQuestion("Which segment has the highest opportunity and why?");
                  }}
                  className="rounded-[6px] border border-border bg-surface2 px-3 py-1.5 text-xs font-semibold text-text2 transition hover:bg-surface3 hover:border-border2 hover:text-text"
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="mt-3 max-h-[260px] overflow-auto rounded-[var(--radius2)] border border-border bg-surface2 p-3">
              {answer ? (
                <Markdown content={answer} />
              ) : (
                <div className="text-sm text-text2">
                  {asking ? "Thinking…" : "Your answer will appear here."}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
            <div className="mb-3 font-[var(--font-heading)] text-[14px] font-bold text-text">
              📡 Active Monitoring Sources
            </div>
            <div className="space-y-2 text-sm text-text2">
              {resultJson?.monitoring_sources?.length ? (
                resultJson.monitoring_sources.slice(0, 10).map((s, idx) => (
                  <SourceRow
                    key={`${s.label}-${idx}`}
                    label={s.note ? `${s.label} — ${s.note}` : s.label}
                    status={s.status}
                  />
                ))
              ) : (
                <div className="text-sm text-text2">Run an AI scan to generate sources.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Opportunity table */}
      <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
        <div className="mb-3 font-[var(--font-heading)] text-[14px] font-bold text-text">
          🌍 Market Opportunity Map
        </div>
        <div className="overflow-auto rounded-[var(--radius2)] border border-border bg-surface2">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.5px] text-text3">
                <th className="px-4 py-3">Segment</th>
                <th className="px-4 py-3">Opportunity score</th>
                <th className="px-4 py-3">TAM signal</th>
                <th className="px-4 py-3">Competition</th>
              </tr>
            </thead>
            <tbody className="text-text">
              {resultJson?.opportunity_map?.length ? (
                resultJson.opportunity_map.slice(0, 6).map((r, idx) => (
                  <OpportunityRow
                    key={`${r.segment}-${idx}`}
                    segment={r.segment}
                    score={`${Math.round(r.opportunity_score)}/100`}
                    tam={r.tam_signal}
                    comp={r.competition}
                  />
                ))
              ) : (
                <tr>
                  <td className="px-4 py-4 text-sm text-text2" colSpan={4}>
                    Run an AI scan to generate an opportunity map.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Report modal */}
      {showReport ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setShowReport(false)}
          />
          <div className="relative w-full max-w-4xl rounded-[var(--radius)] border border-border bg-surface p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-[var(--font-heading)] text-[18px] font-extrabold text-text">
                  Market Research Report
                </div>
                <div className="mt-1 text-sm text-text2">
                  Latest scan summary. Kept as-is in this browser until you run a new AI scan.
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!summary) return;
                    downloadMarketResearchPdf({
                      productName: profile?.product.name ?? "Product",
                      summary,
                      resultJson
                    });
                  }}
                  disabled={!summary}
                  className="rounded-[var(--radius2)] bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#5b52ee] disabled:opacity-50"
                >
                  Download PDF
                </button>
                <button
                  type="button"
                  onClick={() => setShowReport(false)}
                  className="rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-sm font-semibold text-text transition hover:bg-surface3 hover:border-border2"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="mt-4 max-h-[70vh] overflow-auto rounded-[var(--radius2)] border border-border bg-surface2 p-4">
              {summary ? (
                <Markdown content={summary} />
              ) : (
                <div className="text-sm text-text2">Run a scan to generate a report.</div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SignalRow({
  icon,
  iconBg,
  title,
  desc,
  meta
}: {
  icon: string;
  iconBg: string;
  title: string;
  desc: string;
  meta: string;
}) {
  return (
    <div className="flex gap-3 border-t border-border pt-3 first:border-t-0 first:pt-0">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] text-[16px]"
        style={{ background: iconBg }}
      >
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-[13px] font-semibold text-text">{title}</div>
        <div className="mt-1 text-[12px] leading-5 text-text2">{desc}</div>
        <div className="mt-1 text-[11px] text-text3">{meta}</div>
      </div>
    </div>
  );
}

function SourceRow({
  label,
  status
}: {
  label: string;
  status: "ok" | "warn" | "err";
}) {
  const dot =
    status === "ok"
      ? "bg-green"
      : status === "warn"
        ? "bg-yellow"
        : "bg-red";
  return (
    <div className="flex items-center justify-between">
      <div className="text-[13px] text-text2">{label}</div>
      <span className={`h-2 w-2 rounded-full ${dot}`} />
    </div>
  );
}

function Tag({ tone, children }: { tone: "green" | "yellow" | "red" | "blue" | "purple"; children: string }) {
  const cls =
    tone === "green"
      ? "bg-[rgba(52,211,153,0.15)] text-green"
      : tone === "yellow"
        ? "bg-[rgba(251,191,36,0.15)] text-yellow"
        : tone === "red"
          ? "bg-[rgba(248,113,113,0.15)] text-red"
          : tone === "blue"
            ? "bg-[rgba(56,189,248,0.15)] text-accent3"
            : "bg-[rgba(167,139,250,0.15)] text-accent2";
  return (
    <span className={`inline-flex items-center rounded px-2 py-1 text-[11px] font-semibold ${cls}`}>
      {children}
    </span>
  );
}

function OpportunityRow({
  segment,
  score,
  tam,
  comp
}: {
  segment: string;
  score: string;
  tam: "Low" | "Medium" | "High" | "Very High" | "Growing";
  comp: "Low" | "Medium" | "High";
}) {
  const tamTone =
    tam === "Very High"
      ? "blue"
      : tam === "High"
        ? "green"
        : tam === "Growing"
          ? "purple"
          : tam === "Low"
            ? "red"
            : "yellow";
  const compTone = comp === "Low" ? "green" : comp === "Medium" ? "yellow" : "red";
  return (
    <tr className="border-t border-border">
      <td className="px-4 py-3 text-sm font-semibold text-text">{segment}</td>
      <td className="px-4 py-3 text-sm text-text2">{score}</td>
      <td className="px-4 py-3">
        <Tag tone={tamTone as any}>{tam}</Tag>
      </td>
      <td className="px-4 py-3">
        <Tag tone={compTone as any}>{comp}</Tag>
      </td>
    </tr>
  );
}

