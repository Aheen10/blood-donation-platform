import Link from "next/link";
import RequestList from "@/components/request/RequestList";

export default function RequesterPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-5 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-600">My blood requests</h1>
        <Link href="/requests/new" className="rounded bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700">
          New request
        </Link>
      </div>
      <RequestList mine />
    </main>
  );
}
