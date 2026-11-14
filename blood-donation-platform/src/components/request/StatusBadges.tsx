const URGENCY: Record<string, string> = {
  critical: "bg-brand-100 text-brand-700",
  high: "bg-amber-100 text-amber-800",
  normal: "bg-slate-100 text-slate-700",
};

const STATUS: Record<string, string> = {
  open: "bg-emerald-100 text-emerald-700",
  matched: "bg-sky-100 text-sky-700",
  fulfilled: "bg-green-100 text-green-800",
  closed: "bg-slate-100 text-slate-600",
  flagged: "bg-amber-100 text-amber-800",
};

export function UrgencyBadge({ urgency }: { urgency: string }) {
  return <span className={`badge capitalize ${URGENCY[urgency] ?? URGENCY.normal}`}>{urgency} urgency</span>;
}

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge capitalize ${STATUS[status] ?? STATUS.closed}`}>{status}</span>;
}