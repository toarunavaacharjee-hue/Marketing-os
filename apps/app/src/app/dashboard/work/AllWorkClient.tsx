"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AiProgressBar, AI_PROGRESS_ESTIMATE } from "@/app/dashboard/_components/AiProgressBar";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  aggregateWorkFromSettings,
  workSourcesSummary,
  type WorkItem
} from "@/lib/aggregateWorkspaceWork";

export function AllWorkClient({ environmentId }: { environmentId: string }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const [items, setItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<string>("all");
  const [hideDone, setHideDone] = useState(false);
  const [filterPriority, setFilterPriority] = useState<"" | "p1" | "p2" | "p3">("");
  const [busyIds, setBusyIds] = useState<Record<string, true>>({});
  const [outcomes, setOutcomes] = useState<Record<string, { notes: string; updatedAt: string }>>({});
  const [editingOutcomeId, setEditingOutcomeId] = useState<string | null>(null);
  const [editingOutcomeNotes, setEditingOutcomeNotes] = useState<string>("");
  const [runLogs, setRunLogs] = useState<
    Array<{
      id: string;
      at: string;
      action: string;
      targetId: string;
      targetLabel: string;
      status: "running" | "ok" | "error";
      message?: string;
    }>
  >([]);

  const [pitchModalOpen, setPitchModalOpen] = useState(false);
  const [pitchTargetId, setPitchTargetId] = useState<string | null>(null);
  const [pitchCompetitors, setPitchCompetitors] = useState<Array<{ id: string; name: string }>>([]);
  const [pitchCompetitorId, setPitchCompetitorId] = useState<string>("");
  const [pitchError, setPitchError] = useState<string | null>(null);

  const [priorities, setPriorities] = useState<Record<string, "p1" | "p2" | "p3">>({});
  const [pinned, setPinned] = useState<Record<string, boolean>>({});

  function isBusy(id: string) {
    return Boolean(busyIds[id]);
  }

  function setBusy(id: string, on: boolean) {
    setBusyIds((prev) => {
      const next = { ...prev };
      if (on) next[id] = true;
      else delete next[id];
      return next;
    });
  }

  const PRIORITY_ORDER: Record<string, number> = { p1: 1, p2: 2, p3: 3 };

  function sortWork(a: WorkItem, b: WorkItem) {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const aPinned = Boolean(a.pinned ?? pinned[a.id]);
    const bPinned = Boolean(b.pinned ?? pinned[b.id]);
    if (aPinned !== bPinned) return aPinned ? -1 : 1;
    const aPri = PRIORITY_ORDER[a.priority ?? priorities[a.id] ?? ""] ?? 4;
    const bPri = PRIORITY_ORDER[b.priority ?? priorities[b.id] ?? ""] ?? 4;
    if (aPri !== bPri) return aPri - bPri;
    if (a.dueTs != null && b.dueTs != null && a.dueTs !== b.dueTs) return a.dueTs - b.dueTs;
    if (a.dueTs != null && b.dueTs == null) return -1;
    if (a.dueTs == null && b.dueTs != null) return 1;
    return `${a.sourceLabel} ${a.title}`.localeCompare(`${b.sourceLabel} ${b.title}`);
  }

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

    const fromModules = aggregateWorkFromSettings(rows);

    const { data: segs, error: segErr } = await supabase
      .from("segments")
      .select("id,name,pnf_score,pain_points")
      .eq("environment_id", environmentId)
      .order("created_at", { ascending: false })
      .limit(30);

    if (segErr) {
      setItems(fromModules);
      setLoading(false);
      return;
    }

    const segmentItems: WorkItem[] = (segs ?? []).map((s: any) => {
      const pain = Array.isArray(s.pain_points) ? s.pain_points.filter(Boolean) : [];
      const firstPain = pain[0] ? String(pain[0]).slice(0, 80) : "";
      const pnf = typeof s.pnf_score === "number" ? s.pnf_score : null;
      return {
        id: `segment:${s.id}`,
        source: "segments",
        sourceLabel: "ICP Segments",
        category: "ICP Segment",
        title: s.name ?? "Untitled segment",
        subtitle: firstPain || undefined,
        timeline: undefined,
        status: pnf != null ? `PNF ${pnf}` : "Reference",
        owner: "—",
        due: undefined,
        dueTs: null,
        done: false,
        href: "/dashboard/icp-segmentation",
        tags: undefined
      };
    });

    const { data: workRows } = await supabase
      .from("module_settings")
      .select("key,value_json")
      .eq("environment_id", environmentId)
      .eq("module", "work")
      .in("key", ["outcomes", "workflow_runs", "priorities"]);

    const outcomesRow = (workRows ?? []).find((r: any) => r.key === "outcomes");
    const runsRow = (workRows ?? []).find((r: any) => r.key === "workflow_runs");
    const prioritiesRow = (workRows ?? []).find((r: any) => r.key === "priorities");

    const outcomesVal = (outcomesRow?.value_json ?? null) as any;
    const rawItems = outcomesVal?.items;
    const loadedOutcomes: Record<string, { notes: string; updatedAt: string }> =
      rawItems && typeof rawItems === "object" ? rawItems : {};
    setOutcomes(loadedOutcomes);

    const runsVal = (runsRow?.value_json ?? null) as any;
    const rawRuns = runsVal?.runs;
    const loadedRuns =
      Array.isArray(rawRuns)
        ? rawRuns
            .filter((x) => x && typeof x === "object" && "id" in x && "action" in x)
            .slice(0, 100)
            .map((x) => ({
              id: String((x as any).id),
              at: String((x as any).at ?? new Date().toISOString()),
              action: String((x as any).action ?? ""),
              targetId: String((x as any).targetId ?? ""),
              targetLabel: String((x as any).targetLabel ?? ""),
              status: ((x as any).status as any) || "ok",
              message: typeof (x as any).message === "string" ? (x as any).message : undefined
            }))
        : [];
    setRunLogs(loadedRuns);

    const priVal = (prioritiesRow?.value_json ?? null) as any;
    const loadedPriorities: Record<string, "p1" | "p2" | "p3"> =
      priVal?.priorities && typeof priVal.priorities === "object" ? priVal.priorities : {};
    const loadedPinned: Record<string, boolean> =
      priVal?.pinned && typeof priVal.pinned === "object" ? priVal.pinned : {};
    setPriorities(loadedPriorities);
    setPinned(loadedPinned);

    setItems([...fromModules, ...segmentItems].sort(sortWork));
    setLoading(false);
  }, [environmentId, supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => workSourcesSummary(items), [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...items]
      .sort(sortWork)
      .filter((it) => {
        if (hideDone && it.done) return false;
        if (source !== "all" && it.source !== source) return false;
        if (filterPriority) {
          const effectivePriority = it.priority ?? priorities[it.id];
          if (effectivePriority !== filterPriority) return false;
        }
        if (!q) return true;
        const outcomeNotes = outcomes[it.id]?.notes ?? "";
        const blob = `${it.title} ${it.subtitle ?? ""} ${it.status ?? ""} ${it.owner ?? ""} ${it.category} ${it.sourceLabel} ${(it.tags ?? []).join(" ")} ${outcomeNotes}`.toLowerCase();
        return blob.includes(q);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, query, source, hideDone, filterPriority, outcomes, priorities, pinned]);

  const now = Date.now();
  const openCount = items.filter((i) => !i.done).length;
  const overdueCount = items.filter((i) => !i.done && i.dueTs != null && i.dueTs < now).length;
  const doneCount = items.filter((i) => i.done).length;

  async function persistOutcomes(next: Record<string, { notes: string; updatedAt: string }>) {
    const payload = { items: next };
    const { error: upErr } = await supabase.from("module_settings").upsert({
      environment_id: environmentId,
      module: "work",
      key: "outcomes",
      value_json: payload
    });
    if (upErr) throw upErr;
  }

  async function persistPrioritiesState(
    nextPriorities: Record<string, "p1" | "p2" | "p3">,
    nextPinned: Record<string, boolean>
  ) {
    await supabase.from("module_settings").upsert({
      environment_id: environmentId,
      module: "work",
      key: "priorities",
      value_json: { priorities: nextPriorities, pinned: nextPinned }
    });
  }

  function togglePin(id: string) {
    const next = { ...pinned, [id]: !pinned[id] };
    if (!next[id]) delete next[id];
    setPinned(next);
    void persistPrioritiesState(priorities, next);
  }

  function setPriority(id: string, p: "p1" | "p2" | "p3" | "") {
    const next = { ...priorities };
    if (p) next[id] = p;
    else delete next[id];
    setPriorities(next);
    void persistPrioritiesState(next, pinned);
  }

  async function saveOutcomeFor(id: string) {
    const notes = editingOutcomeNotes.trim();
    const next = {
      ...outcomes,
      [id]: notes ? { notes, updatedAt: new Date().toISOString() } : undefined
    } as any;

    Object.keys(next).forEach((k) => {
      if (!next[k]?.notes) delete next[k];
    });

    const prevEditingId = editingOutcomeId;
    setEditingOutcomeId(null);
    setEditingOutcomeNotes("");
    try {
      setOutcomes(next);
      await persistOutcomes(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save outcome notes.");
      setEditingOutcomeId(prevEditingId);
      setEditingOutcomeNotes(notes);
    }
  }

  async function persistRunLogs(next: typeof runLogs) {
    const payload = { runs: next.slice(0, 100) };
    const { error: upErr } = await supabase.from("module_settings").upsert({
      environment_id: environmentId,
      module: "work",
      key: "workflow_runs",
      value_json: payload
    });
    if (upErr) throw new Error(upErr.message);
  }

  function startRun(action: string, targetId: string, targetLabel: string) {
    const id = crypto.randomUUID();
    const entry = {
      id,
      at: new Date().toISOString(),
      action,
      targetId,
      targetLabel,
      status: "running" as const
    };
    const next = [entry, ...runLogs].slice(0, 100);
    setRunLogs(next);
    void persistRunLogs(next);
    return id;
  }

  function finishRun(runId: string, status: "ok" | "error", message?: string) {
    const next = runLogs.map((r) => (r.id === runId ? { ...r, status, message } : r));
    setRunLogs(next);
    void persistRunLogs(next);
  }

  async function seedMessagingFromSegment(segmentName: string) {
    const MOD = "messaging_artifacts";
    const KEY = "artifacts";

    const defaults = {
      items: [],
      genType: "Landing page copy",
      genTone: "Confident + practical",
      genSegment: "",
      lastOutput: ""
    } as const;

    const { data: msRow, error: msErr } = await supabase
      .from("module_settings")
      .select("value_json")
      .eq("environment_id", environmentId)
      .eq("module", MOD)
      .eq("key", KEY)
      .maybeSingle();

    if (msErr) throw new Error(msErr.message);

    const cur = (msRow?.value_json ?? null) as any;
    const nextStore = {
      ...defaults,
      ...(cur && typeof cur === "object" ? cur : {}),
      genSegment: segmentName
    };

    if (!Array.isArray(nextStore.items)) nextStore.items = [];
    if (typeof nextStore.lastOutput !== "string") nextStore.lastOutput = "";

    const { error: upErr } = await supabase.from("module_settings").upsert({
      environment_id: environmentId,
      module: MOD,
      key: KEY,
      value_json: nextStore
    });
    if (upErr) throw new Error(upErr.message);

    router.push("/dashboard/messaging-artifacts");
  }

  async function openPitchModal(workId: string) {
    setPitchError(null);
    setPitchTargetId(workId);
    setPitchCompetitors([]);
    setPitchCompetitorId("");
    setPitchModalOpen(true);
    try {
      const res = await fetch("/api/battlecards");
      const data = (await res.json()) as { competitors?: Array<{ id: string; name: string }>; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load competitors.");
      const comps = data.competitors ?? [];
      setPitchCompetitors(comps);
      setPitchCompetitorId(comps[0]?.id ?? "");
      if (!comps.length) {
        setPitchError("No competitors found. Add competitors in Battlecards first.");
      }
    } catch (e) {
      setPitchError(e instanceof Error ? e.message : "Failed to load competitors.");
    }
  }

  async function confirmPitchModal() {
    if (!pitchTargetId) return;
    if (!pitchCompetitorId) {
      setPitchError("Pick a competitor.");
      return;
    }
    setPitchModalOpen(false);
    await runPitchBattlecardFromPositioning(pitchTargetId, pitchCompetitorId);
  }

  async function aiGenerateMessagingFromSegment(segmentName: string, workId: string) {
    if (isBusy(workId)) return;
    setBusy(workId, true);
    const runId = startRun("ai_generate_messaging_draft", workId, segmentName);
    setError(null);
    try {
      const MOD = "messaging_artifacts";
      const KEY = "artifacts";

      const { data: msRow, error: msErr } = await supabase
        .from("module_settings")
        .select("value_json")
        .eq("environment_id", environmentId)
        .eq("module", MOD)
        .eq("key", KEY)
        .maybeSingle();

      if (msErr) throw new Error(msErr.message);

      const cur = (msRow?.value_json ?? null) as any;
      const itemsRaw = Array.isArray(cur?.items) ? cur.items : [];
      const genType = typeof cur?.genType === "string" ? cur.genType : "Landing page copy";
      const genTone = typeof cur?.genTone === "string" ? cur.genTone : "Confident + practical";

      const prompt = `Create a ${genType} for the segment "${segmentName}".\nTone: ${genTone}.\nReturn:\nLine 1: short artifact title\nLine 2: blank\nLines 3+: 2–4 sentences of copy suitable for marketing.`;

      const res = await fetch("/api/ai/module-generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt,
          system: "You write sharp B2B marketing copy. Follow the user's output shape exactly (title line, blank line, body)."
        })
      });

      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Generation failed.");

      const text = data.text ?? "";
      if (!text.trim()) throw new Error("AI returned an empty draft.");

      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const titleLine = lines[0] ?? "Generated artifact";

      const nextArtifact = {
        id: crypto.randomUUID(),
        name: titleLine.slice(0, 120),
        segmentName: segmentName,
        status: "Draft",
        consistency: 85
      };

      const nextStore = {
        ...(cur && typeof cur === "object" ? cur : {}),
        genType,
        genTone,
        genSegment: segmentName,
        items: [...itemsRaw, nextArtifact],
        lastOutput: text
      };

      const { error: upErr } = await supabase.from("module_settings").upsert({
        environment_id: environmentId,
        module: MOD,
        key: KEY,
        value_json: nextStore
      });
      if (upErr) throw new Error(upErr.message);

      await load();
      finishRun(runId, "ok");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate messaging.");
      finishRun(runId, "error", e instanceof Error ? e.message : "Failed to generate messaging.");
    } finally {
      setBusy(workId, false);
    }
  }

  async function runPitchBattlecardFromPositioning(workId: string, competitorId: string) {
    if (isBusy(workId)) return;
    setBusy(workId, true);
    const runId = startRun("ai_generate_pitch_battlecard", workId, "Positioning canvas");
    setError(null);
    try {
      const personaRes = await fetch("/api/battlecards/persona-from-positioning", {
        method: "POST",
        headers: { "content-type": "application/json" }
      });
      const personaData = (await personaRes.json()) as {
        ok?: boolean;
        persona_id?: string;
        needs_input?: boolean;
        missing_fields?: string[];
        error?: string;
      };
      if (!personaRes.ok) throw new Error(personaData.error ?? "Persona generation failed.");
      if (personaData.needs_input) {
        const missing = (personaData.missing_fields ?? []).join(", ");
        throw new Error(`Persona generation needs input. Missing: ${missing || "fields"}.`);
      }
      const personaId = personaData.persona_id;
      if (!personaId) throw new Error("Could not create persona.");

      const pitchRes = await fetch("/api/battlecards/pitch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ competitor_id: competitorId, persona_id: personaId })
      });

      const pitchData = (await pitchRes.json()) as {
        ok?: boolean;
        markdown?: string;
        needs_input?: boolean;
        questions?: string[];
        error?: string;
      };
      if (!pitchRes.ok) throw new Error(pitchData.error ?? "Pitch generation failed.");
      if (pitchData.needs_input) {
        const qs = (pitchData.questions ?? []).slice(0, 4).join(" | ");
        throw new Error(`Pitch needs persona input. Questions: ${qs || "see response"}.`);
      }

      await load();
      router.push("/dashboard/battlecards");
      finishRun(runId, "ok");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate pitch battlecard.");
      finishRun(runId, "error", e instanceof Error ? e.message : "Failed to generate pitch battlecard.");
    } finally {
      setBusy(workId, false);
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  function getRowAccent(it: WorkItem): string {
    const isOverdue = !it.done && it.dueTs != null && it.dueTs < now;
    if (isOverdue) return "border-l-red-500";
    if (pinned[it.id]) return "border-l-primary";
    const pri = it.priority ?? priorities[it.id];
    if (pri === "p1") return "border-l-red-500";
    if (pri === "p2") return "border-l-amber";
    if (pri === "p3") return "border-l-[#CBD5E1]";
    return "border-l-transparent";
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-heading" style={{ fontFamily: "var(--font-heading)" }}>
            Marketing Workbench
          </h1>
          <p className="mt-1 text-sm text-text2">
            Live view of tasks, campaigns, and milestones across every module.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="shrink-0 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text2 hover:bg-surface2 disabled:opacity-50"
        >
          {loading ? "Loading…" : "↻ Refresh"}
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Total" value={loading ? "—" : String(items.length)} icon="📋" />
        <KpiCard label="Open" value={loading ? "—" : String(openCount)} icon="🔵" accent="text-primary" />
        <KpiCard
          label="Overdue"
          value={loading ? "—" : String(overdueCount)}
          icon={overdueCount > 0 ? "🔴" : "✅"}
          accent={overdueCount > 0 ? "text-red" : "text-teal"}
        />
        <KpiCard label="Done" value={loading ? "—" : String(doneCount)} icon="✓" accent="text-teal" />
      </div>

      {/* Error */}
      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/8 px-4 py-3 text-sm text-red">
          <span className="mt-px shrink-0">⚠</span>
          <span>{error}</span>
        </div>
      ) : null}

      {/* AI progress */}
      <AiProgressBar
        active={Object.keys(busyIds).length > 0}
        variant="dark"
        title="Running AI workflow…"
        estimate={AI_PROGRESS_ESTIMATE.deep}
        durationMs={120_000}
      />

      {/* Filter bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-3 sm:flex-row sm:flex-wrap sm:items-center">
        {/* Search */}
        <div className="relative min-w-[180px] flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-text3 text-sm">⌕</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search items…"
            className="w-full rounded-lg border border-border bg-surface2 py-2 pl-8 pr-3 text-sm text-heading placeholder:text-text3 focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>

        {/* Module filter */}
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="rounded-lg border border-border bg-surface2 px-3 py-2 text-sm text-heading focus:outline-none focus:ring-1 focus:ring-primary/40"
        >
          <option value="all">All modules</option>
          {summary.map((s) => (
            <option key={s.source} value={s.source}>
              {s.label} ({s.count})
            </option>
          ))}
        </select>

        {/* Priority pill filters */}
        <div className="flex items-center gap-1.5">
          {(["", "p1", "p2", "p3"] as const).map((p) => {
            const label = p === "" ? "All" : p.toUpperCase();
            const active = filterPriority === p;
            const accent =
              p === "p1"
                ? active
                  ? "bg-red-500 text-white border-red-500"
                  : "border-red-500/40 text-red hover:bg-red-500/8"
                : p === "p2"
                  ? active
                    ? "bg-amber text-black border-amber"
                    : "border-amber/40 text-amber hover:bg-amber/8"
                  : p === "p3"
                    ? active
                      ? "bg-surface3 text-text border-border"
                      : "border-border text-text2 hover:bg-surface2"
                    : active
                      ? "bg-heading text-white border-heading"
                      : "border-border text-text2 hover:bg-surface2";
            return (
              <button
                key={p}
                type="button"
                onClick={() => setFilterPriority(p)}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${accent}`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Hide done */}
        <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-text2">
          <span
            onClick={() => setHideDone((v) => !v)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${hideDone ? "bg-primary" : "bg-surface3"}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${hideDone ? "translate-x-4" : "translate-x-0"}`}
            />
          </span>
          Hide done
        </label>
      </div>

      {/* Empty state */}
      {!loading && filtered.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-surface2 px-6 py-14 text-center">
          <div className="text-4xl">📭</div>
          <div className="mt-3 text-base font-medium text-heading">No items match your filters</div>
          <div className="mt-1 text-sm text-text2">
            Add work in{" "}
            <Link href="/dashboard/gtm-planner" className="text-primary hover:underline">GTM Planner</Link>,{" "}
            <Link href="/dashboard/events" className="text-primary hover:underline">Events</Link>,{" "}
            <Link href="/dashboard/content-studio" className="text-primary hover:underline">Content Studio</Link>, or{" "}
            <Link href="/dashboard/campaigns" className="text-primary hover:underline">Campaigns</Link>.
          </div>
        </div>
      ) : null}

      {/* ── Mobile cards ──────────────────────────────────────────────────────── */}
      <div className="space-y-2.5 md:hidden">
        {filtered.map((it) => {
          const isUntitled = /^(untitled|new item|new artifact)/i.test(it.title.trim());
          const isOverdue = !it.done && it.dueTs != null && it.dueTs < now;
          const isPinnedRow = Boolean(pinned[it.id]);
          const itemPriority = priorities[it.id];
          const accentCls = getRowAccent(it);

          return (
            <div
              key={it.id}
              className={`group rounded-xl border border-border bg-surface border-l-4 ${accentCls} ${isOverdue ? "bg-red-500/4" : ""}`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {isPinnedRow && (
                        <span className="text-[11px]" title="Pinned">★</span>
                      )}
                      {itemPriority && <PriorityBadge priority={itemPriority} />}
                      <span
                        className={`text-sm font-medium leading-snug ${isUntitled ? "italic text-text3" : "text-heading"}`}
                      >
                        {it.title}
                      </span>
                    </div>
                    {it.subtitle && (
                      <div className="mt-0.5 line-clamp-2 text-[11px] text-text2">{it.subtitle}</div>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <SourcePill label={it.sourceLabel} />
                      {it.tags?.slice(0, 2).map((t) => (
                        <span key={t} className="rounded bg-surface3 px-1.5 py-0.5 text-[10px] text-text2">{t}</span>
                      ))}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <StatusBadge status={it.status} done={it.done} />
                    <div className={`mt-1 text-[11px] ${isOverdue ? "font-semibold text-red" : "text-text3"}`}>
                      {isOverdue && <span>⚠ </span>}{it.due ?? "—"}
                    </div>
                  </div>
                </div>

                {outcomes[it.id]?.notes && (
                  <div className="mt-2 line-clamp-2 rounded-lg bg-primary/6 px-2.5 py-1.5 text-[11px] text-primary">
                    ↳ {outcomes[it.id]!.notes}
                  </div>
                )}

                {/* Actions */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {it.source === "segments" && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          void (async () => {
                            try { await seedMessagingFromSegment(it.title); }
                            catch (e) { setError(e instanceof Error ? e.message : "Failed to seed messaging."); }
                          })();
                        }}
                        className="rounded-lg border border-primary/30 bg-primary/8 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/14"
                      >
                        Seed messaging
                      </button>
                      <button
                        type="button"
                        onClick={() => void aiGenerateMessagingFromSegment(it.title, it.id)}
                        disabled={isBusy(it.id)}
                        className="rounded-lg border border-primary/30 bg-primary/8 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/14 disabled:opacity-60"
                      >
                        {isBusy(it.id) ? "Generating…" : "AI draft"}
                      </button>
                    </>
                  )}
                  {it.source === "positioning_studio" && (
                    <button
                      type="button"
                      onClick={() => void openPitchModal(it.id)}
                      disabled={isBusy(it.id)}
                      className="rounded-lg border border-primary/30 bg-primary/8 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/14 disabled:opacity-60"
                    >
                      {isBusy(it.id) ? "Generating…" : "AI pitch"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { setEditingOutcomeId(it.id); setEditingOutcomeNotes(outcomes[it.id]?.notes ?? ""); }}
                    className="rounded-lg border border-border bg-surface px-3 py-1 text-xs font-medium text-text2 hover:bg-surface2"
                  >
                    Update
                  </button>
                  <Link
                    href={it.href}
                    className="ml-auto rounded-lg bg-heading px-3 py-1 text-xs font-medium text-white hover:opacity-80"
                  >
                    Open →
                  </Link>
                </div>

                {/* Outcome editor */}
                {editingOutcomeId === it.id && (
                  <div className="mt-3">
                    <textarea
                      value={editingOutcomeNotes}
                      onChange={(e) => setEditingOutcomeNotes(e.target.value)}
                      rows={3}
                      placeholder="Notes — what changed, results, next step…"
                      className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-heading focus:outline-none focus:ring-1 focus:ring-primary/40"
                    />
                    <div className="mt-2 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => void saveOutcomeFor(it.id)}
                        className="rounded-lg bg-primary px-3 py-1 text-xs font-medium text-white hover:opacity-80"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEditingOutcomeId(null); setEditingOutcomeNotes(""); }}
                        className="rounded-lg border border-border px-3 py-1 text-xs font-medium text-text2 hover:bg-surface2"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Desktop table ─────────────────────────────────────────────────────── */}
      {filtered.length > 0 && (
        <div className="hidden overflow-x-auto rounded-xl border border-border bg-surface md:block">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface2/60">
                <th className="w-8 px-3 py-3" />
                <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-wider text-text2">Item</th>
                <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-wider text-text2">Module</th>
                <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-wider text-text2">Status</th>
                <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-wider text-text2">Owner</th>
                <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-wider text-text2">Due</th>
                <th className="w-[200px] px-3 py-3 text-[10px] font-semibold uppercase tracking-wider text-text2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((it) => {
                const isUntitled = /^(untitled|new item|new artifact)/i.test(it.title.trim());
                const isOverdue = !it.done && it.dueTs != null && it.dueTs < now;
                const isPinnedRow = Boolean(pinned[it.id]);
                const itemPriority = priorities[it.id];
                const accentCls = getRowAccent(it);

                return (
                  <tr
                    key={it.id}
                    className={`group relative border-l-4 transition-colors ${accentCls} ${isOverdue ? "bg-red-500/4 hover:bg-red-500/7" : "hover:bg-surface2/50"}`}
                  >
                    {/* Pin + Priority column */}
                    <td className="px-3 py-3">
                      <div className="flex flex-col items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => togglePin(it.id)}
                          title={isPinnedRow ? "Unpin" : "Pin to top"}
                          className={`text-[14px] transition-opacity ${isPinnedRow ? "opacity-100 text-primary" : "opacity-0 group-hover:opacity-40 hover:!opacity-80"}`}
                        >
                          {isPinnedRow ? "★" : "☆"}
                        </button>
                        <select
                          value={itemPriority ?? ""}
                          onChange={(e) => setPriority(it.id, e.target.value as "p1" | "p2" | "p3" | "")}
                          title="Set priority"
                          className="w-10 rounded border border-border bg-surface2 px-0.5 py-0.5 text-center text-[10px] text-text2 opacity-0 group-hover:opacity-100 focus:opacity-100"
                        >
                          <option value="">—</option>
                          <option value="p1">P1</option>
                          <option value="p2">P2</option>
                          <option value="p3">P3</option>
                        </select>
                      </div>
                    </td>

                    {/* Item */}
                    <td className="max-w-[300px] px-3 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {itemPriority && <PriorityBadge priority={itemPriority} />}
                        <span
                          className={`font-medium leading-snug ${isUntitled ? "italic text-text3" : "text-heading"}`}
                          title={it.title}
                        >
                          {it.title}
                        </span>
                      </div>
                      {it.subtitle && (
                        <div className="mt-0.5 line-clamp-1 text-[11px] text-text2" title={it.subtitle}>
                          {it.subtitle}
                        </div>
                      )}
                      {outcomes[it.id]?.notes && (
                        <div
                          className="mt-1 line-clamp-1 rounded bg-primary/6 px-1.5 py-0.5 text-[11px] text-primary"
                          title={outcomes[it.id]!.notes}
                        >
                          ↳ {outcomes[it.id]!.notes}
                        </div>
                      )}
                      {it.tags?.length ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {it.tags.slice(0, 3).map((t) => (
                            <span key={t} className="rounded bg-surface3 px-1.5 py-0.5 text-[10px] text-text2">{t}</span>
                          ))}
                        </div>
                      ) : null}
                    </td>

                    {/* Module */}
                    <td className="whitespace-nowrap px-3 py-3">
                      <SourcePill label={it.sourceLabel} />
                    </td>

                    {/* Status */}
                    <td className="whitespace-nowrap px-3 py-3">
                      <StatusBadge status={it.status} done={it.done} />
                    </td>

                    {/* Owner */}
                    <td className="whitespace-nowrap px-3 py-3 text-xs text-text2">
                      {it.owner && it.owner !== "—" ? it.owner : <span className="text-text3">—</span>}
                    </td>

                    {/* Due */}
                    <td className="whitespace-nowrap px-3 py-3 text-xs">
                      {it.due ? (
                        <span className={isOverdue ? "font-semibold text-red" : "text-text2"}>
                          {isOverdue && "⚠ "}{it.due}
                        </span>
                      ) : (
                        <span className="text-text3">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-3">
                      {editingOutcomeId === it.id ? (
                        <div className="w-52">
                          <textarea
                            value={editingOutcomeNotes}
                            onChange={(e) => setEditingOutcomeNotes(e.target.value)}
                            rows={3}
                            placeholder="Notes — results, next step…"
                            className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-heading focus:outline-none focus:ring-1 focus:ring-primary/40"
                          />
                          <div className="mt-1.5 flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => void saveOutcomeFor(it.id)}
                              className="rounded bg-primary px-2.5 py-1 text-[11px] font-medium text-white hover:opacity-80"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => { setEditingOutcomeId(null); setEditingOutcomeNotes(""); }}
                              className="rounded border border-border px-2.5 py-1 text-[11px] font-medium text-text2 hover:bg-surface2"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {it.source === "segments" && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  void (async () => {
                                    try { await seedMessagingFromSegment(it.title); }
                                    catch (e) { setError(e instanceof Error ? e.message : "Failed to seed messaging."); }
                                  })();
                                }}
                                className="rounded border border-primary/30 bg-primary/8 px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/14"
                              >
                                Seed
                              </button>
                              <button
                                type="button"
                                onClick={() => void aiGenerateMessagingFromSegment(it.title, it.id)}
                                disabled={isBusy(it.id)}
                                className="rounded border border-primary/30 bg-primary/8 px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/14 disabled:opacity-60"
                              >
                                {isBusy(it.id) ? "…" : "AI draft"}
                              </button>
                            </>
                          )}
                          {it.source === "positioning_studio" && (
                            <button
                              type="button"
                              onClick={() => void openPitchModal(it.id)}
                              disabled={isBusy(it.id)}
                              className="rounded border border-primary/30 bg-primary/8 px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/14 disabled:opacity-60"
                            >
                              {isBusy(it.id) ? "…" : "AI pitch"}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => { setEditingOutcomeId(it.id); setEditingOutcomeNotes(outcomes[it.id]?.notes ?? ""); }}
                            className="rounded border border-border px-2 py-1 text-[11px] font-medium text-text2 hover:bg-surface2"
                          >
                            Update
                          </button>
                          <Link
                            href={it.href}
                            className="rounded bg-heading px-2.5 py-1 text-[11px] font-medium text-white hover:opacity-80"
                          >
                            Open →
                          </Link>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Workflow runs log */}
      <details className="rounded-xl border border-border bg-surface">
        <summary className="flex cursor-pointer select-none items-center justify-between px-4 py-3 text-sm font-medium text-heading hover:bg-surface2/40">
          <span>Workflow runs</span>
          <span className="rounded-full bg-surface3 px-2 py-0.5 text-[11px] font-normal text-text2">
            {runLogs.length}
          </span>
        </summary>
        <div className="border-t border-border px-4 py-3">
          {runLogs.length === 0 ? (
            <div className="text-sm text-text2">No workflow runs yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-xs">
                <thead className="border-b border-border text-[10px] uppercase text-text2">
                  <tr>
                    <th className="py-2 pr-4 font-semibold">When</th>
                    <th className="py-2 pr-4 font-semibold">Action</th>
                    <th className="py-2 pr-4 font-semibold">Target</th>
                    <th className="py-2 pr-4 font-semibold">Status</th>
                    <th className="py-2 font-semibold">Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {runLogs.slice(0, 30).map((r) => (
                    <tr key={r.id} className="align-top">
                      <td className="py-2 pr-4 text-text2">{r.at ? new Date(r.at).toLocaleString() : "—"}</td>
                      <td className="py-2 pr-4 text-primary">{r.action}</td>
                      <td className="py-2 pr-4 text-text2">{r.targetLabel || r.targetId}</td>
                      <td className="py-2 pr-4">
                        <span className={r.status === "ok" ? "text-teal" : r.status === "error" ? "text-red" : "text-amber"}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-2 text-text2">{r.message ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </details>

      {/* Pitch battlecard modal */}
      {pitchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl">
            <div className="text-lg font-semibold text-heading">Generate pitch battlecard</div>
            <p className="mt-1 text-sm text-text2">
              Pick a competitor. We'll build an ICP persona from your Positioning canvas and create a pitch battlecard.
            </p>

            {pitchError && (
              <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/8 px-3 py-2 text-sm text-red">
                {pitchError}
              </div>
            )}

            <div className="mt-4">
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-text2">
                Competitor
              </label>
              <select
                value={pitchCompetitorId}
                onChange={(e) => setPitchCompetitorId(e.target.value)}
                disabled={!pitchCompetitors.length}
                className="w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-sm text-heading focus:outline-none focus:ring-1 focus:ring-primary/40"
              >
                {pitchCompetitors.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPitchModalOpen(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text2 hover:bg-surface2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmPitchModal()}
                disabled={!pitchCompetitorId || !pitchCompetitors.length}
                className="rounded-lg bg-amber px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  icon,
  accent = "text-heading"
}: {
  label: string;
  value: string;
  icon: string;
  accent?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-text2">{label}</span>
        <span className="text-base">{icon}</span>
      </div>
      <div className={`text-2xl font-bold leading-none ${accent}`}>{value}</div>
    </div>
  );
}

function SourcePill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-primary/8 px-2 py-0.5 text-[10px] font-semibold text-primary">
      {label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: "p1" | "p2" | "p3" }) {
  const styles: Record<string, string> = {
    p1: "bg-red-500/12 text-red font-bold",
    p2: "bg-amber/12 text-amber font-semibold",
    p3: "bg-surface3 text-text2 font-medium"
  };
  return (
    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] uppercase tracking-wide ${styles[priority]}`}>
      {priority.toUpperCase()}
    </span>
  );
}

function StatusBadge({ status, done }: { status?: string; done: boolean }) {
  const base = "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold";

  if (done || /^(live|published|shipped|done)$/i.test(status ?? "")) {
    return <span className={`${base} bg-teal/12 text-teal`}>Live</span>;
  }

  const s = status ?? "";
  if (!s) return <span className="text-[11px] text-text3">—</span>;

  const pnfMatch = s.match(/^PNF\s*(\d+)$/i);
  if (pnfMatch) {
    const score = parseInt(pnfMatch[1]);
    const cls = score >= 80 ? "bg-teal/12 text-teal" : score >= 60 ? "bg-primary/10 text-primary" : "bg-surface3 text-text2";
    return <span className={`${base} ${cls}`}>PNF {score}</span>;
  }

  if (/clarity|differentiation|credibility/i.test(s)) {
    const nums = [...s.matchAll(/(\d+)%/g)].map((m) => parseInt(m[1]));
    const avg = nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : null;
    return <span className={`${base} bg-primary/10 text-primary`}>{avg != null ? `Score ${avg}%` : "Scored"}</span>;
  }

  const draftMatch = s.match(/^Draft\s*\((\d+)%\)/i);
  if (draftMatch) {
    return <span className={`${base} bg-amber/12 text-amber`}>Draft {draftMatch[1]}%</span>;
  }

  const prepMatch = s.match(/^(\d+)%\s*prep$/i);
  if (prepMatch) {
    const pct = parseInt(prepMatch[1]);
    if (pct === 0) return <span className={`${base} bg-surface3 text-text3`}>Not started</span>;
    return <span className={`${base} bg-amber/12 text-amber`}>{pct}% prep</span>;
  }

  if (/^in[\s-]?draft$/i.test(s)) return <span className={`${base} bg-amber/12 text-amber`}>In draft</span>;
  if (/^plan/i.test(s))           return <span className={`${base} bg-surface3 text-text2`}>{s}</span>;
  if (/^open$/i.test(s))          return <span className={`${base} bg-primary/10 text-primary`}>Open</span>;
  if (/^reference$/i.test(s))     return <span className={`${base} bg-surface3 text-text3`}>Reference</span>;
  if (/^review/i.test(s))         return <span className={`${base} bg-amber/12 text-amber`}>{s}</span>;

  return <span className="text-[11px] text-text2">{s}</span>;
}
