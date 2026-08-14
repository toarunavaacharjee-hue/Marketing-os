import { NextResponse } from "next/server";

const TIMEOUT_MS = 8_000;

async function checkSupabase(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { ok: false, latencyMs: 0, error: "SUPABASE env vars missing" };

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const start = Date.now();
  try {
    const res = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: controller.signal
    }).finally(() => clearTimeout(t));
    const latencyMs = Date.now() - start;
    if (!res.ok && res.status !== 200) {
      return { ok: false, latencyMs, error: `HTTP ${res.status}` };
    }
    return { ok: true, latencyMs };
  } catch (e) {
    clearTimeout(t);
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: e instanceof Error ? e.message : "fetch failed"
    };
  }
}

async function checkAnthropicReachable(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const start = Date.now();
  try {
    // HEAD request — just check the host is reachable, no key needed
    const res = await fetch("https://api.anthropic.com/v1/models", {
      method: "GET",
      headers: { "anthropic-version": "2023-06-01", "x-api-key": "ping" },
      signal: controller.signal
    }).finally(() => clearTimeout(t));
    const latencyMs = Date.now() - start;
    // 401 = reached the API (key invalid but host is up); anything else means network issue
    return { ok: res.status === 401 || res.status === 200, latencyMs };
  } catch (e) {
    clearTimeout(t);
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: e instanceof Error ? e.message : "fetch failed"
    };
  }
}

export async function GET() {
  const [supabase, anthropic] = await Promise.all([checkSupabase(), checkAnthropicReachable()]);

  const allOk = supabase.ok && anthropic.ok;
  return NextResponse.json(
    {
      ok: allOk,
      timestamp: new Date().toISOString(),
      services: { supabase, anthropic }
    },
    { status: allOk ? 200 : 503 }
  );
}
