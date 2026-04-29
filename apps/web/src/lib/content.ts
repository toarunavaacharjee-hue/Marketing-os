import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

export type ContentKind = "blog" | "use-cases";

type ContentFrontmatter = {
  title: string;
  description: string;
  date?: string;
  slug: string;
  tags?: string[];
  featured?: boolean;
  audience?: string;
  heroCtaLabel?: string;
  heroCtaHref?: string;
};

export type ContentEntry = {
  kind: ContentKind;
  slug: string;
  title: string;
  description: string;
  date: string | null;
  tags: string[];
  featured: boolean;
  audience: string | null;
  heroCtaLabel: string | null;
  heroCtaHref: string | null;
  content: string;
};

export type ContentListItem = Omit<ContentEntry, "content">;

const contentRoot = path.join(process.cwd(), "content");

function getContentDir(kind: ContentKind) {
  return path.join(contentRoot, kind);
}

function normalizeEntry(kind: ContentKind, frontmatter: ContentFrontmatter, content: string): ContentEntry {
  return {
    kind,
    slug: frontmatter.slug,
    title: frontmatter.title,
    description: frontmatter.description,
    date: frontmatter.date ?? null,
    tags: Array.isArray(frontmatter.tags) ? frontmatter.tags.map(String) : [],
    featured: Boolean(frontmatter.featured),
    audience: frontmatter.audience ?? null,
    heroCtaLabel: frontmatter.heroCtaLabel ?? null,
    heroCtaHref: frontmatter.heroCtaHref ?? null,
    content: content.trim()
  };
}

async function readContentFile(kind: ContentKind, fileName: string): Promise<ContentEntry> {
  const fullPath = path.join(getContentDir(kind), fileName);
  const raw = await fs.readFile(fullPath, "utf8");
  const parsed = matter(raw);
  return normalizeEntry(kind, parsed.data as ContentFrontmatter, parsed.content);
}

function sortEntries<T extends ContentListItem>(entries: T[]): T[] {
  return entries.sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    if (a.date && b.date) return a.date < b.date ? 1 : -1;
    if (a.date) return -1;
    if (b.date) return 1;
    return a.title.localeCompare(b.title);
  });
}

export async function getAllContent(kind: ContentKind): Promise<ContentListItem[]> {
  const dir = getContentDir(kind);
  const fileNames = (await fs.readdir(dir)).filter((name) => name.endsWith(".md"));
  const entries = await Promise.all(fileNames.map((fileName) => readContentFile(kind, fileName)));
  return sortEntries(entries.map(({ content: _content, ...entry }) => entry));
}

export async function getContentEntry(kind: ContentKind, slug: string): Promise<ContentEntry | null> {
  const entries = await getAllContent(kind);
  const match = entries.find((entry) => entry.slug === slug);
  if (!match) return null;

  return readContentFile(kind, `${slug}.md`);
}

export async function getLatestBlogPosts(limit: number): Promise<ContentListItem[]> {
  const posts = await getAllContent("blog");
  return posts.slice(0, limit);
}

export async function getFeaturedUseCases(limit: number): Promise<ContentListItem[]> {
  const useCases = await getAllContent("use-cases");
  return useCases.filter((entry) => entry.featured).slice(0, limit);
}
