"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LocationPicker from "@/components/location/LocationPicker";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

type Donor = {
  bloodGroup: string;
  city: string;
  area: string;
  lat: number | null;
  lng: number | null;
  lastDonationDate: string;
  nextEligibleDate: string;
  isAvailable: boolean;
  consentToContact: boolean;
  showOnLeaderboard: boolean;
};

export default function AccountForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [donor, setDonor] = useState<Donor | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function load() {
    const res = await fetch("/api/account");
    const d = await res.json();
    setName(d.name || "");
    setEmail(d.email || "");
    setPhone(d.phone || "");
    setDonor(d.donor || null);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function setD<K extends keyof Donor>(key: K, value: Donor[K]) {
    setDonor((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setSaving(true);
    const payload: Record<string, unknown> = { name, email, phone };
    if (donor) {
      payload.donor = {
        bloodGroup: donor.bloodGroup,
        city: donor.city,
        area: donor.area,
        lat: donor.lat,
        lng: donor.lng,
        lastDonationDate: donor.lastDonationDate || null,
        isAvailable: donor.isAvailable,
        consentToContact: donor.consentToContact,
        showOnLeaderboard: donor.showOnLeaderboard,
      };
    }
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const d = await res.json();
    setSaving(false);
    if (res.ok) {
      setMsg({ ok: true, text: "All changes saved." });
      load();
    } else {
      setMsg({ ok: false, text: d.error || "Update failed" });
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (newPassword !== confirm) {
      setPwMsg({ ok: false, text: "New passwords do not match" });
      return;
    }
    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const d = await res.json();
    if (res.ok) {
      setPwMsg({ ok: true, text: "Password changed." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
    } else {
      setPwMsg({ ok: false, text: d.error || "Could not change password" });
    }
  }

  const input = "w-full rounded border border-gray-300 px-3 py-2 text-sm";
  const label = "mb-1 block text-sm font-medium";
  const btn = "rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60";
  const check = "flex items-center gap-2 text-sm";

  if (loading) return <p className="text-sm text-gray-500">Loading...</p>;

  return (
    <div className="space-y-8">
      <form onSubmit={save} className="space-y-8">
        <section className="space-y-4 rounded-lg border bg-white p-5">
          <h2 className="text-lg font-semibold">Personal information</h2>
          <div>
            <label className={label}>Full name</label>
            <input className={input} value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className={label}>Email (used for login)</label>
            <input type="email" className={input} value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className={label}>Phone</label>
            <input className={input} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </section>

        <section className="space-y-4 rounded-lg border bg-white p-5">
          <h2 className="text-lg font-semibold">Donor information</h2>
          {!donor ? (
            <p className="text-sm text-gray-600">
              You have not created a donor profile yet.{" "}
              <Link href="/donor" className="font-medium text-red-600 underline">
                Become a donor
              </Link>
            </p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={label}>Blood group</label>
                  <select className={input} value={donor.bloodGroup} onChange={(e) => setD("bloodGroup", e.target.value)}>
                    {BLOOD_GROUPS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={label}>City</label>
                  <input className={input} value={donor.city} onChange={(e) => setD("city", e.target.value)} required />
                </div>
                <div>
                  <label className={label}>Area</label>
                  <input className={input} value={donor.area} onChange={(e) => setD("area", e.target.value)} />
                </div>
                <div>
                  <label className={label}>Last donation date</label>
                  <input
                    type="date"
                    className={input}
                    value={donor.lastDonationDate}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setD("lastDonationDate", e.target.value)}
                  />
                </div>
              </div>

              {donor.nextEligibleDate && (
                <p className="text-sm text-gray-600">Next eligible date: {donor.nextEligibleDate}</p>
              )}

              <div>
                <label className={label}>Saved location (used when live location is not available)</label>
                <LocationPicker
                  lat={donor.lat}
                  lng={donor.lng}
                  onChange={(la, ln) => {
                    setD("lat", la);
                    setD("lng", ln);
                  }}
                />
              </div>

              <div className="space-y-2">
                <label className={check}>
                  <input type="checkbox" checked={donor.isAvailable} onChange={(e) => setD("isAvailable", e.target.checked)} />
                  I am available to donate
                </label>
                <label className={check}>
                  <input
                    type="checkbox"
                    checked={donor.consentToContact}
                    onChange={(e) => setD("consentToContact", e.target.checked)}
                  />
                  Allow requesters to contact me
                </label>
                <label className={check}>
                  <input
                    type="checkbox"
                    checked={donor.showOnLeaderboard}
                    onChange={(e) => setD("showOnLeaderboard", e.target.checked)}
                  />
                  Show me on the yearly leaderboard
                </label>
                <p className="text-xs text-gray-500">
                  Live location sharing can be switched on from the{" "}
                  <Link href="/donor" className="underline">
                    Donate page
                  </Link>
                  .
                </p>
              </div>
            </>
          )}
        </section>

        {msg && <p className={`text-sm ${msg.ok ? "text-green-600" : "text-red-600"}`}>{msg.text}</p>}
        <button className={btn} type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save all changes"}
        </button>
      </form>

      <form onSubmit={changePassword} className="space-y-4 rounded-lg border bg-white p-5">
        <h2 className="text-lg font-semibold">Change password</h2>
        <div>
          <label className={label}>Current password</label>
          <input type="password" className={input} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
        </div>
        <div>
          <label className={label}>New password</label>
          <input type="password" className={input} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} />
        </div>
        <div>
          <label className={label}>Confirm new password</label>
          <input type="password" className={input} value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} />
        </div>
        {pwMsg && <p className={`text-sm ${pwMsg.ok ? "text-green-600" : "text-red-600"}`}>{pwMsg.text}</p>}
        <button className={btn} type="submit">
          Update password
        </button>
      </form>
    </div>
  );
}