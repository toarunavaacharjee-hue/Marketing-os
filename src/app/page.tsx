"use client";

import Link from "next/link";
import { useEffect } from "react";

const SERVICES = [
  {
    title: "Brand & Positioning",
    desc: "Messaging that makes you easy to choose.",
    bullets: ["ICP + narrative", "Positioning & offers", "Brand guidelines"]
  },
  {
    title: "Content & Social",
    desc: "Consistent output with a clear POV.",
    bullets: ["Content strategy", "Short-form + carousels", "Founder-led content edits"]
  },
  {
    title: "Performance Creative",
    desc: "Creative systems for Meta + LinkedIn ads.",
    bullets: ["Hook + angle library", "Creative variants", "Iterate weekly with results"]
  },
  {
    title: "Websites & Landing Pages",
    desc: "Pages that convert and look premium.",
    bullets: ["Copy + UX structure", "Design + build support", "Conversion-first sections"]
  }
] as const;

const RESULTS = [
  ["Clarity", "Sharper messaging, fewer weak claims, more “this is for me.”"],
  ["Conversion", "Landing pages and creatives built to increase intent."],
  ["Velocity", "Weekly shipping cadence your team can plan around."]
] as const;

export default function HomePage() {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll("[data-reveal]"));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-[#08080c] text-[#f0f0f8]" style={{ fontFamily: "var(--font-body)" }}>
      <style jsx global>{`
        [data-reveal] {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 600ms ease, transform 600ms ease;
        }
        [data-reveal].is-visible {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>

      <header className="fixed inset-x-0 top-0 z-50 border-b border-[#2a2e3f] bg-[#08080c]/85 backdrop-blur">
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
            <Link href="/contact">Contact</Link>
          </nav>
          <div className="flex items-center gap-2">
            <a
              href="mailto:hello@orahtechandmarketing.com?subject=Creative%20Marketing%20Inquiry"
              className="rounded-xl border border-[#2a2e3f] bg-transparent px-3 py-2 text-sm hover:bg-white/5"
            >
              hello@…
            </a>
            <a
              href="mailto:hello@orahtechandmarketing.com?subject=Creative%20Marketing%20Inquiry"
              className="rounded-xl bg-[#b8ff6c] px-3 py-2 text-sm font-medium text-black"
            >
              Get a proposal
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-20 pt-24">
        <section data-reveal className="grid gap-8 pt-10 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#2a2e3f] bg-[#141420] px-3 py-1 text-xs text-[#9090b0]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#b8ff6c]" />
              Creative agency for founders and growth teams
            </div>
            <h1 className="mt-4 text-5xl leading-tight md:text-6xl" style={{ fontFamily: "var(--font-heading)" }}>
              Creative marketing that ships fast — and converts.
            </h1>
            <p className="mt-4 max-w-xl text-lg text-[#9090b0]">
              We build brand systems, content engines, and performance creative that makes your product easier to buy.
              Clear scope, weekly delivery, measurable outcomes.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/contact" className="rounded-xl bg-[#b8ff6c] px-5 py-3 font-medium text-black">
                Get a proposal
              </Link>
              <Link href="/services" className="rounded-xl border border-[#2a2e3f] px-5 py-3 font-medium hover:bg-white/5">
                Explore services
              </Link>
              <Link href="/work" className="rounded-xl border border-[#2a2e3f] px-5 py-3 font-medium hover:bg-white/5">
                See work
              </Link>
            </div>
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {[
                ["Turnaround", "Weekly delivery cadence"],
                ["Approach", "Strategy → creative → learn"],
                ["Focus", "Messaging + conversion"]
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4">
                  <div className="text-xs text-[#9090b0]">{k}</div>
                  <div className="mt-1 text-sm">{v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-[#2a2e3f] bg-[#141420] p-6">
            <div className="text-sm text-[#f0f0f8]">What we can ship in 14 days</div>
            <div className="mt-4 grid gap-2 text-sm text-[#9090b0]">
              {[
                "A crisp positioning + messaging one-pager",
                "A landing page (copy + design) aligned to your ICP",
                "A performance creative starter set (hooks + variants)",
                "A simple testing plan for the next 30 days"
              ].map((x) => (
                <div key={x} className="rounded-xl border border-[#2a2e3f] bg-black/20 px-3 py-2">
                  {x}
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/contact" className="rounded-xl bg-[#7c6cff] px-4 py-2 text-sm font-medium text-white">
                Ask about availability
              </Link>
              <Link
                href="/pricing"
                className="rounded-xl border border-[#2a2e3f] px-4 py-2 text-sm font-medium text-[#f0f0f8] hover:bg-white/5"
              >
                See pricing
              </Link>
            </div>
          </div>
        </section>

        <section id="services" data-reveal className="mt-20">
          <h2 className="text-3xl" style={{ fontFamily: "var(--font-heading)" }}>
            Services
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-[#9090b0]">
            Pick a lane or run the full stack. We keep scopes clean so output stays consistent and measurable.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {SERVICES.map((s) => (
              <div key={s.title} className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-lg">{s.title}</div>
                    <div className="mt-1 text-sm text-[#9090b0]">{s.desc}</div>
                  </div>
                  <span className="h-9 w-9 rounded-xl bg-[#7c6cff]/15 ring-1 ring-[#7c6cff]/25" />
                </div>
                <ul className="mt-4 space-y-2 text-sm text-[#9090b0]">
                  {s.bullets.map((b) => (
                    <li key={b} className="flex gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#b8ff6c]" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section data-reveal className="mt-20">
          <h2 className="text-3xl" style={{ fontFamily: "var(--font-heading)" }}>
            What we optimize for
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {RESULTS.map(([t, d]) => (
              <div key={t} className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-6">
                <div className="text-base">{t}</div>
                <div className="mt-2 text-sm text-[#9090b0]">{d}</div>
              </div>
            ))}
          </div>
        </section>

        <section data-reveal className="mt-20 rounded-3xl border border-[#7c6cff]/30 bg-[#141420] p-8 text-center">
          <h3 className="text-4xl" style={{ fontFamily: "var(--font-heading)" }}>
            Want a creative plan for your next 30 days?
          </h3>
          <p className="mt-3 mx-auto max-w-2xl text-[#9090b0]">
            Share your offer + target customer. We’ll reply with a recommended scope, timeline, and what we’d ship first.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/contact" className="rounded-xl bg-[#b8ff6c] px-5 py-3 font-medium text-black">
              Contact us
            </Link>
            <Link href="/services" className="rounded-xl border border-[#2a2e3f] px-5 py-3 font-medium hover:bg-white/5">
              View services
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#2a2e3f]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-4">
          <div>
            <div className="font-semibold">Orah Tech & Marketing</div>
            <p className="mt-2 text-sm text-[#9090b0]">Creative marketing for brand, content, performance, and web.</p>
          </div>
          <div className="text-sm text-[#9090b0]">
            <div className="mb-2 text-[#f0f0f8]">Services</div>
            <Link className="block" href="/services">
              Services
            </Link>
            <Link className="block" href="/work">
              Work
            </Link>
            <Link className="block" href="/pricing">
              Pricing
            </Link>
          </div>
          <div className="text-sm text-[#9090b0]">
            <div className="mb-2 text-[#f0f0f8]">Company</div>
            <Link className="block" href="/about">
              About
            </Link>
            <Link className="block" href="/contact">
              Contact
            </Link>
          </div>
          <div className="text-sm text-[#9090b0]">
            <div className="mb-2 text-[#f0f0f8]">Contact</div>
            <a className="block" href="mailto:hello@orahtechandmarketing.com">
              hello@orahtechandmarketing.com
            </a>
            <div className="mt-2 text-xs text-[#707090]">Typically reply within 24–48 hours.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

