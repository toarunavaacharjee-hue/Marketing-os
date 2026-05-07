import { type AttendeeEnrichmentInput, type EnrichedStakeholder } from "@/lib/prospectResearch/stakeholderTypes";

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

function pdlToStakeholder(input: AttendeeEnrichmentInput, res: PdlPersonEnrichResponse): EnrichedStakeholder {
  const status = typeof (res as any)?.status === "number" ? (res as any).status : undefined;
  const data = (res as any)?.data ?? res;
  const err = (res as any)?.error;

  if (status && status !== 200) {
    return {
      email: input.email,
      source: "pdl",
      matchStatus: status === 404 ? "not_found" : "error",
      note: asStr(err?.message) || asStr(err) || `PDL status ${status}`
    };
  }

  // PDL sometimes returns top-level object without status, so treat missing "full_name" as not found.
  const fullName = asStr(data?.full_name);
  if (!fullName) {
    return { email: input.email, source: "pdl", matchStatus: "not_found", fullName: input.fullName };
  }

  const location = [asStr(data?.location_name), asStr(data?.region), asStr(data?.country)]
    .filter(Boolean)
    .join(", ");

  return {
    email: input.email,
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

async function callPdlEnrich(apiKey: string, params: Record<string, string>): Promise<PdlPersonEnrichResponse> {
  const url = new URL("https://api.peopledatalabs.com/v5/person/enrich");
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }
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
  return { status: res.status, ...json };
}

async function callPdlIdentify(apiKey: string, params: Record<string, string>): Promise<any> {
  const url = new URL("https://api.peopledatalabs.com/v5/person/identify");
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { "X-Api-Key": apiKey }
  });
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    // ignore
  }
  return { status: res.status, ...json };
}

export async function enrichAttendeesWithPdlInputs(args: {
  attendees: AttendeeEnrichmentInput[];
  /** Optional company hint to increase name-only matching. */
  companyHint?: string;
  /** Optional website/domain hint to increase name-only matching. */
  websiteHint?: string;
}): Promise<EnrichedStakeholder[]> {
  const apiKey = process.env.PDL_API_KEY?.trim();
  if (!apiKey) {
    return args.attendees.map((a) => ({
      email: a.email,
      source: "pdl",
      matchStatus: "error",
      note: "Missing PDL_API_KEY."
    }));
  }

  // Keep concurrency low to avoid rate limit spikes.
  const out: EnrichedStakeholder[] = [];
  for (const attendee of args.attendees) {
    try {
      const company = attendee.companyName?.trim() || args.companyHint?.trim() || args.websiteHint?.trim() || "";
      const email = attendee.email?.trim() || "";
      const profile = attendee.linkedinUrl?.trim() || "";
      const name = attendee.fullName?.trim() || "";

      // Best identifiers first: LinkedIn profile → email → name+company → name-only (identify then enrich).
      if (profile) {
        const res = await callPdlEnrich(apiKey, { profile });
        out.push(pdlToStakeholder(attendee, res));
        continue;
      }
      if (email) {
        const res = await callPdlEnrich(apiKey, { email });
        out.push(pdlToStakeholder(attendee, res));
        continue;
      }
      if (name && company) {
        const res = await callPdlEnrich(apiKey, { name, company });
        out.push(pdlToStakeholder(attendee, res));
        continue;
      }
      if (name) {
        const ident = await callPdlIdentify(apiKey, { name, company });
        if (ident?.status !== 200 || !Array.isArray(ident?.matches) || ident.matches.length === 0) {
          out.push({ email: attendee.email, fullName: attendee.fullName, source: "pdl", matchStatus: "not_found" });
          continue;
        }
        const best = ident.matches[0] ?? {};
        const pdlId = asStr(best.pdl_id) || asStr(best.id) || asStr(best.person_id);
        const bestProfile =
          asStr(best.linkedin_url) ||
          asStr(best.profile) ||
          (Array.isArray(best.profiles)
            ? best.profiles.map((x: any) => asStr(x)).find((u: any) => u && String(u).includes("linkedin.com"))
            : undefined);
        if (pdlId) {
          const res = await callPdlEnrich(apiKey, { pdl_id: pdlId });
          out.push(pdlToStakeholder(attendee, res));
          continue;
        }
        if (bestProfile) {
          const res = await callPdlEnrich(apiKey, { profile: bestProfile });
          out.push(pdlToStakeholder(attendee, res));
          continue;
        }
        out.push({ email: attendee.email, fullName: attendee.fullName, source: "pdl", matchStatus: "not_found" });
        continue;
      }

      out.push({ email: attendee.email, fullName: attendee.fullName, source: "pdl", matchStatus: "error", note: "Missing name/email/profile." });
    } catch (e) {
      out.push({
        email: attendee.email,
        fullName: attendee.fullName,
        source: "pdl",
        matchStatus: "error",
        note: e instanceof Error ? e.message : "Network error"
      });
    }
  }
  return out;
}

/** Back-compat helper: enrich by email list. */
export async function enrichAttendeesWithPdl(emails: string[]): Promise<EnrichedStakeholder[]> {
  return enrichAttendeesWithPdlInputs({
    attendees: emails.map((email) => ({ email }))
  });
}

