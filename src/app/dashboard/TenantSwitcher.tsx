"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
  const syncFixRef = useRef(false);

  const companyProducts = useMemo(() => {
    if (!selectedCompanyId) return [];
    return products.filter((p) => p.company_id === selectedCompanyId);
  }, [products, selectedCompanyId]);

  const selectedIsValid = useMemo(() => {
    if (!selectedProductId) return false;
    return companyProducts.some((p) => p.id === selectedProductId);
  }, [companyProducts, selectedProductId]);

  useEffect(() => {
    syncFixRef.current = false;
  }, [selectedCompanyId]);

  useEffect(() => {
    if (syncFixRef.current) return;
    if (!selectedCompanyId || companyProducts.length === 0) return;
    if (selectedIsValid) return;
    const first = companyProducts[0];
    if (!first) return;
    syncFixRef.current = true;
    void setContext(selectedCompanyId, first.id);
  }, [selectedCompanyId, companyProducts, selectedIsValid, selectedProductId]);

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
      <div className="mb-2 text-xs uppercase tracking-wider text-text2">
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
        className="w-full rounded-xl border border-border bg-surface2 px-3 py-2 text-sm text-text shadow-sm focus:border-accent focus:outline-none"
      >
        {companies.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <div className="mb-2 mt-3 text-xs uppercase tracking-wider text-text2">
        Product
      </div>
      <select
        value={selectedIsValid ? (selectedProductId ?? "") : ""}
        disabled={loading || companyProducts.length === 0}
        onChange={(e) => setContext(selectedCompanyId ?? "", e.target.value)}
        className="w-full rounded-xl border border-border bg-surface2 px-3 py-2 text-sm text-text shadow-sm focus:border-accent focus:outline-none"
      >
        {!selectedIsValid && companyProducts.length > 0 ? (
          <option value="" disabled>
            Select product…
          </option>
        ) : null}
        {companyProducts.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      <div className="mt-3 space-y-1 text-xs text-text2">
        <div>
          Want to add a product to this company?{" "}
          <a className="font-medium text-accent hover:underline" href="/dashboard/settings/product#add-product">
            Add product
          </a>
        </div>
        <div>
          Need a new company?{" "}
          <a className="font-medium text-accent hover:underline" href="/onboarding">
            Create company
          </a>
        </div>
      </div>
    </div>
  );
}

