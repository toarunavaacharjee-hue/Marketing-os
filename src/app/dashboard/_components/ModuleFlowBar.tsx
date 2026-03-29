"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FOUNDATION_LINKS,
  PMM_JOURNEY,
  getFlowContext
} from "@/lib/pmmModuleFlow";

export function ModuleFlowBar() {
  const pathname = usePathname() ?? "/dashboard";
  const ctx = getFlowContext(pathname);

  if (!pathname.startsWith("/dashboard")) return null;

  const bar =
    "mb-6 rounded-[var(--radius)] border border-border bg-surface2/80 px-4 py-3 text-[12px] backdrop-blur-sm";

  if (ctx.kind === "onboarding") {
    return (
      <div className={bar}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="font-semibold text-text">Onboarding</span>
            <span className="ml-2 text-text2">Finish company &amp; product context to unlock the workspace.</span>
          </div>
          <Link
            href="/dashboard"
            className="rounded-[var(--radius2)] border border-border bg-surface px-3 py-1.5 font-semibold text-text hover:bg-surface3"
          >
            Command Centre
          </Link>
        </div>
      </div>
    );
  }

  if (ctx.kind === "settings") {
    return (
      <div className={bar}>
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard"
              className="font-semibold text-accent2 hover:underline"
            >
              Command Centre
            </Link>
            <span className="text-text3">/</span>
            <Link href="/dashboard/settings" className="font-semibold text-text hover:text-accent2">
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
                className={`rounded-[var(--radius2)] border px-2.5 py-1 text-[11px] font-semibold transition ${
                  pathname === l.href || pathname.startsWith(l.href + "/")
                    ? "border-accent2 bg-accent2/10 text-accent2"
                    : "border-border bg-surface text-text2 hover:border-border2 hover:text-text"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <span className="text-text2">Data you set here feeds Market Research, ICP, scans, and Analytics.</span>
          <Link
            href="/dashboard/market-research"
            className="font-semibold text-accent hover:underline"
          >
            Start PMM workflow → Market Research
          </Link>
        </div>
      </div>
    );
  }

  if (ctx.kind === "home") {
    return (
      <div className={bar}>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <span className="font-semibold text-text">Product marketing spine</span>
            <span className="ml-2 text-text2">
              One product context → research → ICP → positioning → messaging → launch → measure. Use the sidebar or
              start below.
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard#workspace-health"
              className="rounded-[var(--radius2)] border border-accent2/40 bg-accent2/10 px-3 py-1.5 text-[11px] font-semibold text-accent2 hover:bg-accent2/15"
            >
              Workspace health
            </Link>
            <Link
              href="/dashboard/settings/product"
              className="rounded-[var(--radius2)] border border-border bg-surface px-3 py-1.5 text-[11px] font-semibold text-text hover:bg-surface3"
            >
              Product profile
            </Link>
            <Link
              href="/dashboard/market-research"
              className="rounded-[var(--radius2)] bg-accent px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#5b52ee]"
            >
              Start → Market Research
            </Link>
            <Link
              href="/dashboard/copilot"
              className="rounded-[var(--radius2)] border border-border bg-surface px-3 py-1.5 text-[11px] font-semibold text-text hover:bg-surface3"
            >
              AI Copilot
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { index, step } = ctx;
  const prev = index > 0 ? PMM_JOURNEY[index - 1] : null;
  const next = index < PMM_JOURNEY.length - 1 ? PMM_JOURNEY[index + 1] : null;
  const n = PMM_JOURNEY.length;

  return (
    <div className={bar}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/dashboard" className="shrink-0 text-[11px] font-semibold text-accent2 hover:underline">
              Home
            </Link>
            <span className="text-text3">·</span>
            <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text3">
              {step.phase}
            </span>
            <span className="text-text2">
              Step {index + 1} of {n}: <span className="font-medium text-text">{step.label}</span>
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {prev ? (
            <Link
              href={prev.href}
              className="inline-flex items-center gap-1 rounded-[var(--radius2)] border border-border bg-surface px-3 py-1.5 text-[11px] font-semibold text-text hover:bg-surface3"
            >
              ← {prev.label}
            </Link>
          ) : (
            <Link
              href="/dashboard/settings/product"
              className="inline-flex items-center gap-1 rounded-[var(--radius2)] border border-border bg-surface px-3 py-1.5 text-[11px] font-semibold text-text2 hover:bg-surface3 hover:text-text"
            >
              ← Foundation (product)
            </Link>
          )}
          {next ? (
            <Link
              href={next.href}
              className="inline-flex items-center gap-1 rounded-[var(--radius2)] bg-accent px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#5b52ee]"
            >
              Next: {next.label} →
            </Link>
          ) : (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 rounded-[var(--radius2)] border border-border bg-surface px-3 py-1.5 text-[11px] font-semibold text-text hover:bg-surface3"
            >
              Done → Command Centre
            </Link>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-3 text-[11px] text-text2">
        <span className="font-semibold text-text3">Foundation:</span>
        {FOUNDATION_LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="hover:text-accent2 hover:underline">
            {l.label}
          </Link>
        ))}
        <span className="text-text3">|</span>
        <Link href="/dashboard/copilot" className="font-semibold text-text hover:text-accent2 hover:underline">
          AI Copilot
        </Link>
        <span className="text-text3">|</span>
        <Link href="/dashboard/settings" className="hover:text-accent2 hover:underline">
          All settings
        </Link>
      </div>
    </div>
  );
}
