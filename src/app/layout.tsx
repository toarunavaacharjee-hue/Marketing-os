import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ fontFamily: "var(--font-body)" }}>{children}</body>
    </html>
  );
}

