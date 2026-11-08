import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { donorProfileSchema, donorProfileUpdateSchema } from "@/lib/validators";
import User from "@/models/User";
import DonorProfile from "@/models/DonorProfile";

type Guard =
  | { ok: false; response: NextResponse }
  | { ok: true; userId: string; restricted: boolean };

// Logged-in, not banned. Restricted users may read but not change anything.
async function guard(): Promise<Guard> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false, response: NextResponse.json({ error: "Login required" }, { status: 401 }) };
  }
  await connectDB();
  const user = await User.findById(session.user.id).select("isBlocked isRestricted");
  if (!user || user.isBlocked) {
    return { ok: false, response: NextResponse.json({ error: "Account is not active" }, { status: 403 }) };
  }
  return { ok: true, userId: String(session.user.id), restricted: Boolean(user.isRestricted) };
}

async function readJson(req: Request): Promise<unknown | null> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

// GET /api/donor-profile -> my donor profile, or { profile: null } if I am not a donor yet
export async function GET() {
  const g = await guard();
  if (!g.ok) return g.response;

  const p = await DonorProfile.findOne({ user: g.userId }).lean();
  if (!p) return NextResponse.json({ profile: null });

  return NextResponse.json({
    profile: {
      bloodGroup: p.bloodGroup,
      city: p.city,
      area: p.area ?? "",
      lat: p.location?.lat ?? null,
      lng: p.location?.lng ?? null,
      lastDonationDate: p.lastDonationDate ?? null,
      isAvailable: Boolean(p.isAvailable),
      showOnLeaderboard: Boolean(p.showOnLeaderboard),
    },
  });
}

// POST /api/donor-profile -> become a donor (create my donor profile)
export async function POST(req: Request) {
  const g = await guard();
  if (!g.ok) return g.response;
  if (g.restricted) {
    return NextResponse.json({ error: "Your account is restricted" }, { status: 403 });
  }

  const body = await readJson(req);
  const parsed = donorProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const d = parsed.data;

  const exists = await DonorProfile.findOne({ user: g.userId });
  if (exists) {
    return NextResponse.json({ error: "You already have a donor profile" }, { status: 409 });
  }

  const last = d.lastDonationDate ? new Date(d.lastDonationDate) : null;
  await DonorProfile.create({
    user: g.userId,
    bloodGroup: d.bloodGroup,
    city: d.city,
    area: d.area,
    location: { lat: d.lat, lng: d.lng },
    lastDonationDate: last,
    // TODO (teammate task): replace with calculateNextEligibleDate(last) from lib/eligibility.ts
    nextEligibleDate: null,
    consentToContact: d.consentToContact,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

// PATCH /api/donor-profile { isAvailable?, showOnLeaderboard? } -> pause or resume donating, hide from leaderboard
export async function PATCH(req: Request) {
  const g = await guard();
  if (!g.ok) return g.response;
  if (g.restricted) {
    return NextResponse.json({ error: "Your account is restricted" }, { status: 403 });
  }

  const body = await readJson(req);
  const parsed = donorProfileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const update: Record<string, boolean> = {};
  if (parsed.data.isAvailable !== undefined) update.isAvailable = parsed.data.isAvailable;
  if (parsed.data.showOnLeaderboard !== undefined) update.showOnLeaderboard = parsed.data.showOnLeaderboard;
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const result = await DonorProfile.updateOne({ user: g.userId }, { $set: update });
  if (result.matchedCount === 0) {
    return NextResponse.json({ error: "You are not registered as a donor yet" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}