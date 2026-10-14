export interface ExpenseLike {
  paidBy: string;
  amountSatang: number;
  shares: { userId: string; shareSatang: number }[];
}

export interface SettlementLike {
  fromUser: string;
  toUser: string;
  amountSatang: number;
}

export interface Transfer {
  from: string;
  to: string;
  amountSatang: number;
}

/**
 * Net balance per member.
 *   positive → the group owes this person money
 *   negative → this person owes the group
 * The sum over all members is always 0.
 */
export function computeNetBalances(
  memberIds: string[],
  expenses: ExpenseLike[],
  settlements: SettlementLike[],
): Map<string, number> {
  const net = new Map(memberIds.map((id) => [id, 0]));
  const add = (id: string, delta: number) => net.set(id, (net.get(id) ?? 0) + delta);

  for (const e of expenses) {
    add(e.paidBy, e.amountSatang); // they fronted the money
    for (const s of e.shares) add(s.userId, -s.shareSatang); // what each person consumed
  }
  for (const s of settlements) {
    add(s.fromUser, s.amountSatang); // paying back reduces your debt
    add(s.toUser, -s.amountSatang); // receiving reduces what you're owed
  }
  return net;
}

/**
 * Turn net balances into a short list of "who pays whom".
 *
 * Greedy: repeatedly match the person who is owed the most with the person
 * who owes the most, and transfer the smaller of the two amounts. Each step
 * settles at least one person fully, so there are at most (n − 1) transfers.
 * (Finding the absolute minimum number of transfers is NP-hard; greedy is the
 * standard practical approach and is what most split apps do.)
 */
export function simplifyDebts(net: Map<string, number>): Transfer[] {
  const total = [...net.values()].reduce((a, b) => a + b, 0);
  if (total !== 0) throw new Error(`Balances must sum to zero (got ${total})`);

  const creditors = [...net].filter(([, v]) => v > 0).map(([id, v]) => ({ id, amount: v }));
  const debtors = [...net].filter(([, v]) => v < 0).map(([id, v]) => ({ id, amount: -v }));
  // Deterministic order: biggest first, then by id
  const byAmount = (a: { id: string; amount: number }, b: { id: string; amount: number }) =>
    b.amount - a.amount || a.id.localeCompare(b.id);

  const transfers: Transfer[] = [];
  while (creditors.length && debtors.length) {
    creditors.sort(byAmount);
    debtors.sort(byAmount);
    const c = creditors[0];
    const d = debtors[0];
    const amount = Math.min(c.amount, d.amount);
    transfers.push({ from: d.id, to: c.id, amountSatang: amount });
    c.amount -= amount;
    d.amount -= amount;
    if (c.amount === 0) creditors.shift();
    if (d.amount === 0) debtors.shift();
  }
  return transfers;
}
