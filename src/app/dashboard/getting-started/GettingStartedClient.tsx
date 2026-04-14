"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { GTM_TEMPLATES, type GtmTemplate } from "@/lib/gtmTemplates";

type OnboardingState = {
  applied_template_ids: string[];
  completed_steps: string[];
  updated_at: string;
};

const MODULE = "work";
const KEY = "onboarding";

function uniq(xs: string[]) {
  return Array.from(new Set(xs));
}

export function GettingStartedClient({ environmentId }: { environmentId: string }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<OnboardingState>({
    applied_template_ids: [],
    completed_steps: [],
    updated_at: new Date(0).toISOString()
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("module_settings")
      .select("value_json")
      .eq("environment_id", environmentId)
      .eq("module", MODULE)
      .eq("key", KEY)
      .maybeSingle();
    if (error) setError(error.message);
    const v = (data?.value_json ?? null) as Partial<OnboardingState> | null;
    if (v && typeof v === "object") {
      setState({
        applied_template_ids: Array.isArray(v.applied_template_ids) ? v.applied_template_ids.map(String) : [],
        completed_steps: Array.isArray(v.completed_steps) ? v.completed_steps.map(String) : [],
        updated_at: typeof v.updated_at === "string" ? v.updated_at : new Date().toISOString()
      });
    }
    setLoading(false);
  }, [environmentId, supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  async function persist(next: OnboardingState) {
    setSaving(true);
    setError(null);
    const { error } = await supabase.from("module_settings").upsert({
      environment_id: environmentId,
      module: MODULE,
      key: KEY,
      value_json: next
    });
    setSaving(false);
    if (error) setError(error.message);
  }

  function markDone(step: string) {
    const next: OnboardingState = {
      ...state,
      completed_steps: uniq([...state.completed_steps, step]),
      updated_at: new Date().toISOString()
    };
    setState(next);
    void persist(next);
  }

  async function applyTemplate(t: GtmTemplate) {
    setSaving(true);
    setError(null);
    try {
      // 1) Segments table inserts (optional)
      const segs = (t.payload.segments ?? null) as
        | Array<{ name: string; pnf_score?: number; pain_points?: string[]; notes?: string }>
        | null;
      if (segs?.length) {
        const rows = segs.map((s) => ({
          environment_id: environmentId,
          name: s.name,
          pnf_score: typeof s.pnf_score === "number" ? s.pnf_score : 0,
          pain_points: Array.isArray(s.pain_points) ? s.pain_points : [],
          notes: s.notes ?? null
        }));
        const { error } = await supabase.from("segments").insert(rows);
        if (error) throw new Error(error.message);
      }

      // 2) Module settings seeds
      const entries: Array<{ module: string; key: string; value_json: unknown }> = [];
      if (t.payload.gtm_planner) entries.push({ module: "gtm_planner", key: "plan", value_json: t.payload.gtm_planner });
      if (t.payload.campaigns) entries.push({ module: "campaigns", key: "kanban", value_json: t.payload.campaigns });
      if (t.payload.content_studio) entries.push({ module: "content_studio", key: "workspace", value_json: t.payload.content_studio });
      if (t.payload.events) entries.push({ module: "events", key: "workspace", value_json: t.payload.events });

      for (const e of entries) {
        const { error } = await supabase.from("module_settings").upsert({
          environment_id: environmentId,
          module: e.module,
          key: e.key,
          value_json: e.value_json
        });
        if (error) throw new Error(error.message);
      }

      const next: OnboardingState = {
        ...state,
        applied_template_ids: uniq([...state.applied_template_ids, t.id]),
        updated_at: new Date().toISOString()
      };
      setState(next);
      await persist(next);
      markDone("template_applied");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to apply template.");
    } finally {
      setSaving(false);
    }
  }

  const steps = [
    {
      id: "segments",
      title: "Add ICP segments",
      desc: "Import your ICP doc or apply a starter pack. Segments power Positioning Studio generation.",
      ctaLabel: "Open ICP Segmentation",
      href: "/dashboard/icp-segmentation"
    },
    {
      id: "positioning",
      title: "Generate Positioning canvas",
      desc: "Generate from segments and refine the wedge + differentiation.",
      ctaLabel: "Open Positioning Studio",
      href: "/dashboard/positioning-studio"
    },
    {
      id: "work",
      title: "Track everything in the Marketing Workbench",
      desc: "Your unified workbench. Run AI actions and add updates.",
      ctaLabel: "Open Marketing Workbench",
      href: "/dashboard/work"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm text-text2">
            <Link href="/dashboard" className="text-primary hover:underline">
              ← Command Centre
            </Link>
          </div>
          <h1 className="mt-2 text-4xl text-heading" style={{ fontFamily: "var(--font-heading)" }}>
            Getting started
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-text2">
            A guided first run plus playbook templates. This stays PMM-native (strategy → launch → learn) and does not
            replace your CRM or automation tools.
          </p>
          <div className="mt-2 text-xs text-text3">
            {loading ? "Loading…" : saving ? "Saving…" : "Saved per product."}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text2">
          Templates applied: <span className="text-heading">{state.applied_template_ids.length}</span>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red">{error}</div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {steps.map((s) => {
          const done = state.completed_steps.includes(s.id);
          return (
            <div key={s.id} className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium text-heading">{s.title}</div>
                <span className={`text-xs ${done ? "text-emerald-200" : "text-text2"}`}>
                  {done ? "Done" : "—"}
                </span>
              </div>
              <div className="mt-2 text-sm text-text2">{s.desc}</div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={s.href}
                  className="rounded-xl bg-amber px-4 py-2 text-sm font-medium text-black"
                  onClick={() => markDone(s.id)}
                >
                  {s.ctaLabel}
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6">
        <div className="text-lg text-heading">Template Library</div>
        <div className="mt-1 text-sm text-text2">
          Apply a template to seed workbenches. You can edit everything afterwards.
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {GTM_TEMPLATES.map((t) => {
            const applied = state.applied_template_ids.includes(t.id);
            return (
              <div key={t.id} className="rounded-2xl border border-border bg-surface2 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-heading">{t.name}</div>
                    <div className="mt-1 text-sm text-text2">{t.description}</div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {t.targets.map((x, i) => (
                        <span
                          key={`${t.id}-${i}`}
                          className="rounded bg-surface3 px-2 py-1 text-[10px] uppercase text-text2"
                        >
                          {x.kind.replaceAll("_", " ")}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={saving || applied}
                    onClick={() => void applyTemplate(t)}
                    className={`shrink-0 rounded-xl px-4 py-2 text-sm font-medium ${
                      applied
                        ? "border border-border bg-transparent text-text2"
                        : "bg-primary text-white hover:bg-primary-dark disabled:opacity-60"
                    }`}
                  >
                    {applied ? "Applied" : "Apply"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 text-xs text-text3">
          Tip: After applying templates, open{" "}
          <Link href="/dashboard/work" className="text-primary hover:underline">
            Marketing Workbench
          </Link>{" "}
          and run AI actions from ICP Segments and Positioning.
        </div>
      </div>
    </div>
  );
}

