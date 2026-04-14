"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  FOUNDATION_LINKS,
  PMM_JOURNEY,
  getFlowContext
} from "@/lib/pmmModuleFlow";
import { usePersistedModuleFlowExpanded } from "@/app/dashboard/_components/usePersistedModuleFlowExpanded";

const bar =
  "relative mb-6 overflow-hidden rounded-2xl border border-border bg-surface/90 px-4 py-3.5 text-[12px] shadow-sm backdrop-blur-md transition-[border-color,box-shadow] duration-200 ease-out hover:border-primary/12 hover:shadow-card";

const barAccent =
  "pointer-events-none absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b from-primary to-primary-dark";

const pill =
  "inline-flex items-center rounded-md border border-border bg-surface2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text3";

const btnGhost =
  "inline-flex items-center rounded-lg border border-border bg-surface2 px-3 py-1.5 text-[11px] font-semibold text-text transition-[background-color,border-color,color,box-shadow] duration-200 ease-out hover:bg-surface3 active:scale-[0.98] motion-reduce:active:scale-100";

const btnAccentSoft =
  "inline-flex items-center rounded-lg border border-accent/35 bg-accent/10 px-3 py-1.5 text-[11px] font-semibold text-accent transition-[background-color,border-color,box-shadow] duration-200 ease-out hover:bg-accent/15 active:scale-[0.98] motion-reduce:active:scale-100";

const btnPrimary =
  "inline-flex items-center rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-on-dark shadow-sm transition-[background-color,box-shadow,transform] duration-200 ease-out hover:bg-primary-dark hover:shadow-md active:scale-[0.98] motion-reduce:active:scale-100";

const toggleBtn =
  "shrink-0 rounded-md border border-border bg-surface2 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-text3 transition-[background-color,color] duration-200 hover:bg-surface3";

