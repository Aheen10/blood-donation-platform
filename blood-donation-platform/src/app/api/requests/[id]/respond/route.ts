import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { respondSchema } from "@/lib/validators";
import { sameId } from "@/lib/utils";
import { notifyInApp } from "@/lib/notifications";
import { DONATION_GAP_DAYS } from "@/lib/constants";
import BloodRequest from "@/models/BloodRequest";
import DonorProfile from "@/models/DonorProfile";

const DAY_MS = 24 * 60 * 60 * 1000;

// POST /api/requests/:id/respond  { action: "accept" | "decline" }
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const g = await requireUser();
  if (!g.ok) return g.res;
  if (!mongoose.isValidObjectId(params.id)) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  const parsed = respondSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  await connectDB();
  const request = await BloodRequest.findById(params.id);
  if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });

  if (sameId(request.requester, g.user.id)) {
    return NextResponse.json({ error: "You cannot respond to your own request" }, { status: 400 });
  }
  if (request.status !== "open" && request.status !== "matched") {
    return NextResponse.json({ error: "This request is no longer open" }, { status: 409 });
  }

  if (parsed.data.action === "decline") {
    await BloodRequest.updateOne(
      { _id: request._id },
      { $addToSet: { declinedDonors: g.user.id }, $pull: { acceptedDonors: g.user.id } }
    );
    return NextResponse.json({ ok: true, myResponse: "declined" });
  }

  // ---- accept ----
  const profile = await DonorProfile.findOne({ user: g.user.id });
  if (!profile) {
    return NextResponse.json({ error: "Only registered donors can accept a request" }, { status: 403 });
  }
  if (!profile.isAvailable || !profile.consentToContact) {
    return NextResponse.json({ error: "Your availability is paused" }, { status: 403 });
  }

  // TODO (after Jesan's tasks are merged): use isEligible() from lib/eligibility.ts
  // and canDonate() from lib/compatibility.ts instead of this inline check.
  const nextEligible =
    profile.nextEligibleDate ??
    (profile.lastDonationDate
      ? new Date(profile.lastDonationDate.getTime() + DONATION_GAP_DAYS * DAY_MS)
      : null);
  if (nextEligible && nextEligible.getTime() > Date.now()) {
    return NextResponse.json(
      { error: `You can donate again after ${nextEligible.toDateString()}` },
      { status: 403 }
    );
  }

  await BloodRequest.updateOne(
    { _id: request._id },
    {
      $addToSet: { acceptedDonors: g.user.id },
      $pull: { declinedDonors: g.user.id },
      ...(request.status === "open" ? { $set: { status: "matched" } } : {}),
    }
  );

  await notifyInApp({
    userId: String(request.requester),
    type: "donor_accepted",
    title: "A donor can help",
    message: `${g.user.name} accepted your ${request.bloodGroup} request at ${request.hospitalName}. You can now message them.`,
    requestId: String(request._id),
  });

  return NextResponse.json({ ok: true, myResponse: "accepted" });
}