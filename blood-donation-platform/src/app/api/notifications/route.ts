import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/session";
import Notification from "@/models/Notification";

// GET /api/notifications            -> my latest notifications + unread count
// GET /api/notifications?countOnly=1 -> only the unread count (used by the navbar bell)
export async function GET(req: Request) {
  const g = await requireUser({ allowRestricted: true });
  if (!g.ok) return g.res;
  await connectDB();

  const unread = await Notification.countDocuments({ user: g.user.id, isRead: false });
  if (new URL(req.url).searchParams.get("countOnly") === "1") {
    return NextResponse.json({ unread });
  }

  const docs = await Notification.find({ user: g.user.id }).sort({ createdAt: -1 }).limit(50).lean();
  return NextResponse.json({
    unread,
    notifications: docs.map((n) => ({
      id: String(n._id),
      type: n.type,
      title: n.title,
      message: n.message,
      requestId: n.request ? String(n.request) : null,
      isRead: n.isRead,
      createdAt: n.createdAt,
    })),
  });
}

// PATCH /api/notifications -> mark all my notifications as read
export async function PATCH() {
  const g = await requireUser({ allowRestricted: true });
  if (!g.ok) return g.res;
  await connectDB();
  await Notification.updateMany({ user: g.user.id, isRead: false }, { $set: { isRead: true } });
  return NextResponse.json({ ok: true });
}