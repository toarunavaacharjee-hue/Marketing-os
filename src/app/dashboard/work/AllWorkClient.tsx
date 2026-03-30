"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const [workGenerating, setWorkGenerating] = useState(false);
  const [outcomes, setOutcomes] = useState<Record<string, { notes: string; updatedAt: string }>>({});
  const [editingOutcomeId, setEditingOutcomeId] = useState<string | null>(null);
  const [editingOutcomeNotes, setEditingOutcomeNotes] = useState<string>("");

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

    // Outcome notes (measurement layer: human-updated updates + KPI snapshot text)
    const { data: outRow } = await supabase
      .from("module_settings")
      .select("value_json")
      .eq("environment_id", environmentId)
      .eq("module", "work")
      .eq("key", "outcomes")
      .maybeSingle();

    const value = (outRow?.value_json ?? null) as any;
    const rawItems = value?.items;
    const loadedOutcomes: Record<string, { notes: string; updatedAt: string }> =
      rawItems && typeof rawItems === "object" ? rawItems : {};

    setOutcomes(loadedOutcomes);
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

  async function aiGenerateMessagingFromSegment(segmentName: string) {
    setWorkGenerating(true);
    setError(null);
    try {
      const key = (window.localStorage.getItem("marketing_os_anthropic_api_key") ?? "").trim();

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
          ...(key ? { "x-anthropic-key": key } : {})
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate messaging.");
    } finally {
      setWorkGenerating(false);
    }
  }

  async function aiGeneratePitchBattlecardFromPositioning() {
    setWorkGenerating(true);
    setError(null);
    try {
      const key = (window.localStorage.getItem("marketing_os_anthropic_api_key") ?? "").trim();

      // 1) Create an ICP persona from the positioning canvas
      const personaRes = await fetch("/api/battlecards/persona-from-positioning", {
        method: "POST",
        headers: key ? { "x-anthropic-key": key } : {}
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

      // 2) Choose a competitor and generate the pitch battlecard
      const compsRes = await fetch("/api/battlecards");
      const compsData = (await compsRes.json()) as { competitors?: Array<{ id: string; name: string }>; error?: string };
      if (!compsRes.ok) throw new Error(compsData.error ?? "Failed to load competitors.");

      const comps = compsData.competitors ?? [];
      if (!comps.length) throw new Error("No competitors found. Add competitors in Battlecards first.");

      let competitorId = comps[0]?.id ?? "";
      if (comps.length > 1) {
        const raw = window.prompt(
          "Select competitor by id:\n" +
            comps.map((c) => `${c.id} - ${c.name}`).join("\n"),
          comps[0]?.id ?? ""
        );
        competitorId = (raw ?? "").trim();
      }
      if (!competitorId) throw new Error("Competitor id is required.");

      const pitchRes = await fetch("/api/battlecards/pitch", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(key ? { "x-anthropic-key": key } : {})
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate pitch battlecard.");
    } finally {
      setWorkGenerating(false);
    }
  }

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
                  {outcomes[it.id]?.notes ? (
                    <div className="mt-1 line-clamp-2 text-[11px] text-[#c4b8ff]">
                      Update: {outcomes[it.id]!.notes}
                    </div>
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
                  <div className="flex flex-col items-end gap-2">
                    {editingOutcomeId === it.id ? (
                      <div className="w-56">
                        <textarea
                          value={editingOutcomeNotes}
                          onChange={(e) => setEditingOutcomeNotes(e.target.value)}
                          rows={3}
                          placeholder="Update / outcome notes (what changed, numbers, wins, next step)…"
                          className="w-full rounded-lg border border-[#2a2e3f] bg-[#141420] px-2 py-2 text-sm text-[#f0f0f8]"
                        />
                        <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => void saveOutcomeFor(it.id)}
                            className="rounded-lg border border-[#7c6cff]/40 bg-[#7c6cff]/10 px-3 py-1 text-xs font-medium text-[#c4b8ff] hover:bg-[#7c6cff]/20"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingOutcomeId(null);
                              setEditingOutcomeNotes("");
                            }}
                            className="rounded-lg border border-[#2a2e3f] bg-[#141420] px-3 py-1 text-xs font-medium text-[#9090b0] hover:bg-white/5"
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
                            className="rounded-lg border border-[#7c6cff]/40 bg-[#7c6cff]/10 px-3 py-1 text-xs font-medium text-[#c4b8ff] hover:bg-[#7c6cff]/20"
                          >
                            Seed messaging
                          </button>
                        ) : null}
                        {it.source === "segments" ? (
                          <button
                            type="button"
                            onClick={() => {
                              void aiGenerateMessagingFromSegment(it.title);
                            }}
                            disabled={workGenerating}
                            className="rounded-lg border border-[#7c6cff]/40 bg-[#7c6cff]/10 px-3 py-1 text-xs font-medium text-[#c4b8ff] hover:bg-[#7c6cff]/20 disabled:opacity-60"
                          >
                            {workGenerating ? "Generating…" : "AI generate draft"}
                          </button>
                        ) : null}
                        {it.source === "positioning_studio" ? (
                          <button
                            type="button"
                            onClick={() => void aiGeneratePitchBattlecardFromPositioning()}
                            disabled={workGenerating}
                            className="rounded-lg border border-[#7c6cff]/40 bg-[#7c6cff]/10 px-3 py-1 text-xs font-medium text-[#c4b8ff] hover:bg-[#7c6cff]/20 disabled:opacity-60"
                          >
                            {workGenerating ? "Generating…" : "AI generate pitch"}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingOutcomeId(it.id);
                            setEditingOutcomeNotes(outcomes[it.id]?.notes ?? "");
                          }}
                          className="rounded-lg border border-[#2a2e3f] bg-[#141420] px-3 py-1 text-xs font-medium text-[#9090b0] hover:bg-white/5"
                        >
                          Update
                        </button>
                        <Link
                          href={it.href}
                          className="text-xs font-medium text-[#7c6cff] hover:text-[#a39cff] hover:underline"
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
    </div>
  );
}
