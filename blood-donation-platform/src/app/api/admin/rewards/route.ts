import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { rewardEventSchema } from "@/lib/validators";
import { getRewardEventForYear, getRewardWinners } from "@/lib/rewards";
import { currentYearMonth } from "@/lib/leaderboard";
import RewardEvent from "@/models/RewardEvent";

// GET /api/admin/rewards?year=2026 -> the event for that year and who currently wins which gift
export async function GET(req: Request) {
  const g = await requireUser({ roles: ["admin"], allowRestricted: true });
  if (!g.ok) return g.res;

  const yearParam = Number(new URL(req.url).searchParams.get("year"));
  const year = Number.isInteger(yearParam) && yearParam > 2000 ? yearParam : currentYearMonth().year;

  const event = await getRewardEventForYear(year);
  const winners = event ? await getRewardWinners(year) : [];
  return NextResponse.json({ year, event, winners });
}

// POST /api/admin/rewards -> create the year-end event (one per year)
export async function POST(req: Request) {
  const g = await requireUser({ roles: ["admin"] });
  if (!g.ok) return g.res;

  const parsed = rewardEventSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const d = parsed.data;

  await connectDB();
  if (await RewardEvent.exists({ year: d.year })) {
    return NextResponse.json({ error: `An event for ${d.year} already exists` }, { status: 409 });
  }

  const ranks = d.rewards.map((r) => r.rank);
  if (new Set(ranks).size !== ranks.length) {
    return NextResponse.json({ error: "Each rank can have only one gift" }, { status: 400 });
  }

  await RewardEvent.create({
    year: d.year,
    title: d.title,
    description: d.description,
    eventDate: new Date(d.eventDate),
    venue: d.venue,
    rewards: d.rewards,
    createdBy: g.user.id,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}