import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { confirmDonationSchema } from "@/lib/validators";
import { includesId, sameId } from "@/lib/utils";
import { notifyInApp } from "@/lib/notifications";
import { DONATION_GAP_DAYS } from "@/lib/constants";
import BloodRequest from "@/models/BloodRequest";
import DonationHistory from "@/models/DonationHistory";
import DonorProfile from "@/models/DonorProfile";

const DAY_MS = 24 * 60 * 60 * 1000;

// POST /api/requests/:id/confirm-donation  { donorId }
// Only the requester can confirm that an accepted donor really donated.
// Confirmed donations feed the monthly dashboard and the yearly ranking.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const g = await requireUser();
  if (!g.ok) return g.res;
  if (!mongoose.isValidObjectId(params.id)) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  const parsed = confirmDonationSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !mongoose.isValidObjectId(parsed.data.donorId)) {
    return NextResponse.json({ error: "Invalid donor" }, { status: 400 });
  }
  const donorId = parsed.data.donorId;

  await connectDB();
  const request = await BloodRequest.findById(params.id);
  if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  if (!sameId(request.requester, g.user.id)) {
    return NextResponse.json({ error: "Only the requester can confirm a donation" }, { status: 403 });
  }
  if (!includesId(request.acceptedDonors, donorId)) {
    return NextResponse.json({ error: "This donor has not accepted the request" }, { status: 400 });
  }

  const already = await DonationHistory.findOne({ donor: donorId, request: request._id });
  if (already) return NextResponse.json({ error: "Already confirmed" }, { status: 409 });

  const now = new Date();
  await DonationHistory.create({
    donor: donorId,
    request: request._id,
    confirmedBy: g.user.id,
    donatedAt: now,
    hospitalName: request.hospitalName,
  });

  // TODO (after Jesan's task is merged): use calculateNextEligibleDate(now) from lib/eligibility.ts
  await DonorProfile.updateOne(
    { user: donorId },
    {
      $set: {
        lastDonationDate: now,
        nextEligibleDate: new Date(now.getTime() + DONATION_GAP_DAYS * DAY_MS),
      },
      $inc: { totalDonations: 1 },
    }
  );

  const confirmedCount = await DonationHistory.countDocuments({ request: request._id });
  const fulfilled = confirmedCount >= request.unitsNeeded;
  if (fulfilled) {
    await BloodRequest.updateOne(
      { _id: request._id },
      { $set: { status: "fulfilled", fulfilledAt: now } }
    );
  }

  await notifyInApp({
    userId: donorId,
    type: "request_fulfilled",
    title: "Thank you for donating",
    message: `Your donation at ${request.hospitalName} was confirmed. It counts toward this year's ranking.`,
    requestId: String(request._id),
  });

  return NextResponse.json({ ok: true, confirmedCount, fulfilled });
}