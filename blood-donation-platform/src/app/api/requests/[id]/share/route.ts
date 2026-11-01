import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { shareSchema } from "@/lib/validators";
import { sameId } from "@/lib/utils";
import { notifyInApp } from "@/lib/notifications";
import { MAX_SHARES_PER_REQUEST } from "@/lib/constants";
import BloodRequest from "@/models/BloodRequest";
import User from "@/models/User";

// POST /api/requests/:id/share  { email? }
// Anyone who can see an open request may forward it to a friend.
//  - with `email` of a registered user: the friend gets an in-app notification
//  - without email (or friend not registered): returns the public link to send by WhatsApp / Messenger / SMS
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const g = await requireUser();
  if (!g.ok) return g.res;
  if (!mongoose.isValidObjectId(params.id)) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = shareSchema.safeParse(body ?? {});
  if (!parsed.success) return NextResponse.json({ error: "Invalid email" }, { status: 400 });

  await connectDB();
  const request = await BloodRequest.findById(params.id);
  if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  if (request.status !== "open" && request.status !== "matched") {
    return NextResponse.json({ error: "This request is no longer open" }, { status: 409 });
  }
  if (request.shareCount >= MAX_SHARES_PER_REQUEST) {
    return NextResponse.json({ error: "Share limit reached for this request" }, { status: 429 });
  }

  const shareUrl = `${new URL(req.url).origin}/r/${request.shareCode}`;

  if (!parsed.data.email) {
    return NextResponse.json({ delivered: false, shareUrl });
  }

  const friend = await User.findOne({ email: parsed.data.email.toLowerCase() }).select("_id isBlocked");
  if (!friend || friend.isBlocked) {
    return NextResponse.json({
      delivered: false,
      shareUrl,
      message: "This email is not registered. Send them the link instead.",
    });
  }
  if (sameId(friend._id, g.user.id)) {
    return NextResponse.json({ error: "You cannot share with yourself" }, { status: 400 });
  }

  await notifyInApp({
    userId: String(friend._id),
    type: "request_shared",
    title: `${g.user.name} shared a blood request`,
    message: `${request.bloodGroup} blood needed at ${request.hospitalName}, ${request.city}. Open: ${shareUrl}`,
    requestId: String(request._id),
  });
  await BloodRequest.updateOne({ _id: request._id }, { $inc: { shareCount: 1 } });

  return NextResponse.json({ delivered: true, shareUrl });
}