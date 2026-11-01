import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { resolveReportSchema } from "@/lib/validators";
import { notifyInApp } from "@/lib/notifications";
import { REPORT_REASON_LABELS, REPORT_STATUSES } from "@/lib/constants";
import BloodRequest from "@/models/BloodRequest";
import DonorProfile from "@/models/DonorProfile";
import Message from "@/models/Message";
import Report from "@/models/Report";
import User from "@/models/User";

// GET /api/admin/reports?status=pending|approved|rejected
// Returns each report with both users, the request, and the chat between them as evidence.
export async function GET(req: Request) {
  const g = await requireUser({ roles: ["admin"], allowRestricted: true });
  if (!g.ok) return g.res;
  await connectDB();

  const statusParam = new URL(req.url).searchParams.get("status") ?? "pending";
  const status = (REPORT_STATUSES as readonly string[]).includes(statusParam) ? statusParam : "pending";

  const reports = await Report.find({ status }).sort({ createdAt: -1 }).limit(100).lean();

  const userIds = reports.flatMap((r) => [r.reporter, r.reportedUser]);
  const users = await User.find({ _id: { $in: userIds } })
    .select("name email role isBlocked isRestricted")
    .lean();
  const userById = new Map(users.map((u) => [String(u._id), u]));

  const requests = await BloodRequest.find({ _id: { $in: reports.map((r) => r.request) } })
    .select("bloodGroup hospitalName city status")
    .lean();
  const requestById = new Map(requests.map((r) => [String(r._id), r]));

  const result = await Promise.all(
    reports.map(async (r) => {
      const reporter = userById.get(String(r.reporter));
      const reported = userById.get(String(r.reportedUser));
      const req = requestById.get(String(r.request));

      const chat = await Message.find({
        request: r.request,
        $or: [
          { from: r.reporter, to: r.reportedUser },
          { from: r.reportedUser, to: r.reporter },
        ],
      })
        .sort({ createdAt: 1 })
        .limit(50)
        .lean();

      const otherPending = await Report.countDocuments({
        reportedUser: r.reportedUser,
        status: "pending",
        _id: { $ne: r._id },
      });

      return {
        id: String(r._id),
        status: r.status,
        reason: r.reason,
        reasonLabel: REPORT_REASON_LABELS[r.reason as keyof typeof REPORT_REASON_LABELS] ?? r.reason,
        description: r.description,
        requestedAction: r.requestedAction,
        appliedAction: r.appliedAction ?? null,
        adminNote: r.adminNote ?? null,
        createdAt: r.createdAt,
        otherPendingReportsAgainstUser: otherPending,
        reporter: reporter && { id: String(reporter._id), name: reporter.name, email: reporter.email },
        reportedUser: reported && {
          id: String(reported._id),
          name: reported.name,
          email: reported.email,
          isBlocked: !!reported.isBlocked,
          isRestricted: !!reported.isRestricted,
        },
        request: req && {
          id: String(req._id),
          bloodGroup: req.bloodGroup,
          hospitalName: req.hospitalName,
          city: req.city,
          status: req.status,
        },
        chat: chat.map((m) => ({
          from: String(m.from) === String(r.reporter) ? "reporter" : "reported",
          text: m.text,
          createdAt: m.createdAt,
        })),
      };
    })
  );

  return NextResponse.json({ reports: result });
}

// PATCH /api/admin/reports  { reportId, decision: "approve" | "reject", action?: "restrict" | "ban", adminNote? }
// Approving applies the ban (or the lighter restriction) to the reported user.
export async function PATCH(req: Request) {
  const g = await requireUser({ roles: ["admin"] });
  if (!g.ok) return g.res;

  const parsed = resolveReportSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !mongoose.isValidObjectId(parsed.data.reportId)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { reportId, decision, adminNote } = parsed.data;

  await connectDB();
  const report = await Report.findById(reportId);
  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });
  if (report.status !== "pending") {
    return NextResponse.json({ error: "This report was already resolved" }, { status: 409 });
  }

  const reporterId = String(report.reporter);
  const targetId = String(report.reportedUser);

  if (decision === "reject") {
    report.status = "rejected";
    report.adminNote = adminNote;
    report.resolvedBy = new mongoose.Types.ObjectId(g.user.id);
    report.resolvedAt = new Date();
    await report.save();

    await notifyInApp({
      userId: reporterId,
      type: "report_update",
      title: "Your report was reviewed",
      message: "The admin reviewed your report and did not take action." + (adminNote ? ` Note: ${adminNote}` : ""),
      requestId: String(report.request),
    });
    return NextResponse.json({ ok: true, status: "rejected" });
  }

  // ---- approve ----
  const target = await User.findById(targetId);
  if (!target) return NextResponse.json({ error: "Reported user no longer exists" }, { status: 404 });
  if (target.role === "admin") {
    return NextResponse.json({ error: "Admins cannot be banned from here" }, { status: 403 });
  }

  const action = parsed.data.action ?? report.requestedAction ?? "ban";
  const reasonText = `${REPORT_REASON_LABELS[report.reason as keyof typeof REPORT_REASON_LABELS] ?? report.reason}${
    adminNote ? `: ${adminNote}` : ""
  }`;

  if (action === "ban") {
    target.isBlocked = true;
    target.isRestricted = false;
  } else {
    target.isRestricted = true;
  }
  target.moderationReason = reasonText;
  target.moderatedAt = new Date();
  await target.save();

  if (action === "ban") {
    // Stop the banned account from being matched, and freeze the requests they created
    await DonorProfile.updateOne({ user: targetId }, { $set: { isAvailable: false } });
    await BloodRequest.updateMany(
      { requester: targetId, status: { $in: ["open", "matched"] } },
      { $set: { status: "flagged" } }
    );
    await BloodRequest.updateMany(
      { status: { $in: ["open", "matched"] } },
      { $pull: { acceptedDonors: target._id, notifiedDonors: target._id } }
    );
  }

  report.status = "approved";
  report.appliedAction = action;
  report.adminNote = adminNote;
  report.resolvedBy = new mongoose.Types.ObjectId(g.user.id);
  report.resolvedAt = new Date();
  await report.save();

  await notifyInApp({
    userId: reporterId,
    type: "report_update",
    title: "Your report was approved",
    message: `The admin approved your report. The user was ${action === "ban" ? "banned" : "restricted"}. Thank you for helping keep the platform safe.`,
    requestId: String(report.request),
  });

  if (action === "restrict") {
    // A banned user cannot log in, so only restricted users get a notification
    await notifyInApp({
      userId: targetId,
      type: "account_action",
      title: "Your account is restricted",
      message: `Reason: ${reasonText}. You can view the site but cannot create requests, accept requests or send messages.`,
    });
  }

  return NextResponse.json({ ok: true, status: "approved", appliedAction: action });
}