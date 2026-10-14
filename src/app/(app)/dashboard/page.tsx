import type { Metadata } from "next";
import Link from "next/link";
import { BalanceLabel } from "@/components/balance-label";
import { buttonClass, Card, cn } from "@/components/ui";
import { MonthSwitcher } from "@/components/month-switcher";
import { TransactionRow } from "@/components/transaction-row";
import { requireUser } from "@/lib/auth";
import { getCategory } from "@/lib/categories";
import { currentMonth, formatDateThai, isMonthString } from "@/lib/dates";
import { getMyGroupSummaries } from "@/lib/groups";
import { formatBaht } from "@/lib/money";
import { getMonthSummary } from "@/lib/reports";

export const metadata: Metadata = { title: "ภาพรวม" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const user = await requireUser();
  const { month: m } = await searchParams;
  const month = m && isMonthString(m) ? m : currentMonth();

  const [summary, groups] = await Promise.all([
    getMonthSummary(user.id, month),
    getMyGroupSummaries(user.id),
  ]);
  const maxDaily = Math.max(1, ...summary.dailyExpense.map((d) => d.total));
  const topDay = summary.dailyExpense.reduce((a, b) => (b.total > a.total ? b : a));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">สวัสดี, {user.name}</h1>
        <MonthSwitcher month={month} basePath="/dashboard" />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="รายรับ" value={formatBaht(summary.income)} tone="income" />
        <Stat label="รายจ่าย" value={formatBaht(summary.expense)} tone="expense" />
        <Stat
          label="คงเหลือ"
          value={formatBaht(summary.balance, { sign: true })}
          tone={summary.balance >= 0 ? "income" : "expense"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">รายจ่ายรายวัน</h2>
            {topDay.total > 0 && (
              <span className="text-muted text-xs">
                สูงสุด {formatDateThai(topDay.date)} · {formatBaht(topDay.total)}
              </span>
            )}
          </div>
          {summary.expense === 0 ? (
            <Empty>ยังไม่มีรายจ่ายในเดือนนี้</Empty>
          ) : (
            <div
              className="flex min-h-40 flex-1 items-end gap-[2px]"
              role="img"
              aria-label={`กราฟรายจ่ายรายวัน รวม ${formatBaht(summary.expense)}`}
            >
              {summary.dailyExpense.map((d) => (
                <div
                  key={d.date}
                  title={`${formatDateThai(d.date)}: ${formatBaht(d.total)}`}
                  className={cn("flex-1 rounded-t-sm", d.total > 0 ? "bg-brand" : "bg-slate-100")}
                  style={{ height: `${Math.max(2, (d.total / maxDaily) * 100)}%` }}
                />
              ))}
            </div>
          )}
        </Card>

        <Card className="space-y-3">
          <h2 className="font-semibold">ใช้จ่ายตามหมวด</h2>
          {summary.byCategory.length === 0 ? (
            <Empty>—</Empty>
          ) : (
            <ul className="space-y-3">
              {summary.byCategory.map((c) => {
                const cat = getCategory(c.category);
                const pct = Math.round((c.total / summary.expense) * 100);
                return (
                  <li key={c.category} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>
                        {cat.emoji} {cat.label}
                      </span>
                      <span className="tabular-nums">
                        {formatBaht(c.total)} <span className="text-muted">· {pct}%</span>
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: cat.color }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-1 flex items-center justify-between">
            <h2 className="font-semibold">รายการล่าสุด</h2>
            <Link href={`/transactions?month=${month}`} className={buttonClass("ghost", "sm")}>
              ดูทั้งหมด →
            </Link>
          </div>
          {summary.recent.length === 0 ? (
            <Empty>
              <Link href="/transactions" className="text-brand font-medium">
                + เพิ่มรายการแรก
              </Link>
            </Empty>
          ) : (
            <ul className="divide-line divide-y">
              {summary.recent.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} />
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="mb-1 flex items-center justify-between">
            <h2 className="font-semibold">กลุ่มของฉัน</h2>
            <Link href="/groups" className={buttonClass("ghost", "sm")}>
              จัดการ →
            </Link>
          </div>
          {groups.length === 0 ? (
            <Empty>ยังไม่มีกลุ่ม สร้างกลุ่มเพื่อหารค่าใช้จ่ายกับเพื่อน</Empty>
          ) : (
            <ul className="divide-line divide-y">
              {groups.map((g) => (
                <li key={g.id}>
                  <Link
                    href={`/groups/${g.id}`}
                    className="flex items-center justify-between py-3 hover:opacity-80"
                  >
                    <span>
                      <span className="font-medium">{g.name}</span>
                      <span className="text-muted text-xs"> · {g.memberCount} คน</span>
                    </span>
                    <BalanceLabel satang={g.myBalance} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "income" | "expense" }) {
  return (
    <Card className="p-4 sm:p-5">
      <p className="text-muted text-sm">{label}</p>
      <p
        className={cn(
          "mt-1 text-2xl font-semibold tabular-nums",
          tone === "income" ? "text-income" : "text-expense",
        )}
      >
        {value}
      </p>
    </Card>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-muted py-8 text-center text-sm">{children}</p>;
}
