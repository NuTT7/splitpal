import type { Metadata } from "next";
import Link from "next/link";
import { BalanceLabel } from "@/components/balance-label";
import { Card } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getMyGroupSummaries } from "@/lib/groups";
import { CreateGroupForm } from "./create-group-form";

export const metadata: Metadata = { title: "กลุ่ม" };

export default async function GroupsPage() {
  const user = await requireUser();
  const groups = await getMyGroupSummaries(user.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">กลุ่ม</h1>
        <p className="text-muted">สร้างกลุ่มสำหรับห้องพัก ทริป หรือมื้ออาหาร แล้วส่งลิงก์ชวนเพื่อน</p>
      </div>

      <Card>
        <CreateGroupForm />
      </Card>

      {groups.length === 0 ? (
        <p className="text-muted py-8 text-center">ยังไม่มีกลุ่ม</p>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <Link key={g.id} href={`/groups/${g.id}`} className="block">
              <Card className="flex items-center justify-between transition-shadow hover:shadow-md">
                <div>
                  <div className="font-semibold">{g.name}</div>
                  <div className="text-muted text-sm">{g.memberCount} คน</div>
                </div>
                <BalanceLabel satang={g.myBalance} />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
