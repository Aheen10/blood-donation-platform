import mongoose, { Schema, InferSchemaType, Model } from "mongoose";
import { BLOOD_GROUPS, URGENCY_LEVELS, REQUEST_STATUSES } from "@/lib/constants";

const BloodRequestSchema = new Schema(
  {
    requester: { type: Schema.Types.ObjectId, ref: "User", required: true },
    patientName: { type: String, required: true, trim: true },
    bloodGroup: { type: String, enum: BLOOD_GROUPS, required: true },
    unitsNeeded: { type: Number, default: 1, min: 1 },
    urgency: { type: String, enum: URGENCY_LEVELS, default: "normal" },
    hospitalName: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    contactPhone: { type: String, required: true },
    note: { type: String, trim: true },
    status: { type: String, enum: REQUEST_STATUSES, default: "open" },

    // Public share link: /r/<shareCode>. Does not reveal patient name or phone.
    shareCode: { type: String, required: true, unique: true },
    shareCount: { type: Number, default: 0 },

    // Agent state
    currentRound: { type: Number, default: 0 },
    notifiedDonors: [{ type: Schema.Types.ObjectId, ref: "User" }],
    acceptedDonors: [{ type: Schema.Types.ObjectId, ref: "User" }],
    declinedDonors: [{ type: Schema.Types.ObjectId, ref: "User" }],
    lastEscalatedAt: { type: Date, default: null },
    fulfilledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

BloodRequestSchema.index({ status: 1, lastEscalatedAt: 1 });

export type BloodRequestDoc = InferSchemaType<typeof BloodRequestSchema>;
const BloodRequest: Model<BloodRequestDoc> =
  mongoose.models.BloodRequest || mongoose.model<BloodRequestDoc>("BloodRequest", BloodRequestSchema);
export default BloodRequest;