import type { Metadata } from "next";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/MarketingChrome";
import { getAllContent } from "@/lib/content";
import { BlogModernClient } from "@/app/blog/BlogModernClient";

export const metadata: Metadata = {
  title: "Blog | AI Marketing Workbench",
  description: "Templates, frameworks, and playbooks for PMM & GTM teams shipping weekly.",
  alternates: { canonical: "/blog" }
};

export default async function BlogIndexPage() {
  const posts = await getAllContent("blog");

  return (
    <div className="min-h-screen bg-bg text-text antialiased" style={{ fontFamily: "var(--font-body)" }}>
      <MarketingHeader />

      <div className="pointer-events-none absolute inset-x-0 top-[60px] h-[420px] saas-hero-glow" aria-hidden />
      <div className="saas-grid pointer-events-none absolute inset-x-0 top-[60px] h-[420px] opacity-[0.2]" aria-hidden />

      <BlogModernClient posts={posts} />

      <MarketingFooter />
    </div>
  );
}

