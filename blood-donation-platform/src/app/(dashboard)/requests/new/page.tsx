"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BLOOD_GROUPS, URGENCY_LEVELS } from "@/lib/constants";

export default function NewRequestPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    patientName: "",
    bloodGroup: "O+",
    unitsNeeded: "1",
    urgency: "high",
    hospitalName: "",
    city: "",
    lat: "",
    lng: "",
    contactPhone: "",
    note: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function useMyLocation() {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        set("lat", String(pos.coords.latitude));
        set("lng", String(pos.coords.longitude));
      },
      () => setError("Could not get your location. Enter it manually.")
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        unitsNeeded: Number(form.unitsNeeded),
        lat: Number(form.lat),
        lng: Number(form.lng),
        note: form.note || undefined,
      }),
    });
    setLoading(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Could not create the request");
      return;
    }
    router.push(`/requests/${data.id}`);
  }

  const input = "w-full rounded border px-3 py-2";

  return (
    <main className="mx-auto max-w-md space-y-4 px-4 py-8">
      <h1 className="text-2xl font-bold text-brand-600">New blood request</h1>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg bg-white p-6 shadow">
        <input required placeholder="Patient name" className={input} value={form.patientName} onChange={(e) => set("patientName", e.target.value)} />
        <div className="flex gap-2">
          <select className={input} value={form.bloodGroup} onChange={(e) => set("bloodGroup", e.target.value)}>
            {BLOOD_GROUPS.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
          <input type="number" min={1} max={10} required className={input} value={form.unitsNeeded} onChange={(e) => set("unitsNeeded", e.target.value)} />
        </div>
        <select className={input} value={form.urgency} onChange={(e) => set("urgency", e.target.value)}>
          {URGENCY_LEVELS.map((u) => (
            <option key={u} value={u}>
              Urgency: {u}
            </option>
          ))}
        </select>
        <input required placeholder="Hospital name" className={input} value={form.hospitalName} onChange={(e) => set("hospitalName", e.target.value)} />
        <input required placeholder="City" className={input} value={form.city} onChange={(e) => set("city", e.target.value)} />
        <div className="flex gap-2">
          <input required placeholder="Latitude" className={input} value={form.lat} onChange={(e) => set("lat", e.target.value)} />
          <input required placeholder="Longitude" className={input} value={form.lng} onChange={(e) => set("lng", e.target.value)} />
        </div>
        <button type="button" onClick={useMyLocation} className="text-sm text-brand-600 underline">
          Use my current location (stand at the hospital)
        </button>
        <input required placeholder="Contact phone" className={input} value={form.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} />
        <textarea placeholder="Note for donors (optional)" className={input} rows={3} value={form.note} onChange={(e) => set("note", e.target.value)} />
        <p className="text-xs text-gray-500">
          Your phone number is shown only to donors who accept the request. Fake or misused requests can lead to a ban.
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={loading} className="w-full rounded bg-brand-600 py-2 text-white hover:bg-brand-700 disabled:opacity-50">
          {loading ? "Submitting..." : "Submit request"}
        </button>
      </form>
    </main>
  );
}