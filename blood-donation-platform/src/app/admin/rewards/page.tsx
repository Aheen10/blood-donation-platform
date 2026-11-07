"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDate } from "@/lib/format";

interface Winner {
  rank: number;
  gift: string;
  donors: { donorId: string; name: string; donations: number }[];
}
interface EventView {
  year: number;
  title: string;
  description: string | null;
  eventDate: string;
  venue: string | null;
  rewards: { rank: number; gift: string }[];
}

export default function AdminRewardsPage() {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [event, setEvent] = useState<EventView | null>(null);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({ title: "", description: "", eventDate: "", venue: "" });
  const [rewards, setRewards] = useState([
    { rank: 1, gift: "" },
    { rank: 2, gift: "" },
    { rank: 3, gift: "" },
  ]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoaded(false);
    const res = await fetch(`/api/admin/rewards?year=${year}`);
    if (!res.ok) {
      setError("Could not load");
      return;
    }
    setError("");
    const data = await res.json();
    setEvent(data.event);
    setWinners(data.winners);
    setLoaded(true);
  }, [year]);

  useEffect(() => {
    load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/rewards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        year,
        title: form.title,
        description: form.description || undefined,
        eventDate: new Date(form.eventDate).toISOString(),
        venue: form.venue || undefined,
        rewards: rewards.filter((r) => r.gift.trim()),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not save");
      return;
    }
    load();
  }

  const input = "w-full rounded border px-3 py-2 text-sm";

  return (
    <main className="mx-auto max-w-2xl space-y-5 px-4 py-8">
      <h1 className="text-2xl font-bold text-brand-600">Year-end rewards</h1>

      <label className="flex items-center gap-2 text-sm">
        Year
        <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-28 rounded border px-3 py-1.5" />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loaded && !error && <p className="text-sm text-gray-500">Loading...</p>}

      {loaded && event && (
        <section className="space-y-3 rounded-lg bg-white p-5 shadow">
          <h2 className="text-lg font-semibold">{event.title}</h2>
          <p className="text-sm text-gray-600">
            {formatDate(event.eventDate)}
            {event.venue ? ` · ${event.venue}` : ""}
          </p>
          {event.description && <p className="text-sm">{event.description}</p>}
          <h3 className="pt-2 font-medium">Current winners</h3>
          <ul className="space-y-2 text-sm">
            {winners.map((w) => (
              <li key={w.rank} className="rounded bg-gray-50 p-3">
                <strong>Rank {w.rank}:</strong> {w.gift}
                <br />
                <span className="text-gray-600">
                  {w.donors.length ? w.donors.map((d) => `${d.name} (${d.donations})`).join(", ") : "No donor at this rank yet"}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-500">Banned users are removed from the ranking automatically.</p>
        </section>
      )}

      {loaded && !event && (
        <form onSubmit={create} className="space-y-3 rounded-lg bg-white p-5 shadow">
          <h2 className="font-semibold">Create the {year} event</h2>
          <input required placeholder="Event title" className={input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea placeholder="Description (optional)" rows={2} className={input} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input required type="datetime-local" className={input} value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} />
          <input placeholder="Venue (optional)" className={input} value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />

          <div className="space-y-2">
            <p className="text-sm font-medium">Gifts by rank</p>
            {rewards.map((r, i) => (
              <div key={i} className="flex gap-2">
                <input type="number" min={1} className="w-20 rounded border px-3 py-2 text-sm" value={r.rank} onChange={(e) => setRewards(rewards.map((x, j) => (j === i ? { ...x, rank: Number(e.target.value) } : x)))} />
                <input placeholder="Gift (e.g. Smart watch)" className={input} value={r.gift} onChange={(e) => setRewards(rewards.map((x, j) => (j === i ? { ...x, gift: e.target.value } : x)))} />
                <button type="button" onClick={() => setRewards(rewards.filter((_, j) => j !== i))} className="px-2 text-gray-400 hover:text-red-600">
                  x
                </button>
              </div>
            ))}
            <button type="button" onClick={() => setRewards([...rewards, { rank: rewards.length + 1, gift: "" }])} className="text-sm text-brand-600 underline">
              Add another rank
            </button>
          </div>

          <button disabled={saving} className="w-full rounded bg-brand-600 py-2 text-white hover:bg-brand-700 disabled:opacity-50">
            {saving ? "Saving..." : "Create event"}
          </button>
        </form>
      )}
    </main>
  );
}