import mongoose, { Schema, InferSchemaType, Model } from "mongoose";
import { BLOOD_GROUPS } from "@/lib/constants";

const DonorProfileSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    bloodGroup: { type: String, enum: BLOOD_GROUPS, required: true },
    city: { type: String, required: true, trim: true },
    area: { type: String, trim: true },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    lastDonationDate: { type: Date, default: null },
    nextEligibleDate: { type: Date, default: null },
    // Consent: donor can pause availability at any time
    isAvailable: { type: Boolean, default: true },
    consentToContact: { type: Boolean, required: true, default: false },
    // If false, the donor appears as "Anonymous donor" on public leaderboards
    showOnLeaderboard: { type: Boolean, default: true },
    totalDonations: { type: Number, default: 0 },
    lastReminderSentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

DonorProfileSchema.index({ bloodGroup: 1, isAvailable: 1, nextEligibleDate: 1 });

export type DonorProfileDoc = InferSchemaType<typeof DonorProfileSchema>;
const DonorProfile: Model<DonorProfileDoc> =
  mongoose.models.DonorProfile || mongoose.model<DonorProfileDoc>("DonorProfile", DonorProfileSchema);
export default DonorProfile;