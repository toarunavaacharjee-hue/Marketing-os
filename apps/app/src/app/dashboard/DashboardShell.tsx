"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { TenantSwitcher, type CompanyOption, type ProductOption } from "@/app/dashboard/TenantSwitcher";
import { DashboardTopBar } from "@/app/dashboard/_components/DashboardTopBar";
import { ModuleFlowBar } from "@/app/dashboard/_components/ModuleFlowBar";
import { ProfileCompletenessBanner } from "@/app/dashboard/_components/ProfileCompletenessBanner";
import { NextStepNudge } from "@/app/dashboard/_components/NextStepNudge";
import { ToastProvider } from "@/app/dashboard/_components/Toast";
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
    items: [
      { label: "Command Centre", slug: "", icon: "⚡" },
      { label: "Help & documentation", slug: "help", icon: "📖" }
    ]
  },
  {
    label: "Strategy",
    items: [
      { label: "Market Research", slug: "market-research", icon: "🔭", badge: "NEW" },
      { label: "ICP Segmentation", slug: "icp-segmentation", icon: "🎯", badge: "NEW" },
      { label: "Positioning Studio", slug: "positioning-studio", icon: "💎", badge: "NEW" },
      { label: "Messaging Pillars", slug: "messaging-artifacts", icon: "✨", badge: "NEW" },
      { label: "Artifact Library", slug: "artifacts", icon: "📚", badge: "NEW" }
    ]
  },
  {
    label: "Planning",
    items: [
      { label: "Marketing Workbench", slug: "work", icon: "🗂️" },
      { label: "Launch Playbook", slug: "launch-playbook", icon: "🧩", badge: "NEW" },
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

  // Floating AI Copilot panel
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotMessages, setCopilotMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [copilotInput, setCopilotInput] = useState("");
  const [copilotLoading, setCopilotLoading] = useState(false);
  const copilotMessagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (copilotOpen) {
      copilotMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [copilotMessages, copilotOpen]);

  async function sendCopilotMessage() {
    const text = copilotInput.trim();
    if (!text || copilotLoading) return;
    setCopilotInput("");
    setCopilotMessages((prev) => [...prev, { role: "user", text }]);
    setCopilotLoading(true);
    try {
      const res = await fetch("/api/ai/module-generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt: text,
          system:
            "You are a B2B product marketing assistant embedded in AI Marketing Workbench. Help the user with positioning, messaging, campaigns, and GTM strategy. Be concise and practical.",
          length: "medium"
        })
      });
      const data = (await res.json()) as { text?: string; error?: string };
      const reply = data.text ?? data.error ?? "Sorry, something went wrong.";
      setCopilotMessages((prev) => [...prev, { role: "assistant", text: reply }]);
    } catch {
      setCopilotMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Connection error. Please try again." }
      ]);
    } finally {
      setCopilotLoading(false);
    }
  }

  // Ensure the server-side selected context is persisted into tenant cookies.
  // Without this, deep links like /dashboard/settings/* can redirect to onboarding when cookies are missing.
  useEffect(() => {
    const companyId = selectedCompanyId ?? "";
    const productId = selectedProductId ?? "";
    if (!companyId || !productId) return;

    let cancelled = false;
    (async () => {
      try {
        await fetch("/api/context/select", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ companyId, productId })
        });
      } catch {
        // Ignore — worst case, some pages will redirect to onboarding until user selects context.
      } finally {
        if (cancelled) return;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedCompanyId, selectedProductId]);

  const SIDEBAR_SECTIONS_KEY = "aimw-sidebar-sections";
  const [sectionOpen, setSectionOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SIDEBAR_SECTIONS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== "object") return;
      setSectionOpen(parsed as Record<string, boolean>);
    } catch {
      // ignore
    }
  }, []);

  function persistSections(next: Record<string, boolean>) {
    setSectionOpen(next);
    try {
      localStorage.setItem(SIDEBAR_SECTIONS_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

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

  const activeSectionLabel = useMemo(() => {
    const flat = NAV.flatMap((s) => s.items.map((i) => ({ section: s.label, item: i })));
    for (const { section, item } of flat) {
      const href = item.slug ? `/dashboard/${item.slug}` : "/dashboard";
      const active =
        href === "/dashboard"
          ? pathname === "/dashboard"
          : pathname === href || (pathname?.startsWith(href + "/") ?? false);
      if (active) return section;
    }
    return "Home";
  }, [pathname]);

  const SECTION_COLORS: Record<string, string> = {
    Home:         "#94A3B8",
    Strategy:     "#7C4DFF",
    Planning:     "#0EA5E9",
    Creation:     "#F59E0B",
    Intelligence: "#10B981",
  };

  function initials(name: string | null) {
    if (!name) return "?";
    return name.split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  }

  function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
    return (
      <div className="flex h-full w-[232px] min-h-0 flex-col bg-[#F5F6F8]">

        {/* Logo */}
        <div className="relative flex items-center justify-between border-b border-slate-200 px-4 py-3.5">
          <Link href="/dashboard" className="flex items-center gap-2.5" onClick={onNavigate}>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-dark text-[10px] font-extrabold text-white shadow-sm">
              AI
            </span>
            <span className="text-[13.5px] font-bold tracking-tight text-slate-800">
              Marketing <span className="text-primary">Workbench</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 md:hidden"
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        {/* Workspace + Product switcher */}
        <div className="border-b border-slate-200">
          <TenantSwitcher
            companies={companies}
            products={products}
            selectedCompanyId={selectedCompanyId}
            selectedProductId={selectedProductId}
            theme="light"
          />
        </div>

        {/* Nav */}
        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {NAV.map((section) => {
            const color = SECTION_COLORS[section.label] ?? "#94A3B8";
            const open =
              sectionOpen[section.label] ??
              (section.label === "Home" || activeSectionLabel === section.label);

            return (
              <div key={section.label} className="mb-1">
                <button
                  type="button"
                  onClick={() => persistSections({ ...sectionOpen, [section.label]: !open })}
                  aria-expanded={open}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition hover:bg-slate-200/60"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
                  <span className="flex-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {section.label}
                  </span>
                  <span className="text-[10px] text-slate-300" aria-hidden>
                    {open ? "−" : "+"}
                  </span>
                </button>

                {open && (
                  <div className="mt-0.5 space-y-0.5 pb-1">
                    {section.items.map((m) => {
                      const href = m.slug ? `/dashboard/${m.slug}` : "/dashboard";
                      const active = activeMap.get(href) ?? false;
                      const allowed = isSlugAllowed(ent, m.slug);

                      return (
                        <Link
                          key={m.slug || "home"}
                          href={allowed ? href : `/dashboard/upgrade?next=${encodeURIComponent(href)}`}
                          onClick={onNavigate}
                          className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] transition-all duration-150 ${
                            active
                              ? "bg-white font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200"
                              : allowed
                                ? "text-slate-600 hover:bg-white/70 hover:text-slate-900"
                                : "text-slate-400 hover:bg-white/50"
                          }`}
                          style={active ? { borderLeft: `2.5px solid ${color}`, paddingLeft: "8px" } : {}}
                        >
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[12px]">
                            {m.icon ?? "·"}
                          </span>
                          <span className="min-w-0 flex-1 truncate">{m.label}</span>
                          {!allowed ? (
                            <span className="ml-auto shrink-0 rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-400">
                              Pro
                            </span>
                          ) : m.badge ? (
                            <span className="ml-auto shrink-0 rounded border border-primary/20 bg-primary/8 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
                              {m.badge}
                            </span>
                          ) : null}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* User footer */}
        <div className="border-t border-slate-200 px-3 py-3 space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
              {initials(profile?.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] font-semibold text-slate-800">{profile?.name ?? "—"}</div>
              <div className="truncate text-[10px] text-slate-400">{companyPlan ?? "starter"}</div>
            </div>
            <div className="flex items-center gap-1 shrink-0" title={anthropicReady ? "AI connected" : "AI not configured"}>
              <span className={`h-1.5 w-1.5 rounded-full ${anthropicReady ? "bg-emerald-400" : "bg-slate-300"}`} />
              <span className="text-[10px] text-slate-400">AI</span>
            </div>
          </div>

          <Link
            href="/dashboard/settings"
            onClick={onNavigate}
            className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
          >
            <span>Settings &amp; AI integration</span>
            <span className="text-slate-300">→</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
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
        <div className="hidden w-[232px] shrink-0 border-r border-slate-200 md:block">
          <div className="h-dvh overflow-y-auto">
            <Sidebar />
          </div>
        </div>

        {/* Mobile sidebar overlay */}
        {mobileOpen ? (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="aimw-modal-backdrop absolute inset-0" onClick={() => setMobileOpen(false)} />
            <div className="absolute left-0 top-0 h-full w-[232px] border-r border-slate-200 shadow-dropdown">
              <div className="h-full overflow-y-auto">
                <Sidebar onNavigate={() => setMobileOpen(false)} />
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <DashboardTopBar
            profile={profile}
            companies={companies}
            products={products}
            selectedCompanyId={selectedCompanyId}
            selectedProductId={selectedProductId}
            companyPlan={companyPlan ?? "starter"}
          />

          <main className="relative min-h-0 flex-1 overflow-y-auto bg-page">
            <div className="pointer-events-none absolute inset-0 opacity-40 saas-grid" aria-hidden />
            <div className="relative mx-auto max-w-[1200px] px-4 py-6 md:px-6 md:py-8">
              <ModuleFlowBar />
              <ProfileCompletenessBanner />
              {children}
              <NextStepNudge />
            </div>
          </main>
        </div>
      </div>

      {/* Floating AI Copilot button */}
      <button
        type="button"
        onClick={() => setCopilotOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-105 hover:bg-primary-dark"
        title="AI Copilot"
        aria-label="Toggle AI Copilot"
      >
        <span className="text-base font-bold leading-none">AI</span>
      </button>

      {/* Slide-in Copilot panel */}
      {copilotOpen ? (
        <div className="fixed bottom-0 right-0 z-50 flex h-[520px] w-[340px] flex-col rounded-tl-2xl border border-border bg-surface shadow-2xl">
          {/* Panel header */}
          <div className="flex items-center justify-between border-b border-border bg-sidebar px-4 py-3 rounded-tl-2xl">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-[10px] font-bold text-white">
                AI
              </span>
              <span className="text-sm font-semibold text-on-dark">AI Copilot</span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/copilot"
                className="text-[11px] text-primary-light hover:underline"
                onClick={() => setCopilotOpen(false)}
              >
                Full view
              </Link>
              <button
                type="button"
                onClick={() => setCopilotOpen(false)}
                className="rounded-sm px-1 py-0.5 text-sm text-on-dark/70 hover:text-on-dark"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {copilotMessages.length === 0 ? (
              <div className="pt-4 text-center text-xs text-text2">
                <div className="text-2xl mb-2">✨</div>
                Ask anything about positioning, messaging, campaigns, or GTM strategy.
              </div>
            ) : (
              copilotMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-white"
                        : "border border-border bg-surface2 text-heading"
                    }`}
                  >
                    <pre className="whitespace-pre-wrap font-[inherit]">{msg.text}</pre>
                  </div>
                </div>
              ))
            )}
            {copilotLoading ? (
              <div className="flex justify-start">
                <div className="rounded-xl border border-border bg-surface2 px-3 py-2 text-xs text-text2">
                  Thinking…
                </div>
              </div>
            ) : null}
            <div ref={copilotMessagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border p-3">
            <div className="flex gap-2">
              <input
                value={copilotInput}
                onChange={(e) => setCopilotInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendCopilotMessage();
                  }
                }}
                placeholder="Ask AI Copilot…"
                disabled={copilotLoading}
                className="min-w-0 flex-1 rounded-xl border border-border bg-surface2 px-3 py-2 text-xs text-heading placeholder:text-text3 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => void sendCopilotMessage()}
                disabled={copilotLoading || !copilotInput.trim()}
                className="shrink-0 rounded-xl bg-primary px-3 py-2 text-xs font-medium text-white disabled:opacity-40"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
    </ToastProvider>
  );
}

