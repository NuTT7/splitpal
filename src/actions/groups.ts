"use server";

import { and, eq, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { expenseShares, groupExpenses, groupMembers, groups, settlements } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { isDateString } from "@/lib/dates";
import { generateInviteCode, getGroupMembers, isMember } from "@/lib/groups";
import { MAX_AMOUNT_SATANG, parseBaht } from "@/lib/money";
import { splitEqual, validateExactSplit } from "@/lib/split";
import { formValues, toFieldErrors, type ActionState } from "./types";

const amountField = z
  .string()
  .transform((v) => parseBaht(v))
  .refine((v): v is number => v !== null && v > 0, "จำนวนเงินไม่ถูกต้อง")
  .refine((v) => v <= MAX_AMOUNT_SATANG, "จำนวนเงินสูงเกินไป");

/* ---------- Groups & membership ---------- */

export async function createGroup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const name = z.string().trim().min(1, "กรุณาตั้งชื่อกลุ่ม").max(60).safeParse(formData.get("name"));
  if (!name.success) return { error: name.error.issues[0].message };

  const groupId = await db.transaction(async (tx) => {
    const [group] = await tx
      .insert(groups)
      .values({ name: name.data, inviteCode: generateInviteCode(), createdBy: user.id })
      .returning({ id: groups.id });
    await tx.insert(groupMembers).values({ groupId: group.id, userId: user.id });
    return group.id;
  });

  revalidatePath("/groups");
  redirect(`/groups/${groupId}`);
}

export async function joinGroup(formData: FormData): Promise<void> {
  const user = await requireUser();
  const code = String(formData.get("code") ?? "");
  const [group] = await db.select({ id: groups.id }).from(groups).where(eq(groups.inviteCode, code)).limit(1);
  if (!group) redirect("/groups");

  await db.insert(groupMembers).values({ groupId: group.id, userId: user.id }).onConflictDoNothing();
  revalidatePath("/groups");
  redirect(`/groups/${group.id}`);
}

export async function regenerateInvite(formData: FormData): Promise<void> {
  const user = await requireUser();
  const groupId = z.uuid().safeParse(formData.get("groupId"));
  if (!groupId.success || !(await isMember(groupId.data, user.id))) return;
  await db.update(groups).set({ inviteCode: generateInviteCode() }).where(eq(groups.id, groupId.data));
  revalidatePath(`/groups/${groupId.data}`);
}

/* ---------- Shared expenses ---------- */

const expenseSchema = z.object({
  groupId: z.uuid(),
  description: z.string().trim().min(1, "กรุณากรอกรายการ").max(100),
  amount: amountField,
  paidBy: z.uuid("กรุณาเลือกคนจ่าย"),
  occurredOn: z.string().refine(isDateString, "วันที่ไม่ถูกต้อง"),
  splitType: z.enum(["equal", "exact"]),
});

export async function addExpense(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const values = formValues(formData);
  const parsed = expenseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "กรุณาตรวจสอบข้อมูล", fieldErrors: toFieldErrors(parsed.error.issues), values };
  }
  const { groupId, description, amount, paidBy, occurredOn, splitType } = parsed.data;

  // Never trust member ids from the form — check them against the database.
  const members = await getGroupMembers(groupId);
  const memberIds = new Set(members.map((m) => m.id));
  if (!memberIds.has(user.id)) return { error: "คุณไม่ได้อยู่ในกลุ่มนี้" };
  if (!memberIds.has(paidBy)) return { error: "คนจ่ายต้องเป็นสมาชิกในกลุ่ม", values };

  let shares: Map<string, number>;
  if (splitType === "equal") {
    const participants = formData.getAll("participants").map(String);
    if (participants.length === 0) return { error: "เลือกอย่างน้อย 1 คนที่หารด้วย", values };
    if (participants.some((id) => !memberIds.has(id))) return { error: "มีคนที่ไม่ได้อยู่ในกลุ่ม", values };
    shares = splitEqual(amount, [...new Set(participants)]);
  } else {
    const exact = new Map<string, number>();
    for (const id of memberIds) {
      const raw = String(formData.get(`exact_${id}`) ?? "").trim();
      if (raw === "") continue;
      const v = parseBaht(raw);
      if (v === null) return { error: "จำนวนเงินของแต่ละคนไม่ถูกต้อง", values };
      exact.set(id, v);
    }
    const result = validateExactSplit(amount, exact);
    if (!result.ok) return { error: result.error, values };
    shares = result.shares;
  }

  // Expense + shares must be written together or not at all.
  await db.transaction(async (tx) => {
    const [expense] = await tx
      .insert(groupExpenses)
      .values({
        groupId,
        description,
        amountSatang: amount,
        paidBy,
        occurredOn,
        splitType,
        createdBy: user.id,
      })
      .returning({ id: groupExpenses.id });
    await tx
      .insert(expenseShares)
      .values([...shares].map(([userId, shareSatang]) => ({ expenseId: expense.id, userId, shareSatang })));
  });

  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/dashboard");
  return { ok: true, values: { occurredOn, paidBy } };
}

export async function deleteExpense(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return;

  // Only the person who added it or the payer can delete an expense.
  const [deleted] = await db
    .delete(groupExpenses)
    .where(
      and(
        eq(groupExpenses.id, id.data),
        or(eq(groupExpenses.createdBy, user.id), eq(groupExpenses.paidBy, user.id)),
      ),
    )
    .returning({ groupId: groupExpenses.groupId });

  if (deleted) {
    revalidatePath(`/groups/${deleted.groupId}`);
    revalidatePath("/dashboard");
  }
}

/* ---------- Settlements ---------- */

const settlementSchema = z
  .object({
    groupId: z.uuid(),
    fromUser: z.uuid(),
    toUser: z.uuid(),
    amount: amountField,
  })
  .refine((d) => d.fromUser !== d.toUser, { message: "ผู้จ่ายและผู้รับต้องเป็นคนละคน" });

export async function recordSettlement(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = settlementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { groupId, fromUser, toUser, amount } = parsed.data;

  const memberIds = new Set((await getGroupMembers(groupId)).map((m) => m.id));
  if (!memberIds.has(user.id) || !memberIds.has(fromUser) || !memberIds.has(toUser)) {
    return { error: "สมาชิกไม่ถูกต้อง" };
  }
  // Only the payer or the receiver may record that money changed hands.
  if (user.id !== fromUser && user.id !== toUser) {
    return { error: "บันทึกได้เฉพาะคนที่จ่ายหรือคนที่รับเงิน" };
  }

  await db
    .insert(settlements)
    .values({ groupId, fromUser, toUser, amountSatang: amount, createdBy: user.id });
  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteSettlement(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  const [deleted] = await db
    .delete(settlements)
    .where(and(eq(settlements.id, id.data), eq(settlements.createdBy, user.id)))
    .returning({ groupId: settlements.groupId });
  if (deleted) revalidatePath(`/groups/${deleted.groupId}`);
}
