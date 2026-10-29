import { connectDB } from "@/lib/db";
import { APP_TIMEZONE } from "@/lib/constants";
import DonationHistory from "@/models/DonationHistory";
import DonorProfile from "@/models/DonorProfile";
import User from "@/models/User";

// Bangladesh has no daylight saving, so Asia/Dhaka is always UTC+6.
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;

export const ANONYMOUS_NAME = "Anonymous donor";

export interface DonorRow {
  rank: number;
  donorId: string;
  name: string;
  bloodGroup: string | null;
  city: string | null;
  donations: number;
  lastDonatedAt: Date;
}

/** Start (inclusive) and end (exclusive) of a calendar year in Dhaka time. */
export function yearRange(year: number): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(year, 0, 1) - DHAKA_OFFSET_MS),
    end: new Date(Date.UTC(year + 1, 0, 1) - DHAKA_OFFSET_MS),
  };
}

/** Start (inclusive) and end (exclusive) of a calendar month in Dhaka time. month = 1..12 */
export function monthRange(year: number, month: number): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(year, month - 1, 1) - DHAKA_OFFSET_MS),
    end: new Date(Date.UTC(year, month, 1) - DHAKA_OFFSET_MS),
  };
}

/** Current year and month in Dhaka time. */
export function currentYearMonth(now: Date = new Date()): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "numeric",
  }).formatToParts(now);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  return { year, month };
}

interface AggRow {
  _id: unknown;
  donations: number;
  lastDonatedAt: Date;
  name: string;
  bloodGroup?: string;
  city?: string;
  showOnLeaderboard?: boolean;
}

/**
 * Count confirmed donations per donor between two dates.
 * - Banned users are excluded (so a fraudster cannot win a reward).
 * - Donors who turned off `showOnLeaderboard` appear as "Anonymous donor".
 * - Ties share the same rank (1, 2, 2, 4 ...). Earlier last-donation wins the display order.
 */
async function aggregateDonors(start: Date, end: Date, limit?: number): Promise<DonorRow[]> {
  await connectDB();

  const pipeline: Record<string, unknown>[] = [
    { $match: { donatedAt: { $gte: start, $lt: end } } },
    { $group: { _id: "$donor", donations: { $sum: 1 }, lastDonatedAt: { $max: "$donatedAt" } } },
    { $lookup: { from: User.collection.name, localField: "_id", foreignField: "_id", as: "user" } },
    { $unwind: "$user" },
    { $match: { "user.isBlocked": { $ne: true } } },
    {
      $lookup: {
        from: DonorProfile.collection.name,
        localField: "_id",
        foreignField: "user",
        as: "profile",
      },
    },
    { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        donations: 1,
        lastDonatedAt: 1,
        name: "$user.name",
        bloodGroup: "$profile.bloodGroup",
        city: "$profile.city",
        showOnLeaderboard: "$profile.showOnLeaderboard",
      },
    },
    { $sort: { donations: -1, lastDonatedAt: 1, name: 1 } },
  ];
  if (limit) pipeline.push({ $limit: limit });

  const rows = await DonationHistory.aggregate<AggRow>(pipeline as never[]);

  let lastCount = -1;
  let lastRank = 0;
  return rows.map((r, i) => {
    const rank = r.donations === lastCount ? lastRank : i + 1;
    lastCount = r.donations;
    lastRank = rank;
    const hidden = r.showOnLeaderboard === false;
    return {
      rank,
      donorId: String(r._id),
      name: hidden ? ANONYMOUS_NAME : r.name,
      bloodGroup: hidden ? null : r.bloodGroup ?? null,
      city: hidden ? null : r.city ?? null,
      donations: r.donations,
      lastDonatedAt: r.lastDonatedAt,
    };
  });
}

/** Top donors of a year, ranked by number of confirmed donations. */
export async function getYearlyLeaderboard(year: number, limit = 10): Promise<DonorRow[]> {
  const { start, end } = yearRange(year);
  return aggregateDonors(start, end, limit);
}

/** Everyone who donated in a given month (1..12), most donations first. */
export async function getMonthlyDonors(year: number, month: number): Promise<DonorRow[]> {
  const { start, end } = monthRange(year, month);
  return aggregateDonors(start, end);
}

/** Number of confirmed donations in each month of a year: array of 12 numbers (Jan..Dec). */
export async function getMonthlyTotals(year: number): Promise<number[]> {
  await connectDB();
  const { start, end } = yearRange(year);
  const rows = await DonationHistory.aggregate<{ _id: number; count: number }>([
    { $match: { donatedAt: { $gte: start, $lt: end } } },
    { $group: { _id: { $month: { date: "$donatedAt", timezone: APP_TIMEZONE } }, count: { $sum: 1 } } },
  ]);
  const totals = Array<number>(12).fill(0);
  for (const r of rows) totals[r._id - 1] = r.count;
  return totals;
}