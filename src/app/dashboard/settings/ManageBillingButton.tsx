"use client";

import { useState } from "react";
import { Button } from "@/lib/ui";

export function ManageBillingButton() {
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      window.alert(
        "Billing is not enabled yet. Your account is currently in free mode."
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

