import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <p className="text-lg font-bold text-brand-600">BloodConnect</p>
          <p className="mt-2 text-sm text-slate-500">
            Finds donors faster in an emergency: live-location matching, automatic escalation and an AI assistant.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">Explore</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-500">
            <li>
              <Link href="/donations" className="hover:text-brand-600">
                Monthly donations
              </Link>
            </li>
            <li>
              <Link href="/requests/new" className="hover:text-brand-600">
                Request blood
              </Link>
            </li>
            <li>
              <Link href="/register" className="hover:text-brand-600">
                Become a donor
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">About</p>
          <p className="mt-3 text-sm text-slate-500">
            A final-year capstone project. In a real emergency always contact the hospital or a blood bank directly.
          </p>
        </div>
      </div>
      <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-400">
        &copy; {new Date().getFullYear()} BloodConnect
      </div>
    </footer>
  );
}