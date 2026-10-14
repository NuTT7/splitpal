/**
 * Split an amount equally between members without losing a single satang.
 * 100.00 ÷ 3 → 33.34, 33.33, 33.33 (the remainder goes to the first members).
 */
export function splitEqual(amountSatang: number, userIds: string[]): Map<string, number> {
  if (userIds.length === 0) throw new Error("Cannot split between zero people");
  if (!Number.isInteger(amountSatang) || amountSatang <= 0)
    throw new Error("Amount must be a positive integer");
  if (new Set(userIds).size !== userIds.length) throw new Error("Duplicate members in split");

  const base = Math.floor(amountSatang / userIds.length);
  const remainder = amountSatang % userIds.length;
  return new Map(userIds.map((id, i) => [id, base + (i < remainder ? 1 : 0)]));
}

export type ExactSplitResult = { ok: true; shares: Map<string, number> } | { ok: false; error: string };

/** Validate user-entered exact shares: non-negative and summing exactly to the total. */
export function validateExactSplit(amountSatang: number, shares: Map<string, number>): ExactSplitResult {
  const positive = new Map([...shares].filter(([, v]) => v > 0));
  if (positive.size === 0) return { ok: false, error: "ต้องมีอย่างน้อย 1 คนที่ต้องจ่าย" };
  for (const v of shares.values()) {
    if (!Number.isInteger(v) || v < 0) return { ok: false, error: "จำนวนเงินของแต่ละคนไม่ถูกต้อง" };
  }
  const total = [...positive.values()].reduce((a, b) => a + b, 0);
  if (total !== amountSatang) {
    return { ok: false, error: `ยอดรวมของแต่ละคน (${total / 100}) ไม่เท่ากับยอดบิล (${amountSatang / 100})` };
  }
  return { ok: true, shares: positive };
}
