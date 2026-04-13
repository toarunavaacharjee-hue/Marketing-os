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

function PurpleBar() {
  return <div className="absolute left-0 top-0 h-full w-[3px] bg-accent2" />;
}

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
      <div className="px-[18px] pb-1 pt-4 text-[10px] font-semibold uppercase tracking-[1.5px] text-text3">
        {children}
      </div>
    );
  }

  function NavBadge({ children }: { children: string }) {
    return (
      <span className="ml-auto rounded bg-accent px-1.5 py-0.5 text-[9px] font-bold tracking-[0.5px] text-white">
        {children}
      </span>
    );
  }

  function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
    return (
      <div className="flex h-full w-[228px] min-h-0 flex-col bg-transparent text-text">
        <div className="border-b border-white/[0.06] px-[18px] py-[16px]">
          <Link href="/dashboard" className="flex items-center gap-2.5" onClick={onNavigate}>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#7c6cff] to-[#5a4fd4] text-[11px] font-bold text-white shadow-lg shadow-[#7c6cff]/20 ring-1 ring-white/10">
              AI
            </span>
            <span className="font-[var(--font-heading)] text-[15px] font-extrabold leading-tight tracking-tight">
              Marketing <span className="text-accent2">Workbench</span>
            </span>
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="md:hidden absolute right-3 top-3 rounded-lg px-2 py-1 text-text2 hover:text-text"
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <div className="border-b border-border">
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
              <div className="space-y-1">
                {section.items.map((m) => {
                  const href = m.slug ? `/dashboard/${m.slug}` : "/dashboard";
                  const active = activeMap.get(href) ?? false;
                  const allowed = isSlugAllowed(ent, m.slug);
                  return (
                    <Link
                      key={m.slug || "home"}
                      href={allowed ? href : `/dashboard/upgrade?next=${encodeURIComponent(href)}`}
                      onClick={onNavigate}
                      className={`relative flex items-center gap-2 px-[18px] py-2 text-[13px] font-medium transition ${
                        active
                          ? "bg-surface2 text-accent2"
                          : allowed
                            ? "text-text2 hover:bg-surface2 hover:text-text"
                            : "text-[#5c6278] hover:bg-surface2"
                      }`}
                    >
                      {active ? <PurpleBar /> : null}
                      <span className="w-[18px] text-center text-[15px]">
                        {m.icon ?? "•"}
                      </span>
                      <span className="truncate">{m.label}</span>
                      {!allowed ? <NavBadge>UPGRADE</NavBadge> : m.badge ? <NavBadge>{m.badge}</NavBadge> : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border p-3">
          <Link
            href="/dashboard/settings"
            onClick={onNavigate}
            className={`relative flex items-center gap-2 rounded-none px-3 py-2 text-[13px] font-medium transition ${
              pathname === "/dashboard/settings"
                ? "bg-surface2 text-accent2"
                : "text-text2 hover:bg-surface2 hover:text-text"
            }`}
          >
            {pathname === "/dashboard/settings" ? <PurpleBar /> : null}
            <span className="w-[18px] text-center text-[15px]">⚙️</span>
            <span className="pl-1">Settings</span>
          </Link>
        </div>

        <div className="border-t border-border p-[14px]">
          <div className="mb-2">
            <div className="text-sm text-text">{profile?.name ?? "—"}</div>
            <div className="text-xs text-text2">
              {profile?.company ?? "—"} • {companyPlan ?? "starter"}
            </div>
          </div>

          <details className="group rounded-xl border border-border bg-surface2 px-3 py-2">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[11px] font-semibold text-text2 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${anthropicReady ? "bg-green" : "bg-white/20"}`}
                  aria-hidden
                />
                Workspace AI
              </span>
              <span className="text-text3 transition group-open:rotate-90">›</span>
            </summary>

            <div className="mt-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[10px] font-semibold uppercase tracking-[0.5px] text-text3">
                  Anthropic (this workspace)
                </div>
                <div
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    anthropicReady
                      ? "bg-[rgba(52,211,153,0.15)] text-green"
                      : "bg-[rgba(251,191,36,0.15)] text-yellow"
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
                <div className="mt-2 text-[11px] text-text2">
                  {aiStatus === "checking" ? (
                    <span>Checking connection…</span>
                  ) : aiStatus === "connected" ? (
                    <span className="text-green">Connected</span>
                  ) : aiStatus === "error" ? (
                    <span className="text-red">
                      Not connected{aiError ? ` — ${aiError}` : ""}
                    </span>
                  ) : null}
                </div>
              ) : (
                <div className="mt-2 text-[11px] text-text2">
                  Enterprise needs a workspace key; Starter, Free, and Growth may use platform AI when enabled. Open
                  Settings → AI integration.
                </div>
              )}
              <Link
                href="/dashboard/settings"
                onClick={onNavigate}
                className="mt-2 inline-block text-[11px] font-semibold text-accent2 hover:underline"
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
      className="h-dvh bg-bg text-text overflow-hidden"
      style={{ fontFamily: "var(--font-body)" }}
    >
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-white/[0.06] bg-bg/90 px-4 py-3 backdrop-blur-xl md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="rounded-lg border border-white/[0.08] bg-surface px-3 py-2 text-sm text-text shadow-sm"
          aria-label="Open menu"
        >
          ☰
        </button>
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-[#7c6cff] to-[#5a4fd4] text-[10px] font-bold text-white shadow-md shadow-[#7c6cff]/20 ring-1 ring-white/10">
            AI
          </span>
          <span className="font-[var(--font-heading)] text-[13px] font-bold tracking-tight text-text">
            Marketing <span className="text-accent2">Workbench</span>
          </span>
        </Link>
        <div className="w-[44px]" />
      </div>

      <div className="flex h-[calc(100dvh-56px)] md:h-dvh">
        {/* Desktop sidebar */}
        <div className="hidden w-[228px] shrink-0 border-r border-border bg-[linear-gradient(180deg,var(--surface)_0%,var(--surface2)_100%)] shadow-[4px_0_24px_rgba(2,6,23,0.10)] md:block">
          <div className="h-dvh overflow-y-auto">
            <Sidebar />
          </div>
        </div>

        {/* Mobile sidebar overlay */}
        {mobileOpen ? (
          <div className="fixed inset-0 z-40 md:hidden">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setMobileOpen(false)}
            />
            <div className="absolute left-0 top-0 h-full w-[228px] border-r border-border bg-[linear-gradient(180deg,var(--surface)_0%,var(--surface2)_100%)] shadow-2xl">
              <div className="h-full overflow-y-auto">
                <Sidebar onNavigate={() => setMobileOpen(false)} />
              </div>
            </div>
          </div>
        ) : null}

        <main className="relative min-w-0 flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-10">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.4] md:opacity-50"
            aria-hidden
            style={{
              backgroundImage: `linear-gradient(rgba(124, 108, 255, 0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(124, 108, 255, 0.03) 1px, transparent 1px)`,
              backgroundSize: "48px 48px",
              maskImage: "linear-gradient(to bottom, black 0%, transparent 70%)"
            }}
          />
          <div className="relative">
            <ModuleFlowBar />
            <ProfileCompletenessBanner />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

