import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { deleteTransaction } from "@/actions/transactions";
import { MonthSwitcher } from "@/components/month-switcher";
import { TransactionForm } from "@/components/transaction-form";
import { TransactionRow } from "@/components/transaction-row";
import { Button, buttonClass, Card } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { currentMonth, isMonthString, monthBounds, todayString } from "@/lib/dates";
import { formatBaht } from "@/lib/money";

export const metadata: Metadata = { title: "รายการ" };

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await requireUser();
  const { month: m } = await searchParams;
  const month = m && isMonthString(m) ? m : currentMonth();
  const { first, last } = monthBounds(month);

  const rows = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, user.id),
        gte(transactions.occurredOn, first),
        lte(transactions.occurredOn, last),
      ),
    )
    .orderBy(desc(transactions.occurredOn), desc(transactions.createdAt));

  const income = rows.filter((r) => r.type === "income").reduce((s, r) => s + r.amountSatang, 0);
  const expense = rows.filter((r) => r.type === "expense").reduce((s, r) => s + r.amountSatang, 0);
  const today = todayString();

  return (
    <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
      <Card className="h-fit lg:sticky lg:top-6">
        <h1 className="mb-4 text-xl font-semibold">เพิ่มรายการ</h1>
        <TransactionForm today={today} />
      </Card>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <MonthSwitcher month={month} basePath="/transactions" />
          <a
            href={`/api/transactions/export?month=${month}`}
            className={buttonClass("secondary", "sm")}
            download
          >
            ⬇ Export CSV
          </a>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <span>
            รายรับ <span className="text-income font-semibold tabular-nums">{formatBaht(income)}</span>
          </span>
          <span>
            รายจ่าย <span className="text-expense font-semibold tabular-nums">{formatBaht(expense)}</span>
          </span>
          <span>
            คงเหลือ{" "}
            <span className="font-semibold tabular-nums">{formatBaht(income - expense, { sign: true })}</span>
          </span>
          <span className="text-muted">{rows.length} รายการ</span>
        </div>

        {rows.length === 0 ? (
          <p className="text-muted py-12 text-center">ไม่มีรายการในเดือนนี้</p>
        ) : (
          <ul className="divide-line divide-y">
            {rows.map((tx) => (
              <TransactionRow
                key={tx.id}
                tx={tx}
                actions={
                  <div className="flex shrink-0">
                    <Link
                      href={`/transactions/${tx.id}/edit`}
                      className={buttonClass("ghost", "sm")}
                      aria-label="แก้ไข"
                      title="แก้ไข"
                    >
                      ✎
                    </Link>
                    <form action={deleteTransaction}>
                      <input type="hidden" name="id" value={tx.id} />
                      <Button variant="ghost" size="sm" type="submit" aria-label="ลบรายการ" title="ลบ">
                        ✕
                      </Button>
                    </form>
                  </div>
                }
              />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
