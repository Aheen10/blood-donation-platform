import { connectDB } from "@/lib/db";
import { getYearlyLeaderboard, type DonorRow } from "@/lib/leaderboard";
import RewardEvent from "@/models/RewardEvent";

export interface RewardEventView {
  year: number;
  title: string;
  description: string | null;
  eventDate: string; // ISO string
  venue: string | null;
  rewards: { rank: number; gift: string }[];
}

export interface RewardWinner {
  rank: number;
  gift: string;
  donors: DonorRow[]; // more than one donor if there is a tie for that rank
}

export async function getRewardEventForYear(year: number): Promise<RewardEventView | null> {
  await connectDB();
  const e = await RewardEvent.findOne({ year }).lean();
  if (!e) return null;
  return {
    year: e.year,
    title: e.title,
    description: e.description ?? null,
    eventDate: e.eventDate.toISOString(),
    venue: e.venue ?? null,
    rewards: [...e.rewards].sort((a, b) => a.rank - b.rank).map((r) => ({ rank: r.rank, gift: r.gift })),
  };
}

/** Match the yearly ranking to the gift list. A tie for a rank means all tied donors get that gift. */
export async function getRewardWinners(year: number): Promise<RewardWinner[]> {
  const event = await getRewardEventForYear(year);
  if (!event) return [];
  const maxRank = Math.max(...event.rewards.map((r) => r.rank));
  const board = await getYearlyLeaderboard(year, 100);
  return event.rewards.map((r) => ({
    rank: r.rank,
    gift: r.gift,
    donors: board.filter((d) => d.rank === r.rank && d.rank <= maxRank),
  }));
}