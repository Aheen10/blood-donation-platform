import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import BloodRequest from "@/models/BloodRequest";

export const dynamic = "force-dynamic";

// Public page behind a shared link: /r/<shareCode>
// It never shows the patient's name or the phone number.
export default async function SharedRequestPage({ params }: { params: { code: string } }) {
  await connectDB();
  const r = await BloodRequest.findOne({ shareCode: params.code })
    .select("bloodGroup unitsNeeded urgency hospitalName city status")
    .lean();
  if (!r || r.status === "flagged") notFound();

  const session = await getServerSession(authOptions).catch(() => null);
  const open = r.status === "open" || r.status === "matched";
  const target = `/requests/${r._id}`;

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center gap-5 px-4 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
        {r.urgency === "critical" ? "Critical blood request" : "Blood request"}
      </p>
      <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-brand-600 text-3xl font-bold text-white">
        {r.bloodGroup}
      </div>
      <div>
        <p className="text-lg font-semibold">
          {r.unitsNeeded} {r.unitsNeeded === 1 ? "unit" : "units"} needed
        </p>
        <p className="text-gray-600">
          {r.hospitalName}, {r.city}
        </p>
      </div>

      {open ? (
        <>
          <p className="text-sm text-gray-600">
            Can you donate, or do you know someone who can? Log in to accept the request and chat with the family.
          </p>
          {session ? (
            <Link href={target} className="rounded bg-brand-600 py-2 text-white hover:bg-brand-700">
              Open request
            </Link>
          ) : (
            <div className="flex flex-col gap-2">
              <Link
                href={`/login?callbackUrl=${encodeURIComponent(target)}`}
                className="rounded bg-brand-600 py-2 text-white hover:bg-brand-700"
              >
                Login to help
              </Link>
              <Link
                href={`/register?callbackUrl=${encodeURIComponent(target)}`}
                className="rounded border border-brand-600 py-2 text-brand-600 hover:bg-brand-50"
              >
                Register as a donor
              </Link>
            </div>
          )}
        </>
      ) : (
        <p className="rounded bg-green-50 p-3 text-sm text-green-800">
          This request has been {r.status === "fulfilled" ? "fulfilled. Thank you to everyone who helped." : "closed."}
        </p>
      )}
    </main>
  );
}