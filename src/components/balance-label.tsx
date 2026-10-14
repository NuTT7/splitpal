import { formatBaht } from "@/lib/money";

/** Positive = the group owes you; negative = you owe the group. */
export function BalanceLabel({ satang }: { satang: number }) {
  if (satang === 0) return <span className="text-muted text-sm">เคลียร์แล้ว</span>;
  return satang > 0 ? (
    <span className="text-income text-sm font-medium">ได้คืน {formatBaht(satang)}</span>
  ) : (
    <span className="text-expense text-sm font-medium">ค้างจ่าย {formatBaht(-satang)}</span>
  );
}
