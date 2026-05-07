import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import { enrichAttendeesWithGoogle } from "@/lib/prospectResearch/attendeeEnrichment";
import { normalizeEmailList, type AttendeeEnrichmentInput } from "@/lib/prospectResearch/stakeholderTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

function asStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function deriveNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  const parts = local
    .replace(/[_-]+/g, ".")
    .split(".")
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 4);
  const name = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(" ");
  return name.trim();
}

function parseRawAttendees(raw: string): AttendeeEnrichmentInput[] {
  const lines = raw
    .split(/\r?\n/g)
    .map((l) => l.trim())
    .filter(Boolean);
  const out: AttendeeEnrichmentInput[] = [];

  for (const line of lines) {
    const email = normalizeEmailList(line)[0];
    const linkedin = (line.match(/https?:\/\/[^\s)]+/g) || []).find((u) =>
      u.toLowerCase().includes("linkedin.com")
    );
    const cleaned = line
      .replace(email ?? "", "")
      .replace(linkedin ?? "", "")
      .replace(/[()<>]/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();

    // crude split: "Name — Title" / "Name - Title" / "Name, Title"
    const parts = cleaned
      .split(/\s[-—–]\s|,\s+/g)
      .map((p) => p.trim())
      .filter(Boolean);
    const fullName = parts[0] ?? "";
    const title = parts.length > 1 ? parts.slice(1).join(" — ") : "";

    if (!email && !linkedin && !fullName) continue;

    const derivedName = !fullName && email ? deriveNameFromEmail(email) : "";

    out.push({
      email: email || undefined,
      linkedinUrl: linkedin || undefined,
      fullName: (fullName || derivedName) || undefined,
      title: title || undefined
    });
  }
  return out;
}

export async function POST(req: Request) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const ctx = await getDefaultEnvironmentIdForSelectedProduct();
    if (!ctx) return NextResponse.json({ error: "No product selected." }, { status: 400 });

    const body = (await req.json()) as {
      attendees?: AttendeeEnrichmentInput[];
      raw?: string;
      companyName?: string;
      websiteUrl?: string;
    };

    const attendees: AttendeeEnrichmentInput[] = Array.isArray(body.attendees)
      ? body.attendees
          .filter((a) => a && typeof a === "object")
          .map((a: any) => {
            const email = asStr(a.email).toLowerCase();
            const fullName = asStr(a.fullName);
            return {
              fullName: (fullName || (email ? deriveNameFromEmail(email) : "")) || undefined,
              email: email || undefined,
              title: asStr(a.title) || undefined,
              companyName: asStr(a.companyName) || undefined,
              companyDomain: asStr(a.companyDomain) || undefined,
              linkedinUrl: asStr(a.linkedinUrl) || undefined
            };
          })
      : parseRawAttendees(asStr(body.raw));

    const companyName = asStr(body.companyName);
    const websiteUrl = asStr(body.websiteUrl);

    if (!attendees.length) {
      return NextResponse.json(
        { error: "Paste attendee names/emails/LinkedIn URLs (one per line), or send attendees[]." },
        { status: 400 }
      );
    }
    if (attendees.length > 20) return NextResponse.json({ error: "Max 20 attendees at a time." }, { status: 400 });

    const stakeholders = await enrichAttendeesWithGoogle({
      attendees,
      companyHint: companyName || undefined,
      websiteHint: websiteUrl || undefined
    });

    return NextResponse.json({ ok: true, stakeholders });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

