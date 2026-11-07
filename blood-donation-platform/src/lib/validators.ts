import { z } from "zod";
import {
  BLOOD_GROUPS,
  URGENCY_LEVELS,
  REPORT_REASONS,
  REPORT_ACTIONS,
  MIN_REPORT_DESCRIPTION,
  MAX_MESSAGE_LENGTH,
} from "@/lib/constants";

// ---------- Donor profile (used at registration AND later from the donor page) ----------
export const donorProfileSchema = z.object({
  bloodGroup: z.enum(BLOOD_GROUPS),
  city: z.string().min(2),
  area: z.string().optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  lastDonationDate: z.string().datetime().optional().nullable(),
  consentToContact: z.literal(true, {
    errorMap: () => ({ message: "Consent is required to register as a donor" }),
  }),
});

// Donor switches (pause availability, hide from public leaderboard)
export const donorProfileUpdateSchema = z.object({
  isAvailable: z.boolean().optional(),
  showOnLeaderboard: z.boolean().optional(),
});

// ---------- Registration ----------
// One account type for everyone. Anyone can request blood and anyone can donate.
// Admins are created manually in the DB.
export const registerSchema = z.object({
  name: z.string().min(2, "Name is too short").max(80),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
  phone: z.string().min(6).max(20).optional(),
  // Present only if the person also wants to donate blood
  donor: donorProfileSchema.optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

// ---------- Blood requests ----------
export const createRequestSchema = z.object({
  patientName: z.string().min(2).max(80),
  bloodGroup: z.enum(BLOOD_GROUPS),
  unitsNeeded: z.number().int().min(1).max(10).default(1),
  urgency: z.enum(URGENCY_LEVELS).default("normal"),
  hospitalName: z.string().min(2).max(120),
  city: z.string().min(2).max(60),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  contactPhone: z.string().min(6).max(20),
  note: z.string().max(500).optional(),
});

export const respondSchema = z.object({
  action: z.enum(["accept", "decline"]),
});

export const confirmDonationSchema = z.object({
  donorId: z.string().min(1),
});

export const shareSchema = z.object({
  // Email of a registered friend. If empty, the API just returns the share link.
  email: z.string().email().optional(),
});

// ---------- Messages ----------
export const sendMessageSchema = z.object({
  to: z.string().min(1),
  text: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
});

// ---------- Fraud reports ----------
export const createReportSchema = z.object({
  requestId: z.string().min(1),
  reportedUserId: z.string().min(1),
  reason: z.enum(REPORT_REASONS),
  description: z
    .string()
    .trim()
    .min(MIN_REPORT_DESCRIPTION, `Please explain what happened (at least ${MIN_REPORT_DESCRIPTION} characters)`)
    .max(2000),
  requestedAction: z.enum(REPORT_ACTIONS).default("ban"),
});

export const resolveReportSchema = z.object({
  reportId: z.string().min(1),
  decision: z.enum(["approve", "reject"]),
  // Admin may apply a lighter action than the one requested. Defaults to the requested action.
  action: z.enum(REPORT_ACTIONS).optional(),
  adminNote: z.string().trim().max(1000).optional(),
});

// ---------- Year-end reward event ----------
export const rewardEventSchema = z.object({
  year: z.number().int().min(2024).max(2100),
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(1000).optional(),
  eventDate: z.string().datetime(),
  venue: z.string().trim().max(200).optional(),
  rewards: z
    .array(z.object({ rank: z.number().int().min(1).max(100), gift: z.string().trim().min(1).max(200) }))
    .min(1)
    .max(20),
});