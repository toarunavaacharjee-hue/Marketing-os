import { redirect } from "next/navigation";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import { EventsClient } from "./EventsClient";

export default async function EventsPage() {
  const ctx = await getDefaultEnvironmentIdForSelectedProduct();
  if (!ctx) redirect("/onboarding-v2");
  return <EventsClient environmentId={ctx.environmentId} />;
}
