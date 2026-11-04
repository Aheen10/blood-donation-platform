"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatDate } from "@/lib/format";

interface Item {
  id: string;
  bloodGroup: string;
  unitsNeeded: number;
  urgency: string;
  hospitalName: string;
  city: string;
  status: string;
  acceptedCount: number;
  createdAt: string;
}

const urgencyStyle: Record<string, string> = {
  critical: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  normal: "bg-gray-100 text-gray-700",
};

export default function RequestList({ mine }: { mine: boolean }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/requests${mine ? "?mine=1" : ""}`);
      if (!res.ok) {
        setError("Could not load requests");
        return;
      }
      setItems((await res.json()).requests);
    })();
  }, [mine]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!items) return <p className="text-sm text-gray-500">Loading...</p>;
  if (items.length === 0) return <p className="text-sm text-gray-500">No requests yet.</p>;

  return (
    <ul className="space-y-3">
      {items.map((r) => (
        <li key={r.id}>
          <Link href={`/requests/${r.id}`} className="flex items-center gap-4 rounded-lg bg-white p-4 shadow hover:shadow-md">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-600 font-bold text-white">
              {r.bloodGroup}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {r.hospitalName}, {r.city}
              </p>
              <p className="text-xs text-gray-500">
                {r.unitsNeeded} {r.unitsNeeded === 1 ? "unit" : "units"} · {r.acceptedCount} accepted · {formatDate(r.createdAt)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={`rounded px-2 py-0.5 text-xs font-medium ${urgencyStyle[r.urgency] ?? urgencyStyle.normal}`}>
                {r.urgency}
              </span>
              <span className="text-xs capitalize text-gray-500">{r.status}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}