"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AiProgressBar, AI_PROGRESS_ESTIMATE } from "@/app/dashboard/_components/AiProgressBar";

type Metric = { label: string; value: string };
type ChatRole = "assistant" | "user";
type SuggestedUpdate = { module: string; href: string; action: string };

type PinnedSignal = { title: string; category: string; module: string } | null;

type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  metrics?: Metric[];
  suggestions?: string[];
  suggested_updates?: SuggestedUpdate[];
  signalTitle?: string;
};

const CATEGORY_STYLE: Record<string, string> = {
  COMPETITOR: "bg-[rgba(248,113,113,0.12)] text-red border-[rgba(248,113,113,0.3)]",
  POSITIONING: "bg-[rgba(139,92,246,0.12)] text-[#a78bfa] border-[rgba(139,92,246,0.3)]",
  ICP: "bg-[rgba(56,189,248,0.12)] text-[#38bdf8] border-[rgba(56,189,248,0.3)]",
  MARKET: "bg-[rgba(251,191,36,0.12)] text-yellow border-[rgba(251,191,36,0.3)]",
  BATTLECARD: "bg-[rgba(52,211,153,0.12)] text-green border-[rgba(52,211,153,0.3)]",
};

const HINTS = [
  "LinkedIn audit",
  "GTM brief",
  "Deal killers",
  "Social post",
  "Customer love",
  "vs competitor",
  "Top content",
  "Predict ROAS"
];

