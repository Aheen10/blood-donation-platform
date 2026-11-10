import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import AgentLog from "@/models/AgentLog";
import BloodRequest from "@/models/BloodRequest";
import User from "@/models/User";
import RunAgentButton from "@/components/admin/RunAgentButton";

export const dynamic = "force-dynamic";

interface Log {
  _id: unknown;
  request: unknown;
  action: string;
  round?: number;
  donor?: unknown;
  reason: string;
  createdAt?: Date;
}

const badge: Record<string, string> = {
  match: "bg-blue-100 text-blue-700",
  notify: "bg-green-100 text-green-700",
  escalate: "bg-orange-100 text-orange-700",
  skip: "bg-gray-100 text-gray-700",
  fulfill: "bg-emerald-100 text-emerald-700",
  remind: "bg-purple-100 text-purple-700",
  close: "bg-red-100 text-red-700",
};

// Why did the agent notify each donor? Every decision is listed here with its reason.
export default async function AgentLogsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "admin") redirect("/");

  await connectDB();
  const logs = (await AgentLog.find().sort({ createdAt: -1 }).limit(100).lean()) as unknown as Log[];

  const requestIds = Array.from(new Set(logs.map((l) => String(l.request))));
  const donorIds = Array.from(new Set(logs.filter((l) => l.donor).map((l) => String(l.donor))));

  const requests = (await BloodRequest.find({ _id: { $in: requestIds } })
    .select("bloodGroup hospitalName city")
    .lean()) as unknown as { _id: unknown; bloodGroup?: string; hospitalName?: string; city?: string }[];
  const donors = (await User.find({ _id: { $in: donorIds } })
    .select("name")
    .lean()) as unknown as { _id: unknown; name?: string }[];

  const reqById = new Map(requests.map((r) => [String(r._id), r]));
  const donorById = new Map(donors.map((d) => [String(d._id), d]));

  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-600">Agent logs</h1>
        <Link href="/admin" className="text-sm text-brand-600 underline">
          Back to admin
        </Link>
      </div>
      <p className="text-sm text-gray-600">
        The matching and escalation agent writes the reason for every decision here.
      </p>
      <RunAgentButton />

      {logs.length === 0 ? (
        <p className="text-sm text-gray-500">No agent activity yet. Create a blood request to see the agent work.</p>
      ) : (
        <ul className="space-y-2">
          {logs.map((l) => {
            const req = reqById.get(String(l.request));
            const donor = l.donor ? donorById.get(String(l.donor)) : null;
            return (
              <li key={String(l._id)} className="rounded-lg bg-white p-3 shadow">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={`rounded px-2 py-0.5 font-medium ${badge[l.action] ?? badge.skip}`}>{l.action}</span>
                  <span className="text-gray-500">round {l.round ?? 0}</span>
                  {req && (
                    <Link href={`/requests/${String(l.request)}`} className="text-brand-600 underline">
                      {req.bloodGroup} · {req.hospitalName}, {req.city}
                    </Link>
                  )}
                  {donor && <span className="text-gray-700">→ {donor.name}</span>}
                  <span className="ml-auto text-gray-400">
                    {l.createdAt ? new Date(l.createdAt).toLocaleString("en-GB", { timeZone: "Asia/Dhaka" }) : ""}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-800">{l.reason}</p>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}