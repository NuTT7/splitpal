import { describe, expect, it } from "vitest";
import { csvField, toCsv } from "./csv";
import { isMonthString, monthBounds, shiftMonth, todayString } from "./dates";
import { formatBaht, parseBaht, satangToInput } from "./money";

describe("money", () => {
  it("parses baht strings into integer satang", () => {
    expect(parseBaht("19.99")).toBe(1999);
    expect(parseBaht("1,234.5")).toBe(123450);
    expect(parseBaht("฿ 100")).toBe(10000);
    expect(parseBaht("0.1")).toBe(10);
  });

  it("rejects invalid amounts", () => {
    for (const bad of ["", "abc", "-5", "1.234", "1e5", "1.2.3"]) expect(parseBaht(bad)).toBeNull();
  });

  it("formats satang as baht", () => {
    expect(formatBaht(150000)).toBe("฿1,500");
    expect(formatBaht(1999)).toBe("฿19.99");
    expect(formatBaht(-5000)).toBe("-฿50");
    expect(formatBaht(5000, { sign: true })).toBe("+฿50");
    expect(satangToInput(123450)).toBe("1234.50");
  });
});

describe("dates", () => {
  it("handles month math", () => {
    expect(monthBounds("2028-02")).toEqual({ first: "2028-02-01", last: "2028-02-29", days: 29 });
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(isMonthString("2026-13")).toBe(false);
  });

  it("uses the app timezone for today", () => {
    expect(todayString(new Date("2026-10-12T18:30:00Z"), "Asia/Bangkok")).toBe("2026-10-13");
  });
});

describe("csv", () => {
  it("escapes quotes, commas and newlines", () => {
    expect(csvField('say "hi", ok')).toBe('"say ""hi"", ok"');
    expect(csvField("line1\nline2")).toBe('"line1\nline2"');
    expect(csvField(42)).toBe("42");
  });

  it("neutralises spreadsheet formulas", () => {
    expect(csvField("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvField(-5)).toBe("-5"); // numbers are left alone
  });

  it("adds a BOM for Excel", () => {
    expect(toCsv(["a"], [["ข้าว"]]).startsWith("﻿a\r\nข้าว")).toBe(true);
  });
});
