import { NextResponse } from "next/server";
import { resolveWorkspaceAnthropicKey } from "@/lib/anthropic/resolveWorkspaceAnthropicKey";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import { extractTextFromBuffer } from "@/lib/extractDocumentText";
import { parseJsonObject } from "@/lib/extractJsonObject";

type AnthropicMessageResponse = {
  content?: Array<{ type?: string; text?: string }>;
  error?: { message?: string };
};

const MAX_BYTES = 8 * 1024 * 1024;

function asStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
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

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 8 MB)." }, { status: 400 });
    }

    const fname = file.name || "upload";
    const buffer = Buffer.from(await file.arrayBuffer());

    let text: string;
    try {
      text = await extractTextFromBuffer(buffer, fname);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Could not read file." },
        { status: 400 }
      );
    }

    if (!text.trim()) {
      return NextResponse.json({ error: "No readable text in this file." }, { status: 400 });
    }

    const keyRes = await resolveWorkspaceAnthropicKey();
    if (!keyRes.ok) {
      return NextResponse.json({ error: keyRes.error }, { status: keyRes.status });
    }
    const anthropicKey = keyRes.key;

    const system = `You extract marketing event / conference plans from documents (agendas, exhibitor kits, registration PDFs).
Output ONLY valid JSON (no markdown fences).

Schema:
{
  "events": [
    {
      "name": string (official event title),
      "event_url": string (full https URL to official event or registration page only if explicitly printed in the document — otherwise ""),
      "event_date": string (dates or timeframe as written, e.g. "February 19-20, 2025" — use "" if unknown),
      "location": string (city, venue, or virtual — "" if unknown),
      "booth_or_track": string (booth #, track name, pavilion — "" if unknown),
      "attendees_suggested": string (comma- or newline-separated names/roles only if the document lists speakers, panelists, or company attendees — otherwise ""),
      "timeline_notes": string (short bullet-style lines: registration deadlines, setup/teardown, session blocks, show hours — infer from agenda if possible, else ""),
      "logistics_notes": string (short lines for hotel, parking, badge pickup, dress code, shipping address — only if stated, else ""),
      "commercial_notes": string (sponsor level, package, pricing, PO — only if stated, else ""),
      "lead_capture_notes": string (scanner vendor, app name, lead retrieval process — only if stated, else ""),
      "speaking_notes": string (session title, time, stage — only if stated, else ""),
      "meetings_notes": string (sponsor meeting allotments, VIP programs — only if in document, else ""),
      "competitor_notes": string (named competing exhibitors/sponsors only if listed, else ""),
      "follow_up_notes": string (organizer post-event process only if described, else ""),
      "goals": string (2-4 sentences: why marketing/sales attends, pipeline, awareness, meetings — infer if needed),
      "tasks": string[] (8-14 concrete prep tasks: travel, booth, collateral, meetings booked, lead capture, follow-up)
    }
  ]
}

Rules:
- If the document describes one conference, return exactly one object in "events".
- If multiple distinct events appear, return up to 3.
- Tasks must be short imperative lines (e.g. "Book booth electricity order").
- Do not invent a specific booth number unless stated.
- Do not invent URLs, attendee names, competitor names, or commercial figures; use "" when not in the document.`;

    const userPrompt = `Filename: ${fname}

Document:
${text}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        temperature: 0.2,
        system,
        messages: [{ role: "user", content: userPrompt }]
      })
    });

    const data = (await res.json()) as AnthropicMessageResponse;
    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error?.message ?? "Anthropic request failed." },
        { status: 502 }
      );
    }

    const out = data.content?.find((c) => c.type === "text")?.text ?? "";
    const parsed = parseJsonObject(out);
    if (!parsed) {
      return NextResponse.json({ error: "Could not parse event data from this document." }, { status: 502 });
    }

    const rawList = parsed.events;
    if (!Array.isArray(rawList) || rawList.length === 0) {
      return NextResponse.json({ error: "No events found in the document." }, { status: 400 });
    }

    const drafts = rawList.slice(0, 3).map((item) => {
      const row = item as Record<string, unknown>;
      const taskArr = row.tasks;
      const taskLabels = Array.isArray(taskArr)
        ? taskArr.map((x) => asStr(x)).filter(Boolean).slice(0, 20)
        : [];
      return {
        name: asStr(row.name),
        eventUrl: asStr(row.event_url),
        eventDate: asStr(row.event_date),
        location: asStr(row.location),
        boothOrTrack: asStr(row.booth_or_track),
        attendees: asStr(row.attendees_suggested),
        timeline: asStr(row.timeline_notes),
        logistics: asStr(row.logistics_notes),
        commercialNotes: asStr(row.commercial_notes),
        leadCaptureNotes: asStr(row.lead_capture_notes),
        speakingNotes: asStr(row.speaking_notes),
        meetingsNotes: asStr(row.meetings_notes),
        competitorNotes: asStr(row.competitor_notes),
        followUpNotes: asStr(row.follow_up_notes),
        goals: asStr(row.goals),
        taskLabels
      };
    });

    const valid = drafts.filter((d) => d.name.length > 0);
    if (valid.length === 0) {
      return NextResponse.json({ error: "Could not infer an event name from the document." }, { status: 400 });
    }

    return NextResponse.json({ ok: true, events: valid });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
