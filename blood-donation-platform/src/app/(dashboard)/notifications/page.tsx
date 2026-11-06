"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatDateTime } from "@/lib/format";

interface Item {
  id: string;
  type: string;
  title: string;
  message: string;
  requestId: string | null;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/notifications");
      if (!res.ok) {
        setError("Could not load notifications");
        return;
      }
      const data = await res.json();
      setItems(data.notifications);
      // Opening the page marks everything as read (the list above still shows which were new)
      if (data.unread > 0) await fetch("/api/notifications", { method: "PATCH" });
    })();
  }, []);

  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-8">
      <h1 className="text-2xl font-bold text-brand-600">Notifications</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {items === null && !error && <p className="text-sm text-gray-500">Loading...</p>}
      {items?.length === 0 && <p className="text-sm text-gray-500">Nothing here yet.</p>}

      <ul className="space-y-2">
        {items?.map((n) => {
          const body = (
            <div className={`rounded-lg p-4 shadow ${n.isRead ? "bg-white" : "border-l-4 border-brand-600 bg-brand-50"}`}>
              <p className="font-medium">{n.title}</p>
              <p className="text-sm text-gray-700">{n.message}</p>
              <p className="mt-1 text-xs text-gray-400">{formatDateTime(n.createdAt)}</p>
            </div>
          );
          return (
            <li key={n.id}>
              {n.requestId ? <Link href={`/requests/${n.requestId}`}>{body}</Link> : body}
            </li>
          );
        })}
      </ul>
    </main>
  );
}