"use client";

import { useActionState } from "react";
import { login, register } from "@/actions/auth";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, inputClass } from "@/components/ui";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(login, undefined);
  return (
    <form action={formAction} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      {state?.error && <Alert>{state.error}</Alert>}
      <Field label="อีเมล">
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={state?.values?.email}
          className={inputClass}
        />
      </Field>
      <Field label="รหัสผ่าน">
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className={inputClass}
        />
      </Field>
      <SubmitButton className="w-full" pendingText="กำลังเข้าสู่ระบบ…">
        เข้าสู่ระบบ
      </SubmitButton>
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(register, undefined);
  const e = state?.fieldErrors;
  return (
    <form action={formAction} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      {state?.error && !e && <Alert>{state.error}</Alert>}
      <Field label="ชื่อผู้ใช้" error={e?.name}>
        <input
          name="name"
          required
          maxLength={60}
          autoComplete="nickname"
          defaultValue={state?.values?.name}
          className={inputClass}
        />
      </Field>
      <Field label="อีเมล" error={e?.email}>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={state?.values?.email}
          className={inputClass}
        />
      </Field>
      <Field label="รหัสผ่าน" error={e?.password} hint="อย่างน้อย 8 ตัวอักษร">
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputClass}
        />
      </Field>
      <Field label="ยืนยันรหัสผ่าน" error={e?.confirm}>
        <input name="confirm" type="password" required autoComplete="new-password" className={inputClass} />
      </Field>
      <SubmitButton className="w-full" pendingText="กำลังสร้างบัญชี…">
        สร้างบัญชี
      </SubmitButton>
    </form>
  );
}
