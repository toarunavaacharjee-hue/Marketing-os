"use client";

import { useState } from "react";
import { Button } from "@/lib/ui";
import { publishedSelfServeMonthlyListSummary } from "@/lib/marketingPricing";

export function ManageBillingButton() {
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      window.alert(
        `Billing is not enabled yet. Your workspace is in operator-managed mode until Stripe checkout is wired.\n\n${publishedSelfServeMonthlyListSummary()}`
      );
    }, 250);
  }

  return (
    <div>
      <Button
        type="button"
        onClick={onClick}
        disabled={loading}
        variant="secondary"
      >
        {loading ? "Please wait..." : "Billing (coming soon)"}
      </Button>
    </div>
  );
}

