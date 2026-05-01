import type { Metadata } from "next";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/MarketingChrome";
import { getAllContent } from "@/lib/content";
import { UseCasesModernClient } from "@/app/use-cases/UseCasesModernClient";

export const metadata: Metadata = {
  title: "Use Cases | AI Marketing Workbench",
  description: "See how AI Marketing Workbench supports product marketing teams, founders, GTM leaders, consultants, and multi-product companies."
};

export default async function UseCasesIndexPage() {
  const useCases = await getAllContent("use-cases");

  return (
    <div className="min-h-screen bg-bg text-text antialiased" style={{ fontFamily: "var(--font-body)" }}>
      <MarketingHeader />

      <div className="pointer-events-none absolute inset-x-0 top-[60px] h-[420px] saas-hero-glow" aria-hidden />
      <div className="saas-grid pointer-events-none absolute inset-x-0 top-[60px] h-[420px] opacity-[0.2]" aria-hidden />

      <UseCasesModernClient useCases={useCases} />

      <MarketingFooter />
    </div>
  );
}
