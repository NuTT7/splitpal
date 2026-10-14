"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { isValidCategory } from "@/lib/categories";
import { isDateString } from "@/lib/dates";
import { MAX_AMOUNT_SATANG, parseBaht } from "@/lib/money";
import { formValues, toFieldErrors, type ActionState } from "./types";

const txSchema = z
  .object({
    type: z.enum(["income", "expense"]),
    amount: z
      .string()
      .transform((v) => parseBaht(v))
      .refine((v): v is number => v !== null && v > 0, "จำนวนเงินไม่ถูกต้อง")
      .refine((v) => v <= MAX_AMOUNT_SATANG, "จำนวนเงินสูงเกินไป"),
    category: z.string().min(1, "กรุณาเลือกหมวดหมู่"),
    note: z.string().trim().max(200, "บันทึกยาวเกินไป").default(""),
    occurredOn: z.string().refine(isDateString, "วันที่ไม่ถูกต้อง"),
  })
  .refine((d) => isValidCategory(d.type, d.category), { path: ["category"], message: "กรุณาเลือกหมวดหมู่" });

function parseTx(formData: FormData) {
  return txSchema.safeParse(Object.fromEntries(formData));
}

function revalidateMoneyPages() {
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}

export async function createTransaction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = parseTx(formData);
  if (!parsed.success) {
    return {
      error: "กรุณาตรวจสอบข้อมูล",
      fieldErrors: toFieldErrors(parsed.error.issues),
      values: formValues(formData),
    };
  }
  const { amount, ...rest } = parsed.data;
  await db.insert(transactions).values({ ...rest, amountSatang: amount, userId: user.id });
  revalidateMoneyPages();
  // Keep type + date so adding several entries in a row is quick.
  return { ok: true, values: { type: rest.type, occurredOn: rest.occurredOn, category: rest.category } };
}

export async function updateTransaction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const id = z.uuid().safeParse(formData.get("id"));
  const parsed = parseTx(formData);
  if (!id.success) return { error: "ไม่พบรายการ" };
  if (!parsed.success) {
    return {
      error: "กรุณาตรวจสอบข้อมูล",
      fieldErrors: toFieldErrors(parsed.error.issues),
      values: formValues(formData),
    };
  }
  const { amount, ...rest } = parsed.data;

  // Ownership is part of the WHERE clause: you can only edit your own rows.
  const updated = await db
    .update(transactions)
    .set({ ...rest, amountSatang: amount })
    .where(and(eq(transactions.id, id.data), eq(transactions.userId, user.id)))
    .returning({ id: transactions.id });
  if (updated.length === 0) return { error: "ไม่พบรายการ" };

  revalidateMoneyPages();
  redirect(`/transactions?month=${rest.occurredOn.slice(0, 7)}`);
}

export async function deleteTransaction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  await db.delete(transactions).where(and(eq(transactions.id, id.data), eq(transactions.userId, user.id)));
  revalidateMoneyPages();
}
