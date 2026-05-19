import MarketResearchClient from "@/app/dashboard/market-research/MarketResearchClient";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";

export default async function MarketResearchPage() {
  const selected = await getDefaultEnvironmentIdForSelectedProduct();
  return <MarketResearchClient environmentId={selected?.environmentId ?? null} />;
}
