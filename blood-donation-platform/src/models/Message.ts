import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

// Direct message between a donor and a requester, always tied to one blood request.
const MessageSchema = new Schema(
  {
    request: { type: Schema.Types.ObjectId, ref: "BloodRequest", required: true },
    from: { type: Schema.Types.ObjectId, ref: "User", required: true },
    to: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

MessageSchema.index({ request: 1, createdAt: 1 });
MessageSchema.index({ to: 1, readAt: 1 });

export type MessageDoc = InferSchemaType<typeof MessageSchema>;
const Message: Model<MessageDoc> =
  mongoose.models.Message || mongoose.model<MessageDoc>("Message", MessageSchema);
export default Message;