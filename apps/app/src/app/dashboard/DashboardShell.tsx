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
import { useTrackPageView } from "@/hooks/useTrackPageView";

// ── Nav icon SVG paths (24 × 24 outline, stroke-width 1.5) ──────────────────
const ICON_PATHS: Record<string, string> = {
  squares:     "M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z",
  bolt:        "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z",
  book:        "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25",
  search:      "M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z",
  users:       "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z",
  sparkles:    "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z",
  chat:        "M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z",
  folder:      "M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z",
  puzzle:      "M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z",
  clipboard:   "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
  rocket:      "M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z",
  calendar:    "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5m-9-6h.008v.008H12V12.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM12 15h.008v.008H12V15zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM9.75 15h.008v.008H9.75V15zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z",
  pencil:      "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10",
  share:       "M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z",
  palette:     "M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z",
  slides:      "M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605",
  globe:       "M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5a17.919 17.919 0 01-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418",
  chart:       "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z",
  shield:      "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z",
  map:         "M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z",
  micro:       "M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6",
  heart:       "M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z",
  cpu:         "M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z",
};

function NavIcon({ name, className }: { name?: string; className?: string }) {
  const d = ICON_PATHS[name ?? "squares"] ?? ICON_PATHS.squares;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-[17px] w-[17px] shrink-0"}
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}

// ── Nav structure ─────────────────────────────────────────────────────────────

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
      { label: "Marketing Workbench", slug: "",               icon: "squares"   },
      { label: "Overview",            slug: "overview",       icon: "bolt"      },
      { label: "Help & docs",         slug: "help",           icon: "book"      },
    ]
  },
  {
    label: "Strategy",
    items: [
      { label: "Market Research",   slug: "market-research",    icon: "search",   badge: "NEW" },
      { label: "ICP Segmentation",  slug: "icp-segmentation",   icon: "users",    badge: "NEW" },
      { label: "Positioning Studio",slug: "positioning-studio",  icon: "sparkles", badge: "NEW" },
      { label: "Messaging Pillars", slug: "messaging-artifacts", icon: "chat",     badge: "NEW" },
      { label: "Artifact Library",  slug: "artifacts",           icon: "folder",   badge: "NEW" },
    ]
  },
  {
    label: "Planning",
    items: [
      { label: "Launch Playbook", slug: "launch-playbook", icon: "puzzle",    badge: "NEW" },
      { label: "Campaigns",       slug: "campaigns",       icon: "clipboard"                },
      { label: "GTM Planner",     slug: "gtm-planner",     icon: "rocket"                   },
      { label: "Events",          slug: "events",          icon: "calendar"                 },
    ]
  },
  {
    label: "Creation",
    items: [
      { label: "Content Studio",  slug: "content-studio", icon: "pencil"  },
      { label: "Social Media",    slug: "social-media",   icon: "share"   },
      { label: "Design & Assets", slug: "design-assets",  icon: "palette" },
      { label: "Presentations",   slug: "presentations",  icon: "slides"  },
      { label: "Website & Pages", slug: "website-pages",  icon: "globe"   },
    ]
  },
  {
    label: "Intelligence",
    items: [
      { label: "Analytics",          slug: "analytics",          icon: "chart"  },
      { label: "Battlecards",        slug: "battlecards",        icon: "shield" },
      { label: "Prospect Research",  slug: "prospect-research",  icon: "map",   badge: "NEW" },
      { label: "Sales Intelligence", slug: "sales-intelligence", icon: "micro"  },
      { label: "Customer Insights",  slug: "customer-insights",  icon: "heart"  },
    ]
  },
];

// ── Shell props ───────────────────────────────────────────────────────────────

