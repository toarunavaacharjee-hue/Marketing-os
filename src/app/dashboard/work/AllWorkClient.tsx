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

  function sortWork(a: WorkItem, b: WorkItem) {
    if (a.done !== b.done) return a.done ? 1 : -1;
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

    // Module settings workbench items (gtm, events, content, campaigns, etc.)
    const fromModules = aggregateWorkFromSettings(rows);

    // ICP segments (separate table in Supabase)
    const { data: segs, error: segErr } = await supabase
      .from("segments")
      .select("id,name,pnf_score,pain_points")
      .eq("environment_id", environmentId)
      .order("created_at", { ascending: false })
      .limit(30);

    if (segErr) {
      // Segments are optional for this page; still show module items.
      setItems(fromModules);
      setLoading(false);
      return;
    }

    const segmentItems: WorkItem[] = (segs ?? []).map((s: any) => {
      const pain = Array.isArray(s.pain_points) ? s.pain_points.filter(Boolean).slice(0, 2) : [];
      const painPreview = pain.length ? pain.join("; ") : "";
      const pnf = typeof s.pnf_score === "number" ? s.pnf_score : null;
      return {
        id: `segment:${s.id}`,
        source: "segments",
        sourceLabel: "ICP Segments",
        category: "ICP Segment",
        title: s.name ?? "Untitled segment",
        subtitle:
          pnf != null || painPreview
            ? [pnf != null ? `PNF ${pnf}` : null, painPreview].filter(Boolean).join(" · ")
            : undefined,
        timeline: painPreview || undefined,
        status: pnf != null ? `PNF ${pnf}` : "Reference",
        owner: "—",
        due: undefined,
        dueTs: null,
        done: false,
        href: "/dashboard/icp-segmentation",
        tags: pain.length ? pain.slice(0, 1) : undefined
      };
    });

    // Work meta: outcomes + workflow run logs
    const { data: workRows } = await supabase
      .from("module_settings")
      .select("key,value_json")
      .eq("environment_id", environmentId)
      .eq("module", "work")
      .in("key", ["outcomes", "workflow_runs"]);

    const outcomesRow = (workRows ?? []).find((r: any) => r.key === "outcomes");
    const runsRow = (workRows ?? []).find((r: any) => r.key === "workflow_runs");

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
    setItems([...fromModules, ...segmentItems].sort(sortWork));
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
      const outcomeNotes = outcomes[it.id]?.notes ?? "";
      const blob = `${it.title} ${it.subtitle ?? ""} ${it.status ?? ""} ${it.owner ?? ""} ${it.category} ${it.sourceLabel} ${(it.tags ?? []).join(" ")} ${outcomeNotes}`.toLowerCase();
      return blob.includes(q);
    });
  }, [items, query, source, hideDone, outcomes]);

  const openCount = items.filter((i) => !i.done).length;

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

  async function saveOutcomeFor(id: string) {
    const notes = editingOutcomeNotes.trim();
    const next = {
      ...outcomes,
      [id]: notes ? { notes, updatedAt: new Date().toISOString() } : undefined
    } as any;

    // Remove empty entries
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
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          system:
            "You write sharp B2B marketing copy. Follow the user's output shape exactly (title line, blank line, body)."
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

      // 1) Create an ICP persona from the positioning canvas
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
        headers: {
          "content-type": "application/json",
        },
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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl text-heading" style={{ fontFamily: "var(--font-heading)" }}>
          Marketing Workbench
        </h1>
        <p className="mt-1 text-sm text-text2">
          One view of tasks, queues, campaigns, and milestones from across modules for this product. Edit in each module
          — this page is read-only aggregation.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface p-3">
        <span className="text-xs text-text2">
          {loading ? "Loading…" : `${items.length} rows · ${openCount} open`}
        </span>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-border px-2 py-1 text-xs text-heading hover:bg-surface2"
        >
          Refresh
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red">{error}</div>
      ) : null}

      <AiProgressBar
        active={Object.keys(busyIds).length > 0}
        variant="dark"
        title="Running AI workflow…"
        estimate={AI_PROGRESS_ESTIMATE.deep}
        durationMs={120_000}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-[200px] flex-1">
          <div className="mb-1 text-[10px] uppercase text-text2">Search</div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Title, owner, module, tag…"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-heading"
          />
        </div>
        <div className="min-w-[160px]">
          <div className="mb-1 text-[10px] uppercase text-text2">Module</div>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-heading"
          >
            <option value="all">All modules</option>
            {summary.map((s) => (
              <option key={s.source} value={s.source}>
                {s.label} ({s.count})
              </option>
            ))}
          </select>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-text2">
          <input
            type="checkbox"
            checked={hideDone}
            onChange={(e) => setHideDone(e.target.checked)}
            className="rounded border-border"
          />
          Hide done / live
        </label>
      </div>

      {!loading && filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface2 p-8 text-center text-sm text-text2">
          No matching items. Add work in{" "}
          <Link href="/dashboard/gtm-planner" className="text-primary hover:underline">
            GTM
          </Link>
          ,{" "}
          <Link href="/dashboard/events" className="text-primary hover:underline">
            Events
          </Link>
          ,{" "}
          <Link href="/dashboard/content-studio" className="text-primary hover:underline">
            Content Studio
          </Link>
          , or{" "}
          <Link href="/dashboard/campaigns" className="text-primary hover:underline">
            Campaigns
          </Link>
          .
        </div>
      ) : null}

      {/* Mobile list */}
      <div className="space-y-3 md:hidden">
        {filtered.map((it) => (
          <div key={it.id} className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-heading">{it.title}</div>
                {it.subtitle ? <div className="mt-0.5 text-xs text-text2">{it.subtitle}</div> : null}
                <div className="mt-1 text-xs text-primary">{it.sourceLabel}</div>
              </div>
              <div className="shrink-0 text-right text-xs">
                <div
                  className={
                    it.done
                      ? "text-emerald-300/90"
                      : it.status === "Reference"
                        ? "text-text2"
                        : "text-heading"
                  }
                >
                  {it.status ?? "—"}
                </div>
                <div className="mt-1 text-[11px] text-text3">{it.due ?? "—"}</div>
              </div>
            </div>

            {it.timeline ? <div className="mt-2 line-clamp-3 text-xs text-text3">{it.timeline}</div> : null}
            {outcomes[it.id]?.notes ? (
              <div className="mt-2 line-clamp-2 text-[11px] text-primary">Update: {outcomes[it.id]!.notes}</div>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {it.source === "segments" ? (
                <button
                  type="button"
                  onClick={() => {
                    void (async () => {
                      try {
                        await seedMessagingFromSegment(it.title);
                      } catch (e) {
                        setError(e instanceof Error ? e.message : "Failed to seed messaging.");
                      }
                    })();
                  }}
                  className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20"
                >
                  Seed messaging
                </button>
              ) : null}
              {it.source === "segments" ? (
                <button
                  type="button"
                  onClick={() => {
                    void aiGenerateMessagingFromSegment(it.title, it.id);
                  }}
                  disabled={isBusy(it.id)}
                  className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20 disabled:opacity-60"
                >
                  {isBusy(it.id) ? "Generating…" : "AI draft"}
                </button>
              ) : null}
              {it.source === "positioning_studio" ? (
                <button
                  type="button"
                  onClick={() => void openPitchModal(it.id)}
                  disabled={isBusy(it.id)}
                  className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20 disabled:opacity-60"
                >
                  {isBusy(it.id) ? "Generating…" : "AI pitch"}
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => {
                  setEditingOutcomeId(it.id);
                  setEditingOutcomeNotes(outcomes[it.id]?.notes ?? "");
                }}
                className="rounded-lg border border-border bg-surface px-3 py-1 text-xs font-medium text-text2 hover:bg-surface2"
              >
                Update
              </button>
              <Link href={it.href} className="text-xs font-medium text-primary hover:text-primary-dark hover:underline">
                Open
              </Link>
            </div>

            {editingOutcomeId === it.id ? (
              <div className="mt-3">
                <textarea
                  value={editingOutcomeNotes}
                  onChange={(e) => setEditingOutcomeNotes(e.target.value)}
                  rows={3}
                  placeholder="Update / outcome notes (what changed, numbers, wins, next step)…"
                  className="w-full rounded-lg border border-border bg-surface px-2 py-2 text-sm text-heading"
                />
                <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => void saveOutcomeFor(it.id)}
                    className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingOutcomeId(null);
                      setEditingOutcomeNotes("");
                    }}
                    className="rounded-lg border border-border bg-surface px-3 py-1 text-xs font-medium text-text2 hover:bg-surface2"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-2xl border border-border bg-surface md:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border text-[10px] font-medium uppercase text-text2">
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
          <tbody className="text-heading">
            {filtered.map((it) => (
              <tr key={it.id} className="border-t border-border align-top">
                <td className="px-3 py-2">
                  <div className="font-medium">{it.title}</div>
                  {it.subtitle ? <div className="mt-0.5 text-xs text-text2">{it.subtitle}</div> : null}
                  {it.timeline ? (
                    <div className="mt-1 line-clamp-2 text-xs text-text3">{it.timeline}</div>
                  ) : null}
                  {outcomes[it.id]?.notes ? (
                    <div className="mt-1 line-clamp-2 text-[11px] text-primary">
                      Update: {outcomes[it.id]!.notes}
                    </div>
                  ) : null}
                  {it.tags?.length ? (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {it.tags.map((t) => (
                        <span key={t} className="rounded bg-surface3 px-1.5 py-0.5 text-[10px] text-text2">
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-xs text-primary">{it.sourceLabel}</td>
                <td className="px-3 py-2 text-xs text-text2">{it.category}</td>
                <td className="px-3 py-2">
                  <span
                    className={
                      it.done
                        ? "text-emerald-300/90"
                        : it.status === "Reference"
                          ? "text-text2"
                          : "text-heading"
                    }
                  >
                    {it.status ?? "—"}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-text2">{it.owner ?? "—"}</td>
                <td className="px-3 py-2 text-xs text-text2">{it.due ?? "—"}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-col items-end gap-2">
                    {editingOutcomeId === it.id ? (
                      <div className="w-56">
                        <textarea
                          value={editingOutcomeNotes}
                          onChange={(e) => setEditingOutcomeNotes(e.target.value)}
                          rows={3}
                          placeholder="Update / outcome notes (what changed, numbers, wins, next step)…"
                          className="w-full rounded-lg border border-border bg-surface px-2 py-2 text-sm text-heading"
                        />
                        <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => void saveOutcomeFor(it.id)}
                            className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingOutcomeId(null);
                              setEditingOutcomeNotes("");
                            }}
                            className="rounded-lg border border-border bg-surface px-3 py-1 text-xs font-medium text-text2 hover:bg-surface2"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {it.source === "segments" ? (
                          <button
                            type="button"
                            onClick={() => {
                              void (async () => {
                                try {
                                  await seedMessagingFromSegment(it.title);
                                } catch (e) {
                                  setError(e instanceof Error ? e.message : "Failed to seed messaging.");
                                }
                              })();
                            }}
                            className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20"
                          >
                            Seed messaging
                          </button>
                        ) : null}
                        {it.source === "segments" ? (
                          <button
                            type="button"
                            onClick={() => {
                              void aiGenerateMessagingFromSegment(it.title, it.id);
                            }}
                            disabled={isBusy(it.id)}
                            className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20 disabled:opacity-60"
                          >
                            {isBusy(it.id) ? "Generating…" : "AI generate draft"}
                          </button>
                        ) : null}
                        {it.source === "positioning_studio" ? (
                          <button
                            type="button"
                            onClick={() => void openPitchModal(it.id)}
                            disabled={isBusy(it.id)}
                            className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20 disabled:opacity-60"
                          >
                            {isBusy(it.id) ? "Generating…" : "AI generate pitch"}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingOutcomeId(it.id);
                            setEditingOutcomeNotes(outcomes[it.id]?.notes ?? "");
                          }}
                          className="rounded-lg border border-border bg-surface px-3 py-1 text-xs font-medium text-text2 hover:bg-surface2"
                        >
                          Update
                        </button>
                        <Link
                          href={it.href}
                          className="text-xs font-medium text-primary hover:text-primary-dark hover:underline"
                        >
                          Open
                        </Link>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <details className="rounded-2xl border border-border bg-surface p-4">
        <summary className="cursor-pointer text-sm font-medium text-heading">
          Workflow runs <span className="text-xs text-text2">({runLogs.length})</span>
        </summary>
        <div className="mt-3 space-y-2">
          {runLogs.length === 0 ? (
            <div className="text-sm text-text2">No workflow runs yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-border text-[10px] font-medium uppercase text-text2">
                  <tr>
                    <th className="py-2 pr-4">When</th>
                    <th className="py-2 pr-4">Action</th>
                    <th className="py-2 pr-4">Target</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2">Message</th>
                  </tr>
                </thead>
                <tbody className="text-heading">
                  {runLogs.slice(0, 30).map((r) => (
                    <tr key={r.id} className="border-t border-border align-top">
                      <td className="py-2 pr-4 text-xs text-text2">
                        {r.at ? new Date(r.at).toLocaleString() : "—"}
                      </td>
                      <td className="py-2 pr-4 text-xs text-primary">{r.action}</td>
                      <td className="py-2 pr-4 text-xs text-text2">
                        {r.targetLabel || r.targetId}
                      </td>
                      <td className="py-2 pr-4 text-xs">
                        <span
                          className={
                            r.status === "ok"
                              ? "text-emerald-300/90"
                              : r.status === "error"
                                ? "text-red-300/90"
                                : "text-amber"
                          }
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-2 text-xs text-text2">{r.message ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-2 text-[11px] text-text3">
                Showing the most recent 30 runs. Stored per product in <span className="font-mono">module_settings</span>{" "}
                (<span className="font-mono">work/workflow_runs</span>).
              </div>
            </div>
          )}
        </div>
      </details>

      {pitchModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-5">
            <div className="text-lg font-medium text-heading">Generate pitch battlecard</div>
            <div className="mt-1 text-sm text-text2">
              Pick a competitor. We’ll generate an ICP persona from your Positioning canvas, then create a pitch
              battlecard.
            </div>

            {pitchError ? (
              <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red">
                {pitchError}
              </div>
            ) : null}

            <div className="mt-4">
              <div className="mb-1 text-[10px] uppercase text-text2">Competitor</div>
              <select
                value={pitchCompetitorId}
                onChange={(e) => setPitchCompetitorId(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-sm text-heading"
                disabled={!pitchCompetitors.length}
              >
                {pitchCompetitors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setPitchModalOpen(false)}
                className="rounded-lg border border-border bg-surface2 px-4 py-2 text-sm font-medium text-text2 hover:bg-surface2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmPitchModal()}
                disabled={!pitchCompetitorId || !pitchCompetitors.length}
                className="rounded-lg bg-amber px-4 py-2 text-sm font-medium text-black disabled:opacity-60"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
