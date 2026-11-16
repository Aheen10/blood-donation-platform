"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatDate } from "@/lib/format";
import { StatusBadge, UrgencyBadge } from "@/components/request/StatusBadges";

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

  if (error) return <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>;

  if (!items) {
    return (
      <ul className="space-y-3" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <li key={i} className="card h-20 animate-pulse bg-slate-100" />
        ))}
      </ul>
    );
  }

  if (items.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="font-medium text-slate-800">No requests yet</p>
        <p className="mt-1 text-sm text-slate-500">
          {mine ? "When you post a blood request it will appear here." : "There are no open requests right now."}
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((r) => (
        <li key={r.id}>
          <Link
            href={`/requests/${r.id}`}
            className="card flex items-center gap-4 p-4 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-600 font-bold text-white shadow-sm">
              {r.bloodGroup}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-slate-900">
                {r.hospitalName}, {r.city}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {r.unitsNeeded} {r.unitsNeeded === 1 ? "unit" : "units"} | {r.acceptedCount} accepted |{" "}
                {formatDate(r.createdAt)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <UrgencyBadge urgency={r.urgency} />
              <StatusBadge status={r.status} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}