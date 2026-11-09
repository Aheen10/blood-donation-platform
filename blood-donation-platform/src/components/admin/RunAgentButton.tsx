"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RunAgentButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function run() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/agent", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error || "Could not run the agent");
      } else {
        setMessage(`Checked ${data.checked} open request(s), ran a new round for ${data.escalated}.`);
        router.refresh();
      }
    } catch {
      setMessage("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={run}
        disabled={loading}
        className="rounded bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {loading ? "Running..." : "Run escalation now"}
      </button>
      {message && <span className="text-sm text-gray-600">{message}</span>}
    </div>
  );
}