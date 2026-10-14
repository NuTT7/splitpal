import Link from "next/link";
import { buttonClass } from "./ui";
import { currentMonth, formatMonthThai, shiftMonth } from "@/lib/dates";

export function MonthSwitcher({ month, basePath }: { month: string; basePath: string }) {
  const isCurrent = month === currentMonth();
  return (
    <div className="flex items-center gap-2">
      <Link
        href={`${basePath}?month=${shiftMonth(month, -1)}`}
        className={buttonClass("secondary", "sm")}
        aria-label="เดือนก่อน"
      >
        ←
      </Link>
      <span className="min-w-32 text-center font-semibold">{formatMonthThai(month)}</span>
      <Link
        href={`${basePath}?month=${shiftMonth(month, 1)}`}
        className={buttonClass("secondary", "sm")}
        aria-label="เดือนถัดไป"
      >
        →
      </Link>
      {!isCurrent && (
        <Link href={basePath} className={buttonClass("ghost", "sm")}>
          เดือนนี้
        </Link>
      )}
    </div>
  );
}
