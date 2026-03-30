import Link from "next/link";
import { MarketingLogo } from "@/components/marketing/MarketingChrome";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[#08080c] text-[#f0f0f8] antialiased"
      style={{ fontFamily: "var(--font-body)" }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[min(55vh,480px)] saas-hero-glow" aria-hidden />
      <div className="pointer-events-none absolute inset-0 opacity-[0.35] saas-grid" aria-hidden />

      <header className="relative z-10 border-b border-white/[0.06] bg-[#08080c]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-[56px] max-w-6xl items-center justify-between px-4 sm:px-6">
          <MarketingLogo />
          <nav className="flex items-center gap-1 sm:gap-3">
            <Link
              href="/pricing"
              className="rounded-lg px-2.5 py-2 text-[13px] font-medium text-[#9090b0] transition hover:bg-white/[0.04] hover:text-[#f0f0f8] sm:px-3"
            >
              Pricing
            </Link>
            <Link
              href="/"
              className="rounded-lg px-2.5 py-2 text-[13px] font-medium text-[#9090b0] transition hover:bg-white/[0.04] hover:text-[#f0f0f8] sm:px-3"
            >
              Home
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 sm:py-16">{children}</main>

      <footer className="relative z-10 border-t border-white/[0.06] bg-[#06060a]/80 py-8 text-center">
        <p className="mx-auto max-w-md px-4 text-[12px] leading-relaxed text-[#5c6278]">
          <span className="font-mono text-[11px] text-[#4a4f62]">AI Marketing Workbench</span>
          <span className="mx-2 text-[#3a3f52]">·</span>
          The PMM + GTM operating layer (not a CRM).
        </p>
      </footer>
    </div>
  );
}
