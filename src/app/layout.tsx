import type { Metadata } from "next";
import Link from "next/link";
import { logout } from "@/actions/auth";
import { Button, buttonClass } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "SplitPal — จดรายรับรายจ่าย & หารบิลกับเพื่อน", template: "%s · SplitPal" },
  description: "จดรายรับรายจ่ายรายเดือน และหารค่าใช้จ่ายกับเพื่อนแบบไม่ต้องคิดเลขเอง",
};

const NAV = [
  { href: "/dashboard", label: "ภาพรวม" },
  { href: "/transactions", label: "รายการ" },
  { href: "/groups", label: "กลุ่ม" },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700&display=swap"
        />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <header className="border-line border-b bg-white/80 backdrop-blur">
          <nav className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-2 sm:gap-4">
              <Link
                href={user ? "/dashboard" : "/"}
                className="flex items-center gap-2 text-lg font-semibold"
              >
                <span aria-hidden className="bg-brand grid size-8 place-items-center rounded-lg text-white">
                  ฿
                </span>
                <span className="hidden sm:inline">SplitPal</span>
              </Link>
              {user && (
                <div className="flex gap-1 text-sm">
                  {NAV.map((n) => (
                    <Link
                      key={n.href}
                      href={n.href}
                      className="rounded-lg px-2 py-2 font-medium whitespace-nowrap hover:bg-slate-100 sm:px-3"
                    >
                      {n.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            {user ? (
              <form action={logout} className="text-muted flex items-center gap-2 text-sm">
                <span className="hidden md:inline">{user.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  type="submit"
                  aria-label="ออกจากระบบ"
                  className="whitespace-nowrap"
                >
                  <span className="sm:hidden">ออก</span>
                  <span className="hidden sm:inline">ออกจากระบบ</span>
                </Button>
              </form>
            ) : (
              <div className="flex gap-2">
                <Link href="/login" className={buttonClass("ghost", "sm")}>
                  เข้าสู่ระบบ
                </Link>
                <Link href="/register" className={buttonClass("primary", "sm")}>
                  สมัครฟรี
                </Link>
              </div>
            )}
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
