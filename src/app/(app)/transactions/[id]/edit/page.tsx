import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { TransactionForm } from "@/components/transaction-form";
import { Card } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { todayString } from "@/lib/dates";
import { satangToInput } from "@/lib/money";

export const metadata: Metadata = { title: "แก้ไขรายการ" };

export default async function EditTransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const [tx] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)))
    .limit(1);
  if (!tx) notFound();

  return (
    <Card className="mx-auto max-w-md">
      <h1 className="mb-4 text-xl font-semibold">แก้ไขรายการ</h1>
      <TransactionForm
        today={todayString()}
        initial={{
          id: tx.id,
          type: tx.type,
          amount: satangToInput(tx.amountSatang),
          category: tx.category,
          note: tx.note,
          occurredOn: tx.occurredOn,
        }}
      />
    </Card>
  );
}
