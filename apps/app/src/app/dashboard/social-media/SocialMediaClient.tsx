"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AiProgressBar, AI_PROGRESS_ESTIMATE } from "@/app/dashboard/_components/AiProgressBar";
import { NextStepNudge } from "@/app/dashboard/_components/NextStepNudge";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

// ─── Types ──────────────────────────────────────────────────────────────────

type Platform = "linkedin" | "twitter" | "instagram" | "facebook" | "other";
type PostFormat = "text" | "carousel" | "video" | "poll" | "article" | "thread" | "story" | "reel";
type PostStatus = "draft" | "scheduled" | "published" | "paused";

type SocialPost = {
  id: string;
  platform: Platform;
  format: PostFormat;
  text: string;
  status: PostStatus;
  scheduledAt: string;
  audience: string;
  campaignTag: string;
  draftUrl: string;
  notes: string;
  createdAt: string;
};

type AiHistoryEntry = { id: string; at: string; prompt: string; platform: Platform; text: string };

type Workspace = {
  posts: SocialPost[];
  calendarNotes: string;
  performanceNotes: string;
  prompt: string;
  promptPlatform: Platform;
  lastOutput: string;
  aiHistory: AiHistoryEntry[];
};

// ─── Constants ───────────────────────────────────────────────────────────────

const PLATFORMS: { id: Platform; label: string; color: string; charLimit: number }[] = [
  { id: "linkedin", label: "LinkedIn", color: "text-[#0077B5] border-[#0077B5]/30 bg-[#0077B5]/10", charLimit: 3000 },
  { id: "twitter", label: "X / Twitter", color: "text-text border-border bg-surface2", charLimit: 280 },
  { id: "instagram", label: "Instagram", color: "text-[#E1306C] border-[#E1306C]/30 bg-[#E1306C]/10", charLimit: 2200 },
  { id: "facebook", label: "Facebook", color: "text-[#4267B2] border-[#4267B2]/30 bg-[#4267B2]/10", charLimit: 63206 },
  { id: "other", label: "Other", color: "text-text2 border-border bg-surface2", charLimit: 0 },
];

const FORMATS_BY_PLATFORM: Record<Platform, PostFormat[]> = {
  linkedin: ["text", "article", "carousel", "video", "poll"],
  twitter: ["text", "thread", "poll"],
  instagram: ["text", "carousel", "video", "reel", "story"],
  facebook: ["text", "video", "story", "reel"],
  other: ["text", "video", "carousel"],
};

const STATUS_STYLES: Record<PostStatus, string> = {
  draft: "border-border bg-surface2 text-text2",
  scheduled: "border-primary/30 bg-primary/10 text-primary",
  published: "border-teal/30 bg-teal/10 text-teal",
  paused: "border-yellow-500/30 bg-yellow-500/10 text-yellow-600",
};

