"use client";

import { useEffect, useState } from "react";

type PointsData = {
  isDonor: boolean;
  points?: number;
  totalDonations?: number;
  level?: { name: string; currentMin: number; nextName: string | null; nextAt: number | null };
  history?: { points: number; reason: string; note: string; date: string }[];
};

export default function PointsCard() {
  const [data, setData] = useState<PointsData | null>(null);

  useEffect(() => {
    fetch("/api/points")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ isDonor: false }));
  }, []);

  if (!data) return null;

  if (!data.isDonor) {
    return (
      <div className="rounded-lg border bg-white p-5">
        <h2 className="text-lg font-semibold">Reward points</h2>
        <p className="mt-1 text-sm text-gray-600">
          Become a donor to earn reward points every time a donation is confirmed.
        </p>
      </div>
    );
  }

  const points = data.points ?? 0;
  const level = data.level!;
  const progress =
    level.nextAt === null ? 100 : Math.round(((points - level.currentMin) / (level.nextAt - level.currentMin)) * 100);

  return (
    <div className="space-y-4 rounded-lg border bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Reward points</h2>
        <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-700">{level.name}</span>
      </div>

      <div>
        <p className="text-4xl font-bold text-red-600">{points}</p>
        <p className="text-sm text-gray-600">
          {data.totalDonations ?? 0} confirmed donation{data.totalDonations === 1 ? "" : "s"}
        </p>
      </div>

      <div>
        <div className="h-2 w-full overflow-hidden rounded bg-gray-200">
          <div className="h-2 rounded bg-red-600" style={{ width: `${Math.min(100, progress)}%` }} />
        </div>
        <p className="mt-1 text-xs text-gray-500">
          {level.nextAt === null
            ? "You have reached the highest level."
            : `${level.nextAt - points} more points to reach ${level.nextName}`}
        </p>
      </div>

      <div className="rounded bg-gray-50 p-3 text-xs text-gray-600">
        How to earn: 100 points per confirmed donation, +50 for your first donation, +25 for a high-urgency
        request, +50 for a critical request.
      </div>

      {data.history && data.history.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium">Recent points</h3>
          <ul className="space-y-1 text-sm">
            {data.history.map((h, i) => (
              <li key={i} className="flex justify-between border-b pb-1 last:border-0">
                <span>{h.note || h.reason}</span>
                <span className="text-green-700">
                  +{h.points} <span className="text-xs text-gray-400">({h.date})</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}