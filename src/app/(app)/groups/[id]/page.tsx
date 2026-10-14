import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { deleteExpense, deleteSettlement, regenerateInvite } from "@/actions/groups";
import { BalanceLabel } from "@/components/balance-label";
import { Button, Card, cn } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatDateThai, todayString } from "@/lib/dates";
import { getGroupDetail } from "@/lib/groups";
import { formatBaht, satangToInput } from "@/lib/money";
import { ExpenseForm } from "./expense-form";
import { InviteLink } from "./invite-link";
import { SettleButton } from "./settle-button";

export const metadata: Metadata = { title: "กลุ่ม" };

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const { group, members, expenses, settlements, net, transfers, totalSpent } = await getGroupDetail(
    id,
    user.id,
  );
  const nameOf = new Map(members.map((m) => [m.id, m.id === user.id ? "คุณ" : m.name]));
  const name = (uid: string) => nameOf.get(uid) ?? "อดีตสมาชิก";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{group.name}</h1>
          <p className="text-muted text-sm">
            {members.length} คน · ใช้ไปทั้งหมด {formatBaht(totalSpent)}
          </p>
        </div>
        <BalanceLabel satang={net.get(user.id) ?? 0} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
        <div className="space-y-6">
          <Card className="space-y-3">
            <h2 className="font-semibold">ใครต้องโอนให้ใคร</h2>
            {transfers.length === 0 ? (
              <p className="text-muted text-sm">ทุกคนเคลียร์กันหมดแล้ว 🎉</p>
            ) : (
              <ul className="divide-line divide-y">
                {transfers.map((t) => (
                  <li key={`${t.from}-${t.to}`} className="flex items-center justify-between gap-3 py-3">
                    <span>
                      <span className={cn("font-medium", t.from === user.id && "text-expense")}>
                        {name(t.from)}
                      </span>
                      <span className="text-muted"> → </span>
                      <span className={cn("font-medium", t.to === user.id && "text-income")}>
                        {name(t.to)}
                      </span>
                      <span className="ml-2 font-semibold tabular-nums">{formatBaht(t.amountSatang)}</span>
                    </span>
                    {(t.from === user.id || t.to === user.id) && (
                      <SettleButton
                        groupId={group.id}
                        fromUser={t.from}
                        toUser={t.to}
                        amount={satangToInput(t.amountSatang)}
                      />
                    )}
                  </li>
                ))}
              </ul>
            )}
            <details className="text-sm">
              <summary className="text-muted cursor-pointer">ยอดสุทธิของแต่ละคน</summary>
              <ul className="mt-2 space-y-1">
                {members.map((m) => (
                  <li key={m.id} className="flex justify-between">
                    <span>{name(m.id)}</span>
                    <BalanceLabel satang={net.get(m.id) ?? 0} />
                  </li>
                ))}
              </ul>
            </details>
          </Card>

          <Card>
            <h2 className="mb-1 font-semibold">ค่าใช้จ่าย</h2>
            {expenses.length === 0 ? (
              <p className="text-muted py-6 text-center text-sm">ยังไม่มีรายการ</p>
            ) : (
              <ul className="divide-line divide-y">
                {expenses.map((e) => {
                  const myShare = e.shares.find((s) => s.userId === user.id)?.shareSatang ?? 0;
                  const canDelete = e.createdBy === user.id || e.paidBy === user.id;
                  return (
                    <li key={e.id} className="flex items-center gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{e.description}</div>
                        <div className="text-muted text-xs">
                          {formatDateThai(e.occurredOn)} · {name(e.paidBy)}จ่าย · หาร {e.shares.length} คน
                          {e.splitType === "exact" && " (ระบุยอด)"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold tabular-nums">{formatBaht(e.amountSatang)}</div>
                        <div className="text-muted text-xs tabular-nums">
                          {myShare > 0 ? `ส่วนของคุณ ${formatBaht(myShare)}` : "ไม่ได้หารด้วย"}
                        </div>
                      </div>
                      {canDelete && (
                        <form action={deleteExpense}>
                          <input type="hidden" name="id" value={e.id} />
                          <Button variant="ghost" size="sm" type="submit" aria-label={`ลบ ${e.description}`}>
                            ✕
                          </Button>
                        </form>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {settlements.length > 0 && (
            <Card>
              <h2 className="mb-1 font-semibold">ประวัติการโอนคืน</h2>
              <ul className="divide-line divide-y text-sm">
                {settlements.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-2">
                    <span>
                      {name(s.fromUser)} โอนให้ {name(s.toUser)}{" "}
                      <span className="font-semibold tabular-nums">{formatBaht(s.amountSatang)}</span>
                    </span>
                    {s.createdBy === user.id && (
                      <form action={deleteSettlement}>
                        <input type="hidden" name="id" value={s.id} />
                        <Button variant="ghost" size="sm" type="submit">
                          ยกเลิก
                        </Button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="mb-4 font-semibold">เพิ่มค่าใช้จ่าย</h2>
            <ExpenseForm
              groupId={group.id}
              members={members.map((m) => ({ id: m.id, name: m.name }))}
              currentUserId={user.id}
              today={todayString()}
            />
          </Card>

          <Card className="space-y-3">
            <h2 className="font-semibold">ชวนเพื่อนเข้ากลุ่ม</h2>
            <p className="text-muted text-sm">ส่งลิงก์นี้ให้เพื่อน (ต้องสมัครสมาชิกก่อนเข้ากลุ่ม)</p>
            <InviteLink path={`/join/${group.inviteCode}`} />
            <form action={regenerateInvite}>
              <input type="hidden" name="groupId" value={group.id} />
              <Button variant="ghost" size="sm" type="submit">
                สร้างลิงก์ใหม่ (ลิงก์เดิมจะใช้ไม่ได้)
              </Button>
            </form>
            <ul className="flex flex-wrap gap-2 pt-1">
              {members.map((m) => (
                <li key={m.id} className="rounded-full bg-slate-100 px-3 py-1 text-sm">
                  {name(m.id)}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
