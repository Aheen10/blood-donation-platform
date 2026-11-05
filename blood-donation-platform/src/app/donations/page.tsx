import Link from "next/link";
import {
  currentYearMonth,
  getMonthlyDonors,
  getMonthlyTotals,
  type DonorRow,
} from "@/lib/leaderboard";
import { MONTH_NAMES, formatDate } from "@/lib/format";
import MonthlyChart from "@/components/dashboard/MonthlyChart";

export const dynamic = "force-dynamic";

// Public dashboard: who donated blood in each month. /donations?year=2026&month=10
export default async function DonationsDashboard({
  searchParams,
}: {
  searchParams: { year?: string; month?: string };
}) {
  const now = currentYearMonth();
  const yearParam = Number(searchParams.year);
  const monthParam = Number(searchParams.month);
  const year = Number.isInteger(yearParam) && yearParam >= 2024 && yearParam <= 2100 ? yearParam : now.year;
  const month = Number.isInteger(monthParam) && monthParam >= 1 && monthParam <= 12 ? monthParam : now.month;

  let totals: number[] = Array(12).fill(0);
  let donors: DonorRow[] = [];
  let loadError = false;
  try {
    [totals, donors] = await Promise.all([getMonthlyTotals(year), getMonthlyDonors(year, month)]);
  } catch {
    loadError = true;
  }

  const prev = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  const yearTotal = totals.reduce((a, b) => a + b, 0);

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-bold text-brand-600">Monthly donation dashboard</h1>
        <p className="text-sm text-gray-500">
          Every donation here was confirmed by the person who needed the blood.
        </p>
      </div>

      {loadError ? (
        <p className="rounded bg-white p-4 text-sm text-gray-500 shadow">The dashboard is not available right now.</p>
      ) : (
        <>
          <section className="rounded-lg bg-white p-5 shadow">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">
                {year}: {yearTotal} {yearTotal === 1 ? "donation" : "donations"}
              </h2>
              <div className="flex gap-3 text-sm">
                <Link className="text-brand-600 underline" href={`/donations?year=${year - 1}&month=${month}`}>
                  {year - 1}
                </Link>
                <Link className="text-brand-600 underline" href={`/donations?year=${year + 1}&month=${month}`}>
                  {year + 1}
                </Link>
              </div>
            </div>
            <MonthlyChart year={year} totals={totals} selectedMonth={month} />
          </section>

          <section className="rounded-lg bg-white p-5 shadow">
            <div className="mb-4 flex items-center justify-between">
              <Link href={`/donations?year=${prev.year}&month=${prev.month}`} className="text-sm text-brand-600 underline">
                &larr; {MONTH_NAMES[prev.month - 1]}
              </Link>
              <h2 className="text-lg font-bold">
                {MONTH_NAMES[month - 1]} {year}
              </h2>
              <Link href={`/donations?year=${next.year}&month=${next.month}`} className="text-sm text-brand-600 underline">
                {MONTH_NAMES[next.month - 1]} &rarr;
              </Link>
            </div>

            {donors.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">No confirmed donations in this month.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b text-xs uppercase text-gray-500">
                  <tr>
                    <th className="py-2">Donor</th>
                    <th>Blood group</th>
                    <th>City</th>
                    <th className="text-right">Donations</th>
                    <th className="text-right">Last</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {donors.map((d) => (
                    <tr key={d.donorId}>
                      <td className="py-2 font-medium">{d.name}</td>
                      <td>{d.bloodGroup ?? "-"}</td>
                      <td>{d.city ?? "-"}</td>
                      <td className="text-right">{d.donations}</td>
                      <td className="text-right text-gray-500">{formatDate(d.lastDonatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </main>
  );
}