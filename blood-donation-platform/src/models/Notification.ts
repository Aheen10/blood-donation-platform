import mongoose, { Schema, InferSchemaType, Model } from "mongoose";
import { NOTIFICATION_TYPES } from "@/lib/constants";

const NotificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    request: { type: Schema.Types.ObjectId, ref: "BloodRequest", default: null },
    isRead: { type: Boolean, default: false },
    channels: [{ type: String, enum: ["in_app", "email", "telegram"] }],
  },
  { timestamps: true }
);

NotificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

export type NotificationDoc = InferSchemaType<typeof NotificationSchema>;
const Notification: Model<NotificationDoc> =
  mongoose.models.Notification || mongoose.model<NotificationDoc>("Notification", NotificationSchema);
export default Notification;