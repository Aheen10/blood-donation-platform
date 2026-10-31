import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { sendMessageSchema } from "@/lib/validators";
import { includesId, sameId } from "@/lib/utils";
import { notifyInApp } from "@/lib/notifications";
import BloodRequest from "@/models/BloodRequest";
import Message from "@/models/Message";
import User from "@/models/User";

const MAX_MESSAGES_PER_MINUTE = 20;

/**
 * A chat is always between the requester and ONE donor of that request.
 * The donor must have accepted or been notified. Nobody else can read or write it.
 */
function isAllowedPair(
  request: { requester: unknown; acceptedDonors?: unknown[]; notifiedDonors?: unknown[] },
  a: string,
  b: string
): boolean {
  const aIsRequester = sameId(request.requester, a);
  const bIsRequester = sameId(request.requester, b);
  if (aIsRequester === bIsRequester) return false; // exactly one side must be the requester
  const donor = aIsRequester ? b : a;
  return includesId(request.acceptedDonors, donor) || includesId(request.notifiedDonors, donor);
}

// GET /api/requests/:id/messages?with=<userId>
// Donors may omit `with` (they talk to the requester).
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const g = await requireUser({ allowRestricted: true });
  if (!g.ok) return g.res;
  if (!mongoose.isValidObjectId(params.id)) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }
  await connectDB();

  const request = await BloodRequest.findById(params.id).lean();
  if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });

  const withParam = new URL(req.url).searchParams.get("with");
  const otherId = withParam || (sameId(request.requester, g.user.id) ? null : String(request.requester));
  if (!otherId || !mongoose.isValidObjectId(otherId)) {
    return NextResponse.json({ error: "Choose who to talk to" }, { status: 400 });
  }
  if (!isAllowedPair(request, g.user.id, otherId)) {
    return NextResponse.json({ error: "You cannot chat with this user on this request" }, { status: 403 });
  }

  const messages = await Message.find({
    request: request._id,
    $or: [
      { from: g.user.id, to: otherId },
      { from: otherId, to: g.user.id },
    ],
  })
    .sort({ createdAt: 1 })
    .limit(200)
    .lean();

  // Mark incoming messages as read
  await Message.updateMany(
    { request: request._id, from: otherId, to: g.user.id, readAt: null },
    { $set: { readAt: new Date() } }
  );

  const other = await User.findById(otherId).select("name").lean();

  return NextResponse.json({
    with: { id: otherId, name: other?.name ?? "Unknown" },
    messages: messages.map((m) => ({
      id: String(m._id),
      mine: sameId(m.from, g.user.id),
      text: m.text,
      createdAt: m.createdAt,
    })),
  });
}

// POST /api/requests/:id/messages  { to, text }
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const g = await requireUser(); // restricted users cannot send messages
  if (!g.ok) return g.res;
  if (!mongoose.isValidObjectId(params.id)) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  const parsed = sendMessageSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !mongoose.isValidObjectId(parsed.data.to)) {
    return NextResponse.json({ error: "Message is empty or too long" }, { status: 400 });
  }
  const { to, text } = parsed.data;

  await connectDB();
  const request = await BloodRequest.findById(params.id).lean();
  if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  if (request.status === "closed" || request.status === "flagged") {
    return NextResponse.json({ error: "This request is closed" }, { status: 409 });
  }
  if (!isAllowedPair(request, g.user.id, to)) {
    return NextResponse.json({ error: "You cannot chat with this user on this request" }, { status: 403 });
  }

  const recipient = await User.findById(to).select("isBlocked").lean();
  if (!recipient || recipient.isBlocked) {
    return NextResponse.json({ error: "This user is not available" }, { status: 404 });
  }

  // Spam control
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
  const recentCount = await Message.countDocuments({ from: g.user.id, createdAt: { $gte: oneMinuteAgo } });
  if (recentCount >= MAX_MESSAGES_PER_MINUTE) {
    return NextResponse.json({ error: "You are sending messages too fast" }, { status: 429 });
  }

  // Notify only when there is no unread message waiting already (avoids notification spam)
  const hadUnread = await Message.exists({ request: request._id, from: g.user.id, to, readAt: null });

  const msg = await Message.create({ request: request._id, from: g.user.id, to, text });

  if (!hadUnread) {
    await notifyInApp({
      userId: to,
      type: "message",
      title: `New message from ${g.user.name}`,
      message: text.length > 80 ? `${text.slice(0, 80)}...` : text,
      requestId: String(request._id),
    });
  }

  return NextResponse.json(
    { id: String(msg._id), mine: true, text: msg.text, createdAt: msg.createdAt },
    { status: 201 }
  );
}