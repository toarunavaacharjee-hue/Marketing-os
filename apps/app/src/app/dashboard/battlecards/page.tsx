"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AiProgressBar, AI_PROGRESS_ESTIMATE } from "@/app/dashboard/_components/AiProgressBar";
import { Markdown } from "@/lib/Markdown";
import { downloadPitchPdf } from "@/lib/pitchPdf";
import { ModuleShell } from "@/app/dashboard/_components/ModuleShell";

type Competitor = { id: string; name: string; website_url: string; created_at: string };
type Battlecard = {
  competitor_id: string;
  strengths: string | null;
  weaknesses: string | null;
  why_we_win: string | null;
  objection_handling: string | null;
  positioning_version_id?: string | null;
  updated_at: string;
};
type Persona = {
  id: string;
  kind?: string | null;
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

type PersonaForm = {
  name: string;
  website_url: string;
  industry: string;
  segment: string;
  company_size: string;
  buyer_roles: string;
  pains: string;
  current_stack: string;
  decision_criteria: string;
  notes: string;
};

const emptyForm = (): PersonaForm => ({
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

function normalizeKind(k: string | null | undefined): "icp" | "account" {
  return k === "account" ? "account" : "icp";
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function PersonaCard({
  persona,
  selected,
  onClick
}: {
  persona: Persona;
  selected: boolean;
  onClick: () => void;
}) {
  const tags = [persona.industry, persona.company_size, persona.segment].filter(Boolean);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${
        selected
          ? "border-primary bg-primary/8 shadow-sm"
          : "border-border bg-surface hover:border-primary/30 hover:bg-surface2"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className={`text-sm font-semibold ${selected ? "text-primary" : "text-heading"}`}>
            {persona.name}
          </div>
          {tags.length > 0 ? (
            <div className="mt-1 flex flex-wrap gap-1">
              {tags.map((t) => (
                <span key={t} className="rounded-full bg-surface3 px-2 py-0.5 text-[10px] text-text2">
                  {t}
                </span>
              ))}
            </div>
          ) : null}
          {persona.pains ? (
            <div className="mt-1 line-clamp-1 text-xs text-text3">{persona.pains}</div>
          ) : null}
        </div>
        {selected ? (
          <span className="mt-0.5 shrink-0 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
            <span className="text-[9px] text-white font-bold">✓</span>
          </span>
        ) : null}
      </div>
    </button>
  );
}

function AddPersonaForm({
  form,
  onChange,
  onSave,
  onCancel,
  saving,
  kind
}: {
  form: PersonaForm;
  onChange: (patch: Partial<PersonaForm>) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  kind: "icp" | "account";
}) {
  const fields: [keyof PersonaForm, string][] = kind === "icp"
    ? [
        ["name", "ICP label *"],
        ["website_url", "Example site (optional)"],
        ["industry", "Industry"],
        ["segment", "Segment (optional)"],
        ["company_size", "Company size (optional)"],
        ["buyer_roles", "Buyer roles"],
        ["pains", "Pains / JTBD"],
        ["current_stack", "Typical stack (optional)"],
        ["decision_criteria", "Decision criteria"],
        ["notes", "Notes (optional)"],
      ]
    : [
        ["name", "Company name *"],
        ["website_url", "Website (optional)"],
        ["industry", "Industry"],
        ["segment", "Segment (optional)"],
        ["company_size", "Company size (optional)"],
        ["buyer_roles", "Buyer roles"],
        ["pains", "Pains / priorities"],
        ["current_stack", "Current stack (optional)"],
        ["decision_criteria", "Decision criteria"],
        ["notes", "Notes (optional)"],
      ];

  return (
    <div className="hs-card p-4 space-y-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-primary">
        {kind === "icp" ? "New ICP profile" : "New account prospect"}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {fields.map(([k, ph]) => (
          <input
            key={k}
            value={form[k]}
            onChange={(e) => onChange({ [k]: e.target.value })}
            placeholder={ph}
            className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-heading placeholder:text-text3 focus:border-primary focus:outline-none"
          />
        ))}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !form.name.trim()}
          className="hs-btn hs-btn-primary disabled:opacity-60"
        >
          {saving ? "Saving…" : `Save ${kind === "icp" ? "ICP profile" : "account"}`}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="hs-btn hs-btn-secondary"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function FieldTextarea({
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
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-text3">{label}</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-heading placeholder:text-text3 focus:border-primary focus:outline-none"
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

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
  const [icpPersonaId, setIcpPersonaId] = useState<string | null>(null);
  const [accountPersonaId, setAccountPersonaId] = useState<string | null>(null);
  const [icpForm, setIcpForm] = useState<PersonaForm>(() => emptyForm());
  const [accountForm, setAccountForm] = useState<PersonaForm>(() => emptyForm());
  const [showIcpForm, setShowIcpForm] = useState(false);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [creatingIcp, setCreatingIcp] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [uploadingIcp, setUploadingIcp] = useState(false);
  const [uploadingAccount, setUploadingAccount] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [approvedPositioningVersionId, setApprovedPositioningVersionId] = useState<string | null>(null);

  const [pitchLoading, setPitchLoading] = useState(false);
  const [pitchError, setPitchError] = useState<string | null>(null);
  const [pitchQuestions, setPitchQuestions] = useState<string[] | null>(null);
  const [pitchInfo, setPitchInfo] = useState<string | null>(null);
  const [pitchMarkdownIcp, setPitchMarkdownIcp] = useState<string | null>(null);
  const [pitchMarkdownAccount, setPitchMarkdownAccount] = useState<string | null>(null);
  const [editIcp, setEditIcp] = useState({ industry: "", buyer_roles: "", pains: "", decision_criteria: "", notes: "" });
  const [editAccount, setEditAccount] = useState({ industry: "", buyer_roles: "", pains: "", decision_criteria: "", notes: "" });
  const [personaSavingIcp, setPersonaSavingIcp] = useState(false);
  const [personaSavingAccount, setPersonaSavingAccount] = useState(false);
  const [personaSavedIcp, setPersonaSavedIcp] = useState<string | null>(null);
  const [personaSavedAccount, setPersonaSavedAccount] = useState<string | null>(null);

  const icpUploadRef = useRef<HTMLInputElement>(null);
  const accountUploadRef = useRef<HTMLInputElement>(null);

  const activeCompetitor = useMemo(() => competitors.find((c) => c.id === activeId) ?? null, [competitors, activeId]);
  const activeCard = useMemo(() => {
    if (!activeId) return null;
    return cards[activeId] ?? { competitor_id: activeId, strengths: null, weaknesses: null, why_we_win: null, objection_handling: null, updated_at: new Date(0).toISOString() };
  }, [cards, activeId]);
  const icpList = useMemo(() => personas.filter((p) => normalizeKind(p.kind) === "icp"), [personas]);
  const accountList = useMemo(() => personas.filter((p) => normalizeKind(p.kind) === "account"), [personas]);
  const selectedIcp = useMemo(() => personas.find((p) => p.id === icpPersonaId) ?? null, [personas, icpPersonaId]);
  const selectedAccount = useMemo(() => personas.find((p) => p.id === accountPersonaId) ?? null, [personas, accountPersonaId]);

  // ── Logic (unchanged) ────────────────────────────────────────────────────

  async function load() {
    setLoading(true);
    setError(null);
    setSaved(null);
    try {
      const res = await fetch("/api/battlecards");
      const payload = (await res.json()) as { competitors?: Competitor[]; battlecards?: Battlecard[]; approved_positioning_version_id?: string | null; error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Failed to load battlecards.");
      setApprovedPositioningVersionId(payload.approved_positioning_version_id ?? null);
      const comps = payload.competitors ?? [];
      setCompetitors(comps);
      const map: Record<string, Battlecard> = {};
      (payload.battlecards ?? []).forEach((b) => { map[b.competitor_id] = b; });
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
      setIcpPersonaId((prev) => {
        if (prev && list.some((p) => p.id === prev && normalizeKind(p.kind) === "icp")) return prev;
        return list.find((p) => normalizeKind(p.kind) === "icp")?.id ?? null;
      });
      setAccountPersonaId((prev) => {
        if (prev && list.some((p) => p.id === prev && normalizeKind(p.kind) === "account")) return prev;
        return list.find((p) => normalizeKind(p.kind) === "account")?.id ?? null;
      });
    } catch { /* keep UI usable */ }
  }

  useEffect(() => {
    const p = selectedIcp;
    setEditIcp({ industry: p?.industry ?? "", buyer_roles: p?.buyer_roles ?? "", pains: p?.pains ?? "", decision_criteria: p?.decision_criteria ?? "", notes: p?.notes ?? "" });
  }, [selectedIcp]);

  useEffect(() => {
    const p = selectedAccount;
    setEditAccount({ industry: p?.industry ?? "", buyer_roles: p?.buyer_roles ?? "", pains: p?.pains ?? "", decision_criteria: p?.decision_criteria ?? "", notes: p?.notes ?? "" });
  }, [selectedAccount]);

  async function createPersona(kind: "icp" | "account") {
    const form = kind === "icp" ? icpForm : accountForm;
    if (!form.name.trim()) return;
    const setCreating = kind === "icp" ? setCreatingIcp : setCreatingAccount;
    setCreating(true);
    setPitchError(null);
    try {
      const res = await fetch("/api/personas", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...form, kind }) });
      const data = (await res.json()) as { ok?: boolean; id?: string | null; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to create record.");
      await loadPersonas();
      if (data.id) {
        if (kind === "icp") setIcpPersonaId(data.id);
        else setAccountPersonaId(data.id);
      }
      if (kind === "icp") { setIcpForm(emptyForm()); setShowIcpForm(false); }
      else { setAccountForm(emptyForm()); setShowAccountForm(false); }
    } catch (e) {
      setPitchError(e instanceof Error ? e.message : "Failed to create record.");
    } finally {
      setCreating(false);
    }
  }

  async function uploadDocument(kind: "icp" | "account", file: File | null) {
    if (!file) return;
    setUploadError(null);
    const setBusy = kind === "icp" ? setUploadingIcp : setUploadingAccount;
    setBusy(true);
    if (kind === "icp") setShowIcpForm(true); else setShowAccountForm(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", kind);
      const res = await fetch("/api/battlecards/extract-document", { method: "POST", body: fd });
      const data = (await res.json()) as { ok?: boolean; fields?: Record<string, string> & { kind?: string }; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Upload failed.");
      const f = data.fields;
      if (!f) throw new Error("No fields returned.");
      const next = { name: f.name ?? "", website_url: f.website_url ?? "", industry: f.industry ?? "", segment: f.segment ?? "", company_size: f.company_size ?? "", buyer_roles: f.buyer_roles ?? "", pains: f.pains ?? "", current_stack: f.current_stack ?? "", decision_criteria: f.decision_criteria ?? "", notes: f.notes ?? "" };
      if (kind === "icp") setIcpForm((prev) => ({ ...prev, ...next }));
      else setAccountForm((prev) => ({ ...prev, ...next }));
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function savePersonaImprovements(kind: "icp" | "account") {
    const id = kind === "icp" ? icpPersonaId : accountPersonaId;
    if (!id) return;
    const setSaving2 = kind === "icp" ? setPersonaSavingIcp : setPersonaSavingAccount;
    const setSaved2 = kind === "icp" ? setPersonaSavedIcp : setPersonaSavedAccount;
    const payload = kind === "icp"
      ? { industry: editIcp.industry, buyer_roles: editIcp.buyer_roles, pains: editIcp.pains, decision_criteria: editIcp.decision_criteria, notes: editIcp.notes }
      : { industry: editAccount.industry, buyer_roles: editAccount.buyer_roles, pains: editAccount.pains, decision_criteria: editAccount.decision_criteria, notes: editAccount.notes };
    setSaving2(true);
    setSaved2(null);
    setPitchError(null);
    try {
      const res = await fetch(`/api/personas/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to update.");
      setSaved2("Saved.");
      await loadPersonas();
    } catch (e) {
      setPitchError(e instanceof Error ? e.message : "Failed to update.");
    } finally {
      setSaving2(false);
    }
  }

  async function fetchPitchMarkdown(kind: "icp" | "account"): Promise<{ markdown: string | null; needsMore: boolean }> {
    const personaId = kind === "icp" ? icpPersonaId : accountPersonaId;
    if (!activeId || !personaId) return { markdown: null, needsMore: false };
    const res = await fetch("/api/battlecards/pitch", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ competitor_id: activeId, persona_id: personaId }) });
    const data = (await res.json()) as { ok?: boolean; needs_input?: boolean; markdown?: string | null; questions?: string[]; message?: string; error?: string };
    if (data.needs_input) { setPitchQuestions(data.questions ?? []); setPitchInfo(data.message ?? null); return { markdown: null, needsMore: true }; }
    setPitchInfo(null);
    if (!res.ok) { if (data.questions?.length) setPitchQuestions(data.questions); throw new Error(data.error ?? "Failed to generate pitch battlecard."); }
    return { markdown: data.markdown ?? null, needsMore: false };
  }

  async function generatePitch(kind: "icp" | "account") {
    const personaId = kind === "icp" ? icpPersonaId : accountPersonaId;
    if (!activeId || !personaId) return;
    setPitchLoading(true);
    setPitchError(null);
    setPitchQuestions(null);
    setPitchInfo(null);
    if (kind === "icp") setPitchMarkdownIcp(null); else setPitchMarkdownAccount(null);
    try {
      const { markdown: md, needsMore } = await fetchPitchMarkdown(kind);
      if (needsMore) return;
      if (kind === "icp") setPitchMarkdownIcp(md); else setPitchMarkdownAccount(md);
    } catch (e) {
      setPitchError(e instanceof Error ? e.message : "Failed to generate pitch battlecard.");
    } finally {
      setPitchLoading(false);
    }
  }

  async function generateBothPitches() {
    if (!activeId || !icpPersonaId || !accountPersonaId) return;
    setPitchLoading(true);
    setPitchError(null);
    setPitchQuestions(null);
    setPitchInfo(null);
    setPitchMarkdownIcp(null);
    setPitchMarkdownAccount(null);
    try {
      const icp = await fetchPitchMarkdown("icp");
      if (icp.needsMore) return;
      setPitchMarkdownIcp(icp.markdown);
      const acc = await fetchPitchMarkdown("account");
      if (acc.needsMore) return;
      setPitchMarkdownAccount(acc.markdown);
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
      const res = await fetch("/api/battlecards", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(activeCard) });
      const payload = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Failed to save.");
      setSaved("Battlecard saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  function patch(p: Partial<Battlecard>) {
    if (!activeId) return;
    setCards((prev) => ({ ...prev, [activeId]: { ...(prev[activeId] ?? (activeCard as Battlecard)), ...p, competitor_id: activeId } }));
  }

  useEffect(() => { load(); loadPersonas(); }, []);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <ModuleShell
      title="Battlecards"
      subtitle="Competitor notes, ICP-level positioning, and named-account pitches — tied to your Product Profile."
      actions={
        <Link href="/dashboard/settings/product" className="hs-btn hs-btn-secondary">
          Edit competitors
        </Link>
      }
    >
    <div className="space-y-5">

      {approvedPositioningVersionId ? (
        <p className="text-xs text-text3">
          Linked to approved positioning <span className="font-mono text-[11px] text-text">v{approvedPositioningVersionId.slice(0, 8)}…</span>
        </p>
      ) : (
        <p className="text-xs text-amber-700">
          No approved positioning yet.{" "}
          <Link href="/dashboard/positioning-studio" className="underline hover:no-underline">
            Approve one in Positioning Studio
          </Link>{" "}
          to anchor battlecards to a spine.
        </p>
      )}

      {/* Toasts */}
      {error ? <div className="hs-alert hs-alert-error">{error}</div> : null}
      {saved ? <div className="hs-alert hs-alert-success">{saved}</div> : null}

      <AiProgressBar
        active={pitchLoading || uploadingIcp || uploadingAccount}
        title={uploadingIcp || uploadingAccount ? "Extracting persona from document…" : "Generating battlecard with AI…"}
        estimate={uploadingIcp || uploadingAccount ? AI_PROGRESS_ESTIMATE.extract : AI_PROGRESS_ESTIMATE.memo}
        durationMs={uploadingIcp || uploadingAccount ? 75_000 : 100_000}
      />

      {/* No competitors */}
      {!loading && competitors.length === 0 ? (
        <div className="hs-card p-6 text-center">
          <div className="text-sm font-semibold text-heading">No competitors added yet</div>
          <p className="mt-1 text-sm text-text2">Add competitors in Settings → Product profile, then generate battlecards here.</p>
          <Link href="/dashboard/settings/product" className="hs-btn hs-btn-primary mt-4">
            Add competitors
          </Link>
        </div>
      ) : null}

      {!loading && competitors.length > 0 ? (
        <>
          {/* Competitor tabs + mode toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {competitors.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { setSaved(null); setError(null); setActiveId(c.id); }}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                    c.id === activeId
                      ? "bg-primary text-white"
                      : "border border-border bg-surface2 text-text hover:bg-surface3"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
            <div className="flex rounded-xl border border-border bg-surface2 p-0.5">
              <button
                type="button"
                onClick={() => setMode("pitch")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${mode === "pitch" ? "bg-primary text-white shadow-sm" : "text-text2 hover:text-text"}`}
              >
                ICP &amp; Account pitches
              </button>
              <button
                type="button"
                onClick={() => setMode("competitor")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${mode === "competitor" ? "bg-primary text-white shadow-sm" : "text-text2 hover:text-text"}`}
              >
                Competitor notes
              </button>
            </div>
          </div>

          {/* ── PITCH MODE ──────────────────────────────────────────────────── */}
          {mode === "pitch" ? (
            <div className="space-y-5">

              {/* ICP + Account profile panels side by side */}
              <div className="grid gap-5 lg:grid-cols-2">

                {/* ICP profiles */}
                <div className="hs-card p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-heading">ICP profiles</div>
                      <div className="text-xs text-text2">{icpList.length} saved · segment-level</div>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => icpUploadRef.current?.click()}
                        disabled={uploadingIcp}
                        className="rounded-lg border border-border bg-surface2 px-2.5 py-1.5 text-xs font-medium text-text2 hover:bg-surface3 disabled:opacity-50"
                        title="Upload PDF / Word / Excel to auto-fill"
                      >
                        {uploadingIcp ? "Reading…" : "↑ Upload"}
                      </button>
                      <input
                        ref={icpUploadRef}
                        type="file"
                        accept=".pdf,.docx,.xlsx,.xls,.csv"
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0] ?? null; e.target.value = ""; void uploadDocument("icp", f); }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowIcpForm((v) => !v)}
                        className="rounded-lg border border-primary/30 bg-primary/8 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15"
                      >
                        {showIcpForm ? "Cancel" : "+ Add new"}
                      </button>
                    </div>
                  </div>

                  {icpList.length === 0 && !showIcpForm ? (
                    <div className="rounded-xl border border-dashed border-border bg-surface2 p-4 text-center text-sm text-text2">
                      No ICP profiles yet. Upload a brief or click <span className="font-medium text-text">+ Add new</span>.
                    </div>
                  ) : null}

                  {icpList.map((p) => (
                    <PersonaCard key={p.id} persona={p} selected={p.id === icpPersonaId}
                      onClick={() => { setIcpPersonaId(p.id); setPersonaSavedIcp(null); }} />
                  ))}

                  {showIcpForm ? (
                    <AddPersonaForm
                      form={icpForm}
                      onChange={(patch) => setIcpForm((prev) => ({ ...prev, ...patch }))}
                      onSave={() => void createPersona("icp")}
                      onCancel={() => setShowIcpForm(false)}
                      saving={creatingIcp}
                      kind="icp"
                    />
                  ) : null}
                </div>

                {/* Account prospects */}
                <div className="hs-card p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-heading">Account prospects</div>
                      <div className="text-xs text-text2">{accountList.length} saved · named companies</div>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => accountUploadRef.current?.click()}
                        disabled={uploadingAccount}
                        className="rounded-lg border border-border bg-surface2 px-2.5 py-1.5 text-xs font-medium text-text2 hover:bg-surface3 disabled:opacity-50"
                        title="Upload RFP, account plan, or CRM export to auto-fill"
                      >
                        {uploadingAccount ? "Reading…" : "↑ Upload"}
                      </button>
                      <input
                        ref={accountUploadRef}
                        type="file"
                        accept=".pdf,.docx,.xlsx,.xls,.csv"
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0] ?? null; e.target.value = ""; void uploadDocument("account", f); }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowAccountForm((v) => !v)}
                        className="rounded-lg border border-primary/30 bg-primary/8 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15"
                      >
                        {showAccountForm ? "Cancel" : "+ Add new"}
                      </button>
                    </div>
                  </div>

                  {accountList.length === 0 && !showAccountForm ? (
                    <div className="rounded-xl border border-dashed border-border bg-surface2 p-4 text-center text-sm text-text2">
                      No accounts yet. Upload a CRM export or click <span className="font-medium text-text">+ Add new</span>.
                    </div>
                  ) : null}

                  {accountList.map((p) => (
                    <PersonaCard key={p.id} persona={p} selected={p.id === accountPersonaId}
                      onClick={() => { setAccountPersonaId(p.id); setPersonaSavedAccount(null); }} />
                  ))}

                  {showAccountForm ? (
                    <AddPersonaForm
                      form={accountForm}
                      onChange={(patch) => setAccountForm((prev) => ({ ...prev, ...patch }))}
                      onSave={() => void createPersona("account")}
                      onCancel={() => setShowAccountForm(false)}
                      saving={creatingAccount}
                      kind="account"
                    />
                  ) : null}
                </div>
              </div>

              {uploadError ? (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red">{uploadError}</div>
              ) : null}

              {/* Generate panel */}
              <div className="hs-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-heading">
                      Generate vs <span className="text-primary">{activeCompetitor?.name ?? "competitor"}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-text2">Select an ICP and/or account above, then generate.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setPitchMarkdownIcp(null); setPitchMarkdownAccount(null); }}
                    className="hs-btn hs-btn-secondary"
                  >
                    Clear outputs
                  </button>
                </div>

                {/* Selected profiles preview */}
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div className={`rounded-xl border px-3 py-2 text-sm ${selectedIcp ? "border-primary/25 bg-primary/5" : "border-dashed border-border bg-surface2"}`}>
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-text3">ICP profile</div>
                    <div className={`mt-0.5 font-medium ${selectedIcp ? "text-heading" : "text-text3 italic"}`}>
                      {selectedIcp?.name ?? "None selected"}
                    </div>
                  </div>
                  <div className={`rounded-xl border px-3 py-2 text-sm ${selectedAccount ? "border-primary/25 bg-primary/5" : "border-dashed border-border bg-surface2"}`}>
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-text3">Account prospect</div>
                    <div className={`mt-0.5 font-medium ${selectedAccount ? "text-heading" : "text-text3 italic"}`}>
                      {selectedAccount?.name ?? "None selected"}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void generatePitch("icp")}
                    disabled={pitchLoading || !icpPersonaId || !activeId}
                    className="hs-btn hs-btn-primary disabled:opacity-60"
                  >
                    {pitchLoading ? "Working…" : "Generate ICP battlecard"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void generatePitch("account")}
                    disabled={pitchLoading || !accountPersonaId || !activeId}
                    className="hs-btn hs-btn-primary disabled:opacity-60"
                  >
                    {pitchLoading ? "Working…" : "Generate account battlecard"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void generateBothPitches()}
                    disabled={pitchLoading || !icpPersonaId || !accountPersonaId || !activeId}
                    className="hs-btn hs-btn-secondary disabled:opacity-60"
                  >
                    Generate both
                  </button>
                  <button
                    type="button"
                    onClick={() => { if (pitchMarkdownIcp) downloadPitchPdf({ productName: "AI Marketing Workbench", personaName: selectedIcp?.name ?? "ICP", competitorName: activeCompetitor?.name ?? "Competitor", pitchMarkdown: pitchMarkdownIcp }); }}
                    disabled={!pitchMarkdownIcp}
                    className="hs-btn hs-btn-secondary disabled:opacity-40"
                  >
                    PDF · ICP
                  </button>
                  <button
                    type="button"
                    onClick={() => { if (pitchMarkdownAccount) downloadPitchPdf({ productName: "AI Marketing Workbench", personaName: selectedAccount?.name ?? "Account", competitorName: activeCompetitor?.name ?? "Competitor", pitchMarkdown: pitchMarkdownAccount }); }}
                    disabled={!pitchMarkdownAccount}
                    className="hs-btn hs-btn-secondary disabled:opacity-40"
                  >
                    PDF · Account
                  </button>
                </div>
              </div>

              {/* More detail needed */}
              {pitchQuestions?.length ? (
                <div className="rounded-xl border border-yellow-400/30 bg-yellow-400/8 p-4">
                  <div className="text-sm font-semibold text-heading">More detail needed</div>
                  {pitchInfo ? <div className="mt-1 text-sm text-text2">{pitchInfo}</div> : null}
                  <div className="mt-2 text-xs font-medium text-text2">Add these to the persona, then generate again:</div>
                  <ul className="mt-2 list-disc pl-5 space-y-1">
                    {pitchQuestions.map((q, i) => (
                      <li key={i} className="text-sm text-text2">{q}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {pitchError ? (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red">{pitchError}</div>
              ) : null}

              {/* Refine panels */}
              <div className="grid gap-4 lg:grid-cols-2">
                {icpPersonaId ? (
                  <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold text-heading">Refine ICP</div>
                        <div className="text-xs text-text2">Save then regenerate the ICP battlecard.</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void savePersonaImprovements("icp")}
                        disabled={personaSavingIcp}
                        className="hs-btn hs-btn-primary disabled:opacity-60"
                      >
                        {personaSavingIcp ? "Saving…" : "Save ICP answers"}
                      </button>
                    </div>
                    {personaSavedIcp ? <div className="hs-alert hs-alert-success">{personaSavedIcp}</div> : null}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <FieldTextarea label="Industry" value={editIcp.industry} onChange={(v) => setEditIcp((p) => ({ ...p, industry: v }))} />
                      <FieldTextarea label="Buyer roles" value={editIcp.buyer_roles} onChange={(v) => setEditIcp((p) => ({ ...p, buyer_roles: v }))} />
                      <FieldTextarea label="Pains / JTBD" value={editIcp.pains} onChange={(v) => setEditIcp((p) => ({ ...p, pains: v }))} />
                      <FieldTextarea label="Decision criteria" value={editIcp.decision_criteria} onChange={(v) => setEditIcp((p) => ({ ...p, decision_criteria: v }))} />
                      <FieldTextarea label="Notes" value={editIcp.notes} onChange={(v) => setEditIcp((p) => ({ ...p, notes: v }))} />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-surface p-5 text-sm text-text3">
                    Select an ICP profile above to refine its fields.
                  </div>
                )}

                {accountPersonaId ? (
                  <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold text-heading">Refine account</div>
                        <div className="text-xs text-text2">Save then regenerate the account battlecard.</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void savePersonaImprovements("account")}
                        disabled={personaSavingAccount}
                        className="hs-btn hs-btn-primary disabled:opacity-60"
                      >
                        {personaSavingAccount ? "Saving…" : "Save account answers"}
                      </button>
                    </div>
                    {personaSavedAccount ? <div className="hs-alert hs-alert-success">{personaSavedAccount}</div> : null}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <FieldTextarea label="Industry" value={editAccount.industry} onChange={(v) => setEditAccount((p) => ({ ...p, industry: v }))} />
                      <FieldTextarea label="Buyer roles" value={editAccount.buyer_roles} onChange={(v) => setEditAccount((p) => ({ ...p, buyer_roles: v }))} />
                      <FieldTextarea label="Pains / priorities" value={editAccount.pains} onChange={(v) => setEditAccount((p) => ({ ...p, pains: v }))} />
                      <FieldTextarea label="Decision criteria" value={editAccount.decision_criteria} onChange={(v) => setEditAccount((p) => ({ ...p, decision_criteria: v }))} />
                      <FieldTextarea label="Notes" value={editAccount.notes} onChange={(v) => setEditAccount((p) => ({ ...p, notes: v }))} />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-surface p-5 text-sm text-text3">
                    Select an account prospect above to refine its fields.
                  </div>
                )}
              </div>

              {/* Output panels */}
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="hs-card p-4">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-text3">ICP battlecard</div>
                  {pitchMarkdownIcp
                    ? <Markdown content={pitchMarkdownIcp} />
                    : <p className="text-sm text-text2">Generate an ICP battlecard to see segment-level positioning.</p>}
                </div>
                <div className="hs-card p-4">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-text3">Account battlecard</div>
                  {pitchMarkdownAccount
                    ? <Markdown content={pitchMarkdownAccount} />
                    : <p className="text-sm text-text2">Generate an account battlecard for stakeholder-specific talk tracks.</p>}
                </div>
              </div>
            </div>
          ) : null}

          {/* ── COMPETITOR NOTES MODE ────────────────────────────────────────── */}
          {mode === "competitor" ? (
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="hs-card p-4 space-y-4">
                  <div>
                    <div className="mb-1.5 text-sm font-semibold text-heading">
                      Strengths <span className="font-normal text-text3">({activeCompetitor?.name ?? "Competitor"})</span>
                    </div>
                    <textarea
                      value={activeCard?.strengths ?? ""}
                      onChange={(e) => patch({ strengths: e.target.value })}
                      rows={6}
                      className="w-full rounded-xl border border-border bg-surface2 px-3 py-2.5 text-sm text-heading placeholder:text-text3 focus:border-primary focus:outline-none"
                      placeholder="What they do well — features, positioning, proof points"
                    />
                  </div>
                  <div>
                    <div className="mb-1.5 text-sm font-semibold text-heading">Weaknesses</div>
                    <textarea
                      value={activeCard?.weaknesses ?? ""}
                      onChange={(e) => patch({ weaknesses: e.target.value })}
                      rows={6}
                      className="w-full rounded-xl border border-border bg-surface2 px-3 py-2.5 text-sm text-heading placeholder:text-text3 focus:border-primary focus:outline-none"
                      placeholder="Where they fall short — gaps, risks, customer complaints"
                    />
                  </div>
                </div>

                <div className="hs-card p-4 space-y-4">
                  <div>
                    <div className="mb-1.5 text-sm font-semibold text-heading">Why we win</div>
                    <textarea
                      value={activeCard?.why_we_win ?? ""}
                      onChange={(e) => patch({ why_we_win: e.target.value })}
                      rows={6}
                      className="w-full rounded-xl border border-border bg-surface2 px-3 py-2.5 text-sm text-heading placeholder:text-text3 focus:border-primary focus:outline-none"
                      placeholder="Your differentiators and proof against this competitor"
                    />
                  </div>
                  <div>
                    <div className="mb-1.5 text-sm font-semibold text-heading">Objection handling</div>
                    <textarea
                      value={activeCard?.objection_handling ?? ""}
                      onChange={(e) => patch({ objection_handling: e.target.value })}
                      rows={6}
                      className="w-full rounded-xl border border-border bg-surface2 px-3 py-2.5 text-sm text-heading placeholder:text-text3 focus:border-primary focus:outline-none"
                      placeholder="Talk tracks, rebuttals, and traps to avoid"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={saving || !activeId}
                  className="hs-btn hs-btn-primary disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save battlecard"}
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
    </ModuleShell>
  );
}
