import type { Metadata } from "next";
import HomePageModernClient from "@/app/HomePageModernClient";
import { getFeaturedUseCases, getLatestBlogPosts } from "@/lib/content";
import { getSiteUrl } from "@/lib/siteUrl";

const ogImage = `/og?title=AI+Marketing+Workbench&description=The+PMM+%2B+GTM+operating+layer`;

export const metadata: Metadata = {
  title: "AI Marketing Workbench — The Marketing Operating System for B2B Teams",
  description:
    "AI Marketing Workbench connects ICP, positioning, messaging, campaigns, and launch planning in one place. Built for demand gen, PMM, content, and growth teams that need faster, more consistent GTM execution.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "AI Marketing Workbench — The Marketing Operating System for B2B Teams",
    description:
      "Connect ICP, positioning, messaging, campaigns, and launch planning in one AI-powered workspace. From strategy to launch in hours, not weeks.",
    type: "website",
    url: "/",
    images: [{ url: ogImage, width: 1200, height: 630, alt: "AI Marketing Workbench" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Marketing Workbench — The Marketing Operating System for B2B Teams",
    description:
      "Connect ICP, positioning, messaging, campaigns, and launch planning in one AI-powered workspace. Built for demand gen, PMM, content, and growth teams.",
    images: [ogImage]
  }
};

export default async function HomePage() {
  const [latestPosts, featuredUseCases] = await Promise.all([getLatestBlogPosts(3), getFeaturedUseCases(3)]);

  const siteUrl = getSiteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "AI Marketing Workbench",
        url: siteUrl,
        description: "The operating system for product marketing and GTM teams.",
        sameAs: []
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: "AI Marketing Workbench",
        publisher: { "@id": `${siteUrl}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: { "@type": "EntryPoint", urlTemplate: `${siteUrl}/blog?q={search_term_string}` },
          "query-input": "required name=search_term_string"
        }
      }
    ]
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <HomePageModernClient latestPosts={latestPosts} featuredUseCases={featuredUseCases} />
    </>
  );
}
