import PointLog from "@/models/PointLog";
import DonorProfile from "@/models/DonorProfile";

export const POINTS_PER_DONATION = 100;
export const FIRST_DONATION_BONUS = 50;
export const URGENT_BONUS: Record<string, number> = { normal: 0, high: 25, critical: 50 };

type Reason = "donation" | "first_donation" | "urgent_bonus";

// Gives points for one confirmed donation. Returns how many points were added.
// A duplicate (same donor, request, reason) is skipped by the unique index.
export async function awardDonationPoints(args: {
  donorId: string;
  requestId: string;
  urgency?: string;
  isFirstDonation: boolean;
}): Promise<number> {
  const items: { reason: Reason; points: number; note: string }[] = [
    { reason: "donation", points: POINTS_PER_DONATION, note: "Confirmed blood donation" },
  ];
  if (args.isFirstDonation) {
    items.push({ reason: "first_donation", points: FIRST_DONATION_BONUS, note: "First donation bonus" });
  }
  const bonus = URGENT_BONUS[args.urgency ?? "normal"] ?? 0;
  if (bonus > 0) {
    items.push({ reason: "urgent_bonus", points: bonus, note: `Urgent request bonus (${args.urgency})` });
  }

  let gained = 0;
  for (const it of items) {
    try {
      await PointLog.create({
        user: args.donorId,
        request: args.requestId,
        reason: it.reason,
        points: it.points,
        note: it.note,
      });
      gained += it.points;
    } catch (e) {
      if ((e as { code?: number }).code !== 11000) throw e; // 11000 = already awarded
    }
  }

  if (gained > 0) {
    await DonorProfile.updateOne({ user: args.donorId }, { $inc: { points: gained } });
  }
  return gained;
}

const TIERS = [
  { name: "Bronze", min: 0 },
  { name: "Silver", min: 300 },
  { name: "Gold", min: 800 },
  { name: "Platinum", min: 1500 },
];

export function levelFor(points: number) {
  let idx = 0;
  TIERS.forEach((t, i) => {
    if (points >= t.min) idx = i;
  });
  const next = TIERS[idx + 1];
  return {
    name: TIERS[idx].name,
    currentMin: TIERS[idx].min,
    nextName: next ? next.name : null,
    nextAt: next ? next.min : null,
  };
}