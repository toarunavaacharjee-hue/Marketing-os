import type { MetadataRoute } from "next";
import { BLOG_POSTS } from "@/lib/blog/posts";
import { getSiteUrl } from "@/lib/siteUrl";
import { getAllContent } from "@/lib/content";
import { GLOSSARY_TERMS } from "@/lib/glossary";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const now = new Date();

  const [templates, vsPages] = await Promise.all([
    getAllContent("templates"),
    getAllContent("vs")
  ]);

  const staticRoutes: Array<{ path: string; priority: number }> = [
    { path: "/", priority: 1 },
    { path: "/pricing", priority: 0.8 },
    { path: "/blog", priority: 0.8 },
    { path: "/tools/templates", priority: 0.9 },
    { path: "/tools/glossary", priority: 0.8 },
    { path: "/use-cases", priority: 0.7 },
    { path: "/resources", priority: 0.5 },
    { path: "/docs", priority: 0.5 },
    { path: "/about", priority: 0.6 },
    { path: "/careers", priority: 0.4 },
    { path: "/contact", priority: 0.4 },
    { path: "/company", priority: 0.5 },
    { path: "/status", priority: 0.3 },
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

  const templateEntries: MetadataRoute.Sitemap = templates.map((t) => ({
    url: `${base}/tools/templates/${t.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.75
  }));

  const glossaryEntries: MetadataRoute.Sitemap = GLOSSARY_TERMS.map((t) => ({
    url: `${base}/tools/glossary/${t.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.65
  }));

  const vsEntries: MetadataRoute.Sitemap = vsPages.map((p) => ({
    url: `${base}/vs/${p.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.7
  }));

  return [
    ...staticEntries,
    ...blogEntries,
    ...templateEntries,
    ...glossaryEntries,
    ...vsEntries
  ];
}