const STATUS_OPTIONS: PostStatus[] = ["draft", "scheduled", "published", "paused"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function platformInfo(id: Platform) {
  return PLATFORMS.find((p) => p.id === id) ?? PLATFORMS[PLATFORMS.length - 1]!;
}

function charCount(text: string, platform: Platform): { count: number; limit: number; pct: number } {
  const limit = platformInfo(platform).charLimit;
  const count = text.length;
  const pct = limit > 0 ? Math.min(count / limit, 1) : 0;
  return { count, limit, pct };
}

function charBarColor(pct: number): string {
  if (pct >= 0.95) return "bg-red";
  if (pct >= 0.8) return "bg-yellow-500";
  return "bg-teal";
}

function charLabel(count: number, limit: number): string {
  if (limit === 0) return `${count}`;
  const rem = limit - count;
  if (rem < 0) return `${Math.abs(rem)} over`;
  return `${rem} left`;
}

function emptyPost(platform: Platform = "linkedin"): SocialPost {
  return {
    id: crypto.randomUUID(),
    platform,
    format: "text",
    text: "",
    status: "draft",
    scheduledAt: "",
    audience: "",
    campaignTag: "",
    draftUrl: "",
    notes: "",
    createdAt: new Date().toISOString(),
  };
}

function emptyWorkspace(): Workspace {
  return {
    posts: [],
    calendarNotes: "",
    performanceNotes: "",
    prompt: "",
    promptPlatform: "linkedin",
    lastOutput: "",
    aiHistory: [],
  };
}

function migratePost(raw: unknown): SocialPost {
  const base = emptyPost();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  return {
    id: String(o.id || crypto.randomUUID()),
    platform: (["linkedin", "twitter", "instagram", "facebook", "other"].includes(String(o.platform)) ? o.platform : "linkedin") as Platform,
    format: (["text", "carousel", "video", "poll", "article", "thread", "story", "reel"].includes(String(o.format)) ? o.format : "text") as PostFormat,
    text: String(o.text ?? ""),
    status: (["draft", "scheduled", "published", "paused"].includes(String(o.status)) ? o.status : "draft") as PostStatus,
    scheduledAt: String(o.scheduledAt ?? ""),
    audience: String(o.audience ?? ""),
    campaignTag: String(o.campaignTag ?? ""),
    draftUrl: String(o.draftUrl ?? ""),
    notes: String(o.notes ?? ""),
    createdAt: String(o.createdAt ?? new Date().toISOString()),
  };
}

function migrateWorkspace(v: unknown): Workspace {
  const base = emptyWorkspace();
  if (!v || typeof v !== "object") return base;
  const o = v as Record<string, unknown>;
  return {
    posts: Array.isArray(o.posts) ? o.posts.map(migratePost) : [],
    calendarNotes: typeof o.calendarNotes === "string" ? o.calendarNotes : "",
    performanceNotes: typeof o.performanceNotes === "string" ? o.performanceNotes : "",
    prompt: typeof o.prompt === "string" ? o.prompt : "",
    promptPlatform: (["linkedin", "twitter", "instagram", "facebook", "other"].includes(String(o.promptPlatform)) ? o.promptPlatform : "linkedin") as Platform,
    lastOutput: typeof o.lastOutput === "string" ? o.lastOutput : "",
    aiHistory: Array.isArray(o.aiHistory)
      ? (o.aiHistory as unknown[]).filter((h): h is AiHistoryEntry => !!h && typeof h === "object" && "text" in h).slice(0, 20)
      : [],
  };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function PlatformBadge({ platform, size = "sm" }: { platform: Platform; size?: "sm" | "xs" }) {
  const p = platformInfo(platform);
  return (
    <span className={`rounded-full border px-2 py-0.5 font-medium ${size === "xs" ? "text-[10px]" : "text-xs"} ${p.color}`}>
      {p.label}
    </span>
  );
}

function CharCounter({ text, platform }: { text: string; platform: Platform }) {
  const { count, limit, pct } = charCount(text, platform);
  if (limit === 0) return <span className="text-[10px] text-text3">{count} chars</span>;
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1 w-16 overflow-hidden rounded-full bg-surface3">
        <div className={`h-full rounded-full transition-all ${charBarColor(pct)}`} style={{ width: `${pct * 100}%` }} />
      </div>
      <span className={`text-[10px] ${pct >= 0.95 ? "text-red font-medium" : pct >= 0.8 ? "text-yellow-600" : "text-text3"}`}>
        {charLabel(count, limit)}
      </span>
    </div>
  );
}

function PostCard({
  post,
  expanded,
  onToggle,
  onChange,
  onRemove,
}: {
  post: SocialPost;
  expanded: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<SocialPost>) => void;
  onRemove: () => void;
}) {
  const formats = FORMATS_BY_PLATFORM[post.platform];

  return (
    <div className={`rounded-2xl border bg-surface shadow-sm transition-shadow ${expanded ? "border-primary/40 shadow-md" : "border-border hover:border-primary/20"}`}>
      {/* Collapsed header — always visible */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <PlatformBadge platform={post.platform} size="xs" />
            <span className="rounded border border-border bg-surface2 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-text3">
              {post.format}
            </span>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${STATUS_STYLES[post.status]}`}>
              {post.status}
            </span>
            {post.scheduledAt ? (
              <span className="text-[10px] text-text3">
                {new Date(post.scheduledAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
            ) : null}
            {post.campaignTag ? (
              <span className="rounded-full bg-surface3 px-2 py-0.5 text-[10px] text-text2">#{post.campaignTag}</span>
            ) : null}
          </div>
          <p className="line-clamp-2 text-sm text-text">
            {post.text.trim() || <span className="text-text3 italic">No copy yet…</span>}
          </p>
          {post.text && <CharCounter text={post.text} platform={post.platform} />}
        </div>
        <span className="mt-0.5 shrink-0 text-xs text-text3">{expanded ? "▲" : "▼"}</span>
      </button>

      {/* Expanded editing form */}
      {expanded ? (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text3">Platform</div>
              <select
                value={post.platform}
                onChange={(e) => {
                  const p = e.target.value as Platform;
                  const fmts = FORMATS_BY_PLATFORM[p];
                  onChange({ platform: p, format: fmts.includes(post.format) ? post.format : fmts[0]! });
                }}
                className="w-full rounded-lg border border-border bg-surface2 px-2 py-1.5 text-sm text-heading"
              >
                {PLATFORMS.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text3">Format</div>
              <select
                value={post.format}
                onChange={(e) => onChange({ format: e.target.value as PostFormat })}
                className="w-full rounded-lg border border-border bg-surface2 px-2 py-1.5 text-sm text-heading"
              >
                {formats.map((f) => (
                  <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text3">Status</div>
              <select
                value={post.status}
                onChange={(e) => onChange({ status: e.target.value as PostStatus })}
                className="w-full rounded-lg border border-border bg-surface2 px-2 py-1.5 text-sm text-heading"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text3">Scheduled</div>
              <input
                type="datetime-local"
                value={post.scheduledAt}
                onChange={(e) => onChange({ scheduledAt: e.target.value })}
                className="w-full rounded-lg border border-border bg-surface2 px-2 py-1.5 text-sm text-heading"
              />
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <div className="text-[10px] font-medium uppercase tracking-wide text-text3">Post copy</div>
              <CharCounter text={post.text} platform={post.platform} />
            </div>
            <textarea
              value={post.text}
              onChange={(e) => onChange({ text: e.target.value })}
              rows={5}
              placeholder="Write your post copy here…"
              className="w-full rounded-xl border border-border bg-surface2 px-3 py-2.5 text-sm text-heading placeholder:text-text3 focus:border-primary focus:outline-none"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text3">Target audience / segment</div>
              <input
                value={post.audience}
                onChange={(e) => onChange({ audience: e.target.value })}
                placeholder="e.g. Series A CMOs"
                className="w-full rounded-lg border border-border bg-surface2 px-2 py-1.5 text-sm text-heading placeholder:text-text3"
              />
            </div>
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text3">Campaign tag</div>
              <input
                value={post.campaignTag}
                onChange={(e) => onChange({ campaignTag: e.target.value })}
                placeholder="e.g. q3-launch"
                className="w-full rounded-lg border border-border bg-surface2 px-2 py-1.5 text-sm text-heading placeholder:text-text3"
              />
            </div>
          </div>

          <div>
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text3">Notes</div>
            <textarea
              value={post.notes}
              onChange={(e) => onChange({ notes: e.target.value })}
              rows={2}
              placeholder="Hashtags, mentions, visual brief, CTA…"
              className="w-full rounded-xl border border-border bg-surface2 px-3 py-2 text-sm text-heading placeholder:text-text3"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={onRemove}
              className="text-xs text-text3 hover:text-red"
            >
              Remove post
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SocialMediaClient({
  environmentId,
}: {
  environmentId: string;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const searchParams = useSearchParams();
  const qTopic = searchParams.get("topic") ?? "";
  const qProduct = searchParams.get("product") ?? "";
  const qSegment = searchParams.get("segment") ?? "";
  const qFrom = searchParams.get("from") ?? "";

  const [ws, setWs] = useState<Workspace>(() => emptyWorkspace());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [platformFilter, setPlatformFilter] = useState<Platform | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [strategyContext, setStrategyContext] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefilledRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: qErr } = await supabase
      .from("module_settings")
      .select("value_json")
      .eq("environment_id", environmentId)
      .eq("module", "social_media")
      .eq("key", "workspace")
      .maybeSingle();
    if (qErr) setError(qErr.message);
    const migrated = migrateWorkspace((data?.value_json ?? null) as unknown);
    if (!prefilledRef.current && qTopic && !migrated.prompt.trim()) {
      prefilledRef.current = true;
      const parts = [qTopic];
      if (qProduct) parts.push(`Product: ${qProduct}`);
      if (qSegment) parts.push(`Target segment: ${qSegment}`);
      migrated.prompt = parts.join("\n");
    }
    setWs(migrated);
    setLoading(false);
  }, [environmentId, supabase, qTopic, qProduct, qSegment]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let cancelled = false;
    async function loadCtx() {
      try {
        const [{ data: canvasRow }, { data: segs }] = await Promise.all([
          supabase.from("module_settings").select("value_json").eq("environment_id", environmentId).eq("module", "positioning_studio").eq("key", "canvas").maybeSingle(),
          supabase.from("segments").select("name,pain_points").eq("environment_id", environmentId).order("created_at", { ascending: false }).limit(4),
        ]);
        if (cancelled) return;
        const parts: string[] = [];
        const doc = (canvasRow?.value_json as { doc?: Record<string, string> } | null)?.doc;
        if (doc) {
          const lines: string[] = [];
          if (doc.category) lines.push(`Market category: ${doc.category}`);
          if (doc.target) lines.push(`Target customer: ${doc.target}`);
          if (doc.problem) lines.push(`Core problem: ${doc.problem}`);
          if (doc.solution) lines.push(`Solution: ${doc.solution}`);
          if (doc.diff) lines.push(`Differentiation: ${doc.diff}`);
          if (lines.length) parts.push(`Approved positioning:\n${lines.join("\n")}`);
        }
        const segList = (segs ?? []) as { name: string; pain_points?: string[] }[];
        if (segList.length) {
          const segLines = segList.map((s) => {
            const pains = (s.pain_points ?? []).slice(0, 2).join("; ");
            return pains ? `  - ${s.name} (pains: ${pains})` : `  - ${s.name}`;
          });
          parts.push(`ICP segments:\n${segLines.join("\n")}`);
        }
        setStrategyContext(parts.length ? `\n\n---\n${parts.join("\n\n")}\n---` : "");
      } catch { /* non-critical */ }
    }
    void loadCtx();
    return () => { cancelled = true; };
  }, [environmentId, supabase]);

  const persist = useCallback(async (next: Workspace) => {
    setSaving(true);
    const { error: upErr } = await supabase.from("module_settings").upsert({
      environment_id: environmentId,
      module: "social_media",
      key: "workspace",
      value_json: next,
    });
    setSaving(false);
    if (upErr) setError(upErr.message);
  }, [environmentId, supabase]);

  function scheduleSave(next: Workspace) {
    setWs(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void persist(next), 450);
  }

  async function generate() {
    if (!ws.prompt.trim()) { setError("Add a topic or prompt first."); return; }
    setGenerating(true);
    setError(null);
    const pInfo = platformInfo(ws.promptPlatform);
    const charNote = pInfo.charLimit > 0 ? ` Keep under ${pInfo.charLimit} characters.` : "";
    try {
      const res = await fetch("/api/ai/module-generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt: ws.prompt,
          system: `You are a B2B social media copywriter. Write platform-ready copy for ${pInfo.label}.${charNote} Use hooks, line breaks, and format appropriate for the platform. Output only the post copy, no meta-commentary.${strategyContext}`,
        }),
      });
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Generation failed.");
      const text = data.text ?? "";
      const entry: AiHistoryEntry = { id: crypto.randomUUID(), at: new Date().toISOString(), prompt: ws.prompt, platform: ws.promptPlatform, text };
      scheduleSave({ ...ws, lastOutput: text, aiHistory: [entry, ...ws.aiHistory].slice(0, 20) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  function addPostFromOutput() {
    if (!ws.lastOutput.trim()) return;
    const post: SocialPost = {
      ...emptyPost(ws.promptPlatform),
      text: ws.lastOutput.trim(),
      status: "draft",
    };
    const next = { ...ws, posts: [post, ...ws.posts] };
    scheduleSave(next);
    setExpandedId(post.id);
  }

  function addBlankPost() {
    const post = emptyPost(ws.promptPlatform);
    const next = { ...ws, posts: [post, ...ws.posts] };
    scheduleSave(next);
    setExpandedId(post.id);
  }

  function updatePost(id: string, patch: Partial<SocialPost>) {
    scheduleSave({ ...ws, posts: ws.posts.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  }

  function removePost(id: string) {
    scheduleSave({ ...ws, posts: ws.posts.filter((p) => p.id !== id) });
    if (expandedId === id) setExpandedId(null);
  }

  const filteredPosts = platformFilter === "all" ? ws.posts : ws.posts.filter((p) => p.platform === platformFilter);

  const platformCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of ws.posts) counts[p.platform] = (counts[p.platform] ?? 0) + 1;
    return counts;
  }, [ws.posts]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-3xl text-heading" style={{ fontFamily: "var(--font-heading)" }}>Social Media</h1>
        <p className="mt-1 text-sm text-text2">Queue, draft, and generate platform-ready posts with ICP context.</p>
        {loading ? (
          <p className="mt-2 text-sm text-text2">Loading…</p>
        ) : (
          <p className="mt-2 text-xs text-text3">{saving ? "Saving…" : "Saved to this product environment."}</p>
        )}
      </div>

      {error ? <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red">{error}</div> : null}

      {qFrom ? (
        <div className="flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/8 px-4 py-2.5 text-sm">
          <span className="text-primary">←</span>
          <span className="text-text2">
            Context from <span className="font-semibold text-text">{qFrom}</span>
            {qProduct ? <> — <span className="font-medium text-text">{qProduct}</span></> : null}
            {qSegment ? <span className="text-text3"> · {qSegment}</span> : null}
          </span>
        </div>
      ) : null}

      <AiProgressBar active={generating} variant="dark" title="Generating…" estimate={AI_PROGRESS_ESTIMATE.short} durationMs={40_000} />

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left: Post queue */}
        <div className="space-y-4 lg:col-span-2">
          {/* Platform filter + add button */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setPlatformFilter("all")}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${platformFilter === "all" ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface2 text-text2 hover:border-primary/30"}`}
              >
                All{ws.posts.length > 0 ? ` (${ws.posts.length})` : ""}
              </button>
              {PLATFORMS.filter((p) => p.id !== "other" || (platformCounts["other"] ?? 0) > 0).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlatformFilter(p.id)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${platformFilter === p.id ? `${p.color} border-current` : "border-border bg-surface2 text-text2 hover:border-primary/30"}`}
                >
                  {p.label}{(platformCounts[p.id] ?? 0) > 0 ? ` (${platformCounts[p.id]})` : ""}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={addBlankPost}
              className="rounded-xl border border-border bg-surface2 px-3 py-1.5 text-xs font-semibold text-text hover:bg-surface3"
            >
              + New post
            </button>
          </div>

          {/* Posts */}
          {filteredPosts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
              <div className="text-sm font-medium text-text2">No posts yet</div>
              <div className="mt-1 text-xs text-text3">
                Generate copy with AI or click <span className="font-medium text-text">+ New post</span> to start drafting.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  expanded={expandedId === post.id}
                  onToggle={() => setExpandedId(expandedId === post.id ? null : post.id)}
                  onChange={(patch) => updatePost(post.id, patch)}
                  onRemove={() => removePost(post.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: AI generator */}
        <div className="space-y-3">
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
            <div className="text-sm font-semibold text-heading">AI generator</div>

            {/* Platform selector */}
            <div className="mt-3">
              <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-text3">Platform</div>
              <div className="flex flex-wrap gap-1.5">
                {PLATFORMS.filter((p) => p.id !== "other").map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => scheduleSave({ ...ws, promptPlatform: p.id })}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${ws.promptPlatform === p.id ? `${p.color} border-current` : "border-border bg-surface2 text-text2 hover:border-primary/30"}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={ws.prompt}
              onChange={(e) => scheduleSave({ ...ws, prompt: e.target.value })}
              rows={4}
              className="mt-3 w-full rounded-xl border border-border bg-surface2 px-3 py-2.5 text-sm text-heading placeholder:text-text3 focus:border-primary focus:outline-none"
              placeholder={`e.g. 5 hooks on pipeline attribution for RevOps leaders`}
            />

            <button
              type="button"
              onClick={() => void generate()}
              disabled={generating}
              className="mt-2 w-full rounded-xl bg-amber p-2.5 text-sm font-semibold text-black hover:bg-amber/90 disabled:opacity-50"
            >
              {generating ? "Generating…" : "Generate"}
            </button>

            {strategyContext ? (
              <div className="mt-2 flex items-center gap-1.5 text-[10px] text-text3">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-teal" />
                Positioning &amp; ICP context injected
              </div>
            ) : null}

            {ws.lastOutput ? (
              <div className="mt-3 space-y-2 rounded-xl border border-border bg-surface2 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-text3">Output</span>
                  <CharCounter text={ws.lastOutput} platform={ws.promptPlatform} />
                </div>
                <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap font-sans text-xs leading-relaxed text-heading">
                  {ws.lastOutput}
                </pre>
                <button
                  type="button"
                  onClick={addPostFromOutput}
                  className="w-full rounded-lg border border-primary/30 bg-primary/8 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/15"
                >
                  Add to queue →
                </button>
              </div>
            ) : null}

            {ws.aiHistory.length > 0 ? (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-medium text-text2 hover:text-text">
                  History ({ws.aiHistory.length})
                </summary>
                <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto">
                  {ws.aiHistory.map((h) => (
                    <li key={h.id} className="rounded-lg border border-border bg-surface p-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <PlatformBadge platform={h.platform} size="xs" />
                          <span className="text-[10px] text-text3">{new Date(h.at).toLocaleDateString()}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => scheduleSave({ ...ws, lastOutput: h.text, prompt: h.prompt, promptPlatform: h.platform })}
                          className="text-[10px] text-primary hover:underline"
                        >
                          Restore
                        </button>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-text2">{h.prompt}</p>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
        </div>
      </div>

      {/* Calendar + Performance */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <div className="mb-2 text-sm font-semibold text-heading">Publishing calendar</div>
          <textarea
            value={ws.calendarNotes}
            onChange={(e) => scheduleSave({ ...ws, calendarNotes: e.target.value })}
            rows={5}
            className="w-full rounded-xl border border-border bg-surface2 px-3 py-2.5 text-sm text-heading placeholder:text-text3"
            placeholder={`Mon: LinkedIn article draft\nTue: Twitter thread — pipeline hooks\nWed: Instagram carousel review\nFri: Publish LinkedIn + tweet`}
          />
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <div className="mb-2 text-sm font-semibold text-heading">Performance notes</div>
          <textarea
            value={ws.performanceNotes}
            onChange={(e) => scheduleSave({ ...ws, performanceNotes: e.target.value })}
            rows={5}
            className="w-full rounded-xl border border-border bg-surface2 px-3 py-2.5 text-sm text-heading placeholder:text-text3"
            placeholder="Top performing post, CTR, impressions, engagement rate, learnings…"
          />
        </div>
      </div>

      <NextStepNudge />
    </div>
  );
}
