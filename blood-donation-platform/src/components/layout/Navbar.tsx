"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import LiveLocationReporter from "@/components/location/LiveLocationReporter";

function DropIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 2.5s6 6.2 6 10.7a6 6 0 1 1-12 0C6 8.7 12 2.5 12 2.5z" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

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

  // Close the mobile menu after navigating
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const authed = status === "authenticated";
  const isAdmin = authed && session?.user?.role === "admin";

  const links = authed
    ? [
        { href: "/donations", label: "Donations" },
        { href: "/donor", label: "Donate" },
        { href: "/requester", label: "My requests" },
        { href: "/donor/history", label: "History" },
        { href: "/assistant", label: "Assistant" },
      ]
    : [{ href: "/donations", label: "Donations" }];

  function active(href: string) {
    if (href === "/donor") return pathname === "/donor";
    return pathname === href || pathname.startsWith(href + "/");
  }

  const linkClass = (href: string) =>
    `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
      active(href) ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur">
      {authed && <LiveLocationReporter />}
      <nav className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
        <Link href="/" className="mr-4 flex items-center gap-2 text-lg font-bold text-brand-600">
          <DropIcon />
          BloodConnect
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={linkClass(l.href)}>
              {l.label}
            </Link>
          ))}
        </div>

        <div className="ml-auto hidden items-center gap-2 lg:flex">
          {authed ? (
            <>
              <Link
                href="/notifications"
                className="relative rounded-md p-2 text-slate-600 hover:bg-slate-100"
                aria-label="Notifications"
              >
                <BellIcon />
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold text-white">
                    {unread}
                  </span>
                )}
              </Link>
              <Link href="/account" className={linkClass("/account")}>
                My Account
              </Link>
              {isAdmin && (
                <Link href="/admin" className={linkClass("/admin")}>
                  Admin
                </Link>
              )}
              <Link href="/requests/new" className="btn-primary">
                Request blood
              </Link>
              <button onClick={() => signOut({ callbackUrl: "/" })} className="btn-outline">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-outline">
                Login
              </Link>
              <Link href="/register" className="btn-primary">
                Register
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="ml-auto rounded-md p-2 text-slate-700 hover:bg-slate-100 lg:hidden"
          aria-label="Menu"
          aria-expanded={open}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </nav>

      {/* Mobile panel */}
      {open && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 lg:hidden">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className={linkClass(l.href)}>
                {l.label}
              </Link>
            ))}
            {authed ? (
              <>
                <Link href="/notifications" className={linkClass("/notifications")}>
                  Notifications{unread > 0 ? ` (${unread})` : ""}
                </Link>
                <Link href="/account" className={linkClass("/account")}>
                  My Account
                </Link>
                {isAdmin && (
                  <Link href="/admin" className={linkClass("/admin")}>
                    Admin
                  </Link>
                )}
                <Link href="/requests/new" className="btn-primary mt-2">
                  Request blood
                </Link>
                <button onClick={() => signOut({ callbackUrl: "/" })} className="btn-outline mt-1">
                  Logout
                </button>
              </>
            ) : (
              <div className="mt-2 flex gap-2">
                <Link href="/login" className="btn-outline flex-1">
                  Login
                </Link>
                <Link href="/register" className="btn-primary flex-1">
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}