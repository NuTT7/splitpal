import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { groupMembers, groups } from "@/db/schema";
import { joinGroup } from "@/actions/groups";
import { SubmitButton } from "@/components/submit-button";
import { buttonClass, Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { isMember } from "@/lib/groups";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "เข้าร่วมกลุ่ม", robots: { index: false } };

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!/^[A-Za-z0-9_-]{12}$/.test(code)) notFound();

  const [group] = await db
    .select({ id: groups.id, name: groups.name })
    .from(groups)
    .where(eq(groups.inviteCode, code))
    .limit(1);
  if (!group) notFound();

  const user = await getCurrentUser();
  if (user && (await isMember(group.id, user.id))) redirect(`/groups/${group.id}`);

  const [{ n }] = await db
    .select({ n: count() })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, group.id));
  const next = encodeURIComponent(`/join/${code}`);

  return (
    <Card className="mx-auto max-w-sm space-y-4 text-center">
      <p className="text-4xl">👋</p>
      <div>
        <p className="text-muted text-sm">คุณได้รับคำชวนเข้ากลุ่ม</p>
        <h1 className="text-2xl font-bold">{group.name}</h1>
        <p className="text-muted text-sm">สมาชิก {n} คน</p>
      </div>
      {user ? (
        <form action={joinGroup}>
          <input type="hidden" name="code" value={code} />
          <SubmitButton className="w-full" pendingText="กำลังเข้าร่วม…">
            เข้าร่วมกลุ่ม
          </SubmitButton>
        </form>
      ) : (
        <div className="grid gap-2">
          <Link href={`/register?next=${next}`} className={buttonClass("primary")}>
            สมัครสมาชิกแล้วเข้าร่วม
          </Link>
          <Link href={`/login?next=${next}`} className={buttonClass("secondary")}>
            มีบัญชีแล้ว เข้าสู่ระบบ
          </Link>
        </div>
      )}
    </Card>
  );
}
