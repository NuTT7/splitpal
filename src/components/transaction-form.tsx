"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { createTransaction, updateTransaction } from "@/actions/transactions";
import type { TxType } from "@/db/schema";
import { categoriesFor } from "@/lib/categories";
import { SubmitButton } from "./submit-button";
import { Alert, buttonClass, cn, Field, inputClass } from "./ui";

type Initial = {
  id: string;
  type: TxType;
  amount: string;
  category: string;
  note: string;
  occurredOn: string;
};

export function TransactionForm({ initial, today }: { initial?: Initial; today: string }) {
  const isEdit = Boolean(initial);
  const [state, formAction] = useActionState(isEdit ? updateTransaction : createTransaction, undefined);
  const v = state?.values;
  const [type, setType] = useState<TxType>((initial?.type ?? "expense") as TxType);
  const e = state?.fieldErrors;

  return (
    <form action={formAction} className="space-y-4">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      {state?.error && <Alert>{state.error}</Alert>}
      {state?.ok && !isEdit && <Alert tone="success">บันทึกแล้ว ✓</Alert>}

      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="ประเภท">
        {(["expense", "income"] as const).map((t) => (
          <label
            key={t}
            className={cn(
              "cursor-pointer rounded-xl border px-3 py-2 text-center font-medium transition-colors",
              type === t
                ? t === "expense"
                  ? "border-expense text-expense bg-red-50"
                  : "border-income text-income bg-green-50"
                : "border-line hover:bg-slate-50",
            )}
          >
            <input
              type="radio"
              name="type"
              value={t}
              checked={type === t}
              onChange={() => setType(t)}
              className="sr-only"
            />
            {t === "expense" ? "รายจ่าย" : "รายรับ"}
          </label>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="จำนวนเงิน (บาท)" error={e?.amount}>
          <input
            name="amount"
            inputMode="decimal"
            required
            placeholder="0.00"
            defaultValue={v?.amount ?? initial?.amount}
            className={cn(inputClass, "text-lg font-semibold tabular-nums")}
          />
        </Field>
        <Field label="วันที่" error={e?.occurredOn}>
          <input
            type="date"
            name="occurredOn"
            required
            defaultValue={v?.occurredOn ?? initial?.occurredOn ?? today}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="หมวดหมู่" error={e?.category}>
        {/* key resets the selection when switching between income and expense */}
        <select
          key={type}
          name="category"
          required
          defaultValue={v?.type === type ? v.category : initial?.type === type ? initial.category : ""}
          className={inputClass}
        >
          <option value="" disabled>
            เลือกหมวดหมู่
          </option>
          {categoriesFor(type).map((c) => (
            <option key={c.id} value={c.id}>
              {c.emoji} {c.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="บันทึก (ถ้ามี)" error={e?.note}>
        <input
          name="note"
          maxLength={200}
          placeholder="เช่น ข้าวมันไก่ร้านประจำ"
          defaultValue={v?.note ?? initial?.note}
          className={inputClass}
        />
      </Field>

      <div className="flex gap-2">
        {isEdit && (
          <Link href="/transactions" className={cn(buttonClass("secondary"), "flex-1")}>
            ยกเลิก
          </Link>
        )}
        <SubmitButton className="flex-1">{isEdit ? "บันทึกการแก้ไข" : "เพิ่มรายการ"}</SubmitButton>
      </div>
    </form>
  );
}
