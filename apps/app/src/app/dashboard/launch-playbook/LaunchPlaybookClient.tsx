"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Initiative = {
  id: string;
  kind: "product-launch" | "feature-launch";
  title: string;
  description: string;
  dueLabel: string;
  members: string[];
  updatedLabel: string;
  accent: "purple" | "blue";
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "A").toUpperCase() + (parts[1]?.[0] ?? "").toUpperCase();
}

export function LaunchPlaybookClient({ environmentId }: { environmentId: string }) {
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement | null>(null);

  const initiatives = useMemo<Initiative[]>(
    () => [
      {
        id: "init-1",
        kind: "product-launch",
        title: "Product Launch",
        description: "Plan and execute product launches with clarity and alignment.",
        dueLabel: "Due in 2 days",
        members: ["RK", "AM", "SP"],
        updatedLabel: "2h ago",
        accent: "purple"
      },
      {
        id: "init-2",
        kind: "feature-launch",
        title: "Feature Launch",
        description: "Execute feature rollouts with focused coordination and impact.",
        dueLabel: "Due today",
        members: ["RK"],
        updatedLabel: "5d ago",
        accent: "blue"
      }
    ],
    []
  );

  useEffect(() => {
    if (!pickerOpen) return;
    function onDocPointerDown(e: PointerEvent) {
      const el = pickerRef.current;
      if (!el) return;
      if (e.target instanceof Node && el.contains(e.target)) return;
      setPickerOpen(false);
    }
    document.addEventListener("pointerdown", onDocPointerDown, { capture: true });
    return () => document.removeEventListener("pointerdown", onDocPointerDown, { capture: true } as any);
  }, [pickerOpen]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text3">Playbooks</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text" style={{ fontFamily: "var(--font-heading)" }}>
            Launch Playbook
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text2">
            Run launches with agentic workflows: research → narrative → GTM plan → sales enablement. Work is executed by background agent workers powered by
            Anthropic Claude Sonnet.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/artifacts"
            className="inline-flex items-center justify-center rounded-lg border border-border bg-surface2 px-4 py-2 text-[13px] font-medium text-text transition hover:bg-surface3"
          >
            Artifact Library
          </Link>

          <div className="relative" ref={pickerRef}>
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-[13px] font-semibold text-white shadow-lg shadow-focus transition hover:bg-primary-dark"
              aria-haspopup="menu"
              aria-expanded={pickerOpen}
            >
              New initiative <span aria-hidden>▾</span>
            </button>

            {pickerOpen ? (
              <div
                role="menu"
                aria-label="Create initiative"
                className="absolute right-0 top-[calc(100%+8px)] w-[240px] overflow-hidden rounded-xl border border-border bg-surface text-text shadow-dropdown"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface2"
                  onClick={() => {
                    setPickerOpen(false);
                    void environmentId;
                    router.push("/dashboard/launch-playbook/product-launch");
                  }}
                >
                  <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-white">
                    P
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-heading">Product launch</span>
                    <span className="mt-0.5 block text-xs text-text2">Positioning + message map + launch plan.</span>
                  </span>
                </button>

                <div className="h-px bg-border" />

                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface2"
                  onClick={() => {
                    setPickerOpen(false);
                    void environmentId;
                    router.push("/dashboard/launch-playbook/feature-launch");
                  }}
                >
                  <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#2563eb] text-xs font-bold text-white">
                    F
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-heading">Feature launch</span>
                    <span className="mt-0.5 block text-xs text-text2">Rollout plan + enablement materials.</span>
                  </span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {initiatives.map((i) => (
          <Link
            key={i.id}
            href={`/dashboard/launch-playbook/${i.kind}`}
            className="group overflow-hidden rounded-2xl border border-border bg-surface shadow-card transition hover:shadow-card-hover"
          >
            <div className="border-b border-border bg-surface2 px-5 py-3">
              <div className="flex items-center justify-between gap-3 text-[13px] font-medium text-text2">
                <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs">{i.dueLabel}</span>
                <span
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-xl text-white ${
                    i.accent === "blue" ? "bg-[#2563eb]" : "bg-primary"
                  }`}
                >
                  {i.title.slice(0, 1)}
                </span>
              </div>
            </div>

            <div className="px-5 py-5">
              <div className="text-xl font-semibold tracking-tight text-text group-hover:text-primary" style={{ fontFamily: "var(--font-heading)" }}>
                {i.title}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-text2">{i.description}</p>

              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="flex -space-x-2">
                  {i.members.slice(0, 3).map((m) => (
                    <div
                      key={m}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-[11px] font-semibold text-text2 shadow-sm"
                      title={m}
                    >
                      {initials(m)}
                    </div>
                  ))}
                  {i.members.length > 3 ? (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-[11px] font-semibold text-text2 shadow-sm">
                      +{i.members.length - 3}
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center gap-2 text-xs text-text3">
                  <span className="rounded-full border border-border bg-surface2 px-2 py-1">Owner</span>
                  <span>{i.updatedLabel}</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-border bg-surface p-6">
        <div className="text-sm font-semibold text-text">What you get</div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {[
            ["Launch insights", "Customer/competitor/market research turned into a brief."],
            ["Narrative + messaging", "Positioning, message map, and launch story."],
            ["Enablement pack", "Sales deck outline, battlecard, email + call scripts."]
          ].map(([t, d]) => (
            <div key={t} className="rounded-xl border border-border bg-surface2 p-4">
              <div className="text-[13px] font-semibold text-text">{t}</div>
              <div className="mt-1 text-sm leading-relaxed text-text2">{d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