const OPENING_MESSAGE: ChatMessage = {
  id: "opening",
  role: "assistant",
  text: "I am your AI Copilot for AI Marketing Workbench. I can help with campaign diagnostics, positioning, content ideas, pipeline influence analysis, and action plans by channel. Ask me anything in plain language, and I will return concrete next steps.",
  metrics: [
    { label: "Focus", value: "Pipeline + ROAS" },
    { label: "Speed", value: "< 60 sec plan" },
    { label: "Depth", value: "Tactical + strategic" }
  ],
  suggestions: ["Run a LinkedIn audit", "Build this week's GTM brief", "Find deal killers"]
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export default function CopilotPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([OPENING_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pinnedSignal, setPinnedSignal] = useState<PinnedSignal>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const signalParam = params.get("signal");
    if (signalParam) {
      try {
        const parsed = JSON.parse(decodeURIComponent(signalParam)) as PinnedSignal;
        if (parsed?.title) setPinnedSignal(parsed);
      } catch {
        // ignore malformed
      }
    }
    const qParam = params.get("q");
    if (qParam) {
      setInput((prev) => prev || decodeURIComponent(qParam));
    }
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  async function sendMessage(raw: string) {
    const text = raw.trim();
    if (!text || loading) return;

    setError(null);
    setInput("");
    setMessages((prev) => [...prev, { id: uid(), role: "user", text }]);
    setLoading(true);

    try {
      const history = messages
        .filter((m) => m.id !== "opening")
        .map((m) => ({ role: m.role, content: m.text }));

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: text,
          history,
          signal: pinnedSignal?.title || undefined
        })
      });

      const payload = (await res.json()) as {
        response?: string;
        metrics?: Metric[];
        suggestions?: string[];
        suggested_updates?: SuggestedUpdate[];
        needs_input?: boolean;
        questions?: string[];
        message?: string | null;
        error?: string;
        code?: string;
      };

      if (!res.ok) {
        setError(payload.error ?? "Something went wrong.");
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "assistant",
          text: payload.response ?? "I could not generate a response.",
          metrics: payload.metrics ?? [],
          suggestions: payload.suggestions ?? [],
          suggested_updates: payload.suggested_updates ?? [],
          signalTitle: pinnedSignal?.title
        }
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-120px)] min-h-[580px] flex-col hs-card">
      <div className="border-b border-border px-5 py-4">
        <div className="text-lg text-heading">AI Copilot</div>
        <div className="text-sm text-text2">
          Strategy, diagnostics, and next actions for your growth team
        </div>
      </div>

      {pinnedSignal && (
        <div className="flex items-center gap-2.5 border-b border-border bg-surface2 px-5 py-2.5">
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-text3">
            Signal attached
          </span>
          <span
            className={`shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${CATEGORY_STYLE[pinnedSignal.category] ?? "bg-surface3 text-text3 border-border"}`}
          >
            {pinnedSignal.category}
          </span>
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-text">
            {pinnedSignal.title}
          </span>
          <button
            onClick={() => setPinnedSignal(null)}
            className="shrink-0 text-[11px] text-text3 transition hover:text-text"
            aria-label="Dismiss signal"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6">
        <div className="space-y-4">
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} onSuggestion={sendMessage} />
          ))}

          {loading ? (
            <div className="flex items-start gap-3">
              <Avatar role="assistant" />
              <div className="min-w-0 flex-1">
                <AiProgressBar
                  active
                  variant="dark"
                  title={pinnedSignal ? `Processing signal: ${pinnedSignal.title.slice(0, 50)}…` : "Copilot is thinking…"}
                  estimate={AI_PROGRESS_ESTIMATE.chat}
                  durationMs={60_000}
                  className="!p-3"
                />
              </div>
            </div>
          ) : null}
          <div ref={endRef} />
        </div>
      </div>

      <div className="border-t border-border px-4 py-4 md:px-6">
        {!pinnedSignal && (
          <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
            {HINTS.map((hint) => (
              <button
                key={hint}
                onClick={() => sendMessage(hint)}
                className="rounded-xl border border-border bg-primary-light px-3 py-2 text-xs text-heading hover:bg-surface2"
              >
                {hint}
              </button>
            ))}
          </div>
        )}

        {error ? (
          <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red">
            {error}
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            placeholder={pinnedSignal ? `Tell Copilot what to do about this signal…` : "Ask Copilot anything..."}
            className="w-full hs-card2 px-4 py-3 text-sm text-heading placeholder:text-text2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading}
            className="rounded-xl bg-amber px-4 py-3 text-sm font-medium text-black disabled:opacity-60"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

function Avatar({ role }: { role: ChatRole }) {
  return role === "assistant" ? (
    <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-primary/25 text-xs text-heading ring-1 ring-primary/40">
      AI
    </div>
  ) : (
    <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-amber/20 text-xs text-heading ring-1 ring-teal/40">
      You
    </div>
  );
}

function CarryButton({ response, updates, signalTitle }: { response: string; updates: SuggestedUpdate[]; signalTitle?: string }) {
  const [copied, setCopied] = useState(false);

  function buildSummary() {
    const lines: string[] = [];
    if (signalTitle) lines.push(`📡 *Signal:* ${signalTitle}`);
    lines.push(`*AI recommendation:* ${response.slice(0, 280)}${response.length > 280 ? "…" : ""}`);
    if (updates.length) {
      lines.push(`*Suggested updates:*`);
      updates.forEach((u) => lines.push(`• *${u.module}* — ${u.action}`));
    }
    return lines.join("\n");
  }

  async function copy() {
    await navigator.clipboard.writeText(buildSummary());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={copy}
      className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface2 px-3 py-1.5 text-[11px] font-semibold text-text2 transition hover:bg-surface3 hover:text-text"
    >
      {copied ? "✓ Copied" : "📋 Copy team summary"}
    </button>
  );
}

function MessageBubble({
  message,
  onSuggestion
}: {
  message: ChatMessage;
  onSuggestion: (value: string) => void;
}) {
  const isAI = message.role === "assistant";
  const hasUpdates = isAI && (message.suggested_updates?.length ?? 0) > 0;

  return (
    <div className={`flex items-start gap-3 ${isAI ? "" : "justify-end"}`}>
      {isAI ? <Avatar role="assistant" /> : null}

      <div
        className={`max-w-[88%] rounded-2xl border px-4 py-3 text-sm leading-6 ${
          isAI
            ? "border-border bg-primary-light text-heading"
            : "border-border bg-surface text-heading"
        }`}
      >
        <div className="whitespace-pre-wrap">{message.text}</div>

        {isAI && message.metrics?.length ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {message.metrics.map((m) => (
              <div
                key={`${m.label}-${m.value}`}
                className="hs-card2 px-3 py-2"
              >
                <div className="text-[11px] uppercase tracking-wider text-text2">{m.label}</div>
                <div className="mt-1 text-sm text-heading">{m.value}</div>
              </div>
            ))}
          </div>
        ) : null}

        {hasUpdates && (
          <div className="mt-4 border-t border-border pt-3">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text3">
              Suggested updates
            </div>
            <div className="space-y-2">
              {message.suggested_updates!.map((u) => (
                <Link
                  key={u.href}
                  href={u.href}
                  className="flex items-center gap-2 rounded-lg border border-border bg-surface2 px-3 py-2 transition hover:border-primary/40 hover:bg-surface"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-semibold text-text">{u.module}</div>
                    <div className="text-[11px] text-text2">{u.action}</div>
                  </div>
                  <span className="shrink-0 text-text3 transition group-hover:text-primary">→</span>
                </Link>
              ))}
            </div>
            <CarryButton
              response={message.text}
              updates={message.suggested_updates!}
              signalTitle={message.signalTitle}
            />
          </div>
        )}

        {isAI && message.suggestions?.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.suggestions.map((s) => (
              <button
                key={s}
                onClick={() => onSuggestion(s)}
                className="rounded-full border border-border bg-surface2 px-3 py-1.5 text-xs text-heading hover:bg-surface2"
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {!isAI ? <Avatar role="user" /> : null}
    </div>
  );
}
