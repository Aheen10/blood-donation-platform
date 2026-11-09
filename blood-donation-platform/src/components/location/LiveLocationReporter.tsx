"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

const PING_MS = 60 * 1000;

// Invisible component. While a donor has live location sharing switched on and the app is open,
// it sends the current position to the server once a minute.
export default function LiveLocationReporter() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;
    let timer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    function stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }

    function ping() {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const res = await fetch("/api/location", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            });
            if (res.status === 409) stop(); // sharing was switched off
          } catch {
            /* ignore network errors, next ping will retry */
          }
        },
        () => {
          /* permission denied or no signal: skip this ping */
        },
        { maximumAge: 30000, timeout: 20000 }
      );
    }

    async function sync() {
      stop();
      try {
        const res = await fetch("/api/donor-profile");
        if (!res.ok || cancelled) return;
        const enabled = Boolean((await res.json()).profile?.shareLiveLocation);
        if (enabled && !cancelled) {
          ping();
          timer = setInterval(ping, PING_MS);
        }
      } catch {
        /* ignore */
      }
    }

    sync();
    window.addEventListener("live-location-changed", sync);
    return () => {
      cancelled = true;
      stop();
      window.removeEventListener("live-location-changed", sync);
    };
  }, [status]);

  return null;
}