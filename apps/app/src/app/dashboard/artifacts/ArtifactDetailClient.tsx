"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type ArtifactRow = {
  id: string;
  artifact_type: string;
  title: string;
  status: "draft" | "ready";
  created_at: string;
  content_json: any;
  source_run_id: string | null;
};

function prettyType(t: string) {
  switch (t) {
    case "positioning_guide":
      return "Positioning Guide";
    case "message_map":
      return "Message Map";
    case "launch_brief":
      return "Launch Brief";
    case "sales_enablement":
      return "Sales Enablement Pack";
    default:
      return t.replace(/_/g, " ");
  }
}

function isPlainObject(v: unknown): v is Record<string, any> {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

function titleFromKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase())
    .trim();
}

function renderValue(v: unknown): React.ReactNode {
  if (v == null) return <span className="text-text3">—</span>;
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
    return <span className="text-text">{String(v)}</span>;
  }
  if (Array.isArray(v)) {
    if (v.length === 0) return <span className="text-text3">—</span>;
    const primitives = v.every((x) => x == null || ["string", "number", "boolean"].includes(typeof x));
    if (primitives) {
      return (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-text2">
          {v.map((x, i) => (
            <li key={i}>{x == null ? "—" : String(x)}</li>
          ))}
        </ul>
      );
    }
    return (
      <pre className="mt-2 max-h-[320px] overflow-auto rounded-xl border border-border bg-bg p-3 text-xs leading-relaxed text-text2">
        {JSON.stringify(v, null, 2)}
      </pre>
    );
  }
  if (isPlainObject(v)) {
    const entries = Object.entries(v);
    if (entries.length === 0) return <span className="text-text3">—</span>;
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

function MessageMapView({
  coreMessage,
  valuePillars,
  proofLibrary,
  copyBlocks,
  nextBestActions
}: {
  coreMessage: string | null;
  valuePillars: { pillar?: string; benefit?: string; proof?: string[] }[];
  proofLibrary: string[];
  copyBlocks:
    | {
        headlines?: string[];
        subhead?: string;
        short_pitch?: string;
        cta?: string;
      }
    | null;
  nextBestActions: string[];
}) {
  return (
    <div className="space-y-4">
      <div className="hs-card p-5">
        <div className="text-[13px] font-semibold text-text">Core message</div>
        <div className="mt-2 text-sm leading-relaxed text-text2">{coreMessage ? coreMessage : "—"}</div>
      </div>

      <div className="hs-card p-5">
        <div className="text-[13px] font-semibold text-text">Value pillars</div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {valuePillars.length ? (
            valuePillars.map((p, idx) => (
              <div key={`${p.pillar ?? "pillar"}-${idx}`} className="hs-card2 p-4">
                <div className="text-sm font-semibold text-text">{p.pillar ?? `Pillar ${idx + 1}`}</div>
                {p.benefit ? <div className="mt-2 text-sm text-text2">{p.benefit}</div> : null}
                {p.proof?.length ? (
                  <>
                    <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-text3">Proof</div>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-text2">
                      {p.proof.map((x, i) => (
                        <li key={i}>{x}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </div>
            ))
          ) : (
            <div className="text-sm text-text2">—</div>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="hs-card p-5">
          <div className="text-[13px] font-semibold text-text">Copy-ready blocks</div>
          {copyBlocks ? (
            <div className="mt-3 space-y-3 text-sm text-text2">
              {copyBlocks.headlines?.length ? (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-text3">Headlines</div>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {copyBlocks.headlines.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {copyBlocks.subhead ? (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-text3">Subhead</div>
                  <div className="mt-1">{copyBlocks.subhead}</div>
                </div>
              ) : null}
              {copyBlocks.short_pitch ? (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-text3">Short pitch</div>
                  <div className="mt-1">{copyBlocks.short_pitch}</div>
                </div>
              ) : null}
              {copyBlocks.cta ? (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-text3">CTA</div>
                  <div className="mt-1">{copyBlocks.cta}</div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-2 text-sm text-text2">—</div>
          )}
        </div>

        <div className="hs-card p-5">
          <div className="text-[13px] font-semibold text-text">Proof library</div>
          <div className="mt-2 text-sm text-text2">
            {proofLibrary.length ? (
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {proofLibrary.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            ) : (
              "—"
            )}
          </div>

          <div className="mt-4 border-t border-border pt-4">
            <div className="text-[13px] font-semibold text-text">Next best actions</div>
            {nextBestActions.length ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-text2">
                {nextBestActions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            ) : (
              <div className="mt-2 text-sm text-text2">—</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PositioningGuideView({ json }: { json: Record<string, any> }) {
  const stmt = typeof json.positioning_statement === "string" ? json.positioning_statement : null;
  const diffs = Array.isArray(json.differentiators) ? json.differentiators : [];
  const proof = Array.isArray(json.proof_points) ? json.proof_points : [];
  const objections = Array.isArray(json.objections) ? json.objections : [];
  return (
    <div className="space-y-4">
      {stmt && (
        <div className="hs-card p-5">
          <div className="text-[13px] font-semibold text-text">Positioning statement</div>
          <div className="mt-2 text-sm leading-relaxed text-text2 italic">&ldquo;{stmt}&rdquo;</div>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {diffs.length > 0 && (
          <div className="hs-card p-5">
            <div className="text-[13px] font-semibold text-text">Differentiators</div>
            <ul className="mt-3 space-y-2">
              {diffs.map((d: any, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm text-text2">
                  <span className="mt-0.5 shrink-0 text-primary">▸</span>
                  {String(d)}
                </li>
              ))}
            </ul>
          </div>
        )}
        {proof.length > 0 && (
          <div className="hs-card p-5">
            <div className="text-[13px] font-semibold text-text">Proof points</div>
            <ul className="mt-3 space-y-2">
              {proof.map((p: any, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm text-text2">
                  <span className="mt-0.5 shrink-0 text-[var(--color-teal)]">✓</span>
                  {String(p)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {objections.length > 0 && (
        <div className="hs-card p-5">
          <div className="text-[13px] font-semibold text-text">Objection responses</div>
          <div className="mt-3 space-y-3">
            {objections.map((o: any, i: number) => (
              <div key={i} className="hs-card2 rounded-xl p-4">
                <div className="text-[12px] font-semibold text-heading">&ldquo;{o.objection}&rdquo;</div>
                <div className="mt-1.5 text-[13px] text-text2">{o.response}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LaunchBriefView({ json }: { json: Record<string, any> }) {
  const objective = typeof json.objective === "string" ? json.objective : null;
  const keyMessages = Array.isArray(json.key_messages) ? json.key_messages : [];
  const timeline = Array.isArray(json.timeline) ? json.timeline : [];
  const channels = Array.isArray(json.channels) ? json.channels : [];
  const assetChecklist = Array.isArray(json.asset_checklist) ? json.asset_checklist : [];
  const metrics = Array.isArray(json.success_metrics) ? json.success_metrics : [];
  return (
    <div className="space-y-4">
      {objective && (
        <div className="hs-card p-5">
          <div className="text-[13px] font-semibold text-text">Launch objective</div>
          <div className="mt-2 text-sm leading-relaxed text-text2">{objective}</div>
        </div>
      )}
      {keyMessages.length > 0 && (
        <div className="hs-card p-5">
          <div className="text-[13px] font-semibold text-text">Key messages</div>
          <ul className="mt-3 space-y-2">
            {keyMessages.map((m: any, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm text-text2">
                <span className="mt-0.5 shrink-0 font-semibold text-primary">{i + 1}.</span>
                {String(m)}
              </li>
            ))}
          </ul>
        </div>
      )}
      {timeline.length > 0 && (
        <div className="hs-card p-5">
          <div className="text-[13px] font-semibold text-text">Timeline</div>
          <div className="mt-3 space-y-3">
            {timeline.map((t: any, i: number) => (
              <div key={i} className="hs-card2 rounded-xl p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="text-[13px] font-semibold text-heading">{t.phase}</div>
                  <div className="text-[11px] text-text3">{t.timing}</div>
                </div>
                {Array.isArray(t.deliverables) && t.deliverables.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {t.deliverables.map((d: any, j: number) => (
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
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        {channels.length > 0 && (
          <div className="hs-card p-5">
            <div className="text-[13px] font-semibold text-text">Channels</div>
            <ul className="mt-3 space-y-2">
              {channels.map((c: any, i: number) => (
                <li key={i} className="flex items-start gap-2 text-[12px] text-text2">
                  <span className="shrink-0 text-primary">▸</span>
                  {String(c)}
                </li>
              ))}
            </ul>
          </div>
        )}
        {assetChecklist.length > 0 && (
          <div className="hs-card p-5">
            <div className="text-[13px] font-semibold text-text">Asset checklist</div>
            <ul className="mt-3 space-y-2">
              {assetChecklist.map((a: any, i: number) => (
                <li key={i} className="flex items-center gap-2 text-[12px] text-text2">
                  <span className="h-3.5 w-3.5 rounded border border-border" />
                  {String(a)}
                </li>
              ))}
            </ul>
          </div>
        )}
        {metrics.length > 0 && (
          <div className="hs-card p-5">
            <div className="text-[13px] font-semibold text-text">Success metrics</div>
            <ul className="mt-3 space-y-2">
              {metrics.map((m: any, i: number) => (
                <li key={i} className="flex items-start gap-2 text-[12px] text-text2">
                  <span className="shrink-0 text-[var(--color-teal)]">✓</span>
                  {String(m)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function SalesEnablementView({ json }: { json: Record<string, any> }) {
  const talkTrack = Array.isArray(json.talk_track) ? json.talk_track : [];
  const discoveryQ = Array.isArray(json.discovery_questions) ? json.discovery_questions : [];
  const compAngles = Array.isArray(json.competitive_angles) ? json.competitive_angles : [];
  const objections = Array.isArray(json.objections) ? json.objections : [];
  const emails = Array.isArray(json.email_templates) ? json.email_templates : [];
  const deckOutline = Array.isArray(json.deck_outline) ? json.deck_outline : [];
  return (
    <div className="space-y-4">
      {talkTrack.length > 0 && (
        <div className="hs-card p-5">
          <div className="text-[13px] font-semibold text-text">Talk track</div>
          <ol className="mt-3 space-y-2">
            {talkTrack.map((t: any, i: number) => (
              <li key={i} className="flex items-start gap-3 text-sm text-text2">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-light text-[10px] font-bold text-primary">
                  {i + 1}
                </span>
                {String(t)}
              </li>
            ))}
          </ol>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {discoveryQ.length > 0 && (
          <div className="hs-card p-5">
            <div className="text-[13px] font-semibold text-text">Discovery questions</div>
            <ul className="mt-3 space-y-2">
              {discoveryQ.map((q: any, i: number) => (
                <li key={i} className="text-[13px] text-text2">
                  <span className="font-medium text-text">Q{i + 1}:</span> {String(q)}
                </li>
              ))}
            </ul>
          </div>
        )}
        {compAngles.length > 0 && (
          <div className="hs-card p-5">
            <div className="text-[13px] font-semibold text-text">Competitive angles</div>
            <ul className="mt-3 space-y-2">
              {compAngles.map((a: any, i: number) => (
                <li key={i} className="flex items-start gap-2 text-[13px] text-text2">
                  <span className="shrink-0 text-primary">▸</span>
                  {String(a)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {objections.length > 0 && (
        <div className="hs-card p-5">
          <div className="text-[13px] font-semibold text-text">Objection responses</div>
          <div className="mt-3 space-y-3">
            {objections.map((o: any, i: number) => (
              <div key={i} className="hs-card2 rounded-xl p-4">
                <div className="text-[12px] font-semibold text-heading">&ldquo;{o.objection}&rdquo;</div>
                <div className="mt-1.5 text-[13px] text-text2">{o.response}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {emails.length > 0 && (
        <div className="hs-card p-5">
          <div className="text-[13px] font-semibold text-text">Email templates</div>
          <div className="mt-3 space-y-4">
            {emails.map((e: any, i: number) => (
              <div key={i} className="hs-card2 rounded-xl p-4">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-text3">{e.type}</div>
                <div className="text-[12px] font-semibold text-heading">Subject: {e.subject}</div>
                <div className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-text2">{e.body}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {deckOutline.length > 0 && (
        <div className="hs-card p-5">
          <div className="text-[13px] font-semibold text-text">Deck outline</div>
          <ol className="mt-3 space-y-2">
            {deckOutline.map((s: any, i: number) => (
              <li key={i} className="flex items-center gap-2 text-[13px] text-text2">
                <span className="shrink-0 font-mono text-[11px] text-text3">{String(i + 1).padStart(2, "0")}</span>
                {String(s)}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function humanOutputForArtifact(artifact: ArtifactRow): { title: string; content: React.ReactNode } {
  const json = artifact.content_json ?? {};
  const typeLabel = prettyType(artifact.artifact_type);

  if (artifact.artifact_type === "positioning_guide" && isPlainObject(json)) {
    return { title: "Positioning Guide", content: <PositioningGuideView json={json} /> };
  }

  if (artifact.artifact_type === "launch_brief" && isPlainObject(json)) {
    return { title: "Launch Brief", content: <LaunchBriefView json={json} /> };
  }

  if (artifact.artifact_type === "sales_enablement" && isPlainObject(json)) {
    return { title: "Sales Enablement Pack", content: <SalesEnablementView json={json} /> };
  }

  if (artifact.artifact_type === "message_map" && isPlainObject(json)) {
    const coreMessage = typeof json.core_message === "string" ? json.core_message : null;
    const valuePillarsRaw = Array.isArray(json.value_pillars)
      ? json.value_pillars
      : Array.isArray(json.pillars)
        ? json.pillars
        : [];
    const valuePillars = valuePillarsRaw
      .filter((x) => isPlainObject(x))
      .map((x) => ({
        pillar: typeof x.pillar === "string" ? x.pillar : typeof x.title === "string" ? x.title : undefined,
        benefit: typeof x.benefit === "string" ? x.benefit : typeof x.message === "string" ? x.message : undefined,
        proof: Array.isArray(x.proof) ? x.proof.map((p: any) => String(p)) : undefined
      }));
    const proofLibrary = Array.isArray(json.proof_library) ? json.proof_library.map((p: any) => String(p)) : [];
    const copyBlocks = isPlainObject(json.copy_blocks) ? (json.copy_blocks as any) : null;
    const nextBestActions = Array.isArray(json.next_best_actions) ? json.next_best_actions.map((a: any) => String(a)) : [];

    return {
      title: "Message Map",
      content: (
        <MessageMapView
          coreMessage={coreMessage}
          valuePillars={valuePillars}
          proofLibrary={proofLibrary}
          copyBlocks={copyBlocks}
          nextBestActions={nextBestActions}
        />
      )
    };
  }

  const { model: _model, summary: _summary, kind: _kind, ...rest } = isPlainObject(json) ? json : { raw: json };
  const meaningfulKeys = isPlainObject(rest)
    ? Object.keys(rest).filter((k) => rest[k] != null && !(typeof rest[k] === "string" && String(rest[k]).trim() === ""))
    : [];

  if (meaningfulKeys.length === 0) {
    return {
      title: `${typeLabel} output`,
      content: (
        <div className="text-sm text-text2">
          This artifact currently only has a short summary and metadata. Run the generator again to produce the full{" "}
          <span className="font-semibold text-text">{typeLabel}</span> content (pillars, proof points, and copy-ready
          sections).
        </div>
      )
    };
  }

  return {
    title: `${typeLabel} output`,
    content: (
      <div className="space-y-4">
        {meaningfulKeys.map((k) => (
          <div key={k} className="hs-card p-5">
            <div className="text-[13px] font-semibold text-text">{titleFromKey(k)}</div>
            <div className="mt-2">{renderValue((rest as any)[k])}</div>
          </div>
        ))}
      </div>
    )
  };
}

export function ArtifactDetailClient({
  environmentId,
  artifact
}: {
  environmentId: string;
  artifact: ArtifactRow;
}) {
  const [showStructured, setShowStructured] = useState(false);
  const meta = useMemo(() => {
    const created = new Date(artifact.created_at);
    const createdLabel = Number.isNaN(created.getTime()) ? artifact.created_at : created.toLocaleString();
    const model = artifact.content_json?.model ?? "claude-sonnet";
    const summary = artifact.content_json?.summary ?? null;
    return { createdLabel, model, summary };
  }, [artifact.created_at, artifact.content_json]);

  const output = useMemo(() => humanOutputForArtifact(artifact), [artifact]);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center gap-2 text-xs text-text3">
        <Link href="/dashboard/artifacts" className="hover:text-text">
          Artifact Library
        </Link>
        <span>/</span>
        <span className="text-text2">{artifact.title}</span>
        <span
          className={`rounded-full border px-2.5 py-1 ${
            artifact.status === "ready"
              ? "border-[rgba(0,191,165,0.35)] bg-[rgba(0,191,165,0.10)] text-[var(--color-teal)]"
              : "border-border bg-surface2 text-text2"
          }`}
        >
          {artifact.status === "ready" ? "Ready" : "Draft"}
        </span>
      </div>

      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-text" style={{ fontFamily: "var(--font-heading)" }}>
        {artifact.title}
      </h1>
      <p className="mt-2 text-sm text-text2">
        Type: <span className="font-medium text-text">{prettyType(artifact.artifact_type)}</span> · Created:{" "}
        <span className="font-medium text-text">{meta.createdLabel}</span> · Model:{" "}
        <span className="font-mono text-text">{meta.model}</span>
      </p>

      {meta.summary ? (
        <div className="mt-6 hs-card p-5 text-sm text-text2">
          <div className="text-[13px] font-semibold text-text">Summary</div>
          <div className="mt-2 leading-relaxed">{String(meta.summary)}</div>
        </div>
      ) : null}

      <div className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-[13px] font-semibold text-text">{output.title}</div>
          <div className="flex items-center gap-2">
            {artifact.source_run_id ? (
              <Link
                href="/dashboard/launch-playbook"
                className="hs-card2 px-3 py-2 text-[13px] font-medium text-text transition hover:bg-surface3"
              >
                View playbook runs
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => setShowStructured((v) => !v)}
              className="hs-card2 px-3 py-2 text-[13px] font-medium text-text transition hover:bg-surface3"
              aria-expanded={showStructured}
            >
              {showStructured ? "Hide" : "Show"} structured output
            </button>
          </div>
        </div>

        <div className="mt-4">{output.content}</div>

        {showStructured ? (
          <div className="mt-6 hs-card p-5">
            <div className="text-[13px] font-semibold text-text">Structured output (advanced)</div>
            <pre className="mt-4 max-h-[520px] overflow-auto rounded-xl border border-border bg-bg p-4 text-xs leading-relaxed text-text2">
{JSON.stringify(
  {
    environmentId,
    ...artifact.content_json
  },
  null,
  2
)}
            </pre>
          </div>
        ) : null}
      </div>
    </div>
  );
}

