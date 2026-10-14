"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, pgErrorCode, PG_UNIQUE_VIOLATION } from "@/db";
import { users } from "@/db/schema";
import { safeNext } from "@/lib/safe-next";
import { createSession, destroySession } from "@/lib/session";
import { formValues, toFieldErrors, type ActionState } from "./types";

const registerSchema = z
  .object({
    name: z.string().trim().min(1, "กรุณากรอกชื่อ").max(60, "ชื่อยาวเกินไป"),
    email: z.email("อีเมลไม่ถูกต้อง").transform((v) => v.toLowerCase()),
    password: z.string().min(8, "รหัสผ่านอย่างน้อย 8 ตัวอักษร").max(200),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "รหัสผ่านไม่ตรงกัน" });

export async function register(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = formValues(formData, ["password", "confirm"]);
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "กรุณาตรวจสอบข้อมูล", fieldErrors: toFieldErrors(parsed.error.issues), values };
  }
  const { name, email, password } = parsed.data;

  let userId: string;
  try {
    const [user] = await db
      .insert(users)
      .values({ name, email, passwordHash: await bcrypt.hash(password, 12) })
      .returning({ id: users.id });
    userId = user.id;
  } catch (err) {
    if (pgErrorCode(err) === PG_UNIQUE_VIOLATION) {
      return { error: "อีเมลนี้มีบัญชีอยู่แล้ว", fieldErrors: { email: "อีเมลนี้มีบัญชีอยู่แล้ว" }, values };
    }
    throw err;
  }

  await createSession(userId);
  redirect(safeNext(formData.get("next")));
}

const loginSchema = z.object({
  email: z.email().transform((v) => v.toLowerCase()),
  password: z.string().min(1).max(200),
});

// In-memory throttle: 5 failed attempts per email per 15 minutes (single instance).
const WINDOW_MS = 15 * 60_000;
const failures = new Map<string, { count: number; first: number }>();

function tooManyAttempts(email: string): boolean {
  const entry = failures.get(email);
  if (!entry) return false;
  if (Date.now() - entry.first > WINDOW_MS) {
    failures.delete(email);
    return false;
  }
  return entry.count >= 5;
}

function recordFailure(email: string) {
  const entry = failures.get(email);
  if (!entry || Date.now() - entry.first > WINDOW_MS) failures.set(email, { count: 1, first: Date.now() });
  else entry.count++;
}

// Compared against when the email doesn't exist, so timing doesn't reveal registered emails.
const DUMMY_HASH = "$2b$12$1of28FTiIWo7/J8d/9eVoeRqnPMJNWhRnvuHRTg2WMo5O/8.b2Lym";

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = formValues(formData, ["password"]);
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง", values };
  const { email, password } = parsed.data;

  if (tooManyAttempts(email)) return { error: "พยายามเข้าสู่ระบบหลายครั้งเกินไป กรุณารอ 15 นาที", values };

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) {
    recordFailure(email);
    return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง", values };
  }

  failures.delete(email);
  await createSession(user.id);
  redirect(safeNext(formData.get("next")));
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}
