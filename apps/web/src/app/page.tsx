import type { Metadata } from "next";
import HomePageModernClient from "@/app/HomePageModernClient";
import { getFeaturedUseCases, getLatestBlogPosts } from "@/lib/content";
import { getSiteUrl } from "@/lib/siteUrl";

const ogImage = `/og?title=AI+Marketing+Workbench&description=The+PMM+%2B+GTM+operating+layer`;

export const metadata: Metadata = {
  title: "Marketing OS | Connected Marketing Operating System",
  description:
    "The marketing operating system for teams that need clarity and execution. Run research, ICPs, positioning, messaging, campaigns, planning, and analytics in one connected workspace.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Marketing OS",
    description:
      "Run research, ICP definition, positioning, messaging, campaigns, planning, and analytics in one connected workspace.",
    type: "website",
    url: "/",
    images: [{ url: ogImage, width: 1200, height: 630, alt: "AI Marketing Workbench" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Marketing OS | AI Marketing Workbench",
    description: "The marketing operating system for PMM and GTM teams.",
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
