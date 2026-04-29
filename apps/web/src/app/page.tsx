import type { Metadata } from "next";
import HomePageContentClient from "@/app/HomePageContentClient";
import { getFeaturedUseCases, getLatestBlogPosts } from "@/lib/content";

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
    url: "/"
  }
};

export default async function HomePage() {
  const [latestPosts, featuredUseCases] = await Promise.all([getLatestBlogPosts(3), getFeaturedUseCases(3)]);

  return <HomePageContentClient latestPosts={latestPosts} featuredUseCases={featuredUseCases} />;
}

