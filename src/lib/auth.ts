import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { users } from "@/db/schema";
import { readSessionSubject } from "./session";

export const getCurrentUser = cache(async () => {
  const id = await readSessionSubject();
  if (!id) return null;
  const [user] = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return user ?? null;
});

/** Call in every protected page and server action (actions are public endpoints). */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
