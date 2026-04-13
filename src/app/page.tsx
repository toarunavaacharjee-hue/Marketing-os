import type { Metadata } from "next";
import HomePageClient from "@/app/HomePageClient";

export const metadata: Metadata = {
  title: "AI Marketing Workbench | PMM & GTM Operating System",
  description:
    "The operating system for product marketing and GTM teams. Connect ICP, positioning, messaging, campaigns, and measurement loops—then ship weekly workflows.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "AI Marketing Workbench",
    description: "Connect ICP, positioning, messaging, campaigns, and measurement loops—then ship weekly workflows.",
    type: "website",
    url: "/"
  }
};

export default function HomePage() {
  return <HomePageClient />;
}