function FlowBarShell({
  expanded,
  onToggle,
  collapsed,
  children
}: {
  expanded: boolean;
  onToggle: () => void;
  collapsed: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="relative mb-6 pl-3">
      <div className={barAccent} aria-hidden />
      <div className={`${bar} relative pl-3`}>
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">{expanded ? children : collapsed}</div>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            className={toggleBtn}
          >
            {expanded ? "Less" : "More"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ModuleFlowBar() {
  const pathname = usePathname() ?? "/dashboard";
  const ctx = getFlowContext(pathname);
  const { expanded, toggle } = usePersistedModuleFlowExpanded(true);

  if (!pathname.startsWith("/dashboard")) return null;

  if (ctx.kind === "onboarding") {
    return (
      <FlowBarShell
        expanded={expanded}
        onToggle={toggle}
        collapsed={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-text">Onboarding</span>
            <Link href="/dashboard" className={btnGhost}>
              Command Centre
            </Link>
          </div>
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="font-semibold text-text">Onboarding</span>
            <span className="ml-2 text-text2">Finish company &amp; product context to unlock the workspace.</span>
          </div>
          <Link href="/dashboard" className={btnGhost}>
            Command Centre
          </Link>
        </div>
      </FlowBarShell>
    );
  }

  if (ctx.kind === "settings") {
    return (
      <FlowBarShell
        expanded={expanded}
        onToggle={toggle}
        collapsed={
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <Link href="/dashboard" className="font-semibold text-primary hover:underline">
              Command Centre
            </Link>
            <span className="text-text3">/</span>
            <Link href="/dashboard/settings" className="font-semibold text-text hover:text-primary">
              Settings
            </Link>
            {ctx.subPath !== "/" ? (
              <>
                <span className="text-text3">/</span>
                <span className="text-text2">Workspace setup</span>
              </>
            ) : null}
          </div>
        }
      >
        <>
          <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/dashboard" className="text-[11px] font-semibold text-primary hover:underline">
                Command Centre
              </Link>
              <span className="text-text3">/</span>
              <Link href="/dashboard/settings" className="text-[11px] font-semibold text-text hover:text-primary">
                Settings
              </Link>
              {ctx.subPath !== "/" ? (
                <>
                  <span className="text-text3">/</span>
                  <span className="text-text2">Workspace setup</span>
                </>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {FOUNDATION_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                    pathname === l.href || pathname.startsWith(l.href + "/")
                      ? "border border-primary/40 bg-primary-light text-primary-dark"
                      : `${btnGhost}`
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
            <span className="text-text2">Data you set here feeds Market Research, ICP, scans, and Analytics.</span>
            <Link href="/dashboard/market-research" className="text-[11px] font-semibold text-accent hover:underline">
              Start PMM workflow → Market Research
            </Link>
          </div>
        </>
      </FlowBarShell>
    );
  }

  if (ctx.kind === "home") {
    return (
      <FlowBarShell
        expanded={expanded}
        onToggle={toggle}
        collapsed={
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <span className="font-semibold text-text">Product marketing spine</span>
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard/market-research" className={btnPrimary}>
                Start → Research
              </Link>
              <Link href="/dashboard/copilot" className={btnGhost}>
                Copilot
              </Link>
            </div>
          </div>
        }
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <span className="font-semibold text-text">Product marketing spine</span>
            <span className="ml-2 text-text2">
              One product context → research → ICP → positioning → messaging → launch → measure. Use the sidebar or
              start below.
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard#workspace-health" className={btnAccentSoft}>
              Workspace health
            </Link>
            <Link href="/dashboard/settings/product" className={btnGhost}>
              Product profile
            </Link>
            <Link href="/dashboard/market-research" className={btnPrimary}>
              Start → Market Research
            </Link>
            <Link href="/dashboard/copilot" className={btnGhost}>
              AI Copilot
            </Link>
          </div>
        </div>
      </FlowBarShell>
    );
  }

  const { index, step } = ctx;
  const prev = index > 0 ? PMM_JOURNEY[index - 1] : null;
  const next = index < PMM_JOURNEY.length - 1 ? PMM_JOURNEY[index + 1] : null;
  const n = PMM_JOURNEY.length;

  return (
    <FlowBarShell
      expanded={expanded}
      onToggle={toggle}
      collapsed={
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Link href="/dashboard" className="shrink-0 text-[11px] font-semibold text-accent2 hover:underline">
              Home
            </Link>
            <span className="text-text3">·</span>
            <span className={pill}>{step.phase}</span>
            <span className="min-w-0 truncate text-[11px] font-medium text-text">{step.label}</span>
            <span className="text-[10px] text-text3">
              ({index + 1}/{n})
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {prev ? (
              <Link href={prev.href} className={`${btnGhost} gap-1`}>
                ← {prev.label}
              </Link>
            ) : (
              <Link href="/dashboard/settings/product" className={`${btnGhost} gap-1 text-text2 hover:text-text`}>
                ← Foundation
              </Link>
            )}
            {next ? (
              <Link href={next.href} className={`${btnPrimary} gap-1`}>
                Next: {next.label} →
              </Link>
            ) : (
              <Link href="/dashboard" className={`${btnGhost} gap-1`}>
                Done → Home
              </Link>
            )}
          </div>
        </div>
      }
    >
      <>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/dashboard" className="shrink-0 text-[11px] font-semibold text-accent2 hover:underline">
                Home
              </Link>
              <span className="text-text3">·</span>
              <span className={pill}>{step.phase}</span>
              <span className="text-text2">
                Step {index + 1} of {n}: <span className="font-medium text-text">{step.label}</span>
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {prev ? (
              <Link href={prev.href} className={`${btnGhost} gap-1`}>
                ← {prev.label}
              </Link>
            ) : (
              <Link href="/dashboard/settings/product" className={`${btnGhost} gap-1 text-text2 hover:text-text`}>
                ← Foundation (product)
              </Link>
            )}
            {next ? (
              <Link href={next.href} className={`${btnPrimary} gap-1`}>
                Next: {next.label} →
              </Link>
            ) : (
              <Link href="/dashboard" className={`${btnGhost} gap-1`}>
                Done → Command Centre
              </Link>
            )}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-3 text-[11px] text-text2">
          <span className="font-semibold text-text3">Foundation:</span>
          {FOUNDATION_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="transition hover:text-accent2 hover:underline">
              {l.label}
            </Link>
          ))}
          <span className="text-text3">|</span>
          <Link href="/dashboard/copilot" className="font-semibold text-text hover:text-accent2 hover:underline">
            AI Copilot
          </Link>
          <span className="text-text3">|</span>
          <Link href="/dashboard/settings" className="font-semibold transition hover:text-accent2 hover:underline">
            All settings
          </Link>
        </div>
      </>
    </FlowBarShell>
  );
}
