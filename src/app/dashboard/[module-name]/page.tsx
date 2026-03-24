import { notFound } from "next/navigation";

const MODULES: Record<string, string> = {
  "command-centre": "Command Centre",
  "market-research": "Market Research",
  "icp-segmentation": "ICP Segmentation",
  "positioning-studio": "Positioning Studio",
  "messaging-artifacts": "Messaging & Artifacts",
  campaigns: "Campaigns",
  "gtm-planner": "GTM Planner",
  events: "Events",
  "content-studio": "Content Studio",
  "social-media": "Social Media",
  "design-assets": "Design & Assets",
  presentations: "Presentations",
  "website-pages": "Website & Pages",
  analytics: "Analytics",
  battlecards: "Battlecards",
  "sales-intelligence": "Sales Intelligence",
  "customer-insights": "Customer Insights",
  "ai-copilot": "AI Copilot"
};

export default function ModulePage({
  params
}: {
  params: { "module-name": string };
}) {
  const slug = params["module-name"];
  const title = MODULES[slug];
  if (!title) return notFound();

  return (
    <div>
      <div
        className="text-4xl"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {title}
      </div>
      <div className="mt-2 text-sm text-[#9090b0]">
        This module page is live at <span className="text-[#f0f0f8]">/dashboard/{slug}</span>.
      </div>

      <div className="mt-8 rounded-2xl border border-[#2a2e3f] bg-[#141420] p-6">
        <div className="text-sm text-[#f0f0f8]">Coming next</div>
        <div className="mt-2 text-sm text-[#9090b0]">
          We’ll build out the full UI + data flows for this module.
        </div>
      </div>
    </div>
  );
}

