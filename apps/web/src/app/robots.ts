import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/siteUrl";

export default function robots(): MetadataRoute.Robots {
  // Block all bots on Vercel preview deployments only. VERCEL_URL is always the
  // per-deployment *.vercel.app host (even in production), so it can't be used
  // to detect the production domain — VERCEL_ENV can.
  const isPreview = !!process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production";

  if (isPreview) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }]
    };
  }

  const base = getSiteUrl();
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${base}/sitemap.xml`,
    host: base
  };
}
