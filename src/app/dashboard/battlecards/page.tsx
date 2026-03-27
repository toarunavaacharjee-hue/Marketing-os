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
  const [creatingIcp, setCreatingIcp] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [uploadingIcp, setUploadingIcp] = useState(false);
  const [uploadingAccount, setUploadingAccount] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [pitchLoading, setPitchLoading] = useState(false);
  const [pitchError, setPitchError] = useState<string | null>(null);
  const [pitchQuestions, setPitchQuestions] = useState<string[] | null>(null);
  const [pitchMarkdownIcp, setPitchMarkdownIcp] = useState<string | null>(null);
  const [pitchMarkdownAccount, setPitchMarkdownAccount] = useState<string | null>(null);
  const [editIcp, setEditIcp] = useState({
    industry: "",
    buyer_roles: "",
    pains: "",
    decision_criteria: "",
    notes: ""
  });
  const [editAccount, setEditAccount] = useState({
    industry: "",
    buyer_roles: "",
    pains: "",
    decision_criteria: "",
    notes: ""
  });
  const [personaSavingIcp, setPersonaSavingIcp] = useState(false);
  const [personaSavingAccount, setPersonaSavingAccount] = useState(false);
  const [personaSavedIcp, setPersonaSavedIcp] = useState<string | null>(null);
  const [personaSavedAccount, setPersonaSavedAccount] = useState<string | null>(null);

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

  const icpList = useMemo(
    () => personas.filter((p) => normalizeKind(p.kind) === "icp"),
    [personas]
  );
  const accountList = useMemo(
    () => personas.filter((p) => normalizeKind(p.kind) === "account"),
    [personas]
  );

  const selectedIcp = useMemo(
    () => personas.find((p) => p.id === icpPersonaId) ?? null,
    [personas, icpPersonaId]
  );
  const selectedAccount = useMemo(
    () => personas.find((p) => p.id === accountPersonaId) ?? null,
    [personas, accountPersonaId]
  );

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
      setIcpPersonaId((prev) => {
        if (prev && list.some((p) => p.id === prev && normalizeKind(p.kind) === "icp")) return prev;
        return list.find((p) => normalizeKind(p.kind) === "icp")?.id ?? null;
      });
      setAccountPersonaId((prev) => {
        if (prev && list.some((p) => p.id === prev && normalizeKind(p.kind) === "account")) return prev;
        return list.find((p) => normalizeKind(p.kind) === "account")?.id ?? null;
      });
    } catch {
      // keep pitch UI usable
    }
  }

  useEffect(() => {
    const p = selectedIcp;
    setEditIcp({
      industry: p?.industry ?? "",
      buyer_roles: p?.buyer_roles ?? "",
      pains: p?.pains ?? "",
      decision_criteria: p?.decision_criteria ?? "",
      notes: p?.notes ?? ""
    });
  }, [selectedIcp]);

  useEffect(() => {
    const p = selectedAccount;
    setEditAccount({
      industry: p?.industry ?? "",
      buyer_roles: p?.buyer_roles ?? "",
      pains: p?.pains ?? "",
      decision_criteria: p?.decision_criteria ?? "",
      notes: p?.notes ?? ""
    });
  }, [selectedAccount]);

  async function createPersona(kind: "icp" | "account") {
    const form = kind === "icp" ? icpForm : accountForm;
    if (!form.name.trim()) return;
    const setCreating = kind === "icp" ? setCreatingIcp : setCreatingAccount;
    setCreating(true);
    setPitchError(null);
    try {
      const res = await fetch("/api/personas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, kind })
      });
      const data = (await res.json()) as { ok?: boolean; id?: string | null; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to create record.");
      await loadPersonas();
      if (data.id) {
        if (kind === "icp") setIcpPersonaId(data.id);
        else setAccountPersonaId(data.id);
      }
      if (kind === "icp") setIcpForm(emptyForm());
      else setAccountForm(emptyForm());
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
    try {
      const key =
        typeof window === "undefined"
          ? ""
          : (window.localStorage.getItem("marketing_os_anthropic_api_key") ?? "").trim();
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", kind);
      const res = await fetch("/api/battlecards/extract-document", {
        method: "POST",
        headers: key ? { "x-anthropic-key": key } : {},
        body: fd
      });
      const data = (await res.json()) as {
        ok?: boolean;
        fields?: Record<string, string> & { kind?: string };
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Upload failed.");
      const f = data.fields;
      if (!f) throw new Error("No fields returned.");
      const next = {
        name: f.name ?? "",
        website_url: f.website_url ?? "",
        industry: f.industry ?? "",
        segment: f.segment ?? "",
        company_size: f.company_size ?? "",
        buyer_roles: f.buyer_roles ?? "",
        pains: f.pains ?? "",
        current_stack: f.current_stack ?? "",
        decision_criteria: f.decision_criteria ?? "",
        notes: f.notes ?? ""
      };
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
    const setSaving = kind === "icp" ? setPersonaSavingIcp : setPersonaSavingAccount;
    const setSaved = kind === "icp" ? setPersonaSavedIcp : setPersonaSavedAccount;
    const payload =
      kind === "icp"
        ? {
            industry: editIcp.industry,
            buyer_roles: editIcp.buyer_roles,
            pains: editIcp.pains,
            decision_criteria: editIcp.decision_criteria,
            notes: editIcp.notes
          }
        : {
            industry: editAccount.industry,
            buyer_roles: editAccount.buyer_roles,
            pains: editAccount.pains,
            decision_criteria: editAccount.decision_criteria,
            notes: editAccount.notes
          };
    setSaving(true);
    setSaved(null);
    setPitchError(null);
    try {
      const res = await fetch(`/api/personas/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to update.");
      setSaved("Saved.");
      await loadPersonas();
    } catch (e) {
      setPitchError(e instanceof Error ? e.message : "Failed to update.");
    } finally {
      setSaving(false);
    }
  }

  async function fetchPitchMarkdown(kind: "icp" | "account"): Promise<string | null> {
    const personaId = kind === "icp" ? icpPersonaId : accountPersonaId;
    if (!activeId || !personaId) return null;
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
      questions?: string[];
      error?: string;
    };
    if (!res.ok) {
      if (data.questions?.length) setPitchQuestions(data.questions);
      throw new Error(data.error ?? "Failed to generate pitch battlecard.");
    }
    return data.markdown ?? null;
  }

  async function generatePitch(kind: "icp" | "account") {
    const personaId = kind === "icp" ? icpPersonaId : accountPersonaId;
    if (!activeId || !personaId) return;
    setPitchLoading(true);
    setPitchError(null);
    setPitchQuestions(null);
    if (kind === "icp") setPitchMarkdownIcp(null);
    else setPitchMarkdownAccount(null);
    try {
      const md = await fetchPitchMarkdown(kind);
      if (kind === "icp") setPitchMarkdownIcp(md);
      else setPitchMarkdownAccount(md);
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
    setPitchMarkdownIcp(null);
    setPitchMarkdownAccount(null);
    try {
      const icpMd = await fetchPitchMarkdown("icp");
      const accMd = await fetchPitchMarkdown("account");
      setPitchMarkdownIcp(icpMd);
      setPitchMarkdownAccount(accMd);
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
            Competitor notes, ICP-level positioning, and named-account pitches — tied to your Product Profile.
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
                  ICP & account pitches
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
              Upload a brief (PDF / Word / Excel) to auto-fill fields. ICP captures your segment; Accounts are named
              prospects. Generate ICP and Account battlecards against the selected competitor.
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
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
                  <div className="text-sm font-semibold text-text">Upload → ICP profile</div>
                  <div className="mt-1 text-sm text-text2">
                    PDF, Word (.docx), or Excel (.xlsx). Uses your Anthropic key to extract segment-level fields.
                  </div>
                  <div className="mt-3">
                    <input
                      type="file"
                      accept=".pdf,.docx,.xlsx,.xls,.csv"
                      disabled={uploadingIcp}
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        e.target.value = "";
                        void uploadDocument("icp", f);
                      }}
                      className="block w-full text-sm text-text2 file:mr-3 file:rounded-[var(--radius2)] file:border file:border-border file:bg-surface2 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-text"
                    />
                    {uploadingIcp ? (
                      <div className="mt-2 text-xs text-text2">Reading document…</div>
                    ) : null}
                  </div>
                </div>
                <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
                  <div className="text-sm font-semibold text-text">Upload → Account prospect</div>
                  <div className="mt-1 text-sm text-text2">
                    Use RFPs, account plans, or CRM exports. We map them to a named account record (not your broad ICP).
                  </div>
                  <div className="mt-3">
                    <input
                      type="file"
                      accept=".pdf,.docx,.xlsx,.xls,.csv"
                      disabled={uploadingAccount}
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        e.target.value = "";
                        void uploadDocument("account", f);
                      }}
                      className="block w-full text-sm text-text2 file:mr-3 file:rounded-[var(--radius2)] file:border file:border-border file:bg-surface2 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-text"
                    />
                    {uploadingAccount ? (
                      <div className="mt-2 text-xs text-text2">Reading document…</div>
                    ) : null}
                  </div>
                </div>
              </div>

              {uploadError ? (
                <div className="rounded-[var(--radius)] border border-red bg-[rgba(248,113,113,0.12)] p-4 text-sm text-red">
                  {uploadError}
                </div>
              ) : null}

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
                  <div className="text-sm font-semibold text-text">ICP (segment)</div>
                  <div className="mt-1 text-sm text-text2">
                    {icpList.length} profile{icpList.length === 1 ? "" : "s"} · create or refine after upload.
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {(
                      [
                        ["name", "ICP label (e.g. Mid-market SaaS RevOps)"],
                        ["website_url", "Example site (optional)"],
                        ["industry", "Industry"],
                        ["segment", "Segment (optional)"],
                        ["company_size", "Company size (optional)"],
                        ["buyer_roles", "Buyer roles"],
                        ["pains", "Pains / JTBD"],
                        ["current_stack", "Typical stack (optional)"],
                        ["decision_criteria", "Decision criteria"],
                        ["notes", "Notes (optional)"]
                      ] as const
                    ).map(([k, ph]) => (
                      <input
                        key={k}
                        value={icpForm[k]}
                        onChange={(e) => setIcpForm((prev) => ({ ...prev, [k]: e.target.value }))}
                        placeholder={ph}
                        className="w-full rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-sm text-text placeholder:text-text3"
                      />
                    ))}
                  </div>
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => createPersona("icp")}
                      disabled={creatingIcp || !icpForm.name.trim()}
                      className="rounded-[var(--radius2)] bg-[rgba(52,211,153,0.15)] px-4 py-2 text-xs font-semibold text-green border border-[rgba(52,211,153,0.3)] transition hover:bg-[rgba(52,211,153,0.25)] disabled:opacity-60"
                    >
                      {creatingIcp ? "Saving..." : "Save ICP profile"}
                    </button>
                  </div>
                </div>

                <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
                  <div className="text-sm font-semibold text-text">Account prospects</div>
                  <div className="mt-1 text-sm text-text2">
                    {accountList.length} account{accountList.length === 1 ? "" : "s"} · named companies you are
                    pursuing.
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {(
                      [
                        ["name", "Account / company name"],
                        ["website_url", "Website (optional)"],
                        ["industry", "Industry"],
                        ["segment", "Segment (optional)"],
                        ["company_size", "Company size (optional)"],
                        ["buyer_roles", "Buyer roles"],
                        ["pains", "Pains / priorities"],
                        ["current_stack", "Current stack (optional)"],
                        ["decision_criteria", "Decision criteria"],
                        ["notes", "Notes (optional)"]
                      ] as const
                    ).map(([k, ph]) => (
                      <input
                        key={k}
                        value={accountForm[k]}
                        onChange={(e) => setAccountForm((prev) => ({ ...prev, [k]: e.target.value }))}
                        placeholder={ph}
                        className="w-full rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-sm text-text placeholder:text-text3"
                      />
                    ))}
                  </div>
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => createPersona("account")}
                      disabled={creatingAccount || !accountForm.name.trim()}
                      className="rounded-[var(--radius2)] bg-[rgba(52,211,153,0.15)] px-4 py-2 text-xs font-semibold text-green border border-[rgba(52,211,153,0.3)] transition hover:bg-[rgba(52,211,153,0.25)] disabled:opacity-60"
                    >
                      {creatingAccount ? "Saving..." : "Save account prospect"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-text">Generate vs {activeCompetitor?.name ?? "competitor"}</div>
                    <div className="mt-1 text-sm text-text2">
                      Pick an ICP profile and/or a named account, then generate one or both battlecards.
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPitchMarkdownIcp(null);
                        setPitchMarkdownAccount(null);
                      }}
                      className="rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-xs font-semibold text-text transition hover:bg-surface3 hover:border-border2"
                    >
                      Clear outputs
                    </button>
                    <Link
                      href="/dashboard/settings/product"
                      className="rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-xs font-semibold text-text transition hover:bg-surface3 hover:border-border2"
                    >
                      Product settings
                    </Link>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div>
                    <div className="mb-1 text-xs font-semibold tracking-[0.3px] text-text2">ICP profile</div>
                    <select
                      value={icpPersonaId ?? ""}
                      onChange={(e) => {
                        const next = e.target.value || null;
                        setIcpPersonaId(next);
                        setPersonaSavedIcp(null);
                      }}
                      className="w-full rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-sm text-text"
                    >
                      <option value="">Choose ICP…</option>
                      {icpList.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-semibold tracking-[0.3px] text-text2">Account prospect</div>
                    <select
                      value={accountPersonaId ?? ""}
                      onChange={(e) => {
                        const next = e.target.value || null;
                        setAccountPersonaId(next);
                        setPersonaSavedAccount(null);
                      }}
                      className="w-full rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-sm text-text"
                    >
                      <option value="">Choose account…</option>
                      {accountList.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => generatePitch("icp")}
                    disabled={pitchLoading || !icpPersonaId || !activeId}
                    className="rounded-[var(--radius2)] bg-accent px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#5b52ee] disabled:opacity-60"
                  >
                    {pitchLoading ? "Working…" : "Generate ICP battlecard"}
                  </button>
                  <button
                    type="button"
                    onClick={() => generatePitch("account")}
                    disabled={pitchLoading || !accountPersonaId || !activeId}
                    className="rounded-[var(--radius2)] bg-accent px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#5b52ee] disabled:opacity-60"
                  >
                    {pitchLoading ? "Working…" : "Generate account battlecard"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void generateBothPitches()}
                    disabled={pitchLoading || !icpPersonaId || !accountPersonaId || !activeId}
                    className="rounded-[var(--radius2)] border border-border bg-surface2 px-4 py-2 text-xs font-semibold text-text transition hover:bg-surface3 hover:border-border2 disabled:opacity-60"
                  >
                    Generate both
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (pitchMarkdownIcp) {
                        downloadPitchPdf({
                          productName: "Marketing OS",
                          personaName: selectedIcp?.name ?? "ICP",
                          competitorName: activeCompetitor?.name ?? "Competitor",
                          pitchMarkdown: pitchMarkdownIcp
                        });
                      }
                    }}
                    disabled={!pitchMarkdownIcp}
                    className="rounded-[var(--radius2)] border border-border bg-surface2 px-4 py-2 text-xs font-semibold text-text transition hover:bg-surface3 hover:border-border2 disabled:opacity-50"
                  >
                    PDF · ICP
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (pitchMarkdownAccount) {
                        downloadPitchPdf({
                          productName: "Marketing OS",
                          personaName: selectedAccount?.name ?? "Account",
                          competitorName: activeCompetitor?.name ?? "Competitor",
                          pitchMarkdown: pitchMarkdownAccount
                        });
                      }
                    }}
                    disabled={!pitchMarkdownAccount}
                    className="rounded-[var(--radius2)] border border-border bg-surface2 px-4 py-2 text-xs font-semibold text-text transition hover:bg-surface3 hover:border-border2 disabled:opacity-50"
                  >
                    PDF · Account
                  </button>
                </div>
              </div>

              {pitchQuestions?.length ? (
                <div className="rounded-[var(--radius)] border border-yellow bg-[rgba(251,191,36,0.12)] p-4 text-sm text-yellow">
                  <div className="font-semibold text-text">To make the next pitch stronger, answer these:</div>
                  <ul className="mt-2 list-disc pl-5 text-text2">
                    {pitchQuestions.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="grid gap-4 lg:grid-cols-2">
                {icpPersonaId ? (
                  <div className="rounded-[var(--radius2)] border border-border bg-surface2 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-text">Refine ICP (Q&A)</div>
                        <div className="mt-1 text-sm text-text2">Save, then regenerate the ICP battlecard.</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => savePersonaImprovements("icp")}
                        disabled={personaSavingIcp}
                        className="rounded-[var(--radius2)] bg-[rgba(52,211,153,0.15)] px-4 py-2 text-xs font-semibold text-green border border-[rgba(52,211,153,0.3)] transition hover:bg-[rgba(52,211,153,0.25)] disabled:opacity-60"
                      >
                        {personaSavingIcp ? "Saving..." : "Save ICP answers"}
                      </button>
                    </div>
                    {personaSavedIcp ? (
                      <div className="mt-3 rounded-[var(--radius2)] border border-[rgba(52,211,153,0.3)] bg-[rgba(52,211,153,0.12)] px-3 py-2 text-sm text-green">
                        {personaSavedIcp}
                      </div>
                    ) : null}
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <TextArea
                        label="Industry"
                        value={editIcp.industry}
                        onChange={(v) => setEditIcp((p) => ({ ...p, industry: v }))}
                      />
                      <TextArea
                        label="Buyer roles"
                        value={editIcp.buyer_roles}
                        onChange={(v) => setEditIcp((p) => ({ ...p, buyer_roles: v }))}
                      />
                      <TextArea
                        label="Pains / JTBD"
                        value={editIcp.pains}
                        onChange={(v) => setEditIcp((p) => ({ ...p, pains: v }))}
                      />
                      <TextArea
                        label="Decision criteria"
                        value={editIcp.decision_criteria}
                        onChange={(v) => setEditIcp((p) => ({ ...p, decision_criteria: v }))}
                      />
                      <TextArea
                        label="Notes"
                        value={editIcp.notes}
                        onChange={(v) => setEditIcp((p) => ({ ...p, notes: v }))}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[var(--radius2)] border border-dashed border-border bg-surface2/40 p-4 text-sm text-text2">
                    Select or create an ICP profile to refine fields.
                  </div>
                )}

                {accountPersonaId ? (
                  <div className="rounded-[var(--radius2)] border border-border bg-surface2 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-text">Refine account (Q&A)</div>
                        <div className="mt-1 text-sm text-text2">Save, then regenerate the account battlecard.</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => savePersonaImprovements("account")}
                        disabled={personaSavingAccount}
                        className="rounded-[var(--radius2)] bg-[rgba(52,211,153,0.15)] px-4 py-2 text-xs font-semibold text-green border border-[rgba(52,211,153,0.3)] transition hover:bg-[rgba(52,211,153,0.25)] disabled:opacity-60"
                      >
                        {personaSavingAccount ? "Saving..." : "Save account answers"}
                      </button>
                    </div>
                    {personaSavedAccount ? (
                      <div className="mt-3 rounded-[var(--radius2)] border border-[rgba(52,211,153,0.3)] bg-[rgba(52,211,153,0.12)] px-3 py-2 text-sm text-green">
                        {personaSavedAccount}
                      </div>
                    ) : null}
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <TextArea
                        label="Industry"
                        value={editAccount.industry}
                        onChange={(v) => setEditAccount((p) => ({ ...p, industry: v }))}
                      />
                      <TextArea
                        label="Buyer roles"
                        value={editAccount.buyer_roles}
                        onChange={(v) => setEditAccount((p) => ({ ...p, buyer_roles: v }))}
                      />
                      <TextArea
                        label="Pains / priorities"
                        value={editAccount.pains}
                        onChange={(v) => setEditAccount((p) => ({ ...p, pains: v }))}
                      />
                      <TextArea
                        label="Decision criteria"
                        value={editAccount.decision_criteria}
                        onChange={(v) => setEditAccount((p) => ({ ...p, decision_criteria: v }))}
                      />
                      <TextArea
                        label="Notes"
                        value={editAccount.notes}
                        onChange={(v) => setEditAccount((p) => ({ ...p, notes: v }))}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[var(--radius2)] border border-dashed border-border bg-surface2/40 p-4 text-sm text-text2">
                    Select or create an account prospect to refine fields.
                  </div>
                )}
              </div>

              {pitchError ? (
                <div className="rounded-[var(--radius)] border border-red bg-[rgba(248,113,113,0.12)] p-4 text-sm text-red">
                  {pitchError}
                </div>
              ) : null}

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-[var(--radius2)] border border-border bg-surface2 p-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text2">ICP battlecard</div>
                  {pitchMarkdownIcp ? (
                    <Markdown content={pitchMarkdownIcp} />
                  ) : (
                    <div className="text-sm text-text2">Generate an ICP battlecard to see segment-level positioning.</div>
                  )}
                </div>
                <div className="rounded-[var(--radius2)] border border-border bg-surface2 p-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text2">Account battlecard</div>
                  {pitchMarkdownAccount ? (
                    <Markdown content={pitchMarkdownAccount} />
                  ) : (
                    <div className="text-sm text-text2">Generate an account battlecard for stakeholder-specific talk tracks.</div>
                  )}
                </div>
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
