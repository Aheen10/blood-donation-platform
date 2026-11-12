import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { levelFor } from "@/lib/points";
import DonorProfile from "@/models/DonorProfile";
import PointLog from "@/models/PointLog";

// GET /api/points : the logged-in member's reward points, level and recent history
export async function GET() {
  const g = await requireUser({ allowRestricted: true });
  if (!g.ok) return g.res;
  await connectDB();

  const profile = (await DonorProfile.findOne({ user: g.user.id })
    .select("points totalDonations")
    .lean()) as unknown as { points?: number; totalDonations?: number } | null;

  if (!profile) return NextResponse.json({ isDonor: false });

  const points = profile.points ?? 0;
  const logs = (await PointLog.find({ user: g.user.id })
    .sort({ createdAt: -1 })
    .limit(10)
    .select("points reason note createdAt")
    .lean()) as unknown as { points: number; reason: string; note?: string; createdAt: Date }[];

  return NextResponse.json({
    isDonor: true,
    points,
    totalDonations: profile.totalDonations ?? 0,
    level: levelFor(points),
    history: logs.map((l) => ({
      points: l.points,
      reason: l.reason,
      note: l.note || "",
      date: new Date(l.createdAt).toISOString().slice(0, 10),
    })),
  });
}