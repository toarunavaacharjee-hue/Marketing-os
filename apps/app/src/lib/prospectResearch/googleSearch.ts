export type GoogleOrganicResult = {
  position?: number;
  title?: string;
  link?: string;
  displayed_link?: string;
  snippet?: string;
  source?: string;
  date?: string;
};

export type GoogleSearchResponse = {
  search_metadata?: { status?: string };
  search_parameters?: Record<string, unknown>;
  organic_results?: GoogleOrganicResult[];
  error?: string;
};

export async function googleSearchViaSerpApi(args: {
  query: string;
  location?: string;
  num?: number;
}): Promise<{ ok: true; results: GoogleOrganicResult[] } | { ok: false; error: string }> {
  const apiKey = process.env.SERPAPI_API_KEY?.trim();
  if (!apiKey) return { ok: false, error: "Missing SERPAPI_API_KEY." };

  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", args.query);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("num", String(args.num ?? 5));
  if (args.location?.trim()) url.searchParams.set("location", args.location.trim());

  try {
    const res = await fetch(url.toString(), { method: "GET" });
    const data = (await res.json()) as GoogleSearchResponse;
    if (!res.ok) {
      return { ok: false, error: data?.error || `Search failed (${res.status}).` };
    }
    const organic = Array.isArray(data.organic_results) ? data.organic_results : [];
    return { ok: true, results: organic };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }
}

