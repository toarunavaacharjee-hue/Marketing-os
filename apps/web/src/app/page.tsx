import type { Metadata } from "next";
import HomePageClient from "@/app/HomePageClient";

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

export default function HomePage() {
  return <HomePageClient />;
}

