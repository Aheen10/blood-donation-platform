"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import LiveLocationReporter from "@/components/location/LiveLocationReporter";

export default function Navbar() {
  const { data: session, status } = useSession();
  const [unread, setUnread] = useState(0);

  // Poll the unread notification count (messages, shared requests, report updates)
  useEffect(() => {
    if (status !== "authenticated") return;
    let stop = false;
    async function load() {
      try {
        const res = await fetch("/api/notifications?countOnly=1");
        if (res.ok && !stop) setUnread((await res.json()).unread ?? 0);
      } catch {
        /* ignore network errors */
      }
    }
    load();
    const t = setInterval(load, 30000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [status]);

  const link = "text-sm text-gray-700 hover:text-brand-600";

  return (
    <header className="border-b bg-white">
      {status === "authenticated" && <LiveLocationReporter />}
      <nav className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
        <Link href="/" className="mr-auto font-bold text-brand-600">
          BloodConnect
        </Link>
        <Link href="/donations" className={link}>
          Donations
        </Link>

        {status === "authenticated" ? (
          <>
            <Link href="/donor" className={link}>
              Donate
            </Link>
            <Link href="/requester" className={link}>
              My requests
            </Link>
            <Link href="/donor/history" className={link}>
              History
            </Link>
            <Link href="/assistant" className={link}>
              Assistant
            </Link>
            <Link href="/notifications" className={`relative ${link}`}>
              Notifications
              {unread > 0 && (
                <span className="ml-1 rounded-full bg-brand-600 px-1.5 py-0.5 text-xs text-white">{unread}</span>
              )}
            </Link>
            <Link href="/account" className={link}>
              My Account
            </Link>
            {session.user.role === "admin" && (
              <Link href="/admin" className={link}>
                Admin
              </Link>
            )}
            <button onClick={() => signOut({ callbackUrl: "/" })} className={link}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className={link}>
              Login
            </Link>
            <Link href="/register" className="rounded bg-brand-600 px-3 py-1 text-sm text-white hover:bg-brand-700">
              Register
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}