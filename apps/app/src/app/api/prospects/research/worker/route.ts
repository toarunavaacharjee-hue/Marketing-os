import { NextResponse } from "next/server";
import { processProspectResearchQueue } from "@/lib/prospectResearch/prospectResearchWorker";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

function isAuthorized(req: Request): boolean {
  // In production: accept requests from Vercel Cron OR a caller presenting the CRON_SECRET.
  // The x-vercel-cron header alone is not a security guarantee — anyone can set it.
  // Add CRON_SECRET to environment variables (generate with: openssl rand -hex 32).
  if (process.env.NODE_ENV !== "production") return true;

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader === `Bearer ${cronSecret}`) return true;
  }

  // Fall back to Vercel's cron header as a secondary signal (Vercel strips external headers).
  return req.headers.get("x-vercel-cron") === "1";
}

async function runWorker(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const result = await processProspectResearchQueue();
  if (result.kind === "db_error") {
    return NextResponse.json({ error: result.message }, { status: 500 });
  }
  if (result.kind === "empty") {
    return NextResponse.json({ ok: true, processed: 0 });
  }
  if (result.kind === "key_error") {
    return NextResponse.json({ ok: false, error: result.error, processed: 0 });
  }
  return NextResponse.json({ ok: true, processed: result.processed });
}

export async function GET(req: Request) {
  return runWorker(req);
}

export async function POST(req: Request) {
  return runWorker(req);
}
