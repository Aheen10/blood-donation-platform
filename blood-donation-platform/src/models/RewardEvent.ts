import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

// Year-end appreciation event. Admin creates one per year.
// Gifts are listed by rank; winners come from the yearly leaderboard.
const RewardEventSchema = new Schema(
  {
    year: { type: Number, required: true, unique: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    eventDate: { type: Date, required: true },
    venue: { type: String, trim: true },
    rewards: [
      {
        rank: { type: Number, required: true, min: 1 },
        gift: { type: String, required: true, trim: true },
      },
    ],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export type RewardEventDoc = InferSchemaType<typeof RewardEventSchema>;
const RewardEvent: Model<RewardEventDoc> =
  mongoose.models.RewardEvent || mongoose.model<RewardEventDoc>("RewardEvent", RewardEventSchema);
export default RewardEvent;