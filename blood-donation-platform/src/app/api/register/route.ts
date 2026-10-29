import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { registerSchema } from "@/lib/validators";
import User from "@/models/User";
import DonorProfile from "@/models/DonorProfile";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const data = parsed.data;

  if (data.role === "donor" && !data.donor) {
    return NextResponse.json({ error: "Donor details are required" }, { status: 400 });
  }

  await connectDB();

  const exists = await User.findOne({ email: data.email.toLowerCase() });
  if (exists) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await User.create({
    name: data.name,
    email: data.email,
    phone: data.phone,
    passwordHash,
    role: data.role,
  });

  if (data.role === "donor" && data.donor) {
    const last = data.donor.lastDonationDate ? new Date(data.donor.lastDonationDate) : null;
    await DonorProfile.create({
      user: user._id,
      bloodGroup: data.donor.bloodGroup,
      city: data.donor.city,
      area: data.donor.area,
      location: { lat: data.donor.lat, lng: data.donor.lng },
      lastDonationDate: last,
      // TODO (teammate task): replace with calculateNextEligibleDate(last) from lib/eligibility.ts
      nextEligibleDate: null,
      consentToContact: data.donor.consentToContact,
    });
  }

  return NextResponse.json({ id: String(user._id), role: user.role }, { status: 201 });
}