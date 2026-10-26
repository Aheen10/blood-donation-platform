import { APP_TIMEZONE } from "@/lib/constants";

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** e.g. "12 Oct 2026" in Dhaka time. */
export function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString("en-GB", {
    timeZone: APP_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** e.g. "12 Oct 2026, 8:30 pm" in Dhaka time. */
export function formatDateTime(value: string | Date): string {
  return new Date(value).toLocaleString("en-GB", {
    timeZone: APP_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}