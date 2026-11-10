import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import DonorProfile from "@/models/DonorProfile";
import { requireUser } from "@/lib/session";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
const GAP_DAYS = 90;

const donorSchema = z.object({
  bloodGroup: z.enum(BLOOD_GROUPS),
  city: z.string().trim().min(2, "City is required").max(80),
  area: z.string().trim().max(80).optional(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  lastDonationDate: z.string().optional().nullable(),
  isAvailable: z.boolean(),
  consentToContact: z.boolean(),
  showOnLeaderboard: z.boolean(),
});

const updateSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  phone: z
    .string()
    .trim()
    .max(20)
    .optional()
    .refine((v) => !v || v.length >= 6, "Phone must be at least 6 characters"),
  donor: donorSchema.optional(),
});

function getId(auth: { user: unknown }) {
  return (auth.user as { id: string }).id;
}

export async function GET() {
  const auth = await requireUser({ allowRestricted: true });
  if (!auth.ok) return auth.res;
  await connectDB();
  const id = getId(auth);

  const u = (await User.findById(id).select("name email phone role").lean()) as unknown as {
    name: string;
    email: string;
    phone?: string;
    role: string;
  } | null;
  if (!u) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const d = (await DonorProfile.findOne({ user: id }).lean()) as unknown as {
    bloodGroup: string;
    city: string;
    area?: string;
    location?: { lat?: number; lng?: number };
    lastDonationDate?: Date;
    nextEligibleDate?: Date;
    isAvailable: boolean;
    consentToContact: boolean;
    showOnLeaderboard: boolean;
  } | null;

  return NextResponse.json({
    name: u.name,
    email: u.email,
    phone: u.phone || "",
    role: u.role,
    donor: d
      ? {
          bloodGroup: d.bloodGroup,
          city: d.city,
          area: d.area || "",
          lat: d.location?.lat ?? null,
          lng: d.location?.lng ?? null,
          lastDonationDate: d.lastDonationDate ? new Date(d.lastDonationDate).toISOString().slice(0, 10) : "",
          nextEligibleDate: d.nextEligibleDate ? new Date(d.nextEligibleDate).toISOString().slice(0, 10) : "",
          isAvailable: !!d.isAvailable,
          consentToContact: !!d.consentToContact,
          showOnLeaderboard: !!d.showOnLeaderboard,
        }
      : null,
  });
}

export async function PATCH(req: Request) {
  const auth = await requireUser({ allowRestricted: true });
  if (!auth.ok) return auth.res;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;

  await connectDB();
  const id = getId(auth);

  // Email must stay unique
  const clash = await User.findOne({ email: data.email, _id: { $ne: id } }).select("_id").lean();
  if (clash) return NextResponse.json({ error: "This email is already used by another account" }, { status: 409 });

  await User.updateOne(
    { _id: id },
    data.phone
      ? { $set: { name: data.name, email: data.email, phone: data.phone } }
      : { $set: { name: data.name, email: data.email }, $unset: { phone: "" } }
  );

  if (data.donor) {
    const d = data.donor;
    const set: Record<string, unknown> = {
      bloodGroup: d.bloodGroup,
      city: d.city,
      area: d.area || "",
      isAvailable: d.isAvailable,
      consentToContact: d.consentToContact,
      showOnLeaderboard: d.showOnLeaderboard,
    };
    const unset: Record<string, ""> = {};

    if (d.lat != null && d.lng != null) set.location = { lat: d.lat, lng: d.lng };

    if (d.lastDonationDate) {
      const last = new Date(d.lastDonationDate);
      if (isNaN(last.getTime())) return NextResponse.json({ error: "Invalid last donation date" }, { status: 400 });
      if (last.getTime() > Date.now()) {
        return NextResponse.json({ error: "Last donation date cannot be in the future" }, { status: 400 });
      }
      set.lastDonationDate = last;
      set.nextEligibleDate = new Date(last.getTime() + GAP_DAYS * 24 * 60 * 60 * 1000);
    } else {
      unset.lastDonationDate = "";
      unset.nextEligibleDate = "";
    }

    const res = await DonorProfile.updateOne(
      { user: id },
      Object.keys(unset).length ? { $set: set, $unset: unset } : { $set: set }
    );
    if (res.matchedCount === 0) {
      return NextResponse.json({ error: "Donor profile not found. Create it from the Donate page first." }, { status: 404 });
    }
  }

  return NextResponse.json({ ok: true });
}