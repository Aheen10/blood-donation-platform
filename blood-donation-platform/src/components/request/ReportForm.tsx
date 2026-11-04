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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-5 shadow-xl">
        {done ? (
          <div className="space-y-4 text-center">
            <p className="font-semibold">Report sent</p>
            <p className="text-sm text-gray-600">
              An admin will review it. If they approve it, the account will be {requestedAction === "ban" ? "banned" : "restricted"}.
              You will get a notification with the result.
            </p>
            <button onClick={onClose} className="rounded bg-brand-600 px-4 py-2 text-white">
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <h2 className="text-lg font-bold text-brand-600">Report {reportedName}</h2>

            <label className="block text-sm">
              What happened?
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as (typeof REPORT_REASONS)[number])}
                className="mt-1 w-full rounded border px-3 py-2"
              >
                {REPORT_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {REPORT_REASON_LABELS[r]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              Explain in your own words (required)
              <textarea
                required
                minLength={MIN_REPORT_DESCRIPTION}
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Example: They said it was for a patient, took the blood and I later found out they sold it."
                className="mt-1 w-full rounded border px-3 py-2"
              />
            </label>

            <fieldset className="space-y-1 text-sm">
              <legend className="mb-1">What action do you request?</legend>
              <label className="flex items-center gap-2">
                <input type="radio" checked={requestedAction === "ban"} onChange={() => setRequestedAction("ban")} />
                Ban the account
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={requestedAction === "restrict"} onChange={() => setRequestedAction("restrict")} />
                Restrict the account (cannot request, accept or message)
              </label>
            </fieldset>

            <p className="text-xs text-gray-500">
              Nothing happens until an admin approves. False reports can lead to action against your own account.
            </p>
            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="rounded border px-4 py-2 text-sm">
                Cancel
              </button>
              <button disabled={loading} className="rounded bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-50">
                {loading ? "Sending..." : "Send report"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}