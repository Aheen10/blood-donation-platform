import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import DonationHistory from "@/models/DonationHistory";
import BloodRequest from "@/models/BloodRequest";
import { getDonorStatus } from "@/lib/donorStatus";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

interface Row {
  _id: unknown;
  request: unknown;
  donatedAt?: Date;
}
interface Req {
  _id: unknown;
  hospitalName?: string;
  city?: string;
  bloodGroup?: string;
}

// My confirmed donations + when I can donate again
export default async function DonorHistoryPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const userId = String(session.user.id);

  const status = await getDonorStatus(userId);

  await connectDB();
  const rows = (await DonationHistory.find({ donor: userId })
    .sort({ donatedAt: -1 })
    .limit(50)
    .lean()) as unknown as Row[];

  const requestIds = rows.map((r) => String(r.request));
  const requests = (await BloodRequest.find({ _id: { $in: requestIds } })
    .select("hospitalName city bloodGroup")
    .lean()) as unknown as Req[];
  const byId = new Map(requests.map((r) => [String(r._id), r]));

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-600">My donation history</h1>
        <Link href="/donor" className="text-sm text-brand-600 underline">
          Back
        </Link>
      </div>

      {!status.isDonor && (
        <p className="rounded bg-yellow-50 p-3 text-sm text-yellow-800">
          You are not registered as a donor yet.{" "}
          <Link href="/donor" className="underline">
            Become a donor
          </Link>
        </p>
      )}

      <section className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg bg-white p-4 shadow">
          <p className="text-3xl font-bold text-brand-600">{status.totalDonations}</p>
          <p className="text-xs text-gray-500">Confirmed donations</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <p className="text-sm font-semibold">
            {status.lastDonationDate ? formatDate(status.lastDonationDate.toISOString()) : "Never"}
          </p>
          <p className="text-xs text-gray-500">Last donation</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          {status.canDonateNow ? (
            <p className="text-sm font-semibold text-green-600">You can donate now</p>
          ) : (
            <>
              <p className="text-sm font-semibold">
                {status.nextEligibleDate ? formatDate(status.nextEligibleDate.toISOString()) : ""}
              </p>
              <p className="text-xs text-gray-500">Next eligible ({status.daysUntilEligible} days left)</p>
            </>
          )}
        </div>
      </section>

      <section>
        {rows.length === 0 ? (
          <p className="text-sm text-gray-500">No confirmed donations yet.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => {
              const req = byId.get(String(r.request));
              return (
                <li key={String(r._id)} className="flex items-center gap-4 rounded-lg bg-white p-4 shadow">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                    {req?.bloodGroup ?? "?"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {req?.hospitalName ?? "Request removed"}
                      {req?.city ? `, ${req.city}` : ""}
                    </p>
                    <p className="text-xs text-gray-500">{r.donatedAt ? formatDate(new Date(r.donatedAt).toISOString()) : ""}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}