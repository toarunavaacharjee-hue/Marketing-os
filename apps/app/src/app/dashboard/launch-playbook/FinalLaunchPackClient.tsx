"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { LaunchKind } from "@/app/dashboard/launch-playbook/LaunchPlaybookDetailClient";

type ArtifactRow = {
  id: string;
  artifact_type: string;
  title: string;
  status: "draft" | "ready";
  created_at: string;
  content_json: any;
  source_run_id: string | null;
};

function sortKey(t: string) {
  switch (t) {
    case "launch_brief":
      return 1;
    case "positioning_guide":
      return 2;
    case "message_map":
      return 3;
    case "sales_enablement":
      return 4;
    default:
      return 50;
  }
}

export function FinalLaunchPackClient({
  kind,
  run,
  artifacts
}: {
  kind: LaunchKind;
  run: { id: string; status: string; created_at: string };
  artifacts: ArtifactRow[];
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const ordered = useMemo(() => {
    return [...artifacts].sort((a, b) => sortKey(a.artifact_type) - sortKey(b.artifact_type));
  }, [artifacts]);

  const createdLabel = useMemo(() => {
    const d = new Date(run.created_at);
    return Number.isNaN(d.getTime()) ? run.created_at : d.toLocaleString();
  }, [run.created_at]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-text3">
            <Link href="/dashboard/launch-playbook" className="hover:text-text">
              Launch Playbook
            </Link>
            <span>/</span>
            <Link href={`/dashboard/launch-playbook/${kind}`} className="hover:text-text">
              {kind}
            </Link>
            <span>/</span>
            <span className="text-text2">Final pack</span>
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-text" style={{ fontFamily: "var(--font-heading)" }}>
            Final Launch Pack
          </h1>
          <p className="mt-2 text-sm text-text2">
            Run: <span className="font-mono text-text">{run.id.slice(0, 8)}</span> · Status:{" "}
            <span className="font-medium text-text">{run.status}</span> · Created:{" "}
            <span className="font-medium text-text">{createdLabel}</span>
          </p>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text2">
            This view bundles the deliverables from your latest playbook run into one place for review and export.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/artifacts"
            className="hs-btn hs-btn-secondary"
          >
            Artifact Library
          </Link>
          <button
            type="button"
            onClick={async () => {
              const payload = JSON.stringify({ run, artifacts: ordered }, null, 2);
              await navigator.clipboard.writeText(payload);
            }}
            className="hs-btn hs-btn-primary"
          >
            Copy pack JSON
          </button>
        </div>
      </div>

      <div className="mt-8 space-y-3">
        {ordered.length === 0 ? (
          <div className="hs-card p-5 text-sm text-text2">
            No artifacts found for this run yet.
          </div>
        ) : (
          ordered.map((a) => (
            <div key={a.id} className="overflow-hidden hs-card">
              <button
                type="button"
                onClick={() => setExpanded((m) => ({ ...m, [a.id]: !m[a.id] }))}
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-surface2"
              >
                <div className="min-w-0">
                  <div className="truncate text-[15px] font-semibold text-text" style={{ fontFamily: "var(--font-heading)" }}>
                    {a.title}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text3">
                    <span className="rounded-full border border-border bg-surface2 px-2 py-1">{a.artifact_type}</span>
                    <span className="rounded-full border border-border bg-surface2 px-2 py-1">{a.status}</span>
                    <Link href={`/dashboard/artifacts/${a.id}`} className="text-link hover:underline" onClick={(e) => e.stopPropagation()}>
                      Open
                    </Link>
                  </div>
                </div>
                <span className="font-mono text-text2">{expanded[a.id] ? "−" : "+"}</span>
              </button>

              {expanded[a.id] ? (
                <div className="border-t border-border bg-bg px-5 py-4">
                  {a.content_json?.summary ? (
                    <div className="hs-card p-4 text-sm text-text2">
                      <div className="text-[13px] font-semibold text-text">Summary</div>
                      <div className="mt-2 leading-relaxed">{String(a.content_json.summary)}</div>
                    </div>
                  ) : null}

                  <pre className="mt-3 max-h-[520px] overflow-auto hs-card p-4 text-xs leading-relaxed text-text2">
{JSON.stringify(a.content_json ?? {}, null, 2)}
                  </pre>
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

