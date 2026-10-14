"use client";

import { useActionState, useState } from "react";
import { addExpense } from "@/actions/groups";
import { SubmitButton } from "@/components/submit-button";
import { Alert, cn, Field, inputClass } from "@/components/ui";
import { formatBaht, parseBaht } from "@/lib/money";
import { splitEqual } from "@/lib/split";
import type { ActionState } from "@/actions/types";

type Member = { id: string; name: string };

export function ExpenseForm({
  groupId,
  members,
  currentUserId,
  today,
}: {
  groupId: string;
  members: Member[];
  currentUserId: string;
  today: string;
}) {
  const [splitType, setSplitType] = useState<"equal" | "exact">("equal");
  const [amount, setAmount] = useState("");
  const [participants, setParticipants] = useState<Set<string>>(() => new Set(members.map((m) => m.id)));
  const [exact, setExact] = useState<Record<string, string>>({});

  const [state, formAction] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await addExpense(prev, formData);
    if (result?.ok) {
      setAmount("");
      setExact({});
    }
    return result;
  }, undefined);

  const total = parseBaht(amount) ?? 0;
  const label = (m: Member) => (m.id === currentUserId ? `${m.name} (คุณ)` : m.name);

  // Live preview of who pays what, using the same function the server uses.
  const equalShares = total > 0 && participants.size > 0 ? splitEqual(total, [...participants]) : null;
  const exactSum = Object.values(exact).reduce((s, v) => s + (parseBaht(v) ?? 0), 0);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="splitType" value={splitType} />
      {state?.error && <Alert>{state.error}</Alert>}
      {state?.ok && <Alert tone="success">เพิ่มรายการแล้ว ✓</Alert>}

      <Field label="รายการ" error={state?.fieldErrors?.description}>
        <input
          name="description"
          required
          maxLength={100}
          placeholder="เช่น หมูกระทะ, ค่าห้อง"
          defaultValue={state?.ok ? "" : state?.values?.description}
          className={inputClass}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="จำนวนเงิน (บาท)" error={state?.fieldErrors?.amount}>
          <input
            name="amount"
            inputMode="decimal"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className={cn(inputClass, "font-semibold tabular-nums")}
          />
        </Field>
        <Field label="วันที่" error={state?.fieldErrors?.occurredOn}>
          <input
            type="date"
            name="occurredOn"
            required
            defaultValue={state?.values?.occurredOn ?? today}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="ใครจ่าย" error={state?.fieldErrors?.paidBy}>
        <select name="paidBy" defaultValue={state?.values?.paidBy ?? currentUserId} className={inputClass}>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {label(m)}
            </option>
          ))}
        </select>
      </Field>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">หารยังไง</span>
          <div className="border-line inline-flex rounded-lg border p-0.5 text-sm">
            {(["equal", "exact"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setSplitType(t)}
                aria-pressed={splitType === t}
                className={cn("rounded-md px-3 py-1", splitType === t ? "bg-brand text-white" : "text-muted")}
              >
                {t === "equal" ? "หารเท่ากัน" : "ระบุยอดเอง"}
              </button>
            ))}
          </div>
        </div>

        <ul className="border-line divide-line divide-y rounded-xl border">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 px-3 py-2">
              {splitType === "equal" ? (
                <>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="participants"
                      value={m.id}
                      checked={participants.has(m.id)}
                      onChange={(e) => {
                        const next = new Set(participants);
                        if (e.target.checked) next.add(m.id);
                        else next.delete(m.id);
                        setParticipants(next);
                      }}
                      className="accent-brand size-4"
                    />
                    {label(m)}
                  </label>
                  <span className="text-muted text-sm tabular-nums">
                    {equalShares?.has(m.id) ? formatBaht(equalShares.get(m.id)!) : "–"}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-sm">{label(m)}</span>
                  <input
                    name={`exact_${m.id}`}
                    inputMode="decimal"
                    placeholder="0"
                    value={exact[m.id] ?? ""}
                    onChange={(e) => setExact({ ...exact, [m.id]: e.target.value })}
                    aria-label={`ยอดของ ${m.name}`}
                    className={cn(inputClass, "w-28 py-1.5 text-right tabular-nums")}
                  />
                </>
              )}
            </li>
          ))}
        </ul>
        {splitType === "exact" && total > 0 && (
          <p className={cn("text-right text-sm", exactSum === total ? "text-income" : "text-expense")}>
            รวม {formatBaht(exactSum)} / {formatBaht(total)}
            {exactSum !== total &&
              ` (${exactSum < total ? "ขาด" : "เกิน"} ${formatBaht(Math.abs(total - exactSum))})`}
          </p>
        )}
      </div>

      <SubmitButton className="w-full">เพิ่มค่าใช้จ่าย</SubmitButton>
    </form>
  );
}
