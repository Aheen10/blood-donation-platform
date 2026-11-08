import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { liveLocationSchema } from "@/lib/validators";
import User from "@/models/User";
import DonorProfile from "@/models/DonorProfile";

// POST /api/location { lat, lng }
// The browser sends this about once a minute while the app is open and the donor has
// switched live location sharing on. Only the latest point is stored.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }
  await connectDB();
  const userId = String(session.user.id);
  const user = await User.findById(userId).select("isBlocked");
  if (!user || user.isBlocked) {
    return NextResponse.json({ error: "Account is not active" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = liveLocationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid location" }, { status: 400 });
  }

  // Only update when the donor has sharing switched on
  const result = await DonorProfile.updateOne(
    { user: userId, shareLiveLocation: true },
    { $set: { liveLocation: { lat: parsed.data.lat, lng: parsed.data.lng, updatedAt: new Date() } } }
  );
  if (result.matchedCount === 0) {
    return NextResponse.json({ error: "Live location sharing is off" }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}