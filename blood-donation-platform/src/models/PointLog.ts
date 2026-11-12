import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

// One row per point award. Keeps a history so every point can be explained.
const PointLogSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    points: { type: Number, required: true },
    reason: {
      type: String,
      enum: ["donation", "first_donation", "urgent_bonus"],
      required: true,
    },
    request: { type: Schema.Types.ObjectId, ref: "BloodRequest" },
    note: { type: String, trim: true },
  },
  { timestamps: true }
);

// The same reason can be awarded only once per donor per request (no double points).
PointLogSchema.index(
  { user: 1, request: 1, reason: 1 },
  { unique: true, partialFilterExpression: { request: { $exists: true } } }
);

export type PointLogDoc = InferSchemaType<typeof PointLogSchema>;
const PointLog: Model<PointLogDoc> =
  mongoose.models.PointLog || mongoose.model<PointLogDoc>("PointLog", PointLogSchema);
export default PointLog;