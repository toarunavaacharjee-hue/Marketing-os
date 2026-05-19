"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type LastProductUpdate = {
  updated_at: string;
  product_name: string;
};

type ProductStalenessResult = {
  isStale: boolean;
  productName: string | null;
  updatedAt: string | null;
  dismiss: () => void;
  refresh: () => Promise<void>;
};

export function useProductStaleness(environmentId: string): ProductStalenessResult {
  const [isStale, setIsStale] = useState(false);
  const [productName, setProductName] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const supabase = createSupabaseBrowserClient();

  const fetchData = useCallback(async () => {
    // Step 1: Get the product_id for this environment
    const { data: envRow, error: envErr } = await supabase
      .from("product_environments")
      .select("product_id")
      .eq("id", environmentId)
      .maybeSingle<{ product_id: string }>();

    if (envErr || !envRow) {
      return;
    }

    const productId = envRow.product_id;

    // Step 2: Get the product's current updated_at and name
    const { data: productRow, error: productErr } = await supabase
      .from("products")
      .select("updated_at, name")
      .eq("id", productId)
      .maybeSingle<{ updated_at: string; name: string }>();

    if (productErr || !productRow) {
      return;
    }

    setProductName(productRow.name);
    setUpdatedAt(productRow.updated_at);

    // Step 3: Get the last_product_update from module_settings
    const { data: settingRow, error: settingErr } = await supabase
      .from("module_settings")
      .select("value_json")
      .eq("environment_id", environmentId)
      .eq("module", "product_sync")
      .eq("key", "last_product_update")
      .maybeSingle<{ value_json: LastProductUpdate }>();

    if (settingErr) {
      return;
    }

    // If no last_product_update exists yet, not stale (first sync hasn't happened)
    if (!settingRow || !settingRow.value_json) {
      setIsStale(false);
      return;
    }

    const lastUpdate = settingRow.value_json;

    // Compare: stale if product's updated_at is newer than last_product_update
    const productUpdated = new Date(productRow.updated_at).getTime();
    const lastSynced = new Date(lastUpdate.updated_at).getTime();

    setIsStale(productUpdated > lastSynced);
  }, [environmentId, supabase]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const dismiss = useCallback(() => {
    if (!updatedAt || !productName) return;

    const valueJson: LastProductUpdate = {
      updated_at: updatedAt,
      product_name: productName
    };

    void supabase
      .from("module_settings")
      .upsert(
        {
          environment_id: environmentId,
          module: "product_sync",
          key: "last_product_update",
          value_json: valueJson
        },
        { onConflict: "environment_id,module,key" }
      )
      .then(() => {
        setIsStale(false);
      });
  }, [environmentId, productName, updatedAt, supabase]);

  const refresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return { isStale, productName, updatedAt, dismiss, refresh };
}
