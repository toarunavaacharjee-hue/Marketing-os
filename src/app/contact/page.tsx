import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact | Orah Tech & Marketing",
  description: "Reach out for a scope proposal: brand, content, performance creative, and websites."
};

const QUESTIONS = [
  "What are you selling (one sentence)?",
  "Who is the ideal customer?",
  "What’s your primary goal for the next 30 days?",
  "What channels matter most (website, Meta, LinkedIn, etc.)?",
  "Any references for style or competitors?"
] as const;

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#08080c] text-[#f0f0f8]">
      <header className="border-b border-[#2a2e3f] bg-[#08080c]/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
            <span className="h-7 w-7 rounded-lg bg-[#7c6cff]/25 ring-1 ring-[#7c6cff]/40" />
            Orah Tech & Marketing
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-[#9090b0] md:flex">
            <Link href="/services">Services</Link>
            <Link href="/work">Work</Link>
            <Link href="/about">About</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/contact" className="text-[#f0f0f8]">
              Contact
            </Link>
          </nav>
          <a
            href="mailto:hello@orahtechandmarketing.com?subject=Creative%20Marketing%20Inquiry"
            className="rounded-xl bg-[#b8ff6c] px-3 py-2 text-sm font-medium text-black"
          >
            Email us
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-20 pt-12">
        <h1 className="text-5xl leading-tight md:text-6xl" style={{ fontFamily: "var(--font-heading)" }}>
          Contact
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-[#9090b0]">
          Email us and we’ll respond with a recommended scope for the first sprint.
        </p>

        <section className="mt-10 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-6">
            <div className="text-lg">Email</div>
            <p className="mt-2 text-sm text-[#9090b0]">
              The fastest path is email. Include a few details and we’ll reply within 24–48 hours.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href="mailto:hello@orahtechandmarketing.com?subject=Creative%20Marketing%20Inquiry"
                className="rounded-xl bg-[#b8ff6c] px-5 py-3 font-medium text-black"
              >
                hello@orahtechandmarketing.com
              </a>
              <Link href="/services" className="rounded-xl border border-[#2a2e3f] px-5 py-3 font-medium hover:bg-white/5">
                View services
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-6">
            <div className="text-lg">What to include</div>
            <p className="mt-2 text-sm text-[#9090b0]">
              Copy/paste these bullets to keep it simple.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-[#9090b0]">
              {QUESTIONS.map((q) => (
                <li key={q} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#7c6cff]" />
                  <span>{q}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mt-16 rounded-3xl border border-[#7c6cff]/30 bg-[#141420] p-8 text-center">
          <div className="text-3xl" style={{ fontFamily: "var(--font-heading)" }}>
            Prefer a quick first sprint proposal?
          </div>
          <div className="mt-3 text-sm text-[#9090b0]">
            We’ll suggest what to ship first, and what we’d measure.
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a
              href="mailto:hello@orahtechandmarketing.com?subject=Creative%20Marketing%20Inquiry"
              className="rounded-xl bg-[#b8ff6c] px-5 py-3 font-medium text-black"
            >
              Email us
            </a>
            <Link href="/pricing" className="rounded-xl border border-[#2a2e3f] px-5 py-3 font-medium hover:bg-white/5">
              Pricing
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

