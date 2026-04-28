import { NextResponse } from "next/server";
import { processProspectResearchQueue } from "@/lib/prospectResearch/prospectResearchWorker";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

function isFromVercelCron(req: Request): boolean {
  return req.headers.get("x-vercel-cron") === "1";
}

async function runWorker(req: Request) {
  // Allow Vercel Cron, and allow local/dev manual trigger.
  if (process.env.NODE_ENV === "production" && !isFromVercelCron(req)) {
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