type Profile = { name: string | null; company: string | null };

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
  useTrackPageView();
  const [mobileOpen, setMobileOpen] = useState(false);
  const ent = useMemo(() => getEntitlements(companyPlan ?? "starter"), [companyPlan]);

  // ── Floating AI Copilot ──
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotMessages, setCopilotMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [copilotInput, setCopilotInput] = useState("");
  const [copilotLoading, setCopilotLoading] = useState(false);
  const copilotEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (copilotOpen) copilotEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
          system: "You are a B2B product marketing assistant embedded in AI Marketing Workbench. Help the user with positioning, messaging, campaigns, and GTM strategy. Be concise and practical.",
          length: "medium"
        })
      });
      const data = (await res.json()) as { text?: string; error?: string };
      setCopilotMessages((prev) => [...prev, { role: "assistant", text: data.text ?? data.error ?? "Sorry, something went wrong." }]);
    } catch {
      setCopilotMessages((prev) => [...prev, { role: "assistant", text: "Connection error. Please try again." }]);
    } finally {
      setCopilotLoading(false);
    }
  }

  // ── Cookie sync ──
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
      } catch { /* ignore */ } finally {
        if (cancelled) return;
      }
    })();
    return () => { cancelled = true; };
  }, [selectedCompanyId, selectedProductId]);

  // ── Sidebar section collapse ──
  const SIDEBAR_SECTIONS_KEY = "aimw-sidebar-sections";
  const [sectionOpen, setSectionOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SIDEBAR_SECTIONS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== "object") return;
      setSectionOpen(parsed as Record<string, boolean>);
    } catch { /* ignore */ }
  }, []);

  function persistSections(next: Record<string, boolean>) {
    setSectionOpen(next);
    try { localStorage.setItem(SIDEBAR_SECTIONS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }

  // ── AI key status ──
  const [anthropicReady, setAnthropicReady] = useState(false);
  const [aiKeySource, setAiKeySource] = useState<"workspace" | "platform" | "none">("none");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/settings/workspace-ai-key");
        const data = (await res.json()) as { anthropic_ready?: boolean; key_source?: "workspace" | "platform" | "none" };
        if (!cancelled) {
          setAnthropicReady(Boolean(data.anthropic_ready));
          setAiKeySource(data.key_source ?? "none");
        }
      } catch {
        if (!cancelled) { setAnthropicReady(false); setAiKeySource("none"); }
      }
    })();
    return () => { cancelled = true; };
  }, [selectedCompanyId]);

  const [aiStatus, setAiStatus] = useState<"idle" | "checking" | "connected" | "error">("idle");
  const [aiError, setAiError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function ping() {
      if (!anthropicReady) { setAiStatus("idle"); setAiError(null); return; }
      setAiStatus("checking"); setAiError(null);
      try {
        const res = await fetch("/api/ai/ping", { method: "POST", headers: { "content-type": "application/json" } });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (cancelled) return;
        if (!res.ok || !data.ok) { setAiStatus("error"); setAiError(data.error ?? "Could not connect."); return; }
        setAiStatus("connected");
      } catch (e) {
        if (cancelled) return;
        setAiStatus("error"); setAiError(e instanceof Error ? e.message : "Could not connect.");
      }
    }
    const t = window.setTimeout(ping, 600);
    return () => { cancelled = true; window.clearTimeout(t); };
  }, [anthropicReady]);

  // ── Active nav state ──
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
    for (const section of NAV) {
      for (const item of section.items) {
        const href = item.slug ? `/dashboard/${item.slug}` : "/dashboard";
        const active =
          href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname === href || (pathname?.startsWith(href + "/") ?? false);
        if (active) return section.label;
      }
    }
    return "Home";
  }, [pathname]);

  // ── Sidebar component ──
  function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
    return (
      <div className="flex h-full w-[240px] flex-col bg-sidebar text-on-dark">

        {/* Logo */}
        <div className="flex items-center gap-3 border-b border-[var(--sidebar-divider)] px-5 py-[14px]">
          <Link href="/dashboard" className="flex items-center gap-2.5" onClick={onNavigate}>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-dark text-[10px] font-bold text-white shadow-sm">
              AI
            </span>
            <span className="text-[14px] font-bold leading-tight tracking-tight text-white">
              Marketing <span className="text-primary-light">OS</span>
            </span>
          </Link>
          {mobileOpen && (
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="ml-auto rounded px-1.5 py-1 text-sm text-on-dark/60 hover:bg-sidebar-active hover:text-on-dark md:hidden"
              aria-label="Close menu"
            >
              ✕
            </button>
          )}
        </div>

        {/* Workspace / Product switcher */}
        <div className="border-b border-[var(--sidebar-divider)]">
          <TenantSwitcher
            companies={companies}
            products={products}
            selectedCompanyId={selectedCompanyId}
            selectedProductId={selectedProductId}
          />
        </div>

        {/* Nav */}
        <div className="min-h-0 flex-1 overflow-y-auto py-2">
          {NAV.map((section) => {
            const open = sectionOpen[section.label] ?? (section.label === "Home" || activeSectionLabel === section.label);
            return (
              <div key={section.label} className="mb-1">
                <button
                  type="button"
                  onClick={() => persistSections({ ...sectionOpen, [section.label]: !open })}
                  aria-expanded={open}
                  className="group flex w-full items-center gap-1.5 px-4 pb-1 pt-3 text-left"
                >
                  <span className="min-w-0 flex-1 text-[10px] font-semibold uppercase tracking-[0.7px] text-[rgba(255,255,255,0.38)] transition-colors group-hover:text-[rgba(255,255,255,0.6)]">
                    {section.label}
                  </span>
                  <span
                    className={`shrink-0 text-[10px] text-[rgba(255,255,255,0.3)] transition-transform duration-200 ${open ? "rotate-90" : ""}`}
                    aria-hidden
                  >
                    ›
                  </span>
                </button>

                {open && (
                  <div className="mt-0.5 space-y-0.5 px-2">
                    {section.items.map((m) => {
                      const href = m.slug ? `/dashboard/${m.slug}` : "/dashboard";
                      const active = activeMap.get(href) ?? false;
                      const allowed = isSlugAllowed(ent, m.slug);
                      return (
                        <Link
                          key={m.slug || "home"}
                          href={allowed ? href : `/dashboard/upgrade?next=${encodeURIComponent(href)}`}
                          onClick={onNavigate}
                          className={`group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors duration-150 ${
                            active
                              ? "bg-white/12 text-white"
                              : allowed
                                ? "text-[rgba(255,255,255,0.72)] hover:bg-white/8 hover:text-white"
                                : "text-[rgba(255,255,255,0.38)] hover:bg-white/8 hover:text-[rgba(255,255,255,0.6)]"
                          }`}
                        >
                          <NavIcon
                            name={m.icon}
                            className={`h-[16px] w-[16px] shrink-0 transition-opacity ${active ? "opacity-100" : "opacity-60 group-hover:opacity-90"}`}
                          />
                          <span className="min-w-0 flex-1 truncate">{m.label}</span>
                          {!allowed ? (
                            <span className="ml-auto shrink-0 rounded border border-primary/25 bg-primary/15 px-1.5 py-0.5 text-[8px] font-bold tracking-wider text-primary-light">
                              UPGRADE
                            </span>
                          ) : m.badge ? (
                            <span className="ml-auto shrink-0 rounded border border-primary/25 bg-primary/15 px-1.5 py-0.5 text-[8px] font-bold tracking-wider text-primary-light">
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

        {/* Bottom: Profile + AI status */}
        <div className="border-t border-[var(--sidebar-divider)] px-4 py-3 space-y-2">
          {/* User row */}
          <Link
            href="/dashboard/settings/profile"
            onClick={onNavigate}
            className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-white/8"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/60 text-[10px] font-bold text-white">
              {(profile?.name ?? "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] font-semibold text-white">{profile?.name ?? "—"}</div>
              <div className="truncate text-[10px] text-[rgba(255,255,255,0.45)]">
                {companyPlan ? companyPlan.charAt(0).toUpperCase() + companyPlan.slice(1) : "Starter"} plan
              </div>
            </div>
            <Link
              href="/dashboard/settings"
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 rounded p-1 text-on-dark/40 transition-colors hover:bg-white/12 hover:text-on-dark"
              title="Settings"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28zM15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
          </Link>

          {/* AI status pill */}
          <div className="flex items-center justify-between rounded-lg border border-white/8 bg-white/5 px-3 py-2">
            <div className="flex items-center gap-2 text-[11px]">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  aiStatus === "connected" ? "bg-teal" : anthropicReady ? "bg-amber" : "bg-on-dark/25"
                }`}
                aria-hidden
              />
              <span className="text-[rgba(255,255,255,0.55)]">
                {aiStatus === "connected"
                  ? "AI connected"
                  : aiStatus === "error"
                    ? "AI error"
                    : aiStatus === "checking"
                      ? "Checking AI…"
                      : "AI not set"}
              </span>
            </div>
            <Link
              href="/dashboard/settings"
              onClick={onNavigate}
              className="text-[10px] font-semibold text-primary-light hover:underline"
            >
              {anthropicReady ? (aiKeySource === "workspace" ? "BYOK" : "Platform") : "Setup"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="h-dvh overflow-hidden bg-page text-text" style={{ fontFamily: "var(--font-body)" }}>

        {/* Mobile top strip */}
        <div className="sticky top-0 z-30 flex h-[52px] items-center justify-between border-b border-[var(--sidebar-divider)] bg-sidebar px-4 md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-active text-on-dark"
            aria-label="Open menu"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-primary to-primary-dark text-[9px] font-bold text-white">
              AI
            </span>
            <span className="text-[13px] font-bold tracking-tight text-white">
              Marketing <span className="text-primary-light">OS</span>
            </span>
          </Link>
          <div className="w-8" />
        </div>

        <div className="flex h-[calc(100dvh-52px)] md:h-dvh">

          {/* Desktop sidebar */}
          <div className="hidden w-[240px] shrink-0 border-r border-[var(--sidebar-divider)] bg-sidebar md:block">
            <div className="h-dvh overflow-y-auto">
              <Sidebar />
            </div>
          </div>

          {/* Mobile overlay */}
          {mobileOpen && (
            <div className="fixed inset-0 z-40 md:hidden">
              <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
              <div className="absolute left-0 top-0 h-full w-[240px] bg-sidebar shadow-xl">
                <div className="h-full overflow-y-auto">
                  <Sidebar onNavigate={() => setMobileOpen(false)} />
                </div>
              </div>
            </div>
          )}

          {/* Main content */}
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
              <div className="pointer-events-none absolute inset-0 opacity-30 saas-grid" aria-hidden />
              <div className="relative mx-auto max-w-[1200px] px-4 py-6 md:px-6 md:py-8">
                <ModuleFlowBar />
                <ProfileCompletenessBanner />
                {children}
                <NextStepNudge />
              </div>
            </main>
          </div>
        </div>

        {/* Floating Copilot button */}
        <button
          type="button"
          onClick={() => setCopilotOpen((o) => !o)}
          className={`fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all hover:scale-105 ${
            copilotOpen ? "bg-primary-dark ring-2 ring-primary/30" : "bg-primary hover:bg-primary-dark"
          }`}
          title="AI Copilot"
          aria-label="Toggle AI Copilot"
        >
          <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </button>

        {/* Copilot panel */}
        {copilotOpen && (
          <div className="fixed bottom-0 right-0 z-50 flex h-[520px] w-[360px] flex-col overflow-hidden rounded-tl-2xl border border-border bg-surface shadow-2xl">
            {/* Header */}
            <div className="flex shrink-0 items-center gap-3 border-b border-border bg-sidebar px-4 py-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
                <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-[13px] font-semibold text-white">AI Copilot</div>
                <div className="text-[10px] text-on-dark/50">Marketing assistant</div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard/copilot"
                  className="text-[11px] text-primary-light hover:underline"
                  onClick={() => setCopilotOpen(false)}
                >
                  Full view →
                </Link>
                <button
                  type="button"
                  onClick={() => setCopilotOpen(false)}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-on-dark/50 transition-colors hover:bg-white/12 hover:text-on-dark"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-3 p-4">
              {copilotMessages.length === 0 ? (
                <div className="flex flex-col items-center pt-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                    <svg className="h-6 w-6 text-primary" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-[13px] font-semibold text-heading">Ask your marketing AI</div>
                  <div className="mt-1 text-xs text-text2">Positioning, messaging, campaigns, GTM strategy</div>
                </div>
              ) : (
                copilotMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-white"
                        : "border border-border bg-surface2 text-heading"
                    }`}>
                      <pre className="whitespace-pre-wrap font-[inherit]">{msg.text}</pre>
                    </div>
                  </div>
                ))
              )}
              {copilotLoading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1.5 hs-card2 px-4 py-3">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              )}
              <div ref={copilotEndRef} />
            </div>

            {/* Input */}
            <div className="shrink-0 border-t border-border bg-surface p-3">
              <div className="flex gap-2">
                <input
                  value={copilotInput}
                  onChange={(e) => setCopilotInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendCopilotMessage(); }
                  }}
                  placeholder="Ask anything…"
                  disabled={copilotLoading}
                  className="min-w-0 flex-1 hs-card2 px-3 py-2 text-[13px] text-heading placeholder:text-text3 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => void sendCopilotMessage()}
                  disabled={copilotLoading || !copilotInput.trim()}
                  className="shrink-0 rounded-xl bg-primary px-3 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ToastProvider>
  );
}
