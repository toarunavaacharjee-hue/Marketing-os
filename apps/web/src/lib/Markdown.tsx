"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function Markdown({ content }: { content: string }) {
  return (
    <div className="prose max-w-none prose-p:my-2 prose-li:my-1 prose-hr:my-4 prose-hr:border-border prose-headings:text-heading prose-p:text-text prose-li:text-text prose-strong:text-heading prose-a:text-link prose-a:no-underline hover:prose-a:underline prose-blockquote:border-border prose-blockquote:text-text2 prose-code:text-heading prose-table:text-text prose-th:text-heading prose-td:text-text prose-thead:border-border prose-tr:border-border prose-td:border-border/60 prose-th:border-border/70">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}

