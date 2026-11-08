import Link from "next/link";
import RequestList from "@/components/request/RequestList";
import DonorProfileForm from "@/components/forms/DonorProfileForm";

// Main page for every member: donate to open requests, manage donor status, and ask for blood.
export default function DonorPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-8 px-4 py-8">
      <section className="space-y-3">
        <h1 className="text-2xl font-bold text-brand-600">My donor profile</h1>
        <DonorProfileForm />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-brand-600">Open blood requests</h2>
        <RequestList mine={false} />
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Need blood yourself?</h2>
          <Link href="/requests/new" className="rounded bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700">
            Create a request
          </Link>
        </div>
        <Link href="/requester" className="text-sm text-brand-600 underline">
          See my requests
        </Link>
      </section>
    </main>
  );
}