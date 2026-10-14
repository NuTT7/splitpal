export const APP_TIMEZONE = process.env.APP_TIMEZONE ?? "Asia/Bangkok";

/** Today's date (YYYY-MM-DD) in the app timezone. */
export function todayString(now = new Date(), tz = APP_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function isDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function isMonthString(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function currentMonth(now = new Date()): string {
  return todayString(now).slice(0, 7);
}

/** "2026-10" → { first: "2026-10-01", last: "2026-10-31", days: 31 } */
export function monthBounds(month: string) {
  const [y, m] = month.split("-").map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { first: `${month}-01`, last: `${month}-${String(days).padStart(2, "0")}`, days };
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

export function formatMonthThai(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("th-TH", { timeZone: "UTC", month: "long", year: "numeric" }).format(
    new Date(Date.UTC(y, m - 1, 1)),
  );
}

export function formatDateThai(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "2-digit",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}
