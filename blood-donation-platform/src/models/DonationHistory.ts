import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

// One document = one donation confirmed by the requester.
// Leaderboards and monthly dashboards are built from this collection.
const DonationHistorySchema = new Schema(
  {
    donor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    request: { type: Schema.Types.ObjectId, ref: "BloodRequest", default: null },
    confirmedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    donatedAt: { type: Date, required: true },
    hospitalName: { type: String, trim: true },
    note: { type: String, trim: true },
  },
  { timestamps: true }
);

DonationHistorySchema.index({ donor: 1, donatedAt: -1 });
DonationHistorySchema.index({ donatedAt: -1 });
// A donor can be confirmed only once per request
DonationHistorySchema.index(
  { donor: 1, request: 1 },
  { unique: true, partialFilterExpression: { request: { $type: "objectId" } } }
);

export type DonationHistoryDoc = InferSchemaType<typeof DonationHistorySchema>;
const DonationHistory: Model<DonationHistoryDoc> =
  mongoose.models.DonationHistory ||
  mongoose.model<DonationHistoryDoc>("DonationHistory", DonationHistorySchema);
export default DonationHistory;