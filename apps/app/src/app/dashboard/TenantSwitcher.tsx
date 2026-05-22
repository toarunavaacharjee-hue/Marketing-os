"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type CompanyOption = { id: string; name: string };
export type ProductOption = { id: string; name: string; company_id: string; public_id?: string | null };
export type CompanyOptionWithPublicId = { id: string; name: string; public_id?: string | null };

export function TenantSwitcher({
  companies,
  products,
  selectedCompanyId,
  selectedProductId
}: {
  companies: CompanyOptionWithPublicId[];
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
    <div className="px-4 pb-2.5 pt-3">
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-on-dark/40">
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
        className="w-full rounded-sm border border-transparent bg-sidebar-active px-3 py-2 text-sm text-on-dark shadow-none focus:border-primary focus:outline-none focus:shadow-focus"
      >
        {companies.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
            {c.public_id ? ` · ${c.public_id}` : ""}
          </option>
        ))}
      </select>

      <div className="mb-1.5 mt-2.5 text-[10px] font-semibold uppercase tracking-wider text-on-dark/40">
        Product
      </div>
      <select
        value={selectedIsValid ? (selectedProductId ?? "") : ""}
        disabled={loading || companyProducts.length === 0}
        onChange={(e) => setContext(selectedCompanyId ?? "", e.target.value)}
        className="w-full rounded-sm border border-transparent bg-sidebar-active px-3 py-2 text-sm text-on-dark shadow-none focus:border-primary focus:outline-none focus:shadow-focus"
      >
        {!selectedIsValid && companyProducts.length > 0 ? (
          <option value="" disabled>
            Select product…
          </option>
        ) : null}
        {companyProducts.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
            {p.public_id ? ` · ${p.public_id}` : ""}
          </option>
        ))}
      </select>

      <div className="mt-2.5 flex items-center gap-2 text-[11px] text-on-dark/45">
        <a
          href="/dashboard/settings/product#add-product"
          className="font-medium text-primary-light/80 hover:text-primary-light hover:underline transition-colors"
        >
          + Add product
        </a>
        <span>·</span>
        <a
          href="/onboarding"
          className="font-medium text-primary-light/80 hover:text-primary-light hover:underline transition-colors"
        >
          New company
        </a>
      </div>
    </div>
  );
}

