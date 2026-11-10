import type { DonorRow } from "@/lib/leaderboard";

const rankStyle: Record<number, string> = {
  1: "bg-yellow-400 text-yellow-900",
  2: "bg-gray-300 text-gray-800",
  3: "bg-orange-300 text-orange-900",
};

export default function YearlyLeaderboard({ rows, year }: { rows: DonorRow[]; year: number }) {
  return (
    <section className="rounded-lg bg-white p-5 shadow">
      <h2 className="text-xl font-bold text-gray-900">Top donors of {year}</h2>
      <p className="mb-4 text-sm text-gray-500">
        Ranked by number of confirmed blood donations this year. Top donors receive a gift at the year-end event.
      </p>

      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500">No donations confirmed yet this year.</p>
      ) : (
        <ol className="divide-y">
          {rows.map((r) => (
            <li key={r.donorId} className="flex items-center gap-3 py-3">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  rankStyle[r.rank] ?? "bg-gray-100 text-gray-700"
                }`}
              >
                {r.rank}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{r.name}</p>
                <p className="text-xs text-gray-500">
                  {[r.bloodGroup, r.city].filter(Boolean).join(" · ") || "Donor"}
                </p>
              </div>
              <span className="rounded bg-brand-50 px-2 py-1 text-sm font-semibold text-brand-700">
                {r.donations} {r.donations === 1 ? "donation" : "donations"}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}