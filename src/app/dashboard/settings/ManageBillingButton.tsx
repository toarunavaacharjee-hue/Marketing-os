"use client";

import { useState } from "react";
import { Button } from "@/lib/ui";

export function ManageBillingButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/stripe/customer-portal", { method: "POST" });
    const data = (await res.json()) as { url?: string; error?: string };
    setLoading(false);

    if (!res.ok || !data.url) {
      setError(data.error ?? "Could not open billing portal.");
      return;
    }
    window.location.href = data.url;
  }

  return (
    <div>
      <Button
        type="button"
        onClick={onClick}
        disabled={loading}
        variant="secondary"
      >
        {loading ? "Opening billing..." : "Manage / cancel subscription"}
      </Button>
      {error ? <div className="mt-2 text-xs text-red-200">{error}</div> : null}
    </div>
  );
}

