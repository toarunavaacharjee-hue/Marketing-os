import type { Metadata } from "next";
import "./globals.css";
import "@fontsource/dm-sans/latin.css";
import "@fontsource/inter/latin.css";

export const metadata: Metadata = {
  title: {
    default: "AI Marketing Workbench",
    template: "%s | AI Marketing Workbench"
  },
  description: "The operating system for product marketing and GTM teams.",
  applicationName: "AI Marketing Workbench",
  robots: { index: true, follow: true },
  openGraph: {
    title: "AI Marketing Workbench",
    description: "The operating system for product marketing and GTM teams.",
    type: "website"
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

