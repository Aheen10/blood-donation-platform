import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  currentYearMonth,
  getMonthlyDonors,
  getYearlyLeaderboard,
  type DonorRow,
} from "@/lib/leaderboard";
import { getRewardEventForYear, getRewardWinners, type RewardEventView, type RewardWinner } from "@/lib/rewards";
import { MONTH_NAMES } from "@/lib/format";
import YearlyLeaderboard from "@/components/dashboard/YearlyLeaderboard";
import RewardBanner from "@/components/dashboard/RewardBanner";

// The leaderboard changes whenever a donation is confirmed, so never cache this page.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getServerSession(authOptions).catch(() => null);
  const { year, month } = currentYearMonth();

  let leaderboard: DonorRow[] = [];
  let monthDonors: DonorRow[] = [];
  let event: RewardEventView | null = null;
  let winners: RewardWinner[] = [];
  let loadError = false;

  try {
    [leaderboard, monthDonors, event] = await Promise.all([
      getYearlyLeaderboard(year, 10),
      getMonthlyDonors(year, month),
      getRewardEventForYear(year),
    ]);
    if (event && new Date(event.eventDate).getTime() < Date.now()) {
      winners = await getRewardWinners(year);
    }
  } catch {
    loadError = true;
  }

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-10">
      <section className="space-y-4 text-center">
        <h1 className="text-4xl font-bold text-brand-600">Blood Donation &amp; Emergency Response</h1>
        <p className="mx-auto max-w-2xl text-gray-600">
          An autonomous agent that matches, notifies and escalates emergency blood requests, so a
          donor is found faster.
        </p>
        <div className="flex justify-center gap-3">
          {session ? (
            <Link href="/dashboard" className="rounded bg-brand-600 px-5 py-2 text-white hover:bg-brand-700">
              Go to my dashboard
            </Link>
          ) : (
            <>
              <Link href="/register" className="rounded bg-brand-600 px-5 py-2 text-white hover:bg-brand-700">
                Register
              </Link>
              <Link href="/login" className="rounded border border-brand-600 px-5 py-2 text-brand-600 hover:bg-brand-50">
                Login
              </Link>
            </>
          )}
        </div>
      </section>

      {loadError ? (
        <p className="rounded bg-white p-4 text-center text-sm text-gray-500 shadow">
          The donation dashboard is not available right now.
        </p>
      ) : (
        <>
          {event && <RewardBanner event={event} winners={winners} />}

          <section className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-white p-5 text-center shadow">
              <p className="text-3xl font-bold text-brand-600">
                {monthDonors.reduce((sum, d) => sum + d.donations, 0)}
              </p>
              <p className="text-sm text-gray-500">
                donations in {MONTH_NAMES[month - 1]} {year}
              </p>
            </div>
            <div className="rounded-lg bg-white p-5 text-center shadow">
              <p className="text-3xl font-bold text-brand-600">{monthDonors.length}</p>
              <p className="text-sm text-gray-500">donors this month</p>
            </div>
          </section>

          <YearlyLeaderboard rows={leaderboard} year={year} />

          <p className="text-center">
            <Link href="/donations" className="text-brand-600 underline">
              See who donated each month
            </Link>
          </p>
        </>
      )}
    </main>
  );
}