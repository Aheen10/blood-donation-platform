import Link from "next/link";

const cards = [
  { href: "/admin/reports", title: "Fraud reports", text: "Review reports and approve bans or restrictions." },
  { href: "/admin/rewards", title: "Year-end rewards", text: "Set up the yearly event and see who wins which gift." },
  { href: "/admin/users", title: "Users", text: "View users and block or unblock accounts." },
  { href: "/admin/agent-logs", title: "Agent logs", text: "See why the agent notified each donor." },
];

export default function AdminHome() {
  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-8">
      <h1 className="text-2xl font-bold text-brand-600">Admin</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="rounded-lg bg-white p-5 shadow hover:shadow-md">
            <p className="font-semibold">{c.title}</p>
            <p className="text-sm text-gray-600">{c.text}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}