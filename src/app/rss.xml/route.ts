import { NextResponse } from "next/server";
import { BLOG_POSTS } from "@/lib/blog/posts";
import { getSiteUrl } from "@/lib/siteUrl";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function GET() {
  const base = getSiteUrl();
  const posts = [...BLOG_POSTS].sort((a, b) => (a.date < b.date ? 1 : -1));

  const items = posts
    .map((p) => {
      const url = `${base}/blog/${p.slug}`;
      return [
        "<item>",
        `<title>${esc(p.title)}</title>`,
        `<link>${esc(url)}</link>`,
        `<guid>${esc(url)}</guid>`,
        `<pubDate>${new Date(p.date).toUTCString()}</pubDate>`,
        `<description>${esc(p.description)}</description>`,
        "</item>"
      ].join("");
    })
    .join("");

  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rss version="2.0">`,
    `<channel>`,
    `<title>${esc("AI Marketing Workbench Blog")}</title>`,
    `<link>${esc(`${base}/blog`)}</link>`,
    `<description>${esc("Templates, frameworks, and playbooks for PMM & GTM teams.")}</description>`,
    items,
    `</channel>`,
    `</rss>`
  ].join("");

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400"
    }
  });
}

