import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { loadUserGuideMarkdown } from "@/lib/loadUserGuide";

export const metadata = {
  title: "Help & documentation"
};

export default function DashboardHelpPage() {
  const markdown = loadUserGuideMarkdown();

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl text-heading" style={{ fontFamily: "var(--font-heading)" }}>
            Help & documentation
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-text2">
            How each workspace module fits together, practical tips, and industry practices for product marketers.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex shrink-0 items-center justify-center hs-card2 px-4 py-2 text-sm font-semibold text-heading transition hover:bg-surface3"
        >
          ← Command Centre
        </Link>
      </div>

      <article
        className="prose prose-sm max-w-none text-text prose-headings:scroll-mt-24 prose-headings:font-semibold prose-headings:text-heading prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-p:text-text prose-li:text-text prose-strong:text-heading prose-a:text-link prose-a:no-underline hover:prose-a:underline prose-table:border prose-table:border-border prose-th:bg-surface2 prose-th:text-heading prose-td:border prose-td:border-border prose-code:rounded prose-code:bg-surface2 prose-code:px-1 prose-code:py-0.5 prose-code:text-[13px] prose-code:text-heading prose-pre:bg-surface2 prose-pre:border prose-pre:border-border prose-hr:border-border"
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
      </article>
    </div>
  );
}
