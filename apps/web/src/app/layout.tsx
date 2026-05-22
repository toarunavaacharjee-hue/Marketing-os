import type { Metadata } from "next";
import "./globals.css";
import "@fontsource/dm-sans/latin.css";
import "@fontsource/inter/latin.css";

const SITE_URL = "https://orahtechandmarketing.com";

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
    siteName: "AI Marketing Workbench"
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

