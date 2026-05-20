"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement | null>(null);

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

  const closeAccount = useCallback(() => setAccountOpen(false), []);

  const onAccountAction = useCallback(
    (href: string) => {
      closeAccount();
      if (href === "/logout") {
        window.location.assign("/logout");
        return;
      }
      router.push(href);
    },
    [closeAccount, router]
  );

  const initials = useMemo(() => {
    const name = profile?.name?.trim() || "";
    if (!name) return "AA";
    const parts = name.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? "A";
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : parts[0]?.[1];
    return `${String(first).toUpperCase()}${String(last ?? "A").toUpperCase()}`;
  }, [profile?.name]);

  useEffect(() => {
    if (!accountOpen) return;
    function onDocPointerDown(e: PointerEvent) {
      const el = accountRef.current;
      if (!el) return;
      if (e.target instanceof Node && el.contains(e.target)) return;
      closeAccount();
    }
    document.addEventListener("pointerdown", onDocPointerDown, { capture: true });
    return () => document.removeEventListener("pointerdown", onDocPointerDown, { capture: true } as any);
  }, [accountOpen, closeAccount]);

  const planLabel = (companyPlan ?? "starter").charAt(0).toUpperCase() + (companyPlan ?? "starter").slice(1);

  return (
    <header className="relative z-20 hidden h-[52px] shrink-0 items-center border-b border-border bg-surface px-4 md:flex md:px-6">
      <div className="mx-auto flex w-full max-w-[1200px] items-center gap-4">

        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-1 text-[13px]">
          {crumbs.map((c, i) => (
            <span key={`${c.href}-${i}`} className="flex min-w-0 items-center gap-1">
              {i > 0 && <span className="shrink-0 text-text3 select-none">/</span>}
              {i === crumbs.length - 1 ? (
                <span className="truncate font-semibold text-heading" title={c.label}>
                  {c.label}
                </span>
              ) : (
                <Link
                  href={c.href}
                  className="truncate text-text2 transition-colors hover:text-heading"
                  title={c.label}
                >
                  {c.label}
                </Link>
              )}
            </span>
          ))}
        </nav>

        {/* Context label */}
        {contextLabel && (
          <span
            className="hidden max-w-[180px] shrink-0 truncate rounded-full border border-border bg-surface2 px-2.5 py-0.5 text-[11px] font-medium text-text2 xl:inline"
            title={contextLabel}
          >
            {contextLabel}
          </span>
        )}

        {/* Right utilities */}
        <div className="flex shrink-0 items-center gap-1">

          {/* Search */}
          <div className="relative hidden w-[220px] lg:block">
            <svg
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text3"
              fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
            >
              <circle cx={11} cy={11} r={8} /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onSearchKeyDown}
              placeholder="Ask Copilot…"
              className="w-full rounded-md border border-border bg-surface2 py-1.5 pl-8 pr-3 text-[13px] text-heading placeholder:text-text3 transition-[border-color,box-shadow] focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15"
              aria-label="Ask Copilot"
            />
          </div>

          {/* Plan badge */}
          <span
            className="hidden shrink-0 rounded-full border border-primary/25 bg-primary/8 px-2.5 py-0.5 text-[11px] font-semibold text-primary xl:inline"
            title="Current plan"
          >
            {planLabel}
          </span>

          {/* Help */}
          <Link
            href="/dashboard/help"
            className="flex h-8 w-8 items-center justify-center rounded-md text-text2 transition-colors hover:bg-surface2 hover:text-heading"
            title="Help & documentation"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
            </svg>
          </Link>

          {/* Copilot button */}
          <Link
            href="/dashboard/copilot"
            className="flex h-8 items-center gap-1.5 rounded-md border border-primary/30 bg-primary/8 px-2.5 text-[12px] font-semibold text-primary transition-colors hover:bg-primary/14"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            <span className="hidden sm:inline">Copilot</span>
          </Link>

          {/* Account menu */}
          <div className="relative" ref={accountRef}>
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={accountOpen}
              onClick={() => setAccountOpen((v) => !v)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark text-[11px] font-bold text-white shadow-sm transition-opacity hover:opacity-90"
              title={profile?.name ?? "Account"}
            >
              {initials}
            </button>

            {accountOpen && (
              <div
                role="menu"
                aria-label="Account"
                className="absolute right-0 top-[calc(100%+8px)] z-50 w-[220px] overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
              >
                <div className="border-b border-border px-4 py-3">
                  <div className="truncate text-[13px] font-semibold text-heading">{profile?.name ?? "Account"}</div>
                  <div className="mt-0.5 truncate text-xs text-text2">{contextLabel ?? "Workspace"}</div>
                </div>

                <div className="p-1.5 space-y-0.5">
                  {[
                    { label: "My profile", href: "/dashboard/settings/profile" },
                    { label: "My team", href: "/dashboard/settings/team" },
                    { label: "Integrations", href: "/dashboard/settings/integrations" },
                    { label: "Settings", href: "/dashboard/settings" },
                    { label: "Help & documentation", href: "/dashboard/help" },
                  ].map((item) => (
                    <button
                      key={item.href}
                      type="button"
                      role="menuitem"
                      onClick={() => onAccountAction(item.href)}
                      className="flex w-full items-center rounded-lg px-3 py-2 text-[13px] text-text transition-colors hover:bg-surface2 hover:text-heading"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="border-t border-border p-1.5">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => onAccountAction("/logout")}
                    className="flex w-full items-center rounded-lg px-3 py-2 text-[13px] font-semibold text-red transition-colors hover:bg-red/8"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
