import { type EnrichedStakeholder } from "@/lib/prospectResearch/stakeholderTypes";

type PdlPersonEnrichResponse =
  | { status: number; data?: any; error?: any }
  | { data?: any; error?: any; status?: number };

function asStr(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t ? t : undefined;
}

function pickLinkedinUrl(p: any): string | undefined {
  const direct =
    asStr(p?.linkedin_url) ||
    asStr(p?.linkedin) ||
    (Array.isArray(p?.profiles) ? p.profiles.map((x: any) => asStr(x)).find((u: any) => u && String(u).includes("linkedin.com")) : undefined);
  return direct;
}

function pdlToStakeholder(email: string, res: PdlPersonEnrichResponse): EnrichedStakeholder {
  const status = typeof (res as any)?.status === "number" ? (res as any).status : undefined;
  const data = (res as any)?.data ?? res;
  const err = (res as any)?.error;

  if (status && status !== 200) {
    return {
      email,
      source: "pdl",
      matchStatus: status === 404 ? "not_found" : "error",
      note: asStr(err?.message) || asStr(err) || `PDL status ${status}`
    };
  }

  // PDL sometimes returns top-level object without status, so treat missing "full_name" as not found.
  const fullName = asStr(data?.full_name);
  if (!fullName) {
    return { email, source: "pdl", matchStatus: "not_found" };
  }

  const location = [asStr(data?.location_name), asStr(data?.region), asStr(data?.country)]
    .filter(Boolean)
    .join(", ");

  return {
    email,
    source: "pdl",
    matchStatus: "matched",
    matchScore: typeof data?.match_score === "number" ? data.match_score : undefined,
    fullName,
    firstName: asStr(data?.first_name),
    lastName: asStr(data?.last_name),
    title: asStr(data?.job_title),
    seniority: asStr(data?.job_seniority),
    department: asStr(data?.job_department),
    companyName: asStr(data?.job_company_name),
    companyDomain: asStr(data?.job_company_website) || asStr(data?.job_company_domain) || asStr(data?.job_company_url),
    linkedinUrl: pickLinkedinUrl(data),
    location: location || undefined
  };
}

export async function enrichAttendeesWithPdl(emails: string[]): Promise<EnrichedStakeholder[]> {
  const apiKey = process.env.PDL_API_KEY?.trim();
  if (!apiKey) {
    return emails.map((email) => ({
      email,
      source: "pdl",
      matchStatus: "error",
      note: "Missing PDL_API_KEY."
    }));
  }

  // Keep concurrency low to avoid rate limit spikes.
  const out: EnrichedStakeholder[] = [];
  for (const email of emails) {
    try {
      const url = new URL("https://api.peopledatalabs.com/v5/person/enrich");
      url.searchParams.set("email", email);

      const res = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "X-Api-Key": apiKey
        }
      });

      let json: any = null;
      try {
        json = await res.json();
      } catch {
        // ignore
      }

      out.push(pdlToStakeholder(email, { status: res.status, ...json }));
    } catch (e) {
      out.push({
        email,
        source: "pdl",
        matchStatus: "error",
        note: e instanceof Error ? e.message : "Network error"
      });
    }
  }
  return out;
}

