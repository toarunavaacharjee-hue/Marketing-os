"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Connector = {
  enabled: boolean;
  account_id: string;
  notes: string;
};

type IntegrationSettings = {
  ga4: Connector;
  hubspot: Connector;
  linkedin_ads: Connector;
  meta_ads: Connector;
};

const MODULE = "integrations";
const KEY = "connectors";

const defaultConnector: Connector = {
  enabled: false,
  account_id: "",
  notes: ""
};

const defaultSettings: IntegrationSettings = {
  ga4: { ...defaultConnector },
  hubspot: { ...defaultConnector },
  linkedin_ads: { ...defaultConnector },
  meta_ads: { ...defaultConnector }
};

export default function IntegrationsClient({
  environmentId
}: {
  environmentId: string;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [settings, setSettings] = useState<IntegrationSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("module_settings")
      .select("value_json")
      .eq("environment_id", environmentId)
      .eq("module", MODULE)
      .eq("key", KEY)
      .maybeSingle();

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const value = (data?.value_json ?? null) as Partial<IntegrationSettings> | null;
    if (value) {
      setSettings({
        ga4: { ...defaultConnector, ...(value.ga4 ?? {}) },
        hubspot: { ...defaultConnector, ...(value.hubspot ?? {}) },
        linkedin_ads: { ...defaultConnector, ...(value.linkedin_ads ?? {}) },
        meta_ads: { ...defaultConnector, ...(value.meta_ads ?? {}) }
      });
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [environmentId]);

  async function save() {
    setSaving(true);
    setSaved(null);
    setError(null);
    const { error } = await supabase.from("module_settings").upsert({
      environment_id: environmentId,
      module: MODULE,
      key: KEY,
      value_json: settings
    });
    setSaving(false);
    if (error) setError(error.message);
    else setSaved("Integration settings saved.");
  }

  function update<K extends keyof IntegrationSettings>(
    key: K,
    patch: Partial<IntegrationSettings[K]>
  ) {
    setSettings((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...patch }
    }));
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-6">
        <div className="text-lg text-[#f0f0f8]">Integrations</div>
        <div className="mt-1 text-sm text-[#9090b0]">
          Configure platform connections for this selected product (Default environment).
        </div>

        {loading ? <div className="mt-4 text-sm text-[#9090b0]">Loading…</div> : null}
        {error ? (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        ) : null}
        {saved ? (
          <div className="mt-4 rounded-xl border border-[#b8ff6c]/30 bg-[#b8ff6c]/10 px-3 py-2 text-sm text-[#b8ff6c]">
            {saved}
          </div>
        ) : null}

        <div className="mt-5 grid gap-3">
          <ConnectorCard
            title="Google Analytics (GA4)"
            value={settings.ga4}
            onChange={(patch) => update("ga4", patch)}
            placeholder="GA4 property id"
          />
          <ConnectorCard
            title="HubSpot"
            value={settings.hubspot}
            onChange={(patch) => update("hubspot", patch)}
            placeholder="HubSpot portal id"
          />
          <ConnectorCard
            title="LinkedIn Ads"
            value={settings.linkedin_ads}
            onChange={(patch) => update("linkedin_ads", patch)}
            placeholder="LinkedIn ad account id"
          />
          <ConnectorCard
            title="Meta Ads"
            value={settings.meta_ads}
            onChange={(patch) => update("meta_ads", patch)}
            placeholder="Meta ad account id"
          />
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="mt-5 rounded-xl bg-[#b8ff6c] px-4 py-2 text-sm font-medium text-black disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save integrations"}
        </button>
      </div>
    </div>
  );
}

function ConnectorCard({
  title,
  value,
  onChange,
  placeholder
}: {
  title: string;
  value: Connector;
  onChange: (patch: Partial<Connector>) => void;
  placeholder: string;
}) {
  return (
    <div className="rounded-2xl border border-[#2a2e3f] bg-black/20 p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-[#f0f0f8]">{title}</div>
        <label className="flex items-center gap-2 text-xs text-[#9090b0]">
          <input
            type="checkbox"
            checked={value.enabled}
            onChange={(e) => onChange({ enabled: e.target.checked })}
          />
          Enabled
        </label>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <input
          value={value.account_id}
          onChange={(e) => onChange({ account_id: e.target.value })}
          placeholder={placeholder}
          className="w-full rounded-xl border border-[#2a2e3f] bg-[#141420] px-3 py-2 text-sm text-[#f0f0f8]"
        />
        <input
          value={value.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="Notes / token reference"
          className="w-full rounded-xl border border-[#2a2e3f] bg-[#141420] px-3 py-2 text-sm text-[#f0f0f8]"
        />
      </div>
    </div>
  );
}

