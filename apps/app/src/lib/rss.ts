/**
 * Minimal RSS 2.0 / Atom feed parsing for Market Research ingestion (no XML deps).
 */

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripTags(s: string): string {
  return decodeEntities(s)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTag(block: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = block.match(re);
  return m ? m[1].trim() : "";
}

export type RssItem = { title: string; description: string; link?: string };

export function parseFeedItems(xml: string): { channelTitle: string | null; items: RssItem[] } {
  const channelTitle =
    extractTag(xml.replace(/^[\s\S]*?<channel[^>]*>/i, "").split("</channel>")[0] ?? "", "title") ||
    extractTag(xml, "title") ||
    null;

  const items: RssItem[] = [];
  const itemRegex = /<item[\s\S]*?<\/item>/gi;
  let match: RegExpExecArray | null;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[0];
    const title = stripTags(extractTag(block, "title"));
    const desc =
      stripTags(extractTag(block, "description")) ||
      stripTags(extractTag(block, "content:encoded"));
    const link = stripTags(extractTag(block, "link"));
    if (title || desc) items.push({ title, description: desc, link: link || undefined });
  }

  if (items.length) {
    return { channelTitle: channelTitle ? stripTags(channelTitle) : null, items };
  }

  const entryRegex = /<entry[\s\S]*?<\/entry>/gi;
  while ((match = entryRegex.exec(xml)) !== null) {
    const block = match[0];
    const title = stripTags(extractTag(block, "title"));
    const desc =
      stripTags(extractTag(block, "summary")) || stripTags(extractTag(block, "content"));
    const link =
      stripTags(extractTag(block, "link")) ||
      (() => {
        const m = block.match(/<link[^>]+href="([^"]+)"/i);
        return m ? m[1] : "";
      })();
    if (title || desc) items.push({ title, description: desc, link: link || undefined });
  }

  return { channelTitle: channelTitle ? stripTags(channelTitle) : null, items };
}

export function filterItemsByKeywords(
  items: RssItem[],
  keywordsRaw: string | null | undefined,
  maxItems: number
): RssItem[] {
  const parts = (keywordsRaw ?? "")
    .split(/[,;\n]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (!parts.length) return items.slice(0, maxItems);
  const filtered = items.filter((it) => {
    const blob = `${it.title} ${it.description}`.toLowerCase();
    return parts.some((k) => blob.includes(k));
  });
  return (filtered.length ? filtered : items).slice(0, maxItems);
}

export function rssItemsToSnapshotText(
  channelTitle: string | null,
  items: RssItem[],
  feedUrl: string
): string {
  const header = channelTitle ? `Feed: ${channelTitle}\nSource URL: ${feedUrl}\n\n` : `Source URL: ${feedUrl}\n\n`;
  const body = items
    .map((it, i) => {
      const linkLine = it.link ? `\nLink: ${it.link}` : "";
      return `[${i + 1}] ${it.title}\n${it.description}${linkLine}`;
    })
    .join("\n\n---\n\n");
  return (header + body).slice(0, 20000);
}
