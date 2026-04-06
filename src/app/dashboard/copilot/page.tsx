"use client";

import { useEffect, useRef, useState } from "react";

type Metric = { label: string; value: string };
type ChatRole = "assistant" | "user";

type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  metrics?: Metric[];
  suggestions?: string[];
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
  const endRef = useRef<HTMLDivElement | null>(null);

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
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ message: text })
      });

      const payload = (await res.json()) as {
        response?: string;
        metrics?: Metric[];
        suggestions?: string[];
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
          suggestions: payload.suggestions ?? []
        }
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-120px)] min-h-[580px] flex-col rounded-2xl border border-[#2a2e3f] bg-[#141420]">
      <div className="border-b border-[#2a2e3f] px-5 py-4">
        <div className="text-lg text-[#f0f0f8]">AI Copilot</div>
        <div className="text-sm text-[#9090b0]">
          Strategy, diagnostics, and next actions for your growth team
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6">
        <div className="space-y-4">
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} onSuggestion={sendMessage} />
          ))}

          {loading ? (
            <div className="flex items-start gap-3">
              <Avatar role="assistant" />
              <div className="rounded-2xl border border-[#2a2e3f] bg-[#1e1e2e] px-4 py-3 text-sm text-[#9090b0]">
                Thinking...
              </div>
            </div>
          ) : null}
          <div ref={endRef} />
        </div>
      </div>

      <div className="border-t border-[#2a2e3f] px-4 py-4 md:px-6">
        <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
          {HINTS.map((hint) => (
            <button
              key={hint}
              onClick={() => sendMessage(hint)}
              className="rounded-xl border border-[#2a2e3f] bg-[#1e1e2e] px-3 py-2 text-xs text-[#f0f0f8] hover:bg-white/5"
            >
              {hint}
            </button>
          ))}
        </div>

        {error ? (
          <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
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
            placeholder="Ask Copilot anything..."
            className="w-full rounded-xl border border-[#2a2e3f] bg-black/20 px-4 py-3 text-sm text-[#f0f0f8] placeholder:text-[#9090b0] focus:border-[#7c6cff] focus:outline-none focus:ring-2 focus:ring-[#7c6cff]/30"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading}
            className="rounded-xl bg-[#b8ff6c] px-4 py-3 text-sm font-medium text-black disabled:opacity-60"
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
    <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-[#7c6cff]/25 text-xs text-[#f0f0f8] ring-1 ring-[#7c6cff]/40">
      AI
    </div>
  ) : (
    <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-[#b8ff6c]/20 text-xs text-[#f0f0f8] ring-1 ring-[#b8ff6c]/40">
      You
    </div>
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

  return (
    <div className={`flex items-start gap-3 ${isAI ? "" : "justify-end"}`}>
      {isAI ? <Avatar role="assistant" /> : null}

      <div
        className={`max-w-[88%] rounded-2xl border px-4 py-3 text-sm leading-6 ${
          isAI
            ? "border-[#2a2e3f] bg-[#1e1e2e] text-[#f0f0f8]"
            : "border-[#2a2e3f] bg-[#141420] text-[#f0f0f8]"
        }`}
      >
        <div className="whitespace-pre-wrap">{message.text}</div>

        {isAI && message.metrics?.length ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {message.metrics.map((m) => (
              <div
                key={`${m.label}-${m.value}`}
                className="rounded-xl border border-[#2a2e3f] bg-black/20 px-3 py-2"
              >
                <div className="text-[11px] uppercase tracking-wider text-[#9090b0]">
                  {m.label}
                </div>
                <div className="mt-1 text-sm text-[#f0f0f8]">{m.value}</div>
              </div>
            ))}
          </div>
        ) : null}

        {isAI && message.suggestions?.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.suggestions.map((s) => (
              <button
                key={s}
                onClick={() => onSuggestion(s)}
                className="rounded-full border border-[#2a2e3f] bg-black/20 px-3 py-1.5 text-xs text-[#f0f0f8] hover:bg-white/5"
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

