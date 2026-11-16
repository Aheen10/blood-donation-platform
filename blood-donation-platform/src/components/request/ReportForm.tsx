"use client";

import { useState } from "react";
import { MIN_REPORT_DESCRIPTION, REPORT_REASONS, REPORT_REASON_LABELS } from "@/lib/constants";

// Report someone from the same request and ask an admin to restrict or ban them.
export default function ReportForm({
  requestId,
  reportedUserId,
  reportedName,
  onClose,
}: {
  requestId: string;
  reportedUserId: string;
  reportedName: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<(typeof REPORT_REASONS)[number]>("blood_selling");
  const [description, setDescription] = useState("");
  const [requestedAction, setRequestedAction] = useState<"ban" | "restrict">("ban");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, reportedUserId, reason, description, requestedAction }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const detail = data.details?.fieldErrors?.description?.[0];
      setError(detail || data.error || "Could not send the report");
      return;
    }
    setDone(true);
  }

  const field = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        {done ? (
          <div className="space-y-4 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12l5 5 9-10" />
              </svg>
            </span>
            <p className="text-lg font-semibold text-slate-900">Report sent</p>
            <p className="text-sm text-slate-600">
              An admin will review it. If they approve it, the account will be{" "}
              {requestedAction === "ban" ? "banned" : "restricted"}. You will get a notification with the result.
            </p>
            <button onClick={onClose} className="btn-primary px-6">
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Report {reportedName}</h2>

            <label className="block text-sm font-medium text-slate-700">
              What happened?
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as (typeof REPORT_REASONS)[number])}
                className={field}
              >
                {REPORT_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {REPORT_REASON_LABELS[r]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Explain in your own words (required)
              <textarea
                required
                minLength={MIN_REPORT_DESCRIPTION}
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Example: They said it was for a patient, took the blood and I later found out they sold it."
                className={field}
              />
            </label>

            <fieldset className="space-y-2 text-sm text-slate-700">
              <legend className="mb-1 font-medium">What action do you request?</legend>
              <label className="flex items-center gap-2">
                <input type="radio" checked={requestedAction === "ban"} onChange={() => setRequestedAction("ban")} />
                Ban the account
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={requestedAction === "restrict"} onChange={() => setRequestedAction("restrict")} />
                Restrict the account (cannot request, accept or message)
              </label>
            </fieldset>

            <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
              Nothing happens until an admin approves. False reports can lead to action against your own account.
            </p>
            {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="btn-outline">
                Cancel
              </button>
              <button disabled={loading} className="btn-primary disabled:opacity-50">
                {loading ? "Sending..." : "Send report"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}