import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { safeNext } from "@/lib/safe-next";
import { LoginForm } from "../auth-forms";

export const metadata: Metadata = { title: "เข้าสู่ระบบ" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getCurrentUser()) redirect(safeNext(next));
  return (
    <div className="mx-auto max-w-sm space-y-6">
      <h1 className="text-center text-2xl font-bold">เข้าสู่ระบบ</h1>
      <Card>
        <LoginForm next={next} />
      </Card>
      <p className="text-muted text-center text-sm">
        ยังไม่มีบัญชี?{" "}
        <Link
          href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"}
          className="text-brand font-medium"
        >
          สมัครฟรี
        </Link>
      </p>
    </div>
  );
}
