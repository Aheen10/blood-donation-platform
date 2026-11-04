import Link from "next/link";
import { MONTH_NAMES } from "@/lib/format";

// Simple bar chart (pure CSS): donations confirmed in each month of a year.
export default function MonthlyChart({
  year,
  totals,
  selectedMonth,
}: {
  year: number;
  totals: number[];
  selectedMonth?: number;
}) {
  const max = Math.max(1, ...totals);
  return (
    <div className="flex h-40 items-end gap-2">
      {totals.map((count, i) => {
        const month = i + 1;
        const active = selectedMonth === month;
        return (
          <Link
            key={month}
            href={`/donations?year=${year}&month=${month}`}
            className="group flex h-full flex-1 flex-col items-center justify-end gap-1"
            title={`${MONTH_NAMES[i]} ${year}: ${count} donation${count === 1 ? "" : "s"}`}
          >
            <span className="text-xs text-gray-600">{count}</span>
            <div
              className={`w-full rounded-t ${active ? "bg-brand-600" : "bg-brand-100 group-hover:bg-brand-500"}`}
              style={{ height: `${Math.max(4, (count / max) * 100)}%` }}
            />
            <span className={`text-xs ${active ? "font-bold text-brand-700" : "text-gray-500"}`}>
              {MONTH_NAMES[i].slice(0, 3)}
            </span>
          </Link>
        );
      })}
    </div>
  );
}