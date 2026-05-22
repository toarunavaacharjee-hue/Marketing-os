import type { MetadataRoute } from "next";

const CANONICAL = "https://orahtechandmarketing.com";

export default function robots(): MetadataRoute.Robots {
  // Block all bots on Vercel preview deployments — only allow crawling on
  // the production domain to prevent duplicate-content and redirect penalties.
  const host = process.env.VERCEL_URL ?? "";
  const isPreview = host && !host.includes("orahtechandmarketing.com");

  if (isPreview) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }]
    };
  }

  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${CANONICAL}/sitemap.xml`
  };
}

