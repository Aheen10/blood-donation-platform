"use client";

import { useEffect, useState } from "react";
import { BLOOD_GROUPS } from "@/lib/constants";
import { formatDate } from "@/lib/format";

interface Profile {
  bloodGroup: string;
  city: string;
  area: string;
  lat: number | null;
  lng: number | null;
  lastDonationDate: string | null;
  isAvailable: boolean;
  showOnLeaderboard: boolean;
}

// Lets any member become a donor, pause donating, or hide their name from the public leaderboard.
export default function DonorProfileForm() {
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined); // undefined = loading
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    bloodGroup: "O+",
    city: "",
    area: "",
    lat: "",
    lng: "",
    lastDonationDate: "",
    consent: false,
  });

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  async function load() {
    const res = await fetch("/api/donor-profile");
    if (!res.ok) {
      setError("Could not load your donor profile");
      setProfile(null);
      return;
    }
    setProfile((await res.json()).profile);
  }

  useEffect(() => {
    load();
  }, []);

  function useMyLocation() {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        set("lat", String(pos.coords.latitude));
        set("lng", String(pos.coords.longitude));
      },
      () => setError("Could not get your location. Enter it manually.")
    );
  }

  async function becomeDonor(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/donor-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bloodGroup: form.bloodGroup,
        city: form.city,
        area: form.area || undefined,
        lat: Number(form.lat),
        lng: Number(form.lng),
        lastDonationDate: form.lastDonationDate ? new Date(form.lastDonationDate).toISOString() : null,
        consentToContact: form.consent,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not save your donor profile");
      return;
    }
    await load();
  }

  async function toggle(key: "isAvailable" | "showOnLeaderboard", value: boolean) {
    setError("");
    const res = await fetch("/api/donor-profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: value }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not update");
      return;
    }
    setProfile((p) => (p ? { ...p, [key]: value } : p));
  }

  const input = "w-full rounded border px-3 py-2";

  if (profile === undefined) return <p className="text-sm text-gray-500">Loading...</p>;

  // Already a donor: show status and switches
  if (profile) {
    return (
      <div className="space-y-3 rounded-lg bg-white p-4 shadow">
        <p className="text-sm">
          Blood group <strong>{profile.bloodGroup}</strong> · {profile.city}
          {profile.area ? `, ${profile.area}` : ""}
          {profile.lastDonationDate ? ` · last donated ${formatDate(profile.lastDonationDate)}` : ""}
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={profile.isAvailable} onChange={(e) => toggle("isAvailable", e.target.checked)} />
          I am available to donate (turn off to pause requests)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={profile.showOnLeaderboard} onChange={(e) => toggle("showOnLeaderboard", e.target.checked)} />
          Show my name on the public leaderboard
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  // Not a donor yet: show the form to become one
  return (
    <form onSubmit={becomeDonor} className="space-y-3 rounded-lg bg-white p-4 shadow">
      <p className="text-sm text-gray-600">
        You are not registered as a donor yet. Fill this in to help people who need blood.
      </p>
      <select className={input} value={form.bloodGroup} onChange={(e) => set("bloodGroup", e.target.value)}>
        {BLOOD_GROUPS.map((g) => (
          <option key={g}>{g}</option>
        ))}
      </select>
      <input required placeholder="City" className={input} value={form.city} onChange={(e) => set("city", e.target.value)} />
      <input placeholder="Area (optional)" className={input} value={form.area} onChange={(e) => set("area", e.target.value)} />
      <div className="flex gap-2">
        <input required placeholder="Latitude" className={input} value={form.lat} onChange={(e) => set("lat", e.target.value)} />
        <input required placeholder="Longitude" className={input} value={form.lng} onChange={(e) => set("lng", e.target.value)} />
      </div>
      <button type="button" onClick={useMyLocation} className="text-sm text-brand-600 underline">
        Use my current location
      </button>
      <label className="block text-sm text-gray-600">
        Last donation date (leave empty if never)
        <input type="date" className={`${input} mt-1`} value={form.lastDonationDate} onChange={(e) => set("lastDonationDate", e.target.value)} />
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={form.consent} onChange={(e) => set("consent", e.target.checked)} />
        I agree to be contacted for emergency blood requests. I can pause this any time.
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={saving || !form.consent}
        className="rounded bg-brand-600 px-4 py-2 text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Become a donor"}
      </button>
    </form>
  );
}