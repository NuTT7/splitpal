import { and, asc, eq, gte, lte } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getCategory } from "@/lib/categories";
import { toCsv } from "@/lib/csv";
import { currentMonth, isMonthString, monthBounds } from "@/lib/dates";

/** GET /api/transactions/export?month=YYYY-MM → CSV download of the user's own transactions */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const param = req.nextUrl.searchParams.get("month") ?? "";
  const month = isMonthString(param) ? param : currentMonth();
  const { first, last } = monthBounds(month);

  const rows = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, user.id),
        gte(transactions.occurredOn, first),
        lte(transactions.occurredOn, last),
      ),
    )
    .orderBy(asc(transactions.occurredOn), asc(transactions.createdAt));

  const csv = toCsv(
    ["date", "type", "category", "amount_thb", "note"],
    rows.map((r) => [
      r.occurredOn,
      r.type,
      getCategory(r.category).label,
      (r.type === "income" ? r.amountSatang : -r.amountSatang) / 100,
      r.note,
    ]),
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="splitpal-${month}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
