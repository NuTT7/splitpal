import { and, desc, eq, gte, lte, sum } from "drizzle-orm";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { monthBounds } from "./dates";

/** Aggregations are done in SQL (GROUP BY), not by loading every row into JS. */
export async function getMonthSummary(userId: string, month: string) {
  const { first, last, days } = monthBounds(month);
  const inMonth = and(
    eq(transactions.userId, userId),
    gte(transactions.occurredOn, first),
    lte(transactions.occurredOn, last),
  );

  const [totals, byCategory, daily, recent] = await Promise.all([
    db
      .select({ type: transactions.type, total: sum(transactions.amountSatang).mapWith(Number) })
      .from(transactions)
      .where(inMonth)
      .groupBy(transactions.type),
    db
      .select({ category: transactions.category, total: sum(transactions.amountSatang).mapWith(Number) })
      .from(transactions)
      .where(and(inMonth, eq(transactions.type, "expense")))
      .groupBy(transactions.category)
      .orderBy(desc(sum(transactions.amountSatang))),
    db
      .select({ day: transactions.occurredOn, total: sum(transactions.amountSatang).mapWith(Number) })
      .from(transactions)
      .where(and(inMonth, eq(transactions.type, "expense")))
      .groupBy(transactions.occurredOn),
    db
      .select()
      .from(transactions)
      .where(inMonth)
      .orderBy(desc(transactions.occurredOn), desc(transactions.createdAt))
      .limit(6),
  ]);

  const income = totals.find((t) => t.type === "income")?.total ?? 0;
  const expense = totals.find((t) => t.type === "expense")?.total ?? 0;
  const dailyMap = new Map(daily.map((d) => [d.day, d.total]));
  const dailyExpense = Array.from({ length: days }, (_, i) => {
    const date = `${month}-${String(i + 1).padStart(2, "0")}`;
    return { date, total: dailyMap.get(date) ?? 0 };
  });

  return { income, expense, balance: income - expense, byCategory, dailyExpense, recent };
}
