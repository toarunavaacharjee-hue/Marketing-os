"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { ModuleShell } from "@/app/dashboard/_components/ModuleShell";

type Artifact = {
  id: string;
  title: string;
  subtitle: string;
  status: "ready" | "draft";
  href: string;
  accent: "purple" | "teal" | "amber";
};

function accentClass(accent: Artifact["accent"]) {
  switch (accent) {
    case "teal":
      return "bg-[var(--color-teal)]";
    case "amber":
      return "bg-[var(--color-amber)]";
    default:
      return "bg-primary";
  }
}

export function ArtifactLibraryClient({ environmentId }: { environmentId: string }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<
    {
      id: string;
      artifact_type: string;
      title: string;
      status: "draft" | "ready";
      created_at: string;
      content_json: any;
    }[]
  >([]);

  useEffect(() => {
    let cancelled = false;
    const supabase = createSupabaseBrowserClient();

    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("artifact_library_items")
        .select("id,artifact_type,title,status,created_at,content_json")
        .eq("environment_id", environmentId)
        .order("created_at", { ascending: false })
        .limit(24);

      if (cancelled) return;
      setRows((data ?? []) as any);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [environmentId]);

  const artifacts = useMemo<Artifact[]>(() => {
    if (rows.length === 0) {
      return [
        {
          id: "positioning-stub",
          title: "Positioning Guide",
          subtitle: "Core Artifact",
          status: "draft",
          href: "/dashboard/launch-playbook/product-launch",
          accent: "purple"
        },
        {
          id: "messaging-stub",
          title: "Message Map",
          subtitle: "Core Artifact",
          status: "draft",
          href: "/dashboard/launch-playbook/product-launch",
          accent: "teal"
        },
        {
          id: "launch-brief-stub",
          title: "Launch Brief",
          subtitle: "Playbook Output",
          status: "draft",
          href: "/dashboard/launch-playbook/product-launch",
          accent: "amber"
        }
      ];
    }

    return rows.map((r) => {
      const t = String(r.artifact_type ?? "");
      const href = `/dashboard/artifacts/${r.id}`;

      const subtitle = t === "positioning_guide" || t === "message_map" ? "Core Artifact" : "Playbook Output";
      const accent: Artifact["accent"] = t === "message_map" ? "teal" : t === "sales_enablement" ? "amber" : "purple";

      return {
        id: r.id,
        title: r.title,
        subtitle,
        status: r.status === "ready" ? "ready" : "draft",
        href,
        accent
      };
    });
  }, [rows]);

  return (
    <ModuleShell
      title="Artifact Library"
      subtitle="A connected set of strategic artifacts your team can reuse across launches and channels. Artifacts are generated and updated by agent workers, powered by Anthropic Claude Sonnet."
      actions={
        <>
          <Link
            href="/dashboard/launch-playbook"
            className="hs-btn hs-btn-primary"
          >
            Open Launch Playbook
          </Link>
          <button
            type="button"
            onClick={() => {
              void environmentId;
            }}
            className="hs-btn hs-btn-secondary"
          >
            New artifact
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <div className="hs-card p-5 text-sm text-text2">Loading artifacts…</div>
          ) : null}
          {artifacts.map((a) => (
            <Link key={a.id} href={a.href} className="hs-card hs-card-hover group p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[13px] font-semibold text-text">
                  <span className={`inline-flex h-8 w-8 items-center justify-center rounded-xl text-white ${accentClass(a.accent)}`}>A</span>
                  {a.subtitle}
                </div>
                <span className={a.status === "ready" ? "hs-badge hs-badge-success" : "hs-badge hs-badge-neutral"}>
                  {a.status === "ready" ? "Ready" : "Draft"}
                </span>
              </div>

              <div className="mt-4 text-[16px] font-semibold tracking-tight text-text group-hover:text-primary" style={{ fontFamily: "var(--font-heading)" }}>
                {a.title}
              </div>

              <div className="mt-3 flex items-center gap-2 hs-card2 px-3 py-2 text-sm text-text2">
                <span className={a.status === "ready" ? "text-[var(--color-teal)]" : "text-text3"}>{a.status === "ready" ? "✓" : "•"}</span>
                <span className="truncate">{a.status === "ready" ? "Generated and synced across modules" : "Start from the Launch Playbook"}</span>
              </div>
            </Link>
          ))}
        </div>

        <div className="hs-card p-6">
          <div className="text-[14px] font-semibold text-heading">How artifacts are created</div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {[
              ["Agent workers", "Run long workflows in the background and keep a progress log."],
              ["Structured outputs", "Artifacts are saved as reusable blocks, not just chat messages."],
              ["Connected context", "Research → ICP → messaging stays tied to your product and environment."]
            ].map(([t, d]) => (
              <div key={t} className="hs-card p-4">
                <div className="text-[13px] font-semibold text-heading">{t}</div>
                <div className="mt-1 text-[12px] text-text2">{d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ModuleShell>
  );
}

