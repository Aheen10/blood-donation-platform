"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDateTime } from "@/lib/format";

interface ReportItem {
  id: string;
  status: "pending" | "approved" | "rejected";
  reason: string;
  reasonLabel: string;
  description: string;
  requestedAction: "ban" | "restrict";
  appliedAction: "ban" | "restrict" | null;
  adminNote: string | null;
  createdAt: string;
  otherPendingReportsAgainstUser: number;
  reporter: { id: string; name: string; email: string } | null;
  reportedUser: { id: string; name: string; email: string; isBlocked: boolean; isRestricted: boolean } | null;
  request: { id: string; bloodGroup: string; hospitalName: string; city: string; status: string } | null;
  chat: { from: "reporter" | "reported"; text: string; createdAt: string }[];
}

const TABS = ["pending", "approved", "rejected"] as const;

export default function AdminReportsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("pending");
  const [items, setItems] = useState<ReportItem[] | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    setItems(null);
    const res = await fetch(`/api/admin/reports?status=${tab}`);
    if (!res.ok) {
      setError("Could not load reports");
      return;
    }
    setError("");
    setItems((await res.json()).reports);
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  async function resolve(id: string, decision: "approve" | "reject", action?: "ban" | "restrict") {
    const label = decision === "reject" ? "reject this report" : action === "ban" ? "BAN this user" : "restrict this user";
    if (!confirm(`Are you sure you want to ${label}?`)) return;
    setBusyId(id);
    const res = await fetch("/api/admin/reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId: id, decision, action, adminNote: notes[id] || undefined }),
    });
    setBusyId("");
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Action failed");
      return;
    }
    setError("");
    load();
  }

  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-8">
      <h1 className="text-2xl font-bold text-brand-600">Fraud reports</h1>

      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded border px-4 py-1.5 text-sm capitalize ${tab === t ? "bg-brand-600 text-white" : "bg-white"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {items === null && !error && <p className="text-sm text-gray-500">Loading...</p>}
      {items?.length === 0 && <p className="text-sm text-gray-500">No {tab} reports.</p>}

      <ul className="space-y-4">
        {items?.map((r) => (
          <li key={r.id} className="space-y-3 rounded-lg bg-white p-5 shadow">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">{r.reasonLabel}</span>
              <span className="text-xs text-gray-500">wants: {r.requestedAction}</span>
              <span className="ml-auto text-xs text-gray-400">{formatDateTime(r.createdAt)}</span>
            </div>

            <p className="text-sm">
              <strong>{r.reporter?.name ?? "Unknown"}</strong> ({r.reporter?.email}) reported{" "}
              <strong>{r.reportedUser?.name ?? "Unknown"}</strong> ({r.reportedUser?.email})
              {r.reportedUser?.isBlocked && <span className="ml-1 text-red-600">[already banned]</span>}
              {r.reportedUser?.isRestricted && <span className="ml-1 text-orange-600">[restricted]</span>}
            </p>

            {r.otherPendingReportsAgainstUser > 0 && (
              <p className="rounded bg-yellow-50 p-2 text-xs text-yellow-800">
                {r.otherPendingReportsAgainstUser} other pending report(s) against this user.
              </p>
            )}

            {r.request && (
              <p className="text-xs text-gray-500">
                Request: {r.request.bloodGroup} at {r.request.hospitalName}, {r.request.city} ({r.request.status})
              </p>
            )}

            <blockquote className="whitespace-pre-wrap rounded bg-gray-50 p-3 text-sm">{r.description}</blockquote>

            <details className="text-sm">
              <summary className="cursor-pointer text-brand-600">Chat between them ({r.chat.length})</summary>
              <div className="mt-2 max-h-52 space-y-1 overflow-y-auto rounded border p-2">
                {r.chat.length === 0 && <p className="text-xs text-gray-400">No messages.</p>}
                {r.chat.map((m, i) => (
                  <p key={i} className="text-xs">
                    <strong>{m.from === "reporter" ? r.reporter?.name : r.reportedUser?.name}:</strong> {m.text}
                  </p>
                ))}
              </div>
            </details>

            {r.status === "pending" ? (
              <div className="space-y-2">
                <textarea
                  placeholder="Admin note (optional, shown in the reason)"
                  rows={2}
                  value={notes[r.id] ?? ""}
                  onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                  className="w-full rounded border px-3 py-2 text-sm"
                />
                <div className="flex flex-wrap gap-2">
                  <button disabled={busyId === r.id} onClick={() => resolve(r.id, "approve", "ban")} className="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50">
                    Approve and ban
                  </button>
                  <button disabled={busyId === r.id} onClick={() => resolve(r.id, "approve", "restrict")} className="rounded bg-orange-500 px-4 py-2 text-sm text-white hover:bg-orange-600 disabled:opacity-50">
                    Approve and restrict only
                  </button>
                  <button disabled={busyId === r.id} onClick={() => resolve(r.id, "reject")} className="rounded border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50">
                    Reject
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600">
                {r.status === "approved" ? `Approved: user ${r.appliedAction === "ban" ? "banned" : "restricted"}.` : "Rejected."}
                {r.adminNote ? ` Note: ${r.adminNote}` : ""}
              </p>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}