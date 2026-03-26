"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

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
        ? (JSON.parse(raw) as { summary?: string; error?: string })
        : ({ error: raw || "Server error" } as any)) as {
        summary?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Scan failed.");
      setSummary(data.summary ?? null);
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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-3xl text-text" style={{ fontFamily: "var(--font-heading)" }}>
            Market Research
          </div>
          <div className="mt-2 text-sm text-text2">
            Scan your website and competitors, then ask questions using stored evidence.
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
            className="rounded-[var(--radius2)] bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#5b52ee] disabled:opacity-60"
          >
            {running ? "Running scan…" : "Run scan"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-[var(--radius)] border border-red bg-[rgba(248,113,113,0.12)] p-4 text-sm text-red">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-[var(--radius)] border border-border bg-surface p-4 lg:col-span-2">
          <div className="mb-2 text-sm text-text">Scan inputs</div>
          {loading ? (
            <div className="text-sm text-text2">Loading…</div>
          ) : (
            <div className="space-y-2 text-sm text-text2">
              <div className="rounded-[var(--radius2)] border border-border bg-surface2 p-3">
                <div className="text-text">Base product</div>
                <div className="mt-1">
                  <span className="text-text2">Website:</span>{" "}
                  <span className="text-text">{baseUrl || "Not set"}</span>
                </div>
              </div>
              <div className="rounded-[var(--radius2)] border border-border bg-surface2 p-3">
                <div className="text-text">Competitors</div>
                <div className="mt-2 space-y-1">
                  {competitors.length ? (
                    competitors.map((c, i) => (
                      <div key={`${c.website_url}-${i}`} className="flex items-center justify-between gap-3">
                        <div className="truncate text-text">{c.name || "Competitor"}</div>
                        <div className="truncate text-text2">{c.website_url}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-text2">No competitors set yet.</div>
                  )}
                </div>
              </div>
              {!key ? (
                <div className="rounded-[var(--radius2)] border border-border bg-surface2 p-3">
                  Add your Anthropic key in the sidebar to generate real summaries and answers.
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="rounded-[var(--radius)] border border-border bg-surface p-4">
          <div className="mb-2 text-sm text-text">What this covers (MVP)</div>
          <ul className="space-y-2 text-sm text-text2">
            <li>- Your homepage content</li>
            <li>- Competitor homepage content</li>
            <li>- AI summary + comparisons</li>
            <li>- Q&A grounded in those snapshots</li>
          </ul>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[var(--radius)] border border-border bg-surface p-4">
          <div className="mb-2 text-sm text-text">Latest scan summary</div>
          <div className="whitespace-pre-wrap text-sm leading-6 text-text2">
            {summary ?? (running ? "Generating summary…" : "Run a scan to generate a summary.")}
          </div>
        </div>

        <div className="rounded-[var(--radius)] border border-border bg-surface p-4">
          <div className="mb-2 text-sm text-text">Ask Market Research</div>
          <div className="text-sm text-text2">
            Ask questions like “How do competitors position vs us?” or “What should we change on our homepage?”
          </div>

          <div className="mt-3 flex gap-2">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question…"
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
              {asking ? "…" : "Ask"}
            </button>
          </div>

          <div className="mt-3 rounded-[var(--radius2)] border border-border bg-surface2 p-3 text-sm text-text2">
            {answer ?? (asking ? "Thinking…" : "Your answer will appear here.")}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {[
              "Compare our positioning vs competitors",
              "What claims do competitors lead with?",
              "What should our homepage headline be?"
            ].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setQuestion(q)}
                className="rounded-full border border-border bg-surface2 px-3 py-1.5 text-xs font-semibold text-text transition hover:bg-surface3 hover:border-border2"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

