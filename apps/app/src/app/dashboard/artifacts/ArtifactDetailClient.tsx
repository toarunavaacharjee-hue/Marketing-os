"use client";

import Link from "next/link";
import { useMemo } from "react";

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

export function ArtifactDetailClient({
  environmentId,
  artifact
}: {
  environmentId: string;
  artifact: ArtifactRow;
}) {
  const meta = useMemo(() => {
    const created = new Date(artifact.created_at);
    const createdLabel = Number.isNaN(created.getTime()) ? artifact.created_at : created.toLocaleString();
    const model = artifact.content_json?.model ?? "claude-sonnet";
    const summary = artifact.content_json?.summary ?? null;
    return { createdLabel, model, summary };
  }, [artifact.created_at, artifact.content_json]);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center gap-2 text-xs text-text3">
        <Link href="/dashboard/artifacts" className="hover:text-text">
          Artifact Library
        </Link>
        <span>/</span>
        <span className="text-text2">{artifact.title}</span>
        <span className={`rounded-full border px-2.5 py-1 ${artifact.status === "ready" ? "border-[rgba(0,191,165,0.35)] bg-[rgba(0,191,165,0.10)] text-[var(--color-teal)]" : "border-border bg-surface2 text-text2"}`}>
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
        <div className="mt-6 rounded-2xl border border-border bg-surface p-5 text-sm text-text2">
          <div className="text-[13px] font-semibold text-text">Summary</div>
          <div className="mt-2 leading-relaxed">{String(meta.summary)}</div>
        </div>
      ) : null}

      <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[13px] font-semibold text-text">Structured output</div>
          {artifact.source_run_id ? (
            <Link
              href="/dashboard/launch-playbook"
              className="rounded-lg border border-border bg-surface2 px-3 py-2 text-[13px] font-medium text-text transition hover:bg-surface3"
            >
              View playbook runs
            </Link>
          ) : null}
        </div>

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
    </div>
  );
}

