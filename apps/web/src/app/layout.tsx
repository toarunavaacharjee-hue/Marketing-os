import type { Metadata } from "next";
import "./globals.css";
import "@fontsource/dm-sans/latin.css";
import "@fontsource/inter/latin.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aimarketingworkbench.com";
const DEFAULT_OG = `/og?title=AI+Marketing+Workbench&description=The+PMM+%2B+GTM+operating+layer`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "AI Marketing Workbench",
    template: "%s | AI Marketing Workbench"
  },
  description: "The operating system for product marketing and GTM teams.",
  applicationName: "AI Marketing Workbench",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }]
  },
  robots: { index: true, follow: true },
  openGraph: {
    title: "AI Marketing Workbench",
    description: "The operating system for product marketing and GTM teams.",
    type: "website",
    url: SITE_URL,
    siteName: "AI Marketing Workbench",
    images: [{ url: DEFAULT_OG, width: 1200, height: 630, alt: "AI Marketing Workbench" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Marketing Workbench",
    description: "The operating system for product marketing and GTM teams.",
    images: [DEFAULT_OG]
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "var(--font-body)" }}>{children}</body>
    </html>
  );
}

