"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Markdown } from "@/lib/Markdown";
import { downloadPitchPdf } from "@/lib/pitchPdf";

type Competitor = { id: string; name: string; website_url: string; created_at: string };
type Battlecard = {
  competitor_id: string;
  strengths: string | null;
  weaknesses: string | null;
  why_we_win: string | null;
  objection_handling: string | null;
  updated_at: string;
};
type Persona = {
  id: string;
  name: string;
  website_url: string | null;
  industry: string | null;
  segment: string | null;
  company_size: string | null;
  buyer_roles: string | null;
  pains: string | null;
  current_stack: string | null;
  decision_criteria: string | null;
  notes: string | null;
  updated_at: string;
};

export default function BattlecardsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [cards, setCards] = useState<Record<string, Battlecard>>({});
  const [activeId, setActiveId] = useState<string | null>(null);

  const [mode, setMode] = useState<"competitor" | "pitch">("pitch");
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [personaId, setPersonaId] = useState<string | null>(null);
  const [creatingPersona, setCreatingPersona] = useState(false);
  const [personaForm, setPersonaForm] = useState({
    name: "",
    website_url: "",
    industry: "",
    segment: "",
    company_size: "",
    buyer_roles: "",
    pains: "",
    current_stack: "",
    decision_criteria: "",
    notes: ""
  });
  const [pitchLoading, setPitchLoading] = useState(false);
  const [pitchError, setPitchError] = useState<string | null>(null);
  const [pitchQuestions, setPitchQuestions] = useState<string[] | null>(null);
  const [pitchMarkdown, setPitchMarkdown] = useState<string | null>(null);
  const [personaEdit, setPersonaEdit] = useState({
    industry: "",
    buyer_roles: "",
    pains: "",
    decision_criteria: "",
    notes: ""
  });
  const [personaSaving, setPersonaSaving] = useState(false);
  const [personaSaved, setPersonaSaved] = useState<string | null>(null);

  const activeCompetitor = useMemo(
    () => competitors.find((c) => c.id === activeId) ?? null,
    [competitors, activeId]
  );

  const activeCard = useMemo(() => {
    if (!activeId) return null;
    return (
      cards[activeId] ?? {
        competitor_id: activeId,
        strengths: null,
        weaknesses: null,
        why_we_win: null,
        objection_handling: null,
        updated_at: new Date(0).toISOString()
      }
    );
  }, [cards, activeId]);

  async function load() {
    setLoading(true);
    setError(null);
    setSaved(null);
    try {
      const res = await fetch("/api/battlecards");
      const payload = (await res.json()) as {
        competitors?: Competitor[];
        battlecards?: Battlecard[];
        error?: string;
      };
      if (!res.ok) throw new Error(payload.error ?? "Failed to load battlecards.");
      const comps = payload.competitors ?? [];
      setCompetitors(comps);
      const map: Record<string, Battlecard> = {};
      (payload.battlecards ?? []).forEach((b) => {
        map[b.competitor_id] = b;
      });
      setCards(map);
      setActiveId((prev) => prev ?? comps[0]?.id ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load battlecards.");
    } finally {
      setLoading(false);
    }
  }

  async function loadPersonas() {
    try {
      const res = await fetch("/api/personas");
      const data = (await res.json()) as { personas?: Persona[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load personas.");
      const list = data.personas ?? [];
      setPersonas(list);
      setPersonaId((prev) => prev ?? list[0]?.id ?? null);
    } catch (e) {
      // keep pitch UI usable; show errors on generate
    }
  }

  const selectedPersona = useMemo(
    () => personas.find((p) => p.id === personaId) ?? null,
    [personas, personaId]
  );

  async function createPersona() {
    if (!personaForm.name.trim()) return;
    setCreatingPersona(true);
    setPitchError(null);
    try {
      const res = await fetch("/api/personas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(personaForm)
      });
      const data = (await res.json()) as { ok?: boolean; id?: string | null; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to create persona.");
      await loadPersonas();
      if (data.id) setPersonaId(data.id);
      setPersonaForm({
        name: "",
        website_url: "",
        industry: "",
        segment: "",
        company_size: "",
        buyer_roles: "",
        pains: "",
        current_stack: "",
        decision_criteria: "",
        notes: ""
      });
    } catch (e) {
      setPitchError(e instanceof Error ? e.message : "Failed to create persona.");
    } finally {
      setCreatingPersona(false);
    }
  }

  async function savePersonaImprovements() {
    if (!personaId) return;
    setPersonaSaving(true);
    setPersonaSaved(null);
    setPitchError(null);
    try {
      const res = await fetch(`/api/personas/${personaId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          industry: personaEdit.industry,
          buyer_roles: personaEdit.buyer_roles,
          pains: personaEdit.pains,
          decision_criteria: personaEdit.decision_criteria,
          notes: personaEdit.notes
        })
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to update persona.");
      setPersonaSaved("Persona updated.");
      await loadPersonas();
    } catch (e) {
      setPitchError(e instanceof Error ? e.message : "Failed to update persona.");
    } finally {
      setPersonaSaving(false);
    }
  }

  async function generatePitch() {
    if (!activeId || !personaId) return;
    setPitchLoading(true);
    setPitchError(null);
    setPitchQuestions(null);
    setPitchMarkdown(null);
    try {
      const key =
        typeof window === "undefined"
          ? ""
          : (window.localStorage.getItem("marketing_os_anthropic_api_key") ?? "").trim();
      const res = await fetch("/api/battlecards/pitch", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(key ? { "x-anthropic-key": key } : {})
        },
        body: JSON.stringify({ competitor_id: activeId, persona_id: personaId })
      });
      const data = (await res.json()) as {
        ok?: boolean;
        markdown?: string;
        pitch_json?: any;
        questions?: string[];
        missing_fields?: string[];
        error?: string;
      };
      if (!res.ok) {
        if (data.questions?.length) setPitchQuestions(data.questions);
        throw new Error(data.error ?? "Failed to generate pitch battlecard.");
      }
      setPitchMarkdown(data.markdown ?? null);
    } catch (e) {
      setPitchError(e instanceof Error ? e.message : "Failed to generate pitch battlecard.");
    } finally {
      setPitchLoading(false);
    }
  }

  async function save() {
    if (!activeCard) return;
    setSaving(true);
    setError(null);
    setSaved(null);
    try {
      const res = await fetch("/api/battlecards", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(activeCard)
      });
      const payload = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Failed to save.");
      setSaved("Saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  function patch(p: Partial<Battlecard>) {
    if (!activeId) return;
    setCards((prev) => ({
      ...prev,
      [activeId]: {
        ...(prev[activeId] ?? (activeCard as Battlecard)),
        ...p,
        competitor_id: activeId
      }
    }));
  }

  useEffect(() => {
    load();
    loadPersonas();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl text-text" style={{ fontFamily: "var(--font-heading)" }}>
            Battlecards
          </h1>
          <div className="mt-2 text-sm text-text2">
            Create competitor battlecards tied to your real Product Profile competitors.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/settings/product"
            className="rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-xs font-semibold text-text transition hover:bg-surface3 hover:border-border2"
          >
            Edit competitors
          </Link>
          <button
            onClick={save}
            disabled={saving || !activeId}
            className="rounded-[var(--radius2)] bg-accent px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#5b52ee] disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save battlecard"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-[var(--radius)] border border-border bg-surface p-5 text-sm text-text2">
          Loading…
        </div>
      ) : null}

      {error ? (
        <div className="rounded-[var(--radius)] border border-red bg-[rgba(248,113,113,0.12)] p-4 text-sm text-red">
          {error}
        </div>
      ) : null}

      {saved ? (
        <div className="rounded-[var(--radius)] border border-[rgba(52,211,153,0.3)] bg-[rgba(52,211,153,0.12)] p-4 text-sm text-green">
          {saved}
        </div>
      ) : null}

      {!loading && competitors.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
          <div className="text-sm font-semibold text-text">No competitors found</div>
          <div className="mt-2 text-sm text-text2">
            Add competitors in <span className="text-text">Settings → Product profile</span>, then come back here to
            create battlecards.
          </div>
          <div className="mt-3">
            <Link
              href="/dashboard/settings/product"
              className="inline-flex items-center rounded-[var(--radius2)] bg-accent px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#5b52ee]"
            >
              Add competitors
            </Link>
          </div>
        </div>
      ) : null}

      {!loading && competitors.length ? (
        <>
          <div className="rounded-[var(--radius)] border border-border bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm font-semibold text-text">Battlecard mode</div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMode("pitch")}
                  className={`rounded-[var(--radius2)] px-3 py-2 text-xs font-semibold transition ${
                    mode === "pitch"
                      ? "bg-accent text-white"
                      : "border border-border bg-surface2 text-text hover:bg-surface3 hover:border-border2"
                  }`}
                >
                  Pitch to customer
                </button>
                <button
                  type="button"
                  onClick={() => setMode("competitor")}
                  className={`rounded-[var(--radius2)] px-3 py-2 text-xs font-semibold transition ${
                    mode === "competitor"
                      ? "bg-accent text-white"
                      : "border border-border bg-surface2 text-text hover:bg-surface3 hover:border-border2"
                  }`}
                >
                  Competitor notes
                </button>
              </div>
            </div>
            <div className="mt-2 text-sm text-text2">
              Pitch mode generates what to say to a specific customer. Competitor notes stores your general view of the
              competitor.
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {competitors.map((c) => {
              const on = c.id === activeId;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setSaved(null);
                    setError(null);
                    setActiveId(c.id);
                  }}
                  className={`rounded-[var(--radius2)] px-3 py-2 text-sm font-semibold transition ${
                    on
                      ? "bg-accent text-white"
                      : "border border-border bg-surface2 text-text hover:bg-surface3 hover:border-border2"
                  }`}
                >
                  {c.name}
                </button>
              );
            })}
          </div>

          {mode === "pitch" ? (
            <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-text">Target customer</div>
                  <div className="mt-1 text-sm text-text2">
                    Add/select a customer persona. We’ll tailor the pitch vs {activeCompetitor?.name ?? "the competitor"}.
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!pitchMarkdown) return;
                      downloadPitchPdf({
                        productName: "Marketing OS",
                        personaName: selectedPersona?.name ?? "Customer",
                        competitorName: activeCompetitor?.name ?? "Competitor",
                        pitchMarkdown
                      });
                    }}
                    disabled={!pitchMarkdown}
                    className="rounded-[var(--radius2)] border border-border bg-surface2 px-4 py-2 text-xs font-semibold text-text transition hover:bg-surface3 hover:border-border2 disabled:opacity-50"
                  >
                    Download PDF
                  </button>
                  <button
                    type="button"
                    onClick={generatePitch}
                    disabled={pitchLoading || !personaId || !activeId}
                    className="rounded-[var(--radius2)] bg-accent px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#5b52ee] disabled:opacity-60"
                  >
                    {pitchLoading ? "Generating..." : "Generate pitch battlecard"}
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div>
                  <div className="mb-1 text-xs font-semibold tracking-[0.3px] text-text2">
                    Select persona
                  </div>
                  <select
                    value={personaId ?? ""}
                    onChange={(e) => {
                      const next = e.target.value || null;
                      setPersonaId(next);
                      setPersonaSaved(null);
                      const p = personas.find((x) => x.id === next) ?? null;
                      setPersonaEdit({
                        industry: p?.industry ?? "",
                        buyer_roles: p?.buyer_roles ?? "",
                        pains: p?.pains ?? "",
                        decision_criteria: p?.decision_criteria ?? "",
                        notes: p?.notes ?? ""
                      });
                    }}
                    className="w-full rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-sm text-text"
                  >
                    <option value="">Choose…</option>
                    {personas.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end gap-2">
                  <button
                    type="button"
                    onClick={() => setPitchMarkdown(null)}
                    className="rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-xs font-semibold text-text transition hover:bg-surface3 hover:border-border2"
                  >
                    Clear output
                  </button>
                  <Link
                    href="/dashboard/settings/product"
                    className="rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-xs font-semibold text-text transition hover:bg-surface3 hover:border-border2"
                  >
                    Product settings
                  </Link>
                </div>
              </div>

              <div className="mt-4 rounded-[var(--radius2)] border border-border bg-surface2 p-4">
                <div className="text-sm font-semibold text-text">Add a new persona</div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {[
                    ["name", "Customer name (e.g. Acme Health)"],
                    ["website_url", "Website (optional)"],
                    ["industry", "Industry (Required)"],
                    ["segment", "Segment (optional)"],
                    ["company_size", "Company size (optional)"],
                    ["buyer_roles", "Buyer roles (Required)"],
                    ["pains", "Top pains / jobs-to-be-done (Required)"],
                    ["current_stack", "Current stack (optional)"],
                    ["decision_criteria", "Decision criteria (Required)"],
                    ["notes", "Notes (optional)"]
                  ].map(([k, placeholder]) => (
                    <input
                      key={k}
                      value={(personaForm as any)[k] ?? ""}
                      onChange={(e) => setPersonaForm((prev) => ({ ...prev, [k]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full rounded-[var(--radius2)] border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text3"
                    />
                  ))}
                </div>
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={createPersona}
                    disabled={creatingPersona || !personaForm.name.trim()}
                    className="rounded-[var(--radius2)] bg-[rgba(52,211,153,0.15)] px-4 py-2 text-xs font-semibold text-green border border-[rgba(52,211,153,0.3)] transition hover:bg-[rgba(52,211,153,0.25)] disabled:opacity-60"
                  >
                    {creatingPersona ? "Creating..." : "Create persona"}
                  </button>
                </div>
              </div>

              {pitchQuestions?.length ? (
                <div className="mt-4 rounded-[var(--radius)] border border-yellow bg-[rgba(251,191,36,0.12)] p-4 text-sm text-yellow">
                  <div className="font-semibold text-text">To make this pitch better, answer these:</div>
                  <ul className="mt-2 list-disc pl-5 text-text2">
                    {pitchQuestions.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {personaId ? (
                <div className="mt-4 rounded-[var(--radius2)] border border-border bg-surface2 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-text">Improve persona (Q&A wizard)</div>
                      <div className="mt-1 text-sm text-text2">
                        Fill the key fields below, save, then generate again for a stronger pitch.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={savePersonaImprovements}
                      disabled={personaSaving}
                      className="rounded-[var(--radius2)] bg-[rgba(52,211,153,0.15)] px-4 py-2 text-xs font-semibold text-green border border-[rgba(52,211,153,0.3)] transition hover:bg-[rgba(52,211,153,0.25)] disabled:opacity-60"
                    >
                      {personaSaving ? "Saving..." : "Save persona answers"}
                    </button>
                  </div>

                  {personaSaved ? (
                    <div className="mt-3 rounded-[var(--radius2)] border border-[rgba(52,211,153,0.3)] bg-[rgba(52,211,153,0.12)] px-3 py-2 text-sm text-green">
                      {personaSaved}
                    </div>
                  ) : null}

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <TextArea
                      label="Industry (Required)"
                      value={personaEdit.industry}
                      onChange={(v) => setPersonaEdit((p) => ({ ...p, industry: v }))}
                    />
                    <TextArea
                      label="Buyer roles (Required)"
                      value={personaEdit.buyer_roles}
                      onChange={(v) => setPersonaEdit((p) => ({ ...p, buyer_roles: v }))}
                    />
                    <TextArea
                      label="Top pains / jobs-to-be-done (Required)"
                      value={personaEdit.pains}
                      onChange={(v) => setPersonaEdit((p) => ({ ...p, pains: v }))}
                    />
                    <TextArea
                      label="Decision criteria (Required)"
                      value={personaEdit.decision_criteria}
                      onChange={(v) => setPersonaEdit((p) => ({ ...p, decision_criteria: v }))}
                    />
                    <TextArea
                      label="Notes (Optional)"
                      value={personaEdit.notes}
                      onChange={(v) => setPersonaEdit((p) => ({ ...p, notes: v }))}
                    />
                  </div>
                </div>
              ) : null}

              {pitchError ? (
                <div className="mt-4 rounded-[var(--radius)] border border-red bg-[rgba(248,113,113,0.12)] p-4 text-sm text-red">
                  {pitchError}
                </div>
              ) : null}

              <div className="mt-4 rounded-[var(--radius2)] border border-border bg-surface2 p-4">
                {pitchMarkdown ? (
                  <Markdown content={pitchMarkdown} />
                ) : (
                  <div className="text-sm text-text2">
                    Generate a pitch battlecard to see the tailored talk track and objections.
                  </div>
                )}
              </div>
            </div>
          ) : null}

          <div className={`grid gap-4 lg:grid-cols-2 ${mode === "pitch" ? "opacity-60" : ""}`}>
            <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
              <div className="mb-2 text-sm font-semibold text-text">
                Strengths <span className="text-text2">({activeCompetitor?.name ?? "Competitor"})</span>
              </div>
              <textarea
                value={activeCard?.strengths ?? ""}
                onChange={(e) => patch({ strengths: e.target.value })}
                className="min-h-[160px] w-full rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-sm text-text placeholder:text-text3"
                placeholder="What they do well (features, positioning, proof points)"
              />

              <div className="mt-4 mb-2 text-sm font-semibold text-text">Weaknesses</div>
              <textarea
                value={activeCard?.weaknesses ?? ""}
                onChange={(e) => patch({ weaknesses: e.target.value })}
                className="min-h-[160px] w-full rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-sm text-text placeholder:text-text3"
                placeholder="Where they fall short (gaps, risks, objections)"
              />
            </div>

            <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
              <div className="mb-2 text-sm font-semibold text-text">Why We Win</div>
              <textarea
                value={activeCard?.why_we_win ?? ""}
                onChange={(e) => patch({ why_we_win: e.target.value })}
                className="min-h-[160px] w-full rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-sm text-text placeholder:text-text3"
                placeholder="Your differentiators and proof against this competitor"
              />

              <div className="mt-4 mb-2 text-sm font-semibold text-text">Objection Handling</div>
              <textarea
                value={activeCard?.objection_handling ?? ""}
                onChange={(e) => patch({ objection_handling: e.target.value })}
                className="min-h-[160px] w-full rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-sm text-text placeholder:text-text3"
                placeholder="Talk tracks, rebuttals, and traps to avoid"
              />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold tracking-[0.3px] text-text2">{label}</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full rounded-[var(--radius2)] border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text3"
      />
    </div>
  );
}

