import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { expenseShares, groupExpenses, groupMembers, groups, settlements, users } from "@/db/schema";
import { computeNetBalances, simplifyDebts } from "./balances";

export function generateInviteCode(): string {
  return randomBytes(9).toString("base64url"); // 12 URL-safe chars, 72 bits of entropy
}

/**
 * Authorization check for every group read/write. Returns false instead of
 * throwing so callers can respond with 404 — we don't reveal that a group
 * exists to people who aren't in it (prevents IDOR / enumeration).
 */
export async function isMember(groupId: string, userId: string): Promise<boolean> {
  const rows = await db
    .select({ userId: groupMembers.userId })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1);
  return rows.length > 0;
}

export async function getGroupMembers(groupId: string) {
  return db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(groupMembers)
    .innerJoin(users, eq(users.id, groupMembers.userId))
    .where(eq(groupMembers.groupId, groupId))
    .orderBy(asc(groupMembers.joinedAt));
}

/** Everything the group page needs, including balances and suggested transfers. */
export async function getGroupDetail(groupId: string, userId: string) {
  if (!(await isMember(groupId, userId))) notFound();

  const [[group], members, expenses, settlementRows] = await Promise.all([
    db.select().from(groups).where(eq(groups.id, groupId)).limit(1),
    getGroupMembers(groupId),
    db
      .select()
      .from(groupExpenses)
      .where(eq(groupExpenses.groupId, groupId))
      .orderBy(desc(groupExpenses.occurredOn), desc(groupExpenses.createdAt)),
    db
      .select()
      .from(settlements)
      .where(eq(settlements.groupId, groupId))
      .orderBy(desc(settlements.createdAt)),
  ]);
  if (!group) notFound();

  const shares = expenses.length
    ? await db
        .select()
        .from(expenseShares)
        .where(
          inArray(
            expenseShares.expenseId,
            expenses.map((e) => e.id),
          ),
        )
    : [];
  const sharesByExpense = Map.groupBy(shares, (s) => s.expenseId);

  const expensesWithShares = expenses.map((e) => ({ ...e, shares: sharesByExpense.get(e.id) ?? [] }));

  const memberIds = members.map((m) => m.id);
  const net = computeNetBalances(memberIds, expensesWithShares, settlementRows);
  const transfers = simplifyDebts(net);
  const totalSpent = expenses.reduce((sum, e) => sum + e.amountSatang, 0);

  return {
    group,
    members,
    expenses: expensesWithShares,
    settlements: settlementRows,
    net,
    transfers,
    totalSpent,
  };
}

/** For the dashboard: the current user's net balance in each of their groups. */
export async function getMyGroupSummaries(userId: string) {
  const myGroups = await db
    .select({ id: groups.id, name: groups.name })
    .from(groupMembers)
    .innerJoin(groups, eq(groups.id, groupMembers.groupId))
    .where(eq(groupMembers.userId, userId))
    .orderBy(asc(groups.name));

  // One detail query per group keeps the logic in one place; fine for the handful
  // of groups a person is in. Could be replaced by a single SQL aggregate at scale.
  return Promise.all(
    myGroups.map(async (g) => {
      const detail = await getGroupDetail(g.id, userId);
      return { ...g, memberCount: detail.members.length, myBalance: detail.net.get(userId) ?? 0 };
    }),
  );
}
