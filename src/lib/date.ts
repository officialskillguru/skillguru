import { format, isValid, parseISO } from "date-fns";

export type DateInput = Date | string | number;

function toDate(value: DateInput) {
  const date = typeof value === "string" ? parseISO(value) : new Date(value);

  if (!isValid(date)) {
    throw new Error("Invalid date value.");
  }

  return date;
}

export function formatDate(value: DateInput, pattern = "dd MMM yyyy") {
  return format(toDate(value), pattern);
}

export function formatDateTime(value: DateInput, pattern = "dd MMM yyyy, h:mm a") {
  return format(toDate(value), pattern);
}

export function toIsoDate(value: DateInput) {
  return format(toDate(value), "yyyy-MM-dd");
}

// ── India Standard Time ─────────────────────────────────────────────────────
// Live class dates/times are stored as IST wall-clock values (date + time
// without zone, see migration 20261125000001), so they are formatted from
// their parts rather than converted from the viewer's local zone.
export const IST_TIME_ZONE = "Asia/Kolkata";

/** Today's date (yyyy-MM-dd) in India Standard Time, regardless of the viewer's zone. */
export function todayInIst(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: IST_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Current wall-clock time (HH:mm) in India Standard Time. */
export function nowTimeInIst(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: IST_TIME_ZONE, hour: "2-digit", minute: "2-digit", hour12: false }).format(now);
}

function istWallClock(date: string, time = "00:00"): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0);
}

/** "Wed, 25 Nov 2026" for an IST calendar date. */
export function formatIstDate(date: string): string {
  return format(istWallClock(date), "EEE, d MMM yyyy");
}

/** "8:15 PM" for an IST wall-clock time ("20:15" or "20:15:00"). */
export function formatIstTime(time: string): string {
  return format(istWallClock("2000-01-01", time.slice(0, 5)), "h:mm a");
}

/** "Wed, 25 Nov 2026 · 8:15 PM – 9:15 PM IST" */
export function formatIstSession(date: string, start: string, end?: string | null): string {
  const range = end ? `${formatIstTime(start)} – ${formatIstTime(end)}` : formatIstTime(start);
  return `${formatIstDate(date)} · ${range} IST`;
}

/** "Today", "Tomorrow" or the formatted date, relative to today in IST. */
export function relativeIstDay(date: string, now: Date = new Date()): string {
  const today = todayInIst(now);
  if (date === today) return "Today";
  const tomorrow = todayInIst(new Date(now.getTime() + 86_400_000));
  if (date === tomorrow) return "Tomorrow";
  return formatIstDate(date);
}
