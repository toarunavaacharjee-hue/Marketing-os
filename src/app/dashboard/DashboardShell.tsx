"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { TenantSwitcher, type CompanyOption, type ProductOption } from "@/app/dashboard/TenantSwitcher";
import { ModuleFlowBar } from "@/app/dashboard/_components/ModuleFlowBar";
import { ProfileCompletenessBanner } from "@/app/dashboard/_components/ProfileCompletenessBanner";
import { getEntitlements, isSlugAllowed } from "@/lib/planEntitlements";

type Profile = {
  name: string | null;
  company: string | null;
};

type ModuleLink = {
  label: string;
  slug: string;
  icon?: string;
  badge?: string;
};

type NavSection = {
  label: string;
  items: ModuleLink[];
};

const NAV: NavSection[] = [
  {
    label: "Home",
    items: [{ label: "Command Centre", slug: "", icon: "⚡" }]
  },
  {
    label: "Strategy",
    items: [
      { label: "Market Research", slug: "market-research", icon: "🔭", badge: "NEW" },
      { label: "ICP Segmentation", slug: "icp-segmentation", icon: "🎯", badge: "NEW" },
      { label: "Positioning Studio", slug: "positioning-studio", icon: "💎", badge: "NEW" },
      { label: "Messaging & Artifacts", slug: "messaging-artifacts", icon: "✨", badge: "NEW" }
    ]
  },
  {
    label: "Planning",
    items: [
      { label: "Marketing Workbench", slug: "work", icon: "🗂️" },
      { label: "Campaigns", slug: "campaigns", icon: "📋" },
      { label: "GTM Planner", slug: "gtm-planner", icon: "🚀" },
      { label: "Events", slug: "events", icon: "📅" }
    ]
  },
  {
    label: "Creation",
    items: [
      { label: "Content Studio", slug: "content-studio", icon: "✍️" },
      { label: "Social Media", slug: "social-media", icon: "📱" },
      { label: "Design & Assets", slug: "design-assets", icon: "🎨" },
      { label: "Presentations", slug: "presentations", icon: "📊" },
      { label: "Website & Pages", slug: "website-pages", icon: "🌐" }
    ]
  },
  {
    label: "Intelligence",
    items: [
      { label: "Analytics", slug: "analytics", icon: "📈" },
      { label: "Battlecards", slug: "battlecards", icon: "⚔️" },
      { label: "Prospect Research", slug: "prospect-research", icon: "🧭", badge: "NEW" },
      { label: "Sales Intelligence", slug: "sales-intelligence", icon: "🎤" },
      { label: "Customer Insights", slug: "customer-insights", icon: "💬" }
    ]
  },
  {
    label: "AI",
    items: [{ label: "AI Copilot", slug: "copilot", icon: "🤖" }]
  }
];

