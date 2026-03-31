import Link from "next/link";
import { MarketingLogo } from "@/components/marketing/MarketingChrome";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative min-h-screen overflow-hidden bg-bg text-text antialiased"
      style={{ fontFamily: "var(--font-body)" }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[min(55vh,480px)] saas-hero-glow" aria-hidden />
      <div className="pointer-events-none absolute inset-0 opacity-[0.35] saas-grid" aria-hidden />

      <header className="relative z-10 border-b border-border bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-[56px] max-w-6xl items-center justify-between px-4 sm:px-6">
          <MarketingLogo />
          <nav className="flex items-center gap-1 sm:gap-3">
            <Link
              href="/pricing"
              className="rounded-lg px-2.5 py-2 text-[13px] font-medium text-text2 transition hover:bg-surface2 hover:text-text sm:px-3"
            >
              Pricing
            </Link>
            <Link
              href="/"
              className="rounded-lg px-2.5 py-2 text-[13px] font-medium text-text2 transition hover:bg-surface2 hover:text-text sm:px-3"
            >
              Home
            </Link>
            <ThemeToggle className="ml-1" />
          </nav>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 sm:py-16">{children}</main>

      <footer className="relative z-10 border-t border-border bg-bg/70 py-8 text-center">
        <p className="mx-auto max-w-md px-4 text-[12px] leading-relaxed text-text3">
          <span className="font-mono text-[11px] text-text3">AI Marketing Workbench</span>
          <span className="mx-2 text-text3">·</span>
          The PMM + GTM operating layer (not a CRM).
        </p>
      </footer>
    </div>
  );
}
