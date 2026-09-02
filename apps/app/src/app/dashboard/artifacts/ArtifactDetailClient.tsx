"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type ArtifactRow = {
  id: string;
  artifact_type: string;
  title: string;
  status: "draft" | "ready";
  created_at: string;
  content_json: any;
  source_run_id: string | null;
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function prettyType(t: string) {
  switch (t) {
    case "positioning_guide": return "Positioning Guide";
    case "message_map":       return "Message Map";
    case "launch_brief":      return "Launch Brief";
    case "sales_enablement":  return "Sales Enablement Pack";
    default:                  return t.replace(/_/g, " ");
  }
}

function isPlainObject(v: unknown): v is Record<string, any> {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

function titleFromKey(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()).trim();
}

// ─── Reusable small components ────────────────────────────────────────────────

function CopyButton({ getText, label = "Copy" }: { getText: () => string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function doCopy() {
    try {
      await navigator.clipboard.writeText(getText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }
  return (
    <button
      type="button"
      onClick={doCopy}
      className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors ${
        copied
          ? "border-[rgba(0,191,165,0.3)] bg-[rgba(0,191,165,0.08)] text-[var(--color-teal)]"
          : "border-border bg-surface2 text-text2 hover:border-border hover:bg-surface3 hover:text-text"
      }`}
    >
      {copied ? "✓ Copied" : label}
    </button>
  );
}

function EditableText({
  value,
  onSave,
  multiline = false,
  className = "",
}: {
  value: string;
  onSave: (v: string) => void;
  multiline?: boolean;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(value);

  function commit() {
    onSave(local.trim() || value);
    setEditing(false);
  }

  if (editing) {
    if (multiline) {
      return (
        <textarea
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={commit}
          autoFocus
          rows={Math.max(2, (local.match(/\n/g) ?? []).length + 2)}
          className="w-full resize-none rounded-lg border border-primary/40 bg-page px-2.5 py-1.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      );
    }
    return (
      <input
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
        autoFocus
        className={`w-full rounded-lg border border-primary/40 bg-page px-2.5 py-1 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20 ${className}`}
      />
    );
  }

  return (
    <span
      className={`group/edit cursor-pointer rounded px-0.5 hover:bg-surface3 transition-colors ${className}`}
      onClick={() => { setLocal(value); setEditing(true); }}
      title="Click to edit"
    >
      {value}
      <span className="ml-1 text-[10px] text-text3 opacity-0 group-hover/edit:opacity-100 transition-opacity select-none">✏</span>
    </span>
  );
}

function EditableList({
  items,
  onSave,
  bulletColor = "text-primary",
}: {
  items: string[];
  onSave: (items: string[]) => void;
  bulletColor?: string;
}) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="group flex items-start gap-2">
          <span className={`mt-1 shrink-0 text-sm ${bulletColor}`}>▸</span>
          <div className="min-w-0 flex-1">
            <EditableText
              value={item}
              multiline
              onSave={(v) => {
                const next = [...items];
                next[i] = v;
                onSave(next);
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => onSave(items.filter((_, j) => j !== i))}
            className="mt-1 shrink-0 text-[11px] text-text3 opacity-0 group-hover:opacity-100 hover:text-[var(--color-error)] transition-opacity"
          >
            ✕
          </button>
        </li>
      ))}
      <li>
        <button
          type="button"
          onClick={() => onSave([...items, "New item"])}
          className="text-[12px] font-medium text-link hover:underline"
        >
          + Add item
        </button>
      </li>
    </ul>
  );
}

function SectionCard({
  title,
  copyText,
  action,
  children,
}: {
  title: string;
  copyText?: string | (() => string);
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="hs-card p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-[13px] font-semibold text-text">{title}</div>
        <div className="flex items-center gap-2">
          {action}
          {copyText && (
            <CopyButton getText={typeof copyText === "function" ? copyText : () => copyText} />
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

// ─── Artifact type views ──────────────────────────────────────────────────────

function PositioningGuideView({
  json,
  onUpdate,
}: {
  json: Record<string, any>;
  onUpdate: (key: string, value: unknown) => void;
}) {
  const stmt = typeof json.positioning_statement === "string" ? json.positioning_statement : "";
  const diffs: string[] = Array.isArray(json.differentiators) ? json.differentiators : [];
  const proof: string[] = Array.isArray(json.proof_points) ? json.proof_points : [];
  const objections: { objection: string; response: string }[] = Array.isArray(json.objections)
    ? json.objections
    : [];

  return (
    <div className="space-y-4">
      {stmt && (
        <SectionCard
          title="Positioning statement"
          copyText={stmt}
        >
          <div className="text-sm leading-relaxed text-text2 italic">
            <EditableText value={stmt} multiline onSave={(v) => onUpdate("positioning_statement", v)} />
          </div>
        </SectionCard>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {diffs.length > 0 && (
          <SectionCard
            title="Differentiators"
            copyText={() => diffs.map((d) => `• ${d}`).join("\n")}
          >
            <EditableList items={diffs} onSave={(v) => onUpdate("differentiators", v)} bulletColor="text-primary" />
          </SectionCard>
        )}
        {proof.length > 0 && (
          <SectionCard
            title="Proof points"
            copyText={() => proof.map((p) => `✓ ${p}`).join("\n")}
          >
            <EditableList items={proof} onSave={(v) => onUpdate("proof_points", v)} bulletColor="text-[var(--color-teal)]" />
          </SectionCard>
        )}
      </div>

      {objections.length > 0 && (
        <SectionCard
          title="Objection responses"
          copyText={() =>
            objections.map((o) => `Objection: "${o.objection}"\nResponse: ${o.response}`).join("\n\n")
          }
        >
          <div className="space-y-3">
            {objections.map((o, i) => (
              <div key={i} className="group hs-card2 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-[12px] font-semibold text-heading">
                    &ldquo;<EditableText value={o.objection} onSave={(v) => {
                      const next = [...objections];
                      next[i] = { ...next[i], objection: v };
                      onUpdate("objections", next);
                    }} />&rdquo;
                  </div>
                  <button
                    type="button"
                    onClick={() => onUpdate("objections", objections.filter((_, j) => j !== i))}
                    className="shrink-0 text-[11px] text-text3 opacity-0 group-hover:opacity-100 hover:text-[var(--color-error)] transition-opacity"
                  >
                    ✕
                  </button>
                </div>
                <div className="mt-1.5 text-[13px] text-text2">
                  <EditableText value={o.response} multiline onSave={(v) => {
                    const next = [...objections];
                    next[i] = { ...next[i], response: v };
                    onUpdate("objections", next);
                  }} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

function LaunchBriefView({
  json,
  onUpdate,
  onImportToGtm,
  importing,
}: {
  json: Record<string, any>;
  onUpdate: (key: string, value: unknown) => void;
  onImportToGtm: () => void;
  importing: boolean;
}) {
  const objective = typeof json.objective === "string" ? json.objective : "";
  const keyMessages: string[] = Array.isArray(json.key_messages) ? json.key_messages : [];
  const timeline: { phase: string; timing: string; deliverables: string[] }[] = Array.isArray(json.timeline)
    ? json.timeline
    : [];
  const channels: string[] = Array.isArray(json.channels) ? json.channels : [];
  const assetChecklist: string[] = Array.isArray(json.asset_checklist) ? json.asset_checklist : [];
  const metrics: string[] = Array.isArray(json.success_metrics) ? json.success_metrics : [];

  const timelineText = timeline
    .map((t) => `${t.phase} (${t.timing}):\n${(t.deliverables ?? []).map((d) => `  • ${d}`).join("\n")}`)
    .join("\n\n");

  return (
    <div className="space-y-4">
      {objective && (
        <SectionCard title="Launch objective" copyText={objective}>
          <div className="text-sm leading-relaxed text-text2">
            <EditableText value={objective} multiline onSave={(v) => onUpdate("objective", v)} />
          </div>
        </SectionCard>
      )}

      {keyMessages.length > 0 && (
        <SectionCard
          title="Key messages"
          copyText={() => keyMessages.map((m, i) => `${i + 1}. ${m}`).join("\n")}
        >
          <EditableList items={keyMessages} onSave={(v) => onUpdate("key_messages", v)} bulletColor="text-primary" />
        </SectionCard>
      )}

      {timeline.length > 0 && (
        <SectionCard
          title="Timeline"
          copyText={timelineText}
          action={
            <button
              type="button"
              onClick={onImportToGtm}
              disabled={importing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/8 px-2.5 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/15 disabled:opacity-50"
            >
              {importing ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                  Importing…
                </>
              ) : (
                "→ Send to GTM Planner"
              )}
            </button>
          }
        >
          <div className="space-y-3">
            {timeline.map((t, i) => (
              <div key={i} className="hs-card2 rounded-xl p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="text-[13px] font-semibold text-heading">{t.phase}</div>
                  <div className="text-[11px] text-text3">{t.timing}</div>
                </div>
                {Array.isArray(t.deliverables) && t.deliverables.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {t.deliverables.map((d, j) => (
                      <li key={j} className="flex items-center gap-2 text-[12px] text-text2">
                        <span className="text-text3">·</span>
                        {String(d)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {channels.length > 0 && (
          <SectionCard title="Channels" copyText={() => channels.map((c) => `• ${c}`).join("\n")}>
            <EditableList items={channels} onSave={(v) => onUpdate("channels", v)} bulletColor="text-primary" />
          </SectionCard>
        )}
        {assetChecklist.length > 0 && (
          <SectionCard
            title="Asset checklist"
            copyText={() => assetChecklist.map((a) => `☐ ${a}`).join("\n")}
          >
            <ul className="space-y-1.5">
              {assetChecklist.map((a, i) => (
                <li key={i} className="flex items-center gap-2 text-[12px] text-text2">
                  <span className="h-3.5 w-3.5 rounded border border-border shrink-0" />
                  {String(a)}
                </li>
              ))}
            </ul>
          </SectionCard>
        )}
        {metrics.length > 0 && (
          <SectionCard title="Success metrics" copyText={() => metrics.map((m) => `✓ ${m}`).join("\n")}>
            <EditableList items={metrics} onSave={(v) => onUpdate("success_metrics", v)} bulletColor="text-[var(--color-teal)]" />
          </SectionCard>
        )}
      </div>
    </div>
  );
}

function SalesEnablementView({
  json,
  onUpdate,
}: {
  json: Record<string, any>;
  onUpdate: (key: string, value: unknown) => void;
}) {
  const talkTrack: string[] = Array.isArray(json.talk_track) ? json.talk_track : [];
  const discoveryQ: string[] = Array.isArray(json.discovery_questions) ? json.discovery_questions : [];
  const compAngles: string[] = Array.isArray(json.competitive_angles) ? json.competitive_angles : [];
  const objections: { objection: string; response: string }[] = Array.isArray(json.objections) ? json.objections : [];
  const emails: { type: string; subject: string; body: string }[] = Array.isArray(json.email_templates)
    ? json.email_templates
    : [];
  const deckOutline: string[] = Array.isArray(json.deck_outline) ? json.deck_outline : [];

  return (
    <div className="space-y-4">
      {talkTrack.length > 0 && (
        <SectionCard
          title="Talk track"
          copyText={() => talkTrack.map((t, i) => `${i + 1}. ${t}`).join("\n")}
        >
          <ol className="space-y-2">
            {talkTrack.map((t, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-text2">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-light text-[10px] font-bold text-primary">
                  {i + 1}
                </span>
                <EditableText
                  value={t}
                  multiline
                  onSave={(v) => {
                    const next = [...talkTrack];
                    next[i] = v;
                    onUpdate("talk_track", next);
                  }}
                />
              </li>
            ))}
          </ol>
        </SectionCard>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {discoveryQ.length > 0 && (
          <SectionCard
            title="Discovery questions"
            copyText={() => discoveryQ.map((q, i) => `Q${i + 1}: ${q}`).join("\n")}
          >
            <ul className="space-y-2">
              {discoveryQ.map((q, i) => (
                <li key={i} className="text-[13px] text-text2">
                  <span className="font-medium text-text">Q{i + 1}: </span>
                  <EditableText
                    value={q}
                    multiline
                    onSave={(v) => {
                      const next = [...discoveryQ];
                      next[i] = v;
                      onUpdate("discovery_questions", next);
                    }}
                  />
                </li>
              ))}
            </ul>
          </SectionCard>
        )}
        {compAngles.length > 0 && (
          <SectionCard
            title="Competitive angles"
            copyText={() => compAngles.map((a) => `• ${a}`).join("\n")}
          >
            <EditableList items={compAngles} onSave={(v) => onUpdate("competitive_angles", v)} bulletColor="text-primary" />
          </SectionCard>
        )}
      </div>

      {objections.length > 0 && (
        <SectionCard
          title="Objection responses"
          copyText={() =>
            objections.map((o) => `Objection: "${o.objection}"\nResponse: ${o.response}`).join("\n\n")
          }
        >
          <div className="space-y-3">
            {objections.map((o, i) => (
              <div key={i} className="group hs-card2 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-[12px] font-semibold text-heading">
                    &ldquo;<EditableText value={o.objection} onSave={(v) => {
                      const next = [...objections];
                      next[i] = { ...next[i], objection: v };
                      onUpdate("objections", next);
                    }} />&rdquo;
                  </div>
                  <button
                    type="button"
                    onClick={() => onUpdate("objections", objections.filter((_, j) => j !== i))}
                    className="shrink-0 text-[11px] text-text3 opacity-0 group-hover:opacity-100 hover:text-[var(--color-error)] transition-opacity"
                  >
                    ✕
                  </button>
                </div>
                <div className="mt-1.5 text-[13px] text-text2">
                  <EditableText value={o.response} multiline onSave={(v) => {
                    const next = [...objections];
                    next[i] = { ...next[i], response: v };
                    onUpdate("objections", next);
                  }} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {emails.length > 0 && (
        <SectionCard
          title="Email templates"
          copyText={() =>
            emails
              .map((e) => `[${e.type.toUpperCase()}]\nSubject: ${e.subject}\n\n${e.body}`)
              .join("\n\n---\n\n")
          }
        >
          <div className="space-y-4">
            {emails.map((e, i) => (
              <div key={i} className="hs-card2 rounded-xl p-4">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-text3">{e.type}</div>
                <div className="text-[12px] font-semibold text-heading">
                  Subject: <EditableText value={e.subject} onSave={(v) => {
                    const next = [...emails];
                    next[i] = { ...next[i], subject: v };
                    onUpdate("email_templates", next);
                  }} />
                </div>
                <div className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-text2">
                  <EditableText value={e.body} multiline onSave={(v) => {
                    const next = [...emails];
                    next[i] = { ...next[i], body: v };
                    onUpdate("email_templates", next);
                  }} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {deckOutline.length > 0 && (
        <SectionCard
          title="Deck outline"
          copyText={() => deckOutline.map((s, i) => `${String(i + 1).padStart(2, "0")}  ${s}`).join("\n")}
        >
          <ol className="space-y-2">
            {deckOutline.map((s, i) => (
              <li key={i} className="flex items-center gap-2 text-[13px] text-text2">
                <span className="shrink-0 font-mono text-[11px] text-text3">{String(i + 1).padStart(2, "0")}</span>
                <EditableText
                  value={s}
                  onSave={(v) => {
                    const next = [...deckOutline];
                    next[i] = v;
                    onUpdate("deck_outline", next);
                  }}
                />
              </li>
            ))}
          </ol>
        </SectionCard>
      )}
    </div>
  );
}

function MessageMapView({
  json,
  onUpdate,
}: {
  json: Record<string, any>;
  onUpdate: (key: string, value: unknown) => void;
}) {
  const coreMessage = typeof json.core_message === "string" ? json.core_message : null;
  const valuePillars: { pillar?: string; benefit?: string; proof?: string[] }[] = Array.isArray(json.value_pillars)
    ? json.value_pillars
    : [];
  const proofLibrary: string[] = Array.isArray(json.proof_library) ? json.proof_library : [];
  const copyBlocks = isPlainObject(json.copy_blocks) ? (json.copy_blocks as any) : null;
  const nextBestActions: string[] = Array.isArray(json.next_best_actions) ? json.next_best_actions : [];

  return (
    <div className="space-y-4">
      {coreMessage && (
        <SectionCard title="Core message" copyText={coreMessage}>
          <div className="text-sm leading-relaxed text-text2">
            <EditableText value={coreMessage} multiline onSave={(v) => onUpdate("core_message", v)} />
          </div>
        </SectionCard>
      )}

      <SectionCard
        title="Value pillars"
        copyText={() =>
          valuePillars
            .map((p) => `${p.pillar}\n${p.benefit}\n${(p.proof ?? []).map((x) => `  • ${x}`).join("\n")}`)
            .join("\n\n")
        }
      >
        <div className="grid gap-3 md:grid-cols-3">
          {valuePillars.length ? (
            valuePillars.map((p, idx) => (
              <div key={idx} className="hs-card2 p-4">
                <div className="text-sm font-semibold text-text">{p.pillar ?? `Pillar ${idx + 1}`}</div>
                {p.benefit && <div className="mt-2 text-sm text-text2">{p.benefit}</div>}
                {p.proof?.length ? (
                  <>
                    <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-text3">Proof</div>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-text2">
                      {p.proof.map((x, i) => <li key={i}>{x}</li>)}
                    </ul>
                  </>
                ) : null}
              </div>
            ))
          ) : (
            <div className="text-sm text-text2">—</div>
          )}
        </div>
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-2">
        {copyBlocks && (
          <SectionCard
            title="Copy-ready blocks"
            copyText={() => {
              const parts: string[] = [];
              if (copyBlocks.headlines?.length)
                parts.push(`Headlines:\n${(copyBlocks.headlines as string[]).map((h) => `• ${h}`).join("\n")}`);
              if (copyBlocks.subhead) parts.push(`Subhead: ${copyBlocks.subhead}`);
              if (copyBlocks.short_pitch) parts.push(`Short pitch: ${copyBlocks.short_pitch}`);
              if (copyBlocks.cta) parts.push(`CTA: ${copyBlocks.cta}`);
              return parts.join("\n\n");
            }}
          >
            <div className="space-y-3 text-sm text-text2">
              {copyBlocks.headlines?.length && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-text3">Headlines</div>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {(copyBlocks.headlines as string[]).map((h, i) => <li key={i}>{h}</li>)}
                  </ul>
                </div>
              )}
              {copyBlocks.subhead && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-text3">Subhead</div>
                  <div className="mt-1">{copyBlocks.subhead}</div>
                </div>
              )}
              {copyBlocks.short_pitch && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-text3">Short pitch</div>
                  <div className="mt-1">{copyBlocks.short_pitch}</div>
                </div>
              )}
              {copyBlocks.cta && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-text3">CTA</div>
                  <div className="mt-1">{copyBlocks.cta}</div>
                </div>
              )}
            </div>
          </SectionCard>
        )}
        <div className="space-y-4">
          {proofLibrary.length > 0 && (
            <SectionCard title="Proof library" copyText={() => proofLibrary.map((p) => `• ${p}`).join("\n")}>
              <EditableList items={proofLibrary} onSave={(v) => onUpdate("proof_library", v)} bulletColor="text-[var(--color-teal)]" />
            </SectionCard>
          )}
          {nextBestActions.length > 0 && (
            <SectionCard title="Next best actions" copyText={() => nextBestActions.map((a) => `• ${a}`).join("\n")}>
              <EditableList items={nextBestActions} onSave={(v) => onUpdate("next_best_actions", v)} bulletColor="text-primary" />
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
}

// Generic fallback renderer for unknown types
function renderValue(v: unknown): React.ReactNode {
  if (v == null) return <span className="text-text3">—</span>;
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean")
    return <span className="text-text">{String(v)}</span>;
  if (Array.isArray(v)) {
    if (!v.length) return <span className="text-text3">—</span>;
    const primitives = v.every((x) => x == null || ["string", "number", "boolean"].includes(typeof x));
    if (primitives)
      return (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-text2">
          {v.map((x, i) => <li key={i}>{x == null ? "—" : String(x)}</li>)}
        </ul>
      );
    return (
      <pre className="mt-2 max-h-[320px] overflow-auto rounded-xl border border-border bg-bg p-3 text-xs leading-relaxed text-text2">
        {JSON.stringify(v, null, 2)}
      </pre>
    );
  }
  if (isPlainObject(v)) {
    const entries = Object.entries(v);
    if (!entries.length) return <span className="text-text3">—</span>;
    return (
      <div className="mt-2 space-y-2">
        {entries.map(([k, val]) => (
          <div key={k} className="hs-card2 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-text3">{titleFromKey(k)}</div>
            <div className="mt-1">{renderValue(val)}</div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <pre className="mt-2 max-h-[320px] overflow-auto rounded-xl border border-border bg-bg p-3 text-xs leading-relaxed text-text2">
      {JSON.stringify(v, null, 2)}
    </pre>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ArtifactDetailClient({
  environmentId,
  artifact,
}: {
  environmentId: string;
  artifact: ArtifactRow;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [contentJson, setContentJson] = useState<Record<string, any>>(
    isPlainObject(artifact.content_json) ? artifact.content_json : {}
  );
  const [statusValue, setStatusValue] = useState<"draft" | "ready">(artifact.status);
  const [saving, setSaving] = useState(false);
  const [importingToGtm, setImportingToGtm] = useState(false);
  const [gtmImported, setGtmImported] = useState(false);
  const [showStructured, setShowStructured] = useState(false);

  const updateField = useCallback(
    async (key: string, value: unknown) => {
      const updated = { ...contentJson, [key]: value };
      setContentJson(updated);
      setSaving(true);
      await supabase.from("artifact_library_items").update({ content_json: updated }).eq("id", artifact.id);
      setSaving(false);
    },
    [contentJson, supabase, artifact.id]
  );

  const toggleStatus = useCallback(async () => {
    const next: "draft" | "ready" = statusValue === "draft" ? "ready" : "draft";
    setStatusValue(next);
    await supabase.from("artifact_library_items").update({ status: next }).eq("id", artifact.id);
  }, [statusValue, supabase, artifact.id]);

  const importToGtm = useCallback(async () => {
    if (artifact.artifact_type !== "launch_brief") return;
    setImportingToGtm(true);
    try {
      const json = contentJson as any;
      const phases = (Array.isArray(json.timeline) ? json.timeline : []).map((t: any) => ({
        id: crypto.randomUUID(),
        label: String(t.phase ?? "Phase"),
        timing: String(t.timing ?? ""),
        tasks: (Array.isArray(t.deliverables) ? t.deliverables : []).map((d: unknown) => ({
          id: crypto.randomUUID(),
          label: String(d),
          done: false,
          owner: ""
        }))
      }));

      const planValue = {
        launchDate: String(json.launchDate ?? ""),
        productOrFeature: String(json.launchName ?? ""),
        segment: "",
        goals: String(json.objective ?? ""),
        phases: phases.length > 0 ? phases : [],
        stakeholders:
          "Marketing — Responsible\nSales — Accountable\nProduct — Consulted\nRevOps — Consulted\nDesign — Responsible",
        riskNotes: ""
      };

      const planKey = `plan_${crypto.randomUUID().slice(0, 8)}`;
      await supabase.from("module_settings").upsert({
        environment_id: environmentId,
        module: "gtm_planner",
        key: planKey,
        value_json: planValue
      });

      setGtmImported(true);
      setTimeout(() => router.push("/dashboard/gtm-planner"), 800);
    } finally {
      setImportingToGtm(false);
    }
  }, [contentJson, supabase, environmentId, router, artifact.artifact_type]);

  const meta = useMemo(() => {
    const created = new Date(artifact.created_at);
    const createdLabel = Number.isNaN(created.getTime()) ? artifact.created_at : created.toLocaleString();
    const model = contentJson?.model ?? "claude-sonnet";
    const summary = contentJson?.summary ?? null;
    return { createdLabel, model, summary };
  }, [artifact.created_at, contentJson]);

  // Build the type-specific content view
  const output = useMemo(() => {
    const type = artifact.artifact_type;
    const json = contentJson;

    if (type === "positioning_guide" && isPlainObject(json)) {
      return {
        title: "Positioning Guide",
        content: <PositioningGuideView json={json} onUpdate={updateField} />
      };
    }
    if (type === "launch_brief" && isPlainObject(json)) {
      return {
        title: "Launch Brief",
        content: (
          <LaunchBriefView
            json={json}
            onUpdate={updateField}
            onImportToGtm={importToGtm}
            importing={importingToGtm}
          />
        )
      };
    }
    if (type === "sales_enablement" && isPlainObject(json)) {
      return {
        title: "Sales Enablement Pack",
        content: <SalesEnablementView json={json} onUpdate={updateField} />
      };
    }
    if (type === "message_map" && isPlainObject(json)) {
      return {
        title: "Message Map",
        content: <MessageMapView json={json} onUpdate={updateField} />
      };
    }

    // Generic fallback
    const { model: _m, summary: _s, kind: _k, launchName: _ln, ...rest } = isPlainObject(json)
      ? json
      : { raw: json };
    const keys = isPlainObject(rest)
      ? Object.keys(rest).filter(
          (k) => rest[k] != null && !(typeof rest[k] === "string" && String(rest[k]).trim() === "")
        )
      : [];
    return {
      title: `${prettyType(type)} output`,
      content:
        keys.length === 0 ? (
          <div className="text-sm text-text2">
            No structured content yet. Run the playbook to generate{" "}
            <span className="font-medium text-text">{prettyType(type)}</span> content.
          </div>
        ) : (
          <div className="space-y-4">
            {keys.map((k) => (
              <div key={k} className="hs-card p-5">
                <div className="text-[13px] font-semibold text-text">{titleFromKey(k)}</div>
                <div className="mt-2">{renderValue((rest as any)[k])}</div>
              </div>
            ))}
          </div>
        )
    };
  }, [artifact.artifact_type, contentJson, updateField, importToGtm, importingToGtm]);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-text3">
        <Link href="/dashboard/artifacts" className="hover:text-text">Artifact Library</Link>
        <span>/</span>
        <span className="text-text2">{artifact.title}</span>
      </div>

      {/* Header */}
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1
            className="text-2xl font-semibold tracking-tight text-heading"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {artifact.title}
          </h1>
          <p className="mt-1.5 text-sm text-text2">
            <span className="font-medium text-text">{prettyType(artifact.artifact_type)}</span>
            {" · "}Created {meta.createdLabel}
            {" · "}Model <span className="font-mono">{meta.model}</span>
            {saving && <span className="ml-2 text-text3">· Saving…</span>}
          </p>
        </div>

        {/* Status + actions */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={toggleStatus}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
              statusValue === "ready"
                ? "border-[rgba(0,191,165,0.35)] bg-[rgba(0,191,165,0.10)] text-[var(--color-teal)] hover:bg-[rgba(0,191,165,0.18)]"
                : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
            }`}
          >
            {statusValue === "ready" ? "✓ Approved" : "○ Draft"}
            <span className="text-[10px] opacity-60">{statusValue === "ready" ? "→ draft" : "→ approve"}</span>
          </button>

          {artifact.source_run_id && (
            <Link
              href="/dashboard/launch-playbook"
              className="hs-card2 px-3 py-1.5 text-[12px] font-medium text-text transition hover:bg-surface3"
            >
              View run
            </Link>
          )}
          <button
            type="button"
            onClick={() => setShowStructured((v) => !v)}
            className="hs-card2 px-3 py-1.5 text-[12px] font-medium text-text transition hover:bg-surface3"
          >
            {showStructured ? "Hide" : "Show"} JSON
          </button>
        </div>
      </div>

      {/* GTM imported banner */}
      {gtmImported && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-[rgba(0,191,165,0.3)] bg-[rgba(0,191,165,0.08)] px-4 py-3 text-[13px] text-[var(--color-teal)]">
          <span>✓</span>
          <span>GTM plan created — redirecting to GTM Planner…</span>
        </div>
      )}

      {/* Summary */}
      {meta.summary && (
        <div className="mt-5 hs-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[13px] font-semibold text-text">Summary</div>
            <CopyButton getText={() => String(meta.summary)} />
          </div>
          <div className="mt-2 text-sm leading-relaxed text-text2">
            <EditableText
              value={String(meta.summary)}
              multiline
              onSave={(v) => updateField("summary", v)}
            />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="mt-5">
        <div className="mb-3 text-[13px] font-semibold text-text">{output.title}</div>
        {output.content}
      </div>

      {/* Raw JSON */}
      {showStructured && (
        <div className="mt-6 hs-card p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="text-[13px] font-semibold text-text">Structured output</div>
            <CopyButton getText={() => JSON.stringify(contentJson, null, 2)} label="Copy JSON" />
          </div>
          <pre className="max-h-[520px] overflow-auto rounded-xl border border-border bg-bg p-4 text-xs leading-relaxed text-text2">
            {JSON.stringify({ environmentId, ...contentJson }, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
