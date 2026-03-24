"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { usePathname } from "next/navigation";

type Profile = {
  name: string | null;
  company: string | null;
  plan: string | null;
};

type ModuleLink = {
  label: string;
  slug: string;
};

const MODULES: ModuleLink[] = [
  { label: "Command Centre", slug: "" },
  { label: "Market Research", slug: "market-research" },
  { label: "ICP Segmentation", slug: "icp-segmentation" },
  { label: "Positioning Studio", slug: "positioning-studio" },
  { label: "Messaging & Artifacts", slug: "messaging-artifacts" },
  { label: "Campaigns", slug: "campaigns" },
  { label: "GTM Planner", slug: "gtm-planner" },
  { label: "Events", slug: "events" },
  { label: "Content Studio", slug: "content-studio" },
  { label: "Social Media", slug: "social-media" },
  { label: "Design & Assets", slug: "design-assets" },
  { label: "Presentations", slug: "presentations" },
  { label: "Website & Pages", slug: "website-pages" },
  { label: "Analytics", slug: "analytics" },
  { label: "Battlecards", slug: "battlecards" },
  { label: "Sales Intelligence", slug: "sales-intelligence" },
  { label: "Customer Insights", slug: "customer-insights" },
  { label: "AI Copilot", slug: "ai-copilot" }
];

const ANTHROPIC_KEY_STORAGE = "marketing_os_anthropic_api_key";

function PurpleBar() {
  return <div className="absolute left-0 top-0 h-full w-1 bg-[#7c6cff]" />;
}

export function DashboardShell({
  children,
  profile
}: {
  children: React.ReactNode;
  profile: Profile | null;
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

  const keyEntered = anthropicKey.trim().length > 0;

  const links = useMemo(() => {
    return MODULES.map((m) => {
      const href = m.slug ? `/dashboard/${m.slug}` : "/dashboard";
      const active = href === "/dashboard"
        ? pathname === "/dashboard"
        : pathname === href || (pathname?.startsWith(href + "/") ?? false);
      return { ...m, href, active };
    });
  }, [pathname]);

  function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
    return (
      <div className="flex h-full w-[280px] flex-col bg-[#141420] text-[#f0f0f8]">
        <div className="flex items-center justify-between border-b border-[#2a2e3f] px-5 py-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2"
            onClick={onNavigate}
          >
            <div className="h-8 w-8 rounded-xl bg-[#7c6cff]/20 ring-1 ring-[#7c6cff]/40" />
            <div className="leading-tight">
              <div className="text-sm font-semibold">Marketing OS</div>
              <div className="text-xs text-[#9090b0]">Dashboard</div>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="md:hidden rounded-lg px-2 py-1 text-[#9090b0] hover:text-[#f0f0f8]"
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          <div className="mb-3 px-2 text-xs uppercase tracking-wider text-[#9090b0]">
            Modules
          </div>
          <div className="space-y-1">
            {links.map((m) => (
              <Link
                key={m.slug}
                href={m.href}
                onClick={onNavigate}
                className={`relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                  m.active
                    ? "bg-[#1e1e2e] text-[#f0f0f8]"
                    : "text-[#9090b0] hover:bg-white/5 hover:text-[#f0f0f8]"
                }`}
              >
                {m.active ? <PurpleBar /> : null}
                <span className="truncate pl-1">{m.label}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="border-t border-[#2a2e3f] p-4">
          <div className="mb-3">
            <div className="text-sm text-[#f0f0f8]">
              {profile?.name ?? "—"}
            </div>
            <div className="text-xs text-[#9090b0]">
              {profile?.company ?? "—"} • {profile?.plan ?? "free"}
            </div>
          </div>

          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs text-[#9090b0]">Anthropic API key</div>
            <div
              className={`h-2 w-2 rounded-full ${
                keyEntered ? "bg-[#b8ff6c]" : "bg-white/20"
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
            className="w-full rounded-xl border border-[#2a2e3f] bg-black/20 px-3 py-2 text-sm text-[#f0f0f8] placeholder:text-[#9090b0] focus:border-[#7c6cff] focus:outline-none focus:ring-2 focus:ring-[#7c6cff]/30"
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#08080c] text-[#f0f0f8]"
      style={{ fontFamily: "var(--font-body)" }}
    >
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-[#2a2e3f] bg-[#08080c]/80 px-4 py-3 backdrop-blur md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="rounded-lg border border-[#2a2e3f] bg-[#141420] px-3 py-2 text-sm text-[#f0f0f8]"
          aria-label="Open menu"
        >
          ☰
        </button>
        <div className="text-sm font-semibold">Marketing OS</div>
        <div className="w-[44px]" />
      </div>

      <div className="flex">
        {/* Desktop sidebar */}
        <div className="hidden h-screen w-[280px] border-r border-[#2a2e3f] md:block">
          <Sidebar />
        </div>

        {/* Mobile sidebar overlay */}
        {mobileOpen ? (
          <div className="fixed inset-0 z-40 md:hidden">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setMobileOpen(false)}
            />
            <div className="absolute left-0 top-0 h-full border-r border-[#2a2e3f] shadow-2xl">
              <Sidebar onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        ) : null}

        <main className="min-h-[calc(100vh-56px)] flex-1 px-4 py-6 md:min-h-screen md:px-8 md:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}

