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

type IconName = "pin" | "bolt" | "chat" | "gift" | "shield" | "drop";

function Icon({ name, className = "h-6 w-6" }: { name: IconName; className?: string }) {
  const paths: Record<IconName, React.ReactNode> = {
    pin: (
      <>
        <path d="M12 21s-7-5.2-7-11a7 7 0 1 1 14 0c0 5.8-7 11-7 11z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    bolt: <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />,
    chat: <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />,
    gift: (
      <>
        <path d="M4 10h16v10H4z" />
        <path d="M3 7h18v3H3z" />
        <path d="M12 7v13" />
        <path d="M12 7c-2 0-4-1-4-3s3-2 4 3zM12 7c2 0 4-1 4-3s-3-2-4 3z" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />
        <path d="M9 12l2 2 4-4" />
      </>
    ),
    drop: <path d="M12 2.5s6 6.2 6 10.7a6 6 0 1 1-12 0C6 8.7 12 2.5 12 2.5z" />,
  };
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

const STEPS = [
  { n: "1", title: "Post a request", text: "Enter the patient, blood group, hospital and pick the hospital on the map." },
  { n: "2", title: "We find donors", text: "Compatible donors who are nearby right now are alerted first, then the search widens automatically." },
  { n: "3", title: "Donor responds", text: "Donors accept in one tap, you chat with them and confirm the donation." },
];

const FEATURES: { icon: IconName; title: string; text: string; tone: string }[] = [
  { icon: "pin", title: "Live-location matching", text: "Donors who opt in and are close to the hospital are notified first.", tone: "bg-emerald-50 text-emerald-700" },
  { icon: "bolt", title: "Automatic escalation", text: "No reply in time? The agent widens the radius and alerts more donors.", tone: "bg-amber-50 text-amber-700" },
  { icon: "chat", title: "AI assistant", text: "Ask about eligibility, next donation date or open requests in your city.", tone: "bg-slate-100 text-slate-700" },
  { icon: "gift", title: "Reward points", text: "Every confirmed donation earns points, levels and a place on the yearly ranking.", tone: "bg-brand-50 text-brand-700" },
  { icon: "shield", title: "Safety first", text: "Fraud reports, admin review and instant blocking keep the community trusted.", tone: "bg-emerald-50 text-emerald-700" },
  { icon: "drop", title: "Private by design", text: "Phone numbers are shown only to donors who accept, live location is never public.", tone: "bg-amber-50 text-amber-700" },
];

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

  const monthTotal = monthDonors.reduce((sum, d) => sum + d.donations, 0);

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-brand-50 via-white to-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-100/60 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 top-40 h-60 w-60 rounded-full bg-emerald-100/50 blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-4 py-16 text-center sm:py-24">
          <span className="badge mb-5 border border-brand-100 bg-white text-brand-700 shadow-sm">
            Emergency blood, found faster
          </span>
          <h1 className="text-4xl font-extrabold text-slate-900 sm:text-5xl">
            When every minute matters, <span className="text-brand-600">reach the right donor first</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
            An autonomous agent matches nearby compatible donors, notifies them and escalates automatically when
            nobody answers.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {session ? (
              <>
                <Link href="/requests/new" className="btn-primary px-6 py-3 text-base">
                  Request blood
                </Link>
                <Link href="/dashboard" className="btn-outline px-6 py-3 text-base">
                  Go to my dashboard
                </Link>
              </>
            ) : (
              <>
                <Link href="/register" className="btn-primary px-6 py-3 text-base">
                  Join as a donor
                </Link>
                <Link href="/login" className="btn-outline px-6 py-3 text-base">
                  Login
                </Link>
              </>
            )}
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-500">
            <span>Live-location matching</span>
            <span>Automatic escalation</span>
            <span>AI assistant</span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-16 px-4 py-14">
        {/* Stats */}
        {!loadError && (
          <section className="grid gap-4 sm:grid-cols-3">
            <div className="card p-6 text-center">
              <p className="text-4xl font-extrabold text-brand-600">{monthTotal}</p>
              <p className="mt-1 text-sm text-slate-500">
                donations in {MONTH_NAMES[month - 1]} {year}
              </p>
            </div>
            <div className="card p-6 text-center">
              <p className="text-4xl font-extrabold text-emerald-600">{monthDonors.length}</p>
              <p className="mt-1 text-sm text-slate-500">donors this month</p>
            </div>
            <div className="card p-6 text-center">
              <p className="text-4xl font-extrabold text-amber-600">{leaderboard.length}</p>
              <p className="mt-1 text-sm text-slate-500">donors on the {year} ranking</p>
            </div>
          </section>
        )}

        {/* How it works */}
        <section>
          <h2 className="text-center text-2xl font-bold text-slate-900">How it works</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="card p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-lg font-bold text-white">
                  {s.n}
                </span>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section>
          <h2 className="text-center text-2xl font-bold text-slate-900">Built for emergencies</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="card p-6">
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${f.tone}`}>
                  <Icon name={f.icon} />
                </span>
                <h3 className="mt-4 font-semibold text-slate-900">{f.title}</h3>
                <p className="mt-1.5 text-sm text-slate-600">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Live data */}
        {loadError ? (
          <p className="card p-4 text-center text-sm text-slate-500">
            The donation dashboard is not available right now.
          </p>
        ) : (
          <section className="space-y-6">
            {event && <RewardBanner event={event} winners={winners} />}
            <YearlyLeaderboard rows={leaderboard} year={year} />
            <p className="text-center">
              <Link href="/donations" className="font-medium text-brand-600 underline">
                See who donated each month
              </Link>
            </p>
          </section>
        )}

        {/* Final call to action */}
        {!session && (
          <section className="rounded-2xl bg-slate-900 px-6 py-12 text-center text-white">
            <h2 className="text-2xl font-bold">Be the reason someone gets home tonight</h2>
            <p className="mx-auto mt-2 max-w-xl text-slate-300">
              Create your free account in a minute. Donate when you can, ask for help when you need it.
            </p>
            <Link href="/register" className="btn-primary mt-6 px-6 py-3 text-base">
              Create free account
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}