import type { Transaction } from "@/db/schema";
import { getCategory } from "@/lib/categories";
import { formatDateThai } from "@/lib/dates";
import { formatBaht } from "@/lib/money";
import { cn } from "./ui";

export function TransactionRow({ tx, actions }: { tx: Transaction; actions?: React.ReactNode }) {
  const cat = getCategory(tx.category);
  const signed = tx.type === "income" ? tx.amountSatang : -tx.amountSatang;
  return (
    <li className="flex items-center gap-3 py-3">
      <span
        aria-hidden
        className="grid size-10 shrink-0 place-items-center rounded-xl text-lg"
        style={{ backgroundColor: `${cat.color}1a` }}
      >
        {cat.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{tx.note || cat.label}</div>
        <div className="text-muted text-xs">
          {cat.label} · {formatDateThai(tx.occurredOn)}
        </div>
      </div>
      <span
        className={cn("font-semibold tabular-nums", tx.type === "income" ? "text-income" : "text-expense")}
      >
        {formatBaht(signed, { sign: true })}
      </span>
      {actions}
    </li>
  );
}
