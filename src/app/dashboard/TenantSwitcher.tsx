"use client";

import { useMemo, useState } from "react";

export type CompanyOption = { id: string; name: string };
export type ProductOption = { id: string; name: string; company_id: string };

export function TenantSwitcher({
  companies,
  products,
  selectedCompanyId,
  selectedProductId
}: {
  companies: CompanyOption[];
  products: ProductOption[];
  selectedCompanyId: string | null;
  selectedProductId: string | null;
}) {
  const [loading, setLoading] = useState(false);

  const companyProducts = useMemo(() => {
    if (!selectedCompanyId) return [];
    return products.filter((p) => p.company_id === selectedCompanyId);
  }, [products, selectedCompanyId]);

  async function setContext(nextCompanyId: string, nextProductId: string | null) {
    setLoading(true);
    await fetch("/api/context/select", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        companyId: nextCompanyId,
        productId: nextProductId ?? undefined
      })
    });
    window.location.href = "/dashboard";
  }

  return (
    <div className="px-4 pb-3 pt-3">
      <div className="mb-2 text-xs uppercase tracking-wider text-[#9090b0]">
        Workspace
      </div>

      <select
        value={selectedCompanyId ?? ""}
        disabled={loading || companies.length === 0}
        onChange={(e) => {
          const nextCompanyId = e.target.value;
          const firstProduct =
            products.find((p) => p.company_id === nextCompanyId) ?? null;
          setContext(nextCompanyId, firstProduct?.id ?? null);
        }}
        className="w-full rounded-xl border border-[#2a2e3f] bg-black/20 px-3 py-2 text-sm text-[#f0f0f8]"
      >
        {companies.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <div className="mt-3 mb-2 text-xs uppercase tracking-wider text-[#9090b0]">
        Product
      </div>
      <select
        value={selectedProductId ?? ""}
        disabled={loading || companyProducts.length === 0}
        onChange={(e) => setContext(selectedCompanyId ?? "", e.target.value)}
        className="w-full rounded-xl border border-[#2a2e3f] bg-black/20 px-3 py-2 text-sm text-[#f0f0f8]"
      >
        {companyProducts.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      <div className="mt-3 text-xs text-[#9090b0]">
        Need a new company/product?{" "}
        <a className="text-[#7c6cff]" href="/dashboard/onboarding">
          Create one
        </a>
      </div>
    </div>
  );
}

