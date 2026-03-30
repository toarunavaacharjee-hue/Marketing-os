import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orah Tech & Marketing",
  description:
    "Creative marketing agency for brand, content, performance creative, and websites. Strategy-led creative that ships fast and converts."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
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

