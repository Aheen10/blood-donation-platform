import Link from "next/link";

// Shared frame for the login and register pages.
export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
  wide = false,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <main className="bg-gradient-to-b from-brand-50 via-white to-white px-4 py-10 sm:py-14">
      <div className={`mx-auto w-full ${wide ? "max-w-lg" : "max-w-md"}`}>
        <div className="mb-6 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-lg font-bold text-brand-600">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
              <path d="M12 2.5s6 6.2 6 10.7a6 6 0 1 1-12 0C6 8.7 12 2.5 12 2.5z" />
            </svg>
            BloodConnect
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="card p-6 sm:p-8">{children}</div>
        <p className="mt-5 text-center text-sm text-slate-600">{footer}</p>
      </div>
    </main>
  );
}