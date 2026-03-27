"use client";

import { useEffect, useMemo, useState } from "react";

type Competitor = {
  name: string;
  website_url: string;
};

type Payload = {
  product: {
    id: string;
    name: string | null;
    website_url: string | null;
    category: string | null;
    icp_summary: string | null;
    positioning_summary: string | null;
    g2_review_url: string | null;
    capterra_review_url: string | null;
    news_rss_url: string | null;
    news_keywords: string | null;
  };
  competitors: Array<{ name: string; website_url: string }>;
};

export default function ProductProfileClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [category, setCategory] = useState("");
  const [icp, setIcp] = useState("");
  const [positioning, setPositioning] = useState("");
  const [g2Url, setG2Url] = useState("");
  const [capterraUrl, setCapterraUrl] = useState("");
  const [newsRssUrl, setNewsRssUrl] = useState("");
  const [newsKeywords, setNewsKeywords] = useState("");
  const [competitors, setCompetitors] = useState<Competitor[]>([
    { name: "", website_url: "" }
  ]);

  const canSave = useMemo(() => {
    return Boolean(name.trim());
  }, [name]);

  async function load() {
    setLoading(true);
    setError(null);
    setSaved(null);
    try {
      const res = await fetch("/api/product/profile");
      const contentType = res.headers.get("content-type") ?? "";
      const raw = await res.text();
      const data = (contentType.includes("application/json")
        ? (JSON.parse(raw) as Payload & { error?: string })
        : ({ error: raw || "Server error" } as any)) as Payload & {
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Failed to load product profile.");

      setName(data.product.name ?? "");
      setWebsiteUrl(data.product.website_url ?? "");
      setCategory(data.product.category ?? "");
      setIcp(data.product.icp_summary ?? "");
      setPositioning(data.product.positioning_summary ?? "");
      setG2Url(data.product.g2_review_url ?? "");
      setCapterraUrl(data.product.capterra_review_url ?? "");
      setNewsRssUrl(data.product.news_rss_url ?? "");
      setNewsKeywords(data.product.news_keywords ?? "");
      setCompetitors(
        data.competitors?.length
          ? data.competitors.map((c) => ({ name: c.name ?? "", website_url: c.website_url ?? "" }))
          : [{ name: "", website_url: "" }]
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load product profile.");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    setSaved(null);
    try {
      const res = await fetch("/api/product/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          website_url: websiteUrl,
          category,
          icp_summary: icp,
          positioning_summary: positioning,
          g2_review_url: g2Url,
          capterra_review_url: capterraUrl,
          news_rss_url: newsRssUrl,
          news_keywords: newsKeywords,
          competitors
        })
      });
      const contentType = res.headers.get("content-type") ?? "";
      const raw = await res.text();
      const data = (contentType.includes("application/json")
        ? (JSON.parse(raw) as { ok?: boolean; error?: string })
        : ({ error: raw || "Server error" } as any)) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Failed to save.");
      setSaved("Saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-6">
      <div className="text-sm text-text">Base product</div>
      <div className="mt-1 text-sm text-text2">
        This is what the system will treat as “you” during scans and comparisons.
      </div>

      {loading ? (
        <div className="mt-4 text-sm text-text2">Loading…</div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-[var(--radius)] border border-red bg-[rgba(248,113,113,0.12)] px-4 py-3 text-sm text-red">
          {error}
        </div>
      ) : null}

      {saved ? (
        <div className="mt-4 rounded-[var(--radius)] border border-[rgba(52,211,153,0.3)] bg-[rgba(52,211,153,0.12)] px-4 py-3 text-sm text-green">
          {saved}
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <Field label="Product name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-sm text-text placeholder:text-text3"
            placeholder="Marketing OS"
          />
        </Field>
        <Field label="Website URL (optional)">
          <input
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            className="w-full rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-sm text-text placeholder:text-text3"
            placeholder="https://orahtechandmarketing.com"
          />
        </Field>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <Field label="Category (optional)">
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-sm text-text placeholder:text-text3"
            placeholder="B2B SaaS Marketing Platform"
          />
        </Field>
        <Field label="ICP summary (optional)">
          <textarea
            value={icp}
            onChange={(e) => setIcp(e.target.value)}
            className="w-full rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-sm text-text placeholder:text-text3"
            rows={3}
            placeholder="Who is your best customer? (size, roles, pains)"
          />
        </Field>
      </div>

      <div className="mt-3">
        <Field label="Positioning summary (optional)">
          <textarea
            value={positioning}
            onChange={(e) => setPositioning(e.target.value)}
            className="w-full rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-sm text-text placeholder:text-text3"
            rows={3}
            placeholder="One paragraph on how you position and why you win."
          />
        </Field>
      </div>

      <div className="mt-8 text-sm font-semibold text-text">Market research sources (optional)</div>
      <div className="mt-1 text-sm text-text2">
        On each scan, we fetch these pages and your RSS feed, store snapshots in Supabase, and pass them to the AI.
        Industry news uses an RSS URL (for example Google News RSS for your category). Review sites use your public G2
        and Capterra product pages.
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Field label="G2 product page URL">
          <input
            value={g2Url}
            onChange={(e) => setG2Url(e.target.value)}
            className="w-full rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-sm text-text placeholder:text-text3"
            placeholder="https://www.g2.com/products/..."
          />
        </Field>
        <Field label="Capterra product page URL">
          <input
            value={capterraUrl}
            onChange={(e) => setCapterraUrl(e.target.value)}
            className="w-full rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-sm text-text placeholder:text-text3"
            placeholder="https://www.capterra.com/p/..."
          />
        </Field>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <Field label="Industry news RSS feed URL">
          <input
            value={newsRssUrl}
            onChange={(e) => setNewsRssUrl(e.target.value)}
            className="w-full rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-sm text-text placeholder:text-text3"
            placeholder="https://news.google.com/rss/search?q=..."
          />
        </Field>
        <Field label="News keyword filter (optional)">
          <input
            value={newsKeywords}
            onChange={(e) => setNewsKeywords(e.target.value)}
            className="w-full rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-sm text-text placeholder:text-text3"
            placeholder="e.g. SaaS, marketing automation"
          />
        </Field>
      </div>
      <div className="mt-2 text-xs text-text3">
        Comma-separated keywords: only RSS items whose title or summary contain a keyword are kept (if empty, the latest
        items from the feed are used).
      </div>

      <div className="mt-8 text-sm font-semibold text-text">Top competitors</div>
      <div className="mt-1 text-sm text-text2">
        Add competitor name + URL. Market Research will scan these sites and compare messaging.
      </div>

      <div className="mt-4 space-y-2">
        {competitors.map((c, idx) => (
          <div key={idx} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
            <input
              value={c.name}
              onChange={(e) => {
                const v = e.target.value;
                setCompetitors((prev) => prev.map((x, i) => (i === idx ? { ...x, name: v } : x)));
              }}
              className="w-full rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-sm text-text placeholder:text-text3"
              placeholder="Competitor name"
            />
            <input
              value={c.website_url}
              onChange={(e) => {
                const v = e.target.value;
                setCompetitors((prev) => prev.map((x, i) => (i === idx ? { ...x, website_url: v } : x)));
              }}
              className="w-full rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-sm text-text placeholder:text-text3"
              placeholder="https://competitor.com"
            />
            <button
              type="button"
              onClick={() => setCompetitors((prev) => prev.filter((_, i) => i !== idx))}
              className="rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-xs font-semibold text-text transition hover:bg-surface3 hover:border-border2"
              disabled={competitors.length <= 1}
              title={competitors.length <= 1 ? "Keep at least 1 row" : "Remove"}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCompetitors((prev) => [...prev, { name: "", website_url: "" }])}
          className="rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-xs font-semibold text-text transition hover:bg-surface3 hover:border-border2"
        >
          + Add competitor
        </button>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving || !canSave}
          className="rounded-[var(--radius2)] bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#5b52ee] disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={load}
          disabled={saving || loading}
          className="rounded-[var(--radius2)] border border-border bg-surface2 px-4 py-2 text-sm font-semibold text-text transition hover:bg-surface3 hover:border-border2 disabled:opacity-60"
        >
          Reload
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold tracking-[0.3px] text-text2">
        {label}
      </div>
      {children}
    </div>
  );
}

