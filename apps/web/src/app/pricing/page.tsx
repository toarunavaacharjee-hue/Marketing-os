import type { Metadata } from "next";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/MarketingChrome";
import { PricingModernClient } from "@/app/pricing/PricingModernClient";

export const metadata: Metadata = {
  title: "Pricing | AI Marketing Workbench",
  description: "Simple plans for modern PMM & GTM teams: Starter, Growth, and Enterprise.",
  alternates: { canonical: "/pricing" }
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-bg text-text antialiased" style={{ fontFamily: "var(--font-body)" }}>
      <MarketingHeader />

      <div className="pointer-events-none absolute inset-x-0 top-[60px] h-[420px] saas-hero-glow" aria-hidden />
      <div className="saas-grid pointer-events-none absolute inset-x-0 top-[60px] h-[420px] opacity-[0.2]" aria-hidden />

      <PricingModernClient />

      <MarketingFooter />
    </div>
  );
}
