import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonClass, Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const FEATURES = [
  { icon: "📊", title: "สรุปรายเดือน", body: "ดูรายรับ รายจ่าย และหมวดที่ใช้เงินมากที่สุดในหน้าเดียว" },
  { icon: "👥", title: "หารบิลกับเพื่อน", body: "หารเท่ากันหรือกำหนดยอดเอง ระบบคำนวณให้ว่าใครต้องโอนให้ใคร" },
  {
    icon: "🔁",
    title: "โอนน้อยครั้งที่สุด",
    body: "รวมหนี้ซ้ำซ้อนให้เหลือจำนวนการโอนน้อยที่สุด ไม่ต้องโอนวนไปมา",
  },
  { icon: "📥", title: "Export CSV", body: "ดาวน์โหลดรายการไปเปิดใน Excel หรือ Google Sheets ได้ทันที" },
];

export default async function LandingPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <div className="space-y-12 py-6">
      <section className="mx-auto max-w-2xl space-y-5 text-center">
        <h1 className="text-4xl leading-tight font-bold sm:text-5xl">
          รู้ว่าเงินไปไหน
          <br />
          <span className="text-brand">หารบิลไม่ต้องคิดเลข</span>
        </h1>
        <p className="text-muted text-lg">
          จดรายรับรายจ่ายของตัวเอง และแชร์ค่าใช้จ่ายกับเพื่อนร่วมห้อง ทริป หรือมื้อเย็น ในแอปเดียว
        </p>
        <div className="flex justify-center gap-3">
          <Link href="/register" className={buttonClass("primary")}>
            เริ่มใช้งานฟรี
          </Link>
          <Link href="/login" className={buttonClass("secondary")}>
            เข้าสู่ระบบ
          </Link>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <Card key={f.title} className="space-y-1">
            <div className="text-2xl">{f.icon}</div>
            <h2 className="font-semibold">{f.title}</h2>
            <p className="text-muted text-sm">{f.body}</p>
          </Card>
        ))}
      </section>
    </div>
  );
}
