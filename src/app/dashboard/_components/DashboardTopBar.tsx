"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getDashboardBreadcrumb } from "@/lib/dashboardBreadcrumb";
import type { CompanyOption, ProductOption } from "@/app/dashboard/TenantSwitcher";

type Profile = {
  name: string | null;
  company: string | null;
};

export function DashboardTopBar({
  profile,
  companies,
  products,
  selectedCompanyId,
  selectedProductId,
  companyPlan
}: {
  profile: Profile | null;
  companies: CompanyOption[];
  products: ProductOption[];
  selectedCompanyId: string | null;
  selectedProductId: string | null;
  companyPlan: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [q, setQ] = useState("");

  const crumbs = useMemo(() => getDashboardBreadcrumb(pathname), [pathname]);

  const contextLabel = useMemo(() => {
    const co = companies.find((c) => c.id === selectedCompanyId);
    const pr = products.find((p) => p.id === selectedProductId);
    if (!co && !pr) return null;
    if (pr && co) return `${co.name} · ${pr.name}`;
    return co?.name ?? pr?.name ?? null;
  }, [companies, products, selectedCompanyId, selectedProductId]);

  function onSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    const text = q.trim();
    if (text) router.push(`/dashboard/copilot?q=${encodeURIComponent(text)}`);
    else router.push("/dashboard/copilot");
  }

  const initials = useMemo(() => {
    const name = profile?.name?.trim() || "";
    if (!name) return "AA";
    const parts = name.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? "A";
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : parts[0]?.[1];
    return `${String(first).toUpperCase()}${String(last ?? "A").toUpperCase()}`;
  }, [profile?.name]);

  return (
    <header className="relative z-20 hidden h-[52px] shrink-0 border-b border-[var(--sidebar-divider)] bg-sidebar px-4 text-on-dark md:flex md:px-6">
      <div className="mx-auto flex w-full max-w-[1200px] items-center gap-3 lg:gap-4">
        <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-1.5 text-[13px]">
          {crumbs.map((c, i) => (
            <span key={`${c.href}-${i}`} className="flex min-w-0 items-center gap-1.5">
              {i > 0 ? <span className="shrink-0 text-on-dark/35">/</span> : null}
              {i === crumbs.length - 1 ? (
                <span className="truncate font-semibold text-on-dark" title={c.label}>
                  {c.label}
                </span>
              ) : (
                <Link
                  href={c.href}
                  className="truncate text-on-dark/65 transition-colors hover:text-on-dark"
                  title={c.label}
                >
                  {c.label}
                </Link>
              )}
            </span>
          ))}
        </nav>

        {contextLabel ? (
          <span
            className="hidden max-w-[200px] shrink-0 truncate text-xs text-on-dark/55 xl:block"
            title={contextLabel}
          >
            {contextLabel}
          </span>
        ) : null}

        <div className="ml-auto flex min-w-0 shrink-0 items-center justify-end gap-2 sm:gap-3">
          <div className="relative hidden w-[min(100%,240px)] lg:block">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-on-dark/35" aria-hidden>
              ⌕
            </span>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onSearchKeyDown}
              placeholder="Ask Copilot…"
              className="w-full rounded-sm border border-transparent bg-sidebar-active py-2 pl-8 pr-3 text-sm text-on-dark placeholder:text-on-dark/40 transition-[border-color,box-shadow] duration-200 focus:border-primary focus:outline-none focus:shadow-focus"
              aria-label="Ask Copilot"
            />
          </div>

          <span
            className="hidden shrink-0 rounded-sm border border-[var(--sidebar-divider)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-on-dark/50 xl:inline"
            title="Plan"
          >
            {companyPlan ?? "starter"}
          </span>

          <Link
            href="/dashboard/copilot"
            className="shrink-0 rounded-sm px-2 py-1.5 text-xs font-semibold text-primary-light transition-colors hover:bg-sidebar-active"
          >
            Copilot
          </Link>

          <details className="relative">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-on-dark/80 transition-colors hover:bg-sidebar-active hover:text-on-dark [&::-webkit-details-marker]:hidden">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full bg-sidebar-active text-[11px] font-bold text-on-dark"
                aria-hidden
              >
                {initials}
              </span>
              <span className="hidden max-w-[140px] truncate text-xs font-medium text-on-dark/70 lg:block">
                {profile?.name ?? "Account"}
              </span>
              <span className="text-on-dark/40" aria-hidden>
                ▾
              </span>
            </summary>

            <div className="absolute right-0 top-[calc(100%+8px)] w-[220px] overflow-hidden rounded-lg border border-border bg-surface text-text shadow-dropdown">
              <div className="border-b border-border px-3 py-2">
                <div className="truncate text-sm font-semibold text-heading">{profile?.name ?? "Account"}</div>
                <div className="mt-0.5 truncate text-xs text-text2">{contextLabel ?? "Workspace"}</div>
              </div>

              <div className="p-1">
                <Link
                  href="/dashboard/settings/team"
                  className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-sm text-text transition-colors hover:bg-surface2"
                >
                  <span>My profile & team</span>
                </Link>
                <Link
                  href="/dashboard/settings/integrations"
                  className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-sm text-text transition-colors hover:bg-surface2"
                >
                  <span>Integrations</span>
                </Link>
                <Link
                  href="/dashboard/settings"
                  className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-sm text-text transition-colors hover:bg-surface2"
                >
                  <span>Settings</span>
                </Link>
              </div>

              <div className="border-t border-border p-1">
                <Link
                  href="/logout"
                  className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-sm font-semibold text-red transition-colors hover:bg-red/10"
                >
                  <span>Logout</span>
                </Link>
              </div>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
