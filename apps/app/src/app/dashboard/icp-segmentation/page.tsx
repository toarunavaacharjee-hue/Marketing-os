import { redirect } from "next/navigation";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import IcpSegmentationClient from "@/app/dashboard/icp-segmentation/IcpSegmentationClient";

export default async function IcpSegmentationPage() {
  const ctx = await getDefaultEnvironmentIdForSelectedProduct();
  if (!ctx) redirect("/dashboard/onboarding");

  return <IcpSegmentationClient environmentId={ctx.environmentId} />;
}
