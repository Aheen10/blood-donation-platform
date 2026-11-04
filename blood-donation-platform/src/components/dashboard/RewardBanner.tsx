import type { RewardEventView, RewardWinner } from "@/lib/rewards";
import { formatDate } from "@/lib/format";

const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export default function RewardBanner({
  event,
  winners,
}: {
  event: RewardEventView;
  winners: RewardWinner[];
}) {
  const past = new Date(event.eventDate).getTime() < Date.now();
  return (
    <section className="rounded-lg border border-yellow-300 bg-yellow-50 p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-yellow-700">
        {past ? "Year-end event" : "Upcoming year-end event"}
      </p>
      <h2 className="mt-1 text-xl font-bold text-gray-900">{event.title}</h2>
      <p className="text-sm text-gray-700">
        {formatDate(event.eventDate)}
        {event.venue ? ` · ${event.venue}` : ""}
      </p>
      {event.description && <p className="mt-2 text-sm text-gray-700">{event.description}</p>}

      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {event.rewards.map((r) => {
          const w = winners.find((x) => x.rank === r.rank);
          return (
            <li key={r.rank} className="rounded bg-white px-3 py-2 text-sm shadow-sm">
              <span className="font-semibold">{ordinal(r.rank)} place:</span> {r.gift}
              {past && w && w.donors.length > 0 && (
                <span className="block text-xs text-gray-500">
                  Winner: {w.donors.map((d) => d.name).join(", ")}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}