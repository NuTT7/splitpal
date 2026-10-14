"use client";

import { useActionState } from "react";
import { recordSettlement } from "@/actions/groups";
import { SubmitButton } from "@/components/submit-button";

export function SettleButton({
  groupId,
  fromUser,
  toUser,
  amount,
}: {
  groupId: string;
  fromUser: string;
  toUser: string;
  amount: string;
}) {
  const [state, formAction] = useActionState(recordSettlement, undefined);
  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="fromUser" value={fromUser} />
      <input type="hidden" name="toUser" value={toUser} />
      <input type="hidden" name="amount" value={amount} />
      <SubmitButton size="sm" variant="secondary" pendingText="กำลังบันทึก…">
        บันทึกว่าโอนแล้ว
      </SubmitButton>
      {state?.error && <span className="text-xs text-red-600">{state.error}</span>}
    </form>
  );
}
