import type { Metadata } from "next";
import Link from "next/link";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/MarketingChrome";

export const metadata: Metadata = {
  title: "Terms of Service · AI Marketing Workbench",
  description: "Terms for AI Marketing Workbench.",
  alternates: { canonical: "/terms" }
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-bg text-text antialiased" style={{ fontFamily: "var(--font-body)" }}>
      <MarketingHeader />
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-28 sm:px-6">
        <Link href="/" className="text-sm font-medium text-link hover:underline">
          ← Back home
        </Link>
        <h1 className="mt-8 text-3xl font-semibold tracking-tight text-heading" style={{ fontFamily: "var(--font-heading)" }}>
          Terms of Service
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-text2">
          This page is a placeholder. Replace this content with counsel-approved terms before relying on it for compliance.
          Contact details are available on the{" "}
          <Link href="/contact" className="font-medium text-link hover:underline">
            contact page
          </Link>
          .
        </p>
      </main>
      <MarketingFooter />
    </div>
  );
}
