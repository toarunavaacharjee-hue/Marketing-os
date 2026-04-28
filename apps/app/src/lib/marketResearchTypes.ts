export type MarketResearchScanResult = {
  signals?: Array<{
    title: string;
    description: string;
    source: string;
    recency: string;
    severity: "info" | "opportunity" | "risk";
  }>;
  opportunity_map?: Array<{
    segment: string;
    opportunity_score: number;
    tam_signal: "Low" | "Medium" | "High" | "Very High" | "Growing";
    competition: "Low" | "Medium" | "High";
  }>;
  monitoring_sources?: Array<{
    label: string;
    status: "ok" | "warn" | "err";
    note?: string;
  }>;
};
