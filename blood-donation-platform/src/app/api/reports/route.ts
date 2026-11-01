import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { createReportSchema } from "@/lib/validators";
import { includesId, sameId } from "@/lib/utils";
import { notifyInApp } from "@/lib/notifications";
import BloodRequest from "@/models/BloodRequest";
import Report from "@/models/Report";
import User from "@/models/User";

// POST /api/reports
// A person who took part in a request can report the other side (e.g. blood was taken and sold)
// with a written reason, and ask for a restriction or a ban. An admin decides.
export async function POST(req: Request) {
  const g = await requireUser();
  if (!g.ok) return g.res;

  const parsed = createReportSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const d = parsed.data;
  if (!mongoose.isValidObjectId(d.requestId) || !mongoose.isValidObjectId(d.reportedUserId)) {
    return NextResponse.json({ error: "Invalid request or user" }, { status: 400 });
  }
  if (sameId(d.reportedUserId, g.user.id)) {
    return NextResponse.json({ error: "You cannot report yourself" }, { status: 400 });
  }

  await connectDB();
  const request = await BloodRequest.findById(d.requestId).lean();
  if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });

  // Both people must be part of this request. This stops random users from mass-reporting.
  const inRequest = (id: string) =>
    sameId(request.requester, id) ||
    includesId(request.acceptedDonors, id) ||
    includesId(request.notifiedDonors, id);
  if (!inRequest(g.user.id) || !inRequest(d.reportedUserId)) {
    return NextResponse.json(
      { error: "You can only report someone who took part in the same request" },
      { status: 403 }
    );
  }

  const target = await User.findById(d.reportedUserId).select("name role isBlocked").lean();
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (target.role === "admin") {
    return NextResponse.json({ error: "This user cannot be reported" }, { status: 403 });
  }
  if (target.isBlocked) {
    return NextResponse.json({ error: "This user is already banned" }, { status: 409 });
  }

  const duplicate = await Report.findOne({
    reporter: g.user.id,
    reportedUser: d.reportedUserId,
    request: d.requestId,
    status: "pending",
  });
  if (duplicate) {
    return NextResponse.json({ error: "You already have a pending report for this user" }, { status: 409 });
  }

  const report = await Report.create({
    reporter: g.user.id,
    reportedUser: d.reportedUserId,
    request: d.requestId,
    reason: d.reason,
    description: d.description,
    requestedAction: d.requestedAction,
  });

  // Tell the admins there is something to review
  const admins = await User.find({ role: "admin", isBlocked: { $ne: true } }).select("_id").lean();
  await Promise.all(
    admins.map((a) =>
      notifyInApp({
        userId: String(a._id),
        type: "report_update",
        title: "New fraud report",
        message: `${g.user.name} reported ${target.name} (${d.reason.replace("_", " ")}). Please review.`,
        requestId: d.requestId,
      })
    )
  );

  return NextResponse.json({ id: String(report._id), status: report.status }, { status: 201 });
}

// GET /api/reports -> reports I submitted and what happened to them
export async function GET() {
  const g = await requireUser({ allowRestricted: true });
  if (!g.ok) return g.res;
  await connectDB();

  const reports = await Report.find({ reporter: g.user.id }).sort({ createdAt: -1 }).limit(50).lean();
  const users = await User.find({ _id: { $in: reports.map((r) => r.reportedUser) } })
    .select("name")
    .lean();
  const nameOf = new Map(users.map((u) => [String(u._id), u.name]));

  return NextResponse.json({
    reports: reports.map((r) => ({
      id: String(r._id),
      reportedUser: nameOf.get(String(r.reportedUser)) ?? "Unknown",
      reason: r.reason,
      requestedAction: r.requestedAction,
      status: r.status,
      appliedAction: r.appliedAction ?? null,
      adminNote: r.adminNote ?? null,
      createdAt: r.createdAt,
    })),
  });
}