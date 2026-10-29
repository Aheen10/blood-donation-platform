import mongoose, { Schema, InferSchemaType, Model } from "mongoose";
import { REPORT_REASONS, REPORT_ACTIONS, REPORT_STATUSES } from "@/lib/constants";

// A user reports another user from the same blood request (fraud, selling blood, etc.)
// and asks for a restriction or a ban. Nothing happens until an admin approves.
const ReportSchema = new Schema(
  {
    reporter: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reportedUser: { type: Schema.Types.ObjectId, ref: "User", required: true },
    request: { type: Schema.Types.ObjectId, ref: "BloodRequest", required: true },
    reason: { type: String, enum: REPORT_REASONS, required: true },
    description: { type: String, required: true, trim: true },
    requestedAction: { type: String, enum: REPORT_ACTIONS, default: "ban" },

    status: { type: String, enum: REPORT_STATUSES, default: "pending" },
    appliedAction: { type: String, enum: REPORT_ACTIONS, default: undefined },
    adminNote: { type: String, trim: true },
    resolvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ReportSchema.index({ status: 1, createdAt: -1 });
ReportSchema.index({ reportedUser: 1, status: 1 });

export type ReportDoc = InferSchemaType<typeof ReportSchema>;
const Report: Model<ReportDoc> =
  mongoose.models.Report || mongoose.model<ReportDoc>("Report", ReportSchema);
export default Report;