"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { TenantSwitcher, type CompanyOption, type ProductOption } from "@/app/dashboard/TenantSwitcher";
import { ModuleFlowBar } from "@/app/dashboard/_components/ModuleFlowBar";

type Profile = {
  name: string | null;
  company: string | null;
  plan: string | null;
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
      { label: "All work", slug: "work", icon: "🗂️" },
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
      { label: "Sales Intelligence", slug: "sales-intelligence", icon: "🎤" },
      { label: "Customer Insights", slug: "customer-insights", icon: "💬" }
    ]
  },
  {
    label: "AI",
    items: [{ label: "AI Copilot", slug: "copilot", icon: "🤖" }]
  }
];

const ANTHROPIC_KEY_STORAGE = "marketing_os_anthropic_api_key";

function PurpleBar() {
  return <div className="absolute left-0 top-0 h-full w-[3px] bg-accent2" />;
}

export function DashboardShell({
  children,
  profile,
  companies,
  products,
  selectedCompanyId,
  selectedProductId
}: {
  children: React.ReactNode;
  profile: Profile | null;
  companies: CompanyOption[];
  products: ProductOption[];
  selectedCompanyId: string | null;
  selectedProductId: string | null;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const [anthropicKey, setAnthropicKey] = useState("");
  useEffect(() => {
    const v =
      typeof window !== "undefined"
        ? window.localStorage.getItem(ANTHROPIC_KEY_STORAGE)
        : null;
    if (v) setAnthropicKey(v);
  }, []);

  const keyEntered = anthropicKey.trim().startsWith("sk-ant-");
  const [aiStatus, setAiStatus] = useState<
    "idle" | "checking" | "connected" | "error"
  >("idle");
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function ping() {
      if (!keyEntered) {
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
            "content-type": "application/json",
            "x-anthropic-key": anthropicKey.trim()
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
  }, [keyEntered, anthropicKey]);

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
      <div className="flex h-full w-[220px] flex-col bg-surface text-text">
        <div className="border-b border-border px-[18px] py-[16px]">
          <Link
            href="/dashboard"
            className="font-[var(--font-heading)] text-[16px] font-extrabold tracking-[-0.5px]"
            onClick={onNavigate}
          >
            Marketing <span className="text-accent2">OS</span>
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

        <div className="flex-1 overflow-y-auto py-1">
          {NAV.map((section) => (
            <div key={section.label}>
              <SectionLabel>{section.label}</SectionLabel>
              <div className="space-y-1">
                {section.items.map((m) => {
                  const href = m.slug ? `/dashboard/${m.slug}` : "/dashboard";
                  const active = activeMap.get(href) ?? false;
                  return (
                    <Link
                      key={m.slug || "home"}
                      href={href}
                      onClick={onNavigate}
                      className={`relative flex items-center gap-2 px-[18px] py-2 text-[13px] font-medium transition ${
                        active
                          ? "bg-surface2 text-accent2"
                          : "text-text2 hover:bg-surface2 hover:text-text"
                      }`}
                    >
                      {active ? <PurpleBar /> : null}
                      <span className="w-[18px] text-center text-[15px]">
                        {m.icon ?? "•"}
                      </span>
                      <span className="truncate">{m.label}</span>
                      {m.badge ? <NavBadge>{m.badge}</NavBadge> : null}
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
          <div className="mb-3">
            <div className="text-sm text-text">{profile?.name ?? "—"}</div>
            <div className="text-xs text-text2">
              {profile?.company ?? "—"} • {profile?.plan ?? "free"}
            </div>
          </div>

          <div className="mb-2 flex items-center justify-between">
            <div className="text-[10px] font-semibold uppercase tracking-[0.5px] text-text3">
              Anthropic API Key
            </div>
            <div
              className={`h-2 w-2 rounded-full ${
                keyEntered ? "bg-green" : "bg-white/20"
              }`}
              aria-label={keyEntered ? "Key saved" : "No key saved"}
            />
          </div>
          <input
            value={anthropicKey}
            onChange={(e) => {
              const v = e.target.value;
              setAnthropicKey(v);
              window.localStorage.setItem(ANTHROPIC_KEY_STORAGE, v);
            }}
            placeholder="sk-ant-..."
            className="w-full rounded-[6px] border border-border bg-surface2 px-2 py-1.5 text-[11px] text-text placeholder:text-text3 focus:border-accent focus:outline-none"
            style={{ fontFamily: "var(--font-mono)" }}
          />
          {keyEntered ? (
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
              Paste your key to enable Live AI.
            </div>
          )}
          <div
            className={`mt-2 rounded-[4px] px-2 py-1 text-center text-[10px] font-semibold ${
              keyEntered
                ? "bg-[rgba(52,211,153,0.15)] text-green"
                : "bg-[rgba(251,191,36,0.15)] text-yellow"
            }`}
          >
            ● {keyEntered ? "LIVE AI MODE" : "DEMO MODE"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-bg text-text"
      style={{ fontFamily: "var(--font-body)" }}
    >
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-bg/80 px-4 py-3 backdrop-blur md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
          aria-label="Open menu"
        >
          ☰
        </button>
        <div
          className="font-[var(--font-heading)] text-sm font-extrabold tracking-[-0.5px]"
        >
          Marketing <span className="text-accent2">OS</span>
        </div>
        <div className="w-[44px]" />
      </div>

      <div className="flex">
        {/* Desktop sidebar */}
        <div className="hidden h-screen w-[220px] border-r border-border md:block">
          <Sidebar />
        </div>

        {/* Mobile sidebar overlay */}
        {mobileOpen ? (
          <div className="fixed inset-0 z-40 md:hidden">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setMobileOpen(false)}
            />
            <div className="absolute left-0 top-0 h-full border-r border-border shadow-2xl">
              <Sidebar onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        ) : null}

        <main className="min-h-[calc(100vh-56px)] flex-1 px-4 py-6 md:min-h-screen md:px-8 md:py-10">
          <ModuleFlowBar />
          {children}
        </main>
      </div>
    </div>
  );
}

