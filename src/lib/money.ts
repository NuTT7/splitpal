/**
 * Money is stored and calculated as integer satang (1 baht = 100 satang).
 * Floats are only used at the edges: parsing user input and formatting output.
 * Why: 0.1 + 0.2 !== 0.3 in floating point, but 10 + 20 === 30 in integers.
 */

export function formatBaht(satang: number, opts: { sign?: boolean } = {}): string {
  const formatted = new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: satang % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(satang) / 100);
  if (satang < 0) return `-${formatted}`;
  return opts.sign && satang > 0 ? `+${formatted}` : formatted;
}

/** "1,234.5" → 123450. Returns null for invalid, negative or >2 decimal input. */
export function parseBaht(input: string): number | null {
  const cleaned = input.replace(/[,\s฿]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, frac = ""] = cleaned.split(".");
  const satang = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  return Number.isSafeInteger(satang) ? satang : null;
}

/** For pre-filling inputs: 123450 → "1234.50", 10000 → "100" */
export function satangToInput(satang: number): string {
  return satang % 100 === 0 ? String(satang / 100) : (satang / 100).toFixed(2);
}

/** 10 million baht. Postgres integer (int4) tops out at ~21.4 million baht in satang. */
export const MAX_AMOUNT_SATANG = 1_000_000_000;
