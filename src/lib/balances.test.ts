import { describe, expect, it } from "vitest";
import { computeNetBalances, simplifyDebts, type Transfer } from "./balances";
import { splitEqual, validateExactSplit } from "./split";

const equal = (paidBy: string, amount: number, members: string[]) => ({
  paidBy,
  amountSatang: amount,
  shares: [...splitEqual(amount, members)].map(([userId, shareSatang]) => ({ userId, shareSatang })),
});

/** Apply transfers to balances; everyone should end at zero. */
function settle(net: Map<string, number>, transfers: Transfer[]) {
  const after = new Map(net);
  for (const t of transfers) {
    after.set(t.from, after.get(t.from)! + t.amountSatang);
    after.set(t.to, after.get(t.to)! - t.amountSatang);
  }
  return after;
}

describe("splitEqual", () => {
  it("never loses a satang", () => {
    const shares = splitEqual(10000, ["a", "b", "c"]);
    expect([...shares.values()]).toEqual([3334, 3333, 3333]);
    expect([...shares.values()].reduce((x, y) => x + y)).toBe(10000);
  });

  it("rejects invalid input", () => {
    expect(() => splitEqual(100, [])).toThrow();
    expect(() => splitEqual(0, ["a"])).toThrow();
    expect(() => splitEqual(10.5, ["a"])).toThrow();
    expect(() => splitEqual(100, ["a", "a"])).toThrow();
  });
});

describe("validateExactSplit", () => {
  it("accepts shares that add up exactly and drops zero shares", () => {
    const r = validateExactSplit(
      1000,
      new Map([
        ["a", 600],
        ["b", 400],
        ["c", 0],
      ]),
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect([...r.shares.keys()]).toEqual(["a", "b"]);
  });

  it("rejects totals that don't match, negatives and all-zero", () => {
    expect(validateExactSplit(1000, new Map([["a", 999]])).ok).toBe(false);
    expect(
      validateExactSplit(
        1000,
        new Map([
          ["a", 1100],
          ["b", -100],
        ]),
      ).ok,
    ).toBe(false);
    expect(validateExactSplit(1000, new Map([["a", 0]])).ok).toBe(false);
  });
});

describe("computeNetBalances", () => {
  it("credits the payer and debits each share", () => {
    const net = computeNetBalances(["a", "b", "c"], [equal("a", 30000, ["a", "b", "c"])], []);
    expect(Object.fromEntries(net)).toEqual({ a: 20000, b: -10000, c: -10000 });
  });

  it("applies settlements", () => {
    const net = computeNetBalances(
      ["a", "b"],
      [equal("a", 10000, ["a", "b"])],
      [{ fromUser: "b", toUser: "a", amountSatang: 5000 }],
    );
    expect(Object.fromEntries(net)).toEqual({ a: 0, b: 0 });
  });

  it("always sums to zero", () => {
    const members = ["a", "b", "c", "d"];
    const net = computeNetBalances(
      members,
      [equal("a", 12345, members), equal("b", 999, ["b", "c"]), equal("d", 70001, ["a", "d", "c"])],
      [{ fromUser: "c", toUser: "a", amountSatang: 1234 }],
    );
    expect([...net.values()].reduce((x, y) => x + y)).toBe(0);
  });
});

describe("simplifyDebts", () => {
  it("returns no transfers when everyone is even", () => {
    expect(
      simplifyDebts(
        new Map([
          ["a", 0],
          ["b", 0],
        ]),
      ),
    ).toEqual([]);
  });

  it("collapses a chain A→B→C into a single transfer A→C", () => {
    // a owes b 100, b owes c 100 → a pays c directly
    const net = new Map([
      ["a", -10000],
      ["b", 0],
      ["c", 10000],
    ]);
    expect(simplifyDebts(net)).toEqual([{ from: "a", to: "c", amountSatang: 10000 }]);
  });

  it("settles everyone with at most n-1 transfers", () => {
    const members = ["a", "b", "c", "d", "e"];
    const net = computeNetBalances(
      members,
      [
        equal("a", 50000, members),
        equal("b", 12000, ["a", "b", "c"]),
        equal("c", 33333, members),
        equal("e", 9000, ["d", "e"]),
      ],
      [],
    );
    const transfers = simplifyDebts(net);
    expect(transfers.length).toBeLessThanOrEqual(members.length - 1);
    expect(transfers.every((t) => t.amountSatang > 0)).toBe(true);
    expect([...settle(net, transfers).values()].every((v) => v === 0)).toBe(true);
  });

  it("refuses balances that don't sum to zero", () => {
    expect(() => simplifyDebts(new Map([["a", 1]]))).toThrow();
  });
});
