import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { runEscalation } from "@/lib/matching";

// POST /api/admin/agent -> admin runs the escalation agent now, ignoring the waiting time (for demos and emergencies)
export async function POST() {
  const g = await requireUser({ roles: ["admin"] });
  if (!g.ok) return g.res;

  const summary = await runEscalation({ force: true });
  return NextResponse.json(summary);
}