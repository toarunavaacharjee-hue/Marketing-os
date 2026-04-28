"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Segment = {
  id: string;
  name: string;
  pnf_score: number;
  pain_points: string[];
  notes: string | null;
};

export default function SegmentsClient({ environmentId }: { environmentId: string }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [pnf, setPnf] = useState(72);
  const [pains, setPains] = useState("Attribution gaps, Slow iteration, Weak proof");
  const [notes, setNotes] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("segments")
      .select("id,name,pnf_score,pain_points,notes")
      .eq("environment_id", environmentId)
      .order("created_at", { ascending: false });

    if (error) setError(error.message);
    setSegments((data ?? []) as Segment[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [environmentId]);

  async function addSegment() {
    setError(null);
    const pain_points = pains
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);

    const { error } = await supabase.from("segments").insert({
      environment_id: environmentId,
      name,
      pnf_score: pnf,
      pain_points,
      notes: notes || null
    });
    if (error) {
      setError(error.message);
      return;
    }
    setName("");
    setNotes("");
    await load();
  }

  async function updateSegment(id: string, patch: Partial<Segment>) {
    setError(null);
    const { error } = await supabase
      .from("segments")
      .update(patch)
      .eq("id", id)
      .eq("environment_id", environmentId);
    if (error) setError(error.message);
    else await load();
  }

  async function deleteSegment(id: string) {
    setError(null);
    const { error } = await supabase
      .from("segments")
      .delete()
      .eq("id", id)
      .eq("environment_id", environmentId);
    if (error) setError(error.message);
    else await load();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-surface p-6">
        <div className="text-lg text-heading">Segments</div>
        <div className="mt-1 text-sm text-text2">
          Segments are scoped to this product’s <span className="text-heading">Default</span>{" "}
          environment.
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red">
            {error}
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Segment name (e.g. RevOps-led B2B)"
            className="md:col-span-2 w-full rounded-xl border border-border bg-surface2 px-3 py-2 text-sm text-heading"
          />
          <input
            type="number"
            value={pnf}
            onChange={(e) => setPnf(Number(e.target.value))}
            className="w-full rounded-xl border border-border bg-surface2 px-3 py-2 text-sm text-heading"
            min={0}
            max={100}
          />
          <button
            onClick={addSegment}
            disabled={!name.trim()}
            className="rounded-xl bg-amber px-4 py-2 text-sm font-medium text-black disabled:opacity-60"
          >
            Add
          </button>
        </div>

        <div className="mt-3">
          <div className="mb-1 text-xs text-text2">Pain points (comma-separated)</div>
          <input
            value={pains}
            onChange={(e) => setPains(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface2 px-3 py-2 text-sm text-heading"
          />
        </div>

        <div className="mt-3">
          <div className="mb-1 text-xs text-text2">Notes</div>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface2 px-3 py-2 text-sm text-heading"
            placeholder="Optional"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6">
        <div className="mb-3 text-sm text-heading">
          Saved segments {loading ? <span className="text-text2">(loading…)</span> : null}
        </div>

        <div className="space-y-2">
          {segments.map((s) => (
            <div
              key={s.id}
              className="rounded-2xl border border-border bg-surface2 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm text-heading">{s.name}</div>
                  <div className="mt-1 text-xs text-text2">
                    PNF score: <span className="text-heading">{s.pnf_score}</span> •{" "}
                    {s.pain_points?.slice(0, 3).join(" • ")}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      updateSegment(s.id, {
                        pnf_score: Math.min(100, (s.pnf_score ?? 0) + 5)
                      })
                    }
                    className="rounded-xl border border-border bg-surface px-3 py-2 text-xs text-heading hover:bg-surface2"
                  >
                    +5 PNF
                  </button>
                  <button
                    onClick={() => deleteSegment(s.id)}
                    className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red hover:bg-red-500/15"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {s.notes ? (
                <div className="mt-2 text-sm text-text2">{s.notes}</div>
              ) : null}
            </div>
          ))}

          {!loading && segments.length === 0 ? (
            <div className="text-sm text-text2">No segments yet. Add one above.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