export function DashboardShell({
  children,
  profile,
  companyPlan,
  companies,
  products,
  selectedCompanyId,
  selectedProductId
}: {
  children: React.ReactNode;
  profile: Profile | null;
  companyPlan: string;
  companies: CompanyOption[];
  products: ProductOption[];
  selectedCompanyId: string | null;
  selectedProductId: string | null;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const ent = useMemo(() => getEntitlements(companyPlan ?? "starter"), [companyPlan]);

  const [anthropicReady, setAnthropicReady] = useState(false);
  const [aiKeySource, setAiKeySource] = useState<"workspace" | "platform" | "none">("none");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/settings/workspace-ai-key");
        const data = (await res.json()) as {
          anthropic_ready?: boolean;
          key_source?: "workspace" | "platform" | "none";
        };
        if (!cancelled) {
          setAnthropicReady(Boolean(data.anthropic_ready));
          setAiKeySource(data.key_source ?? "none");
        }
      } catch {
        if (!cancelled) {
          setAnthropicReady(false);
          setAiKeySource("none");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedCompanyId]);

  const [aiStatus, setAiStatus] = useState<
    "idle" | "checking" | "connected" | "error"
  >("idle");
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function ping() {
      if (!anthropicReady) {
        setAiStatus("idle");
        setAiError(null);
        return;
      }

      setAiStatus("checking");
      setAiError(null);

      try {
        const res = await fetch("/api/ai/ping", {
          method: "POST",
          headers: {
            "content-type": "application/json"
          }
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (cancelled) return;

        if (!res.ok || !data.ok) {
          setAiStatus("error");
          setAiError(data.error ?? "Could not connect.");
          return;
        }

        setAiStatus("connected");
      } catch (e) {
        if (cancelled) return;
        setAiStatus("error");
        setAiError(e instanceof Error ? e.message : "Could not connect.");
      }
    }

    const t = window.setTimeout(ping, 600);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [anthropicReady]);

  const activeMap = useMemo(() => {
    const map = new Map<string, boolean>();
    NAV.flatMap((s) => s.items).forEach((m) => {
      const href = m.slug ? `/dashboard/${m.slug}` : "/dashboard";
      const active =
        href === "/dashboard"
          ? pathname === "/dashboard"
          : pathname === href || (pathname?.startsWith(href + "/") ?? false);
      map.set(href, active);
    });
    return map;
  }, [pathname]);

  function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
      <div className="px-5 pb-1 pt-4 text-xs font-semibold uppercase tracking-[0.6px] text-text3">
        {children}
      </div>
    );
  }

  function NavBadge({ children }: { children: string }) {
    return (
      <span className="ml-auto rounded border border-primary/25 bg-primary-light px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-primary-dark">
        {children}
      </span>
    );
  }

  function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
    return (
      <div className="flex h-full w-[220px] min-h-0 flex-col bg-sidebar text-on-dark">
        <div className="relative border-b border-[var(--sidebar-divider)] px-5 py-4">
          <Link href="/dashboard" className="flex items-center gap-2.5" onClick={onNavigate}>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-primary to-primary-dark text-[11px] font-bold text-on-dark shadow-sm">
              AI
            </span>
            <span className="font-[var(--font-heading)] text-[15px] font-bold leading-tight tracking-tight text-on-dark">
              Marketing <span className="text-primary-light">Workbench</span>
            </span>
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="absolute right-3 top-3 rounded-sm px-2 py-1 text-sm text-on-dark/70 hover:bg-sidebar-active hover:text-on-dark md:hidden"
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <div className="border-b border-[var(--sidebar-divider)]">
          <TenantSwitcher
            companies={companies}
            products={products}
            selectedCompanyId={selectedCompanyId}
            selectedProductId={selectedProductId}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto py-2">
          {NAV.map((section) => (
            <div key={section.label}>
              <SectionLabel>{section.label}</SectionLabel>
              <div className="space-y-0.5">
                {section.items.map((m) => {
                  const href = m.slug ? `/dashboard/${m.slug}` : "/dashboard";
                  const active = activeMap.get(href) ?? false;
                  const allowed = isSlugAllowed(ent, m.slug);
                  return (
                    <Link
                      key={m.slug || "home"}
                      href={allowed ? href : `/dashboard/upgrade?next=${encodeURIComponent(href)}`}
                      onClick={onNavigate}
                      className={`relative flex items-center gap-2 border-l-[3px] py-2.5 pl-[17px] pr-5 text-sm font-medium transition ${
                        active
                          ? "border-primary bg-sidebar-active text-on-dark"
                          : allowed
                            ? "border-transparent text-on-dark/90 hover:bg-sidebar-active"
                            : "border-transparent text-text3 hover:bg-sidebar-active"
                      }`}
                    >
                      <span className="w-[18px] text-center text-base">{m.icon ?? "•"}</span>
                      <span className="truncate">{m.label}</span>
                      {!allowed ? <NavBadge>UPGRADE</NavBadge> : m.badge ? <NavBadge>{m.badge}</NavBadge> : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-[var(--sidebar-divider)] p-2">
          <Link
            href="/dashboard/settings"
            onClick={onNavigate}
            className={`relative flex items-center gap-2 border-l-[3px] py-2.5 pl-[17px] pr-4 text-sm font-medium transition ${
              pathname === "/dashboard/settings"
                ? "border-primary bg-sidebar-active text-on-dark"
                : "border-transparent text-on-dark/90 hover:bg-sidebar-active"
            }`}
          >
            <span className="w-[18px] text-center text-base">⚙️</span>
            <span className="pl-1">Settings</span>
          </Link>
        </div>

        <div className="border-t border-[var(--sidebar-divider)] p-3">
          <div className="mb-2 px-1">
            <div className="text-sm text-on-dark">{profile?.name ?? "—"}</div>
            <div className="text-xs text-text3">
              {profile?.company ?? "—"} • {companyPlan ?? "starter"}
            </div>
          </div>

          <details className="group rounded-md border border-[var(--sidebar-divider)] bg-sidebar-active px-3 py-2">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[11px] font-semibold text-on-dark/90 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${anthropicReady ? "bg-teal" : "bg-on-dark/25"}`}
                  aria-hidden
                />
                Workspace AI
              </span>
              <span className="text-text3 transition group-open:rotate-90">›</span>
            </summary>

            <div className="mt-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-text3">
                  Anthropic (this workspace)
                </div>
                <div
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    anthropicReady
                      ? "bg-[color-mix(in_srgb,var(--color-teal)_18%,transparent)] text-teal"
                      : "bg-[color-mix(in_srgb,var(--color-amber)_22%,transparent)] text-amber"
                  }`}
                >
                  {aiKeySource === "workspace"
                    ? "YOUR KEY"
                    : aiKeySource === "platform"
                      ? "PLATFORM"
                      : "NOT SET"}
                </div>
              </div>
              {anthropicReady ? (
                <div className="mt-2 text-[11px] text-on-dark/80">
                  {aiStatus === "checking" ? (
                    <span>Checking connection…</span>
                  ) : aiStatus === "connected" ? (
                    <span className="text-teal">Connected</span>
                  ) : aiStatus === "error" ? (
                    <span className="text-red">
                      Not connected{aiError ? ` — ${aiError}` : ""}
                    </span>
                  ) : null}
                </div>
              ) : (
                <div className="mt-2 text-[11px] text-on-dark/80">
                  Enterprise needs a workspace key; Starter, Free, and Growth may use platform AI when enabled. Open
                  Settings → AI integration.
                </div>
              )}
              <Link
                href="/dashboard/settings"
                onClick={onNavigate}
                className="mt-2 inline-block text-[11px] font-semibold text-primary-light hover:underline"
              >
                Open Settings
              </Link>
            </div>
          </details>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-dvh overflow-hidden bg-page text-text"
      style={{ fontFamily: "var(--font-body)" }}
    >
      {/* Mobile top bar (HubSpot-style dark strip) */}
      <div className="sticky top-0 z-30 flex h-[52px] items-center justify-between border-b border-[var(--sidebar-divider)] bg-sidebar px-4 text-on-dark md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="rounded-sm bg-sidebar-active px-3 py-2 text-sm text-on-dark"
          aria-label="Open menu"
        >
          ☰
        </button>
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-primary to-primary-dark text-[10px] font-bold text-on-dark">
            AI
          </span>
          <span className="font-[var(--font-heading)] text-[13px] font-bold tracking-tight text-on-dark">
            Marketing <span className="text-primary-light">Workbench</span>
          </span>
        </Link>
        <div className="w-[44px]" />
      </div>

      <div className="flex h-[calc(100dvh-52px)] md:h-dvh">
        {/* Desktop sidebar */}
        <div className="hidden w-[220px] shrink-0 border-r border-[var(--sidebar-divider)] bg-sidebar md:block">
          <div className="h-dvh overflow-y-auto">
            <Sidebar />
          </div>
        </div>

        {/* Mobile sidebar overlay */}
        {mobileOpen ? (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="aimw-modal-backdrop absolute inset-0" onClick={() => setMobileOpen(false)} />
            <div className="absolute left-0 top-0 h-full w-[220px] border-r border-[var(--sidebar-divider)] bg-sidebar shadow-dropdown">
              <div className="h-full overflow-y-auto">
                <Sidebar onNavigate={() => setMobileOpen(false)} />
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Desktop top bar */}
          <header className="relative z-20 hidden h-[52px] shrink-0 items-center border-b border-[var(--sidebar-divider)] bg-sidebar px-6 text-on-dark md:flex">
            <div className="mx-auto flex w-full max-w-[1200px] items-center gap-4">
              <span className="text-sm font-medium text-on-dark/90">Workspace</span>
              <div
                className="ml-auto hidden max-w-md flex-1 rounded-sm bg-sidebar-active px-3 py-2 text-sm text-on-dark/50 lg:block"
                aria-hidden
              >
                Search…
              </div>
            </div>
          </header>

          <main className="relative min-h-0 flex-1 overflow-y-auto bg-page">
            <div className="pointer-events-none absolute inset-0 opacity-40 saas-grid" aria-hidden />
            <div className="relative mx-auto max-w-[1200px] px-4 py-6 md:px-6 md:py-6">
              <ModuleFlowBar />
              <ProfileCompletenessBanner />
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

