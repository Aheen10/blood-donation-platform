import mongoose, { Schema, InferSchemaType, Model } from "mongoose";
import { BLOOD_GROUPS } from "@/lib/constants";

const HospitalSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ["hospital", "blood_bank"], default: "hospital" },
    city: { type: String, required: true, trim: true },
    address: { type: String, trim: true },
    phone: { type: String, trim: true },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    // Optional, manually updated stock status
    stockStatus: [
      {
        bloodGroup: { type: String, enum: BLOOD_GROUPS },
        status: { type: String, enum: ["available", "low", "out"], default: "available" },
      },
    ],
    stockUpdatedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export type HospitalDoc = InferSchemaType<typeof HospitalSchema>;
const Hospital: Model<HospitalDoc> =
  mongoose.models.Hospital || mongoose.model<HospitalDoc>("Hospital", HospitalSchema);
export default Hospital;