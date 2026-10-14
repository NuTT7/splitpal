import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { safeNext } from "@/lib/safe-next";
import { RegisterForm } from "../auth-forms";

export const metadata: Metadata = { title: "สมัครสมาชิก" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getCurrentUser()) redirect(safeNext(next));
  return (
    <div className="mx-auto max-w-sm space-y-6">
      <h1 className="text-center text-2xl font-bold">สร้างบัญชี SplitPal</h1>
      <Card>
        <RegisterForm next={next} />
      </Card>
      <p className="text-muted text-center text-sm">
        มีบัญชีแล้ว?{" "}
        <Link
          href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
          className="text-brand font-medium"
        >
          เข้าสู่ระบบ
        </Link>
      </p>
    </div>
  );
}
