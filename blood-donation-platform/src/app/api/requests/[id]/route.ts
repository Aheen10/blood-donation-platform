import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { includesId, sameId } from "@/lib/utils";
import BloodRequest from "@/models/BloodRequest";
import DonationHistory from "@/models/DonationHistory";
import User from "@/models/User";

// GET /api/requests/:id
// Patient name and phone are shown only to the requester, admins and donors who accepted.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const g = await requireUser({ allowRestricted: true });
  if (!g.ok) return g.res;
  if (!mongoose.isValidObjectId(params.id)) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }
  await connectDB();

  const r = await BloodRequest.findById(params.id).lean();
  if (!r) return NextResponse.json({ error: "Request not found" }, { status: 404 });

  const isRequester = sameId(r.requester, g.user.id);
  const isAdmin = g.user.role === "admin";
  const isAccepted = includesId(r.acceptedDonors, g.user.id);
  const privileged = isRequester || isAdmin || isAccepted;

  const requester = await User.findById(r.requester).select("name").lean();
  const confirmed = await DonationHistory.find({ request: r._id }).select("donor").lean();
  const confirmedIds = confirmed.map((c) => String(c.donor));

  let acceptedDonors: { id: string; name: string; confirmed: boolean }[] | undefined;
  if (isRequester || isAdmin) {
    const users = await User.find({ _id: { $in: r.acceptedDonors } }).select("name").lean();
    acceptedDonors = users.map((u) => ({
      id: String(u._id),
      name: u.name,
      confirmed: confirmedIds.includes(String(u._id)),
    }));
  }

  return NextResponse.json({
    id: String(r._id),
    shareCode: r.shareCode,
    bloodGroup: r.bloodGroup,
    unitsNeeded: r.unitsNeeded,
    urgency: r.urgency,
    hospitalName: r.hospitalName,
    city: r.city,
    status: r.status,
    note: r.note ?? null,
    createdAt: r.createdAt,
    patientName: privileged ? r.patientName : null,
    contactPhone: privileged ? r.contactPhone : null,
    requester: { id: String(r.requester), name: requester?.name ?? "Unknown" },
    acceptedCount: r.acceptedDonors?.length ?? 0,
    confirmedCount: confirmedIds.length,
    viewerRole: isRequester ? "requester" : isAdmin ? "admin" : isAccepted ? "accepted_donor" : "other",
    myResponse: isAccepted ? "accepted" : includesId(r.declinedDonors, g.user.id) ? "declined" : null,
    iDonated: confirmedIds.includes(g.user.id),
    acceptedDonors: acceptedDonors ?? null,
  });
}