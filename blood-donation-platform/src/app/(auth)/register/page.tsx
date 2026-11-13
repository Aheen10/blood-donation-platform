"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { BLOOD_GROUPS } from "@/lib/constants";
import LocationPicker from "@/components/location/LocationPicker";

export default function RegisterPage() {
  const router = useRouter();
  // One account for everyone. Tick this box if you also want to donate blood.
  const [wantsToDonate, setWantsToDonate] = useState(true);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (wantsToDonate && (form.lat === "" || form.lng === "")) {
      setError("Please pick your location on the map.");
      return;
    }
    setLoading(true);

    const payload: Record<string, unknown> = {
      name: form.name,
      email: form.email,
      password: form.password,
      phone: form.phone || undefined,
    };
    if (wantsToDonate) {
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

    if (!res.ok) {
      setLoading(false);
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Registration failed");
      return;
    }

    // Account created: log the user in straight away (no second login step).
    const login = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });
    setLoading(false);

    if (!login || login.error) {
      router.push(`/login${window.location.search}`);
      return;
    }

    const cb = new URLSearchParams(window.location.search).get("callbackUrl");
    const safe = cb && cb.startsWith("/") && !cb.startsWith("//") ? cb : "/dashboard";
    router.push(safe);
    router.refresh();
  }

  const input = "w-full rounded border px-3 py-2";

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-brand-600">Register</h1>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg bg-white p-6 shadow">
        <input required placeholder="Full name" className={input} value={form.name} onChange={(e) => set("name", e.target.value)} />
        <input required type="email" placeholder="Email" className={input} value={form.email} onChange={(e) => set("email", e.target.value)} />
        <input required type="password" minLength={8} placeholder="Password (min 8 chars)" className={input} value={form.password} onChange={(e) => set("password", e.target.value)} />
        <input placeholder="Phone" className={input} value={form.phone} onChange={(e) => set("phone", e.target.value)} />

        <label className="flex items-start gap-2 rounded bg-gray-50 p-3 text-sm">
          <input type="checkbox" checked={wantsToDonate} onChange={(e) => setWantsToDonate(e.target.checked)} />
          <span>
            I also want to donate blood. <span className="text-gray-500">(You can always ask for blood too. You can turn this on or off later.)</span>
          </span>
        </label>

        {wantsToDonate && (
          <>
            <select className={input} value={form.bloodGroup} onChange={(e) => set("bloodGroup", e.target.value)}>
              {BLOOD_GROUPS.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
            <input required placeholder="City" className={input} value={form.city} onChange={(e) => set("city", e.target.value)} />
            <input placeholder="Area (optional)" className={input} value={form.area} onChange={(e) => set("area", e.target.value)} />

            <div>
              <p className="mb-1 text-sm font-medium text-gray-700">Your location</p>
              <LocationPicker
                lat={form.lat === "" ? null : Number(form.lat)}
                lng={form.lng === "" ? null : Number(form.lng)}
                onChange={(la, ln) => {
                  set("lat", String(la));
                  set("lng", String(ln));
                }}
              />
            </div>

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
          disabled={loading || (wantsToDonate && !form.consent)}
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