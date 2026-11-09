import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { runEscalation } from "@/lib/matching";

export const dynamic = "force-dynamic";

function authorized(req: Request): boolean | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return null; // not configured

  const header = req.headers.get("x-cron-secret") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const a = Buffer.from(header);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Called by a scheduler (cron job, GitHub Actions, scripts/agent-loop.mjs) with the CRON_SECRET.
async function handle(req: Request) {
  const ok = authorized(req);
  if (ok === null) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const summary = await runEscalation();
  return NextResponse.json(summary);
}

export const GET = handle;
export const POST = handle;