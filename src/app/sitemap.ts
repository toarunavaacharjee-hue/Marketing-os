import type { MetadataRoute } from "next";
import { BLOG_POSTS } from "@/lib/blog/posts";
import { getSiteUrl } from "@/lib/siteUrl";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const now = new Date();

  const staticRoutes: Array<{ path: string; priority: number }> = [
    { path: "/", priority: 1 },
    { path: "/pricing", priority: 0.8 },
    { path: "/blog", priority: 0.8 },
    { path: "/login", priority: 0.2 },
    { path: "/signup", priority: 0.2 }
  ];

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((r) => ({
    url: `${base}${r.path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: r.priority
  }));

  const blogEntries: MetadataRoute.Sitemap = BLOG_POSTS.map((p) => ({
    url: `${base}/blog/${p.slug}`,
    lastModified: new Date(p.date),
    changeFrequency: "monthly",
    priority: 0.6
  }));

  return [...staticEntries, ...blogEntries];
}

