/** RFC 4180 field escaping + guard against spreadsheet formula injection. */
export function csvField(value: string | number): string {
  let s = String(value);
  // A cell starting with = + - @ is executed as a formula by Excel/Sheets.
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV text with a UTF-8 BOM so Excel shows Thai characters correctly. */
export function toCsv(header: string[], rows: (string | number)[][]): string {
  const lines = [header, ...rows].map((r) => r.map(csvField).join(","));
  return "﻿" + lines.join("\r\n") + "\r\n";
}
