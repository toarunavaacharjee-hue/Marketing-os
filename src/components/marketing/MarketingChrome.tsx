import Link from "next/link";

const nav = [
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#modules", label: "Modules" },
  { href: "/creative-marketing-agency", label: "Creative agency" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" }
] as const;

export function MarketingLogo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`group flex items-center gap-2.5 ${className}`}>
      <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-[#7c6cff] to-[#5a4fd4] shadow-lg shadow-[#7c6cff]/25 ring-1 ring-white/10">
        <span className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.2)_0%,transparent_50%)]" />
        <span className="relative text-[11px] font-bold tracking-tight text-white">AI</span>
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-[#f0f0f8] group-hover:text-white">
        Marketing Workbench
      </span>
    </Link>
  );
}

export function MarketingHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-[#08080c]/80 backdrop-blur-xl">
      <div className="saas-grid pointer-events-none absolute inset-0 opacity-[0.35]" aria-hidden />
      <div className="relative mx-auto flex h-[60px] max-w-7xl items-center justify-between px-4 sm:px-6">
        <MarketingLogo />
        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-[13px] font-medium text-[#9090b0] transition hover:bg-white/[0.04] hover:text-[#e8e8f0]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="hidden rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[13px] font-medium text-[#c8c8d8] transition hover:border-white/[0.12] hover:bg-white/[0.06] sm:inline-flex"
          >
            View demo
          </Link>
          <Link
            href="/signup?plan=starter"
            className="rounded-lg bg-[#b8ff6c] px-3.5 py-2 text-[13px] font-semibold text-[#0a0a0c] shadow-lg shadow-[#b8ff6c]/15 transition hover:bg-[#c8ff7c]"
          >
            Start free
          </Link>
        </div>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/[0.06] bg-[#06060a]">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <MarketingLogo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-[#707090]">
              The PMM + GTM operating layer (not a CRM).
            </p>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5c6278]">Product</div>
            <ul className="mt-4 space-y-2.5 text-sm text-[#9090b0]">
              <li>
                <Link href="/#features" className="transition hover:text-[#f0f0f8]">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/#modules" className="transition hover:text-[#f0f0f8]">
                  Modules
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="transition hover:text-[#f0f0f8]">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5c6278]">Company</div>
            <ul className="mt-4 space-y-2.5 text-sm text-[#9090b0]">
              <li className="cursor-default">About</li>
              <li className="cursor-default">Careers</li>
              <li className="cursor-default">Contact</li>
            </ul>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5c6278]">Resources</div>
            <ul className="mt-4 space-y-2.5 text-sm text-[#9090b0]">
              <li>
                <Link href="/creative-marketing-agency" className="transition hover:text-[#f0f0f8]">
                  Creative agency
                </Link>
              </li>
              <li className="cursor-default">Docs</li>
              <li>
                <Link href="/#faq" className="transition hover:text-[#f0f0f8]">
                  FAQ
                </Link>
              </li>
              <li className="cursor-default">Status</li>
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-2 border-t border-white/[0.06] pt-8 text-center text-[12px] text-[#5c6278] sm:flex-row sm:justify-between sm:text-left">
          <span>© {new Date().getFullYear()} AI Marketing Workbench</span>
          <span className="font-mono text-[11px] text-[#4a4f62]">Built for product marketing &amp; GTM teams</span>
        </div>
      </div>
    </footer>
  );
}
