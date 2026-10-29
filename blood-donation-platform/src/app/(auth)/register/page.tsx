"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BLOOD_GROUPS } from "@/lib/constants";

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<"donor" | "requester">("donor");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    bloodGroup: "O+",
    city: "",
    area: "",
    lat: "",
    lng: "",
    lastDonationDate: "",
    consent: false,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

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

    const payload: Record<string, unknown> = {
      name: form.name,
      email: form.email,
      password: form.password,
      phone: form.phone || undefined,
      role,
    };
    if (role === "donor") {
      payload.donor = {
        bloodGroup: form.bloodGroup,
        city: form.city,
        area: form.area || undefined,
        lat: Number(form.lat),
        lng: Number(form.lng),
        lastDonationDate: form.lastDonationDate
          ? new Date(form.lastDonationDate).toISOString()
          : null,
        consentToContact: form.consent,
      };
    }

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Registration failed");
      return;
    }
    router.push(`/login${window.location.search}`);
  }

  const input = "w-full rounded border px-3 py-2";

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-brand-600">Register</h1>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg bg-white p-6 shadow">
        <div className="flex gap-2">
          {(["donor", "requester"] as const).map((r) => (
            <button
              type="button"
              key={r}
              onClick={() => setRole(r)}
              className={`flex-1 rounded border py-2 capitalize ${
                role === r ? "bg-brand-600 text-white" : "bg-white"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <input required placeholder="Full name" className={input} value={form.name} onChange={(e) => set("name", e.target.value)} />
        <input required type="email" placeholder="Email" className={input} value={form.email} onChange={(e) => set("email", e.target.value)} />
        <input required type="password" minLength={8} placeholder="Password (min 8 chars)" className={input} value={form.password} onChange={(e) => set("password", e.target.value)} />
        <input placeholder="Phone" className={input} value={form.phone} onChange={(e) => set("phone", e.target.value)} />

        {role === "donor" && (
          <>
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
          </>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading || (role === "donor" && !form.consent)}
          className="w-full rounded bg-brand-600 py-2 text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-600">
        Already registered?{" "}
        <Link href="/login" className="text-brand-600 underline">
          Login
        </Link>
      </p>
    </main>
  );
}