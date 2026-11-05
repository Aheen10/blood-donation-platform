import Link from "next/link";
import RequestList from "@/components/request/RequestList";

export default function DonorPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-8 px-4 py-8">
      <section className="space-y-4">
        <h1 className="text-2xl font-bold text-brand-600">Open blood requests</h1>
        <RequestList mine={false} />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">My own requests</h2>
          <Link href="/requests/new" className="text-sm text-brand-600 underline">
            Need blood? Create a request
          </Link>
        </div>
        <RequestList mine />
      </section>
    </main>
  );
}
