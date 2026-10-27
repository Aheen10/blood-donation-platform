import mongoose, { Schema, InferSchemaType, Model } from "mongoose";
import { ROLES } from "@/lib/constants";

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    phone: { type: String, trim: true },
    role: { type: String, enum: ROLES, default: "requester" },

    // Set by an admin after approving a fraud report
    isBlocked: { type: Boolean, default: false }, // banned: cannot log in
    isRestricted: { type: Boolean, default: false }, // restricted: can log in and read, cannot act
    moderationReason: { type: String },
    moderatedAt: { type: Date, default: null },

    telegramChatId: { type: String },
  },
  { timestamps: true }
);

export type UserDoc = InferSchemaType<typeof UserSchema>;
const User: Model<UserDoc> = mongoose.models.User || mongoose.model<UserDoc>("User", UserSchema);
export default User;