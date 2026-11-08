import { connectDB } from "@/lib/db";
import { DONATION_GAP_DAYS } from "@/lib/constants";
import DonorProfile from "@/models/DonorProfile";
import DonationHistory from "@/models/DonationHistory";

export interface DonorStatus {
  isDonor: boolean;
  bloodGroup: string | null;
  city: string | null;
  isAvailable: boolean;
  totalDonations: number;
  lastDonationDate: Date | null;
  nextEligibleDate: Date | null;
  canDonateNow: boolean;
  daysUntilEligible: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function toDate(v: unknown): Date | null {
  if (!v) return null;
  const d = new Date(v as string | number | Date);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Everything the history page and the AI assistant need to know about a member as a donor.
 * Next eligible date = last donation + DONATION_GAP_DAYS.
 * TODO (teammate task): switch to calculateNextEligibleDate / canDonate from lib/eligibility.ts once merged.
 */
export async function getDonorStatus(userId: string): Promise<DonorStatus> {
  await connectDB();

  const profile = (await DonorProfile.findOne({ user: userId }).lean()) as unknown as {
    bloodGroup?: string;
    city?: string;
    isAvailable?: boolean;
    lastDonationDate?: Date | null;
  } | null;

  const lastRecord = (await DonationHistory.findOne({ donor: userId }).sort({ donatedAt: -1 }).lean()) as unknown as {
    donatedAt?: Date;
  } | null;

  const totalDonations = await DonationHistory.countDocuments({ donor: userId });

  // Most recent of: the date the donor entered, and the latest confirmed donation
  const fromProfile = toDate(profile?.lastDonationDate);
  const fromHistory = toDate(lastRecord?.donatedAt);
  let lastDonationDate = fromProfile;
  if (fromHistory && (!lastDonationDate || fromHistory > lastDonationDate)) {
    lastDonationDate = fromHistory;
  }

  const nextEligibleDate = lastDonationDate ? new Date(lastDonationDate.getTime() + DONATION_GAP_DAYS * DAY_MS) : null;
  const msLeft = nextEligibleDate ? nextEligibleDate.getTime() - Date.now() : 0;
  const canDonateNow = msLeft <= 0;

  return {
    isDonor: Boolean(profile),
    bloodGroup: profile?.bloodGroup ?? null,
    city: profile?.city ?? null,
    isAvailable: Boolean(profile?.isAvailable),
    totalDonations,
    lastDonationDate,
    nextEligibleDate,
    canDonateNow,
    daysUntilEligible: canDonateNow ? 0 : Math.ceil(msLeft / DAY_MS),
  };
}