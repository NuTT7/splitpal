"use client";

import { useActionState } from "react";
import { createGroup } from "@/actions/groups";
import { SubmitButton } from "@/components/submit-button";
import { Alert, inputClass } from "@/components/ui";

export function CreateGroupForm() {
  const [state, formAction] = useActionState(createGroup, undefined);
  return (
    <form action={formAction} className="space-y-2">
      {state?.error && <Alert>{state.error}</Alert>}
      <label htmlFor="group-name" className="text-sm font-medium">
        สร้างกลุ่มใหม่
      </label>
      <div className="flex gap-2">
        <input
          id="group-name"
          name="name"
          required
          maxLength={60}
          placeholder="เช่น ทริปเชียงใหม่, ห้อง 502"
          className={inputClass}
        />
        <SubmitButton pendingText="กำลังสร้าง…" className="shrink-0">
          สร้าง
        </SubmitButton>
      </div>
    </form>
  );
}
