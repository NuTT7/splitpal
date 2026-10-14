/**
 * Demo data: 3 users, a month of personal transactions for the first user,
 * and a shared "trip" group with a few expenses.
 * Login: nut@example.com / password123 (also mint@… and boss@…)
 */
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { expenseShares, groupExpenses, groupMembers, groups, transactions, users } from "../src/db/schema";
import { todayString } from "../src/lib/dates";
import { splitEqual } from "../src/lib/split";

// Scripts run outside Next.js, so load .env ourselves (Next.js does this automatically).
try {
  process.loadEnvFile(".env");
} catch {
  // no .env file (e.g. CI or Docker, where env vars are set directly)
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  const existing = await db.select().from(users).where(eq(users.email, "nut@example.com"));
  if (existing.length) {
    console.log("✓ demo data already present");
    await pool.end();
    return;
  }

  const passwordHash = await bcrypt.hash("password123", 12);
  const [nut, mint, boss] = await db
    .insert(users)
    .values([
      { email: "nut@example.com", name: "นัท", passwordHash },
      { email: "mint@example.com", name: "มิ้นท์", passwordHash },
      { email: "boss@example.com", name: "บอส", passwordHash },
    ])
    .returning();

  const today = todayString();
  const month = today.slice(0, 7);
  const day = (d: number) => `${month}-${String(Math.min(d, Number(today.slice(8)))).padStart(2, "0")}`;

  await db.insert(transactions).values([
    {
      userId: nut.id,
      type: "income",
      amountSatang: 3500000,
      category: "salary",
      note: "เงินเดือน",
      occurredOn: day(1),
    },
    {
      userId: nut.id,
      type: "income",
      amountSatang: 450000,
      category: "freelance",
      note: "งานเว็บ",
      occurredOn: day(9),
    },
    {
      userId: nut.id,
      type: "expense",
      amountSatang: 850000,
      category: "housing",
      note: "ค่าห้อง",
      occurredOn: day(1),
    },
    {
      userId: nut.id,
      type: "expense",
      amountSatang: 6000,
      category: "food",
      note: "ข้าวมันไก่",
      occurredOn: day(2),
    },
    {
      userId: nut.id,
      type: "expense",
      amountSatang: 4200,
      category: "transport",
      note: "BTS",
      occurredOn: day(2),
    },
    {
      userId: nut.id,
      type: "expense",
      amountSatang: 18900,
      category: "food",
      note: "ชาบู",
      occurredOn: day(4),
    },
    {
      userId: nut.id,
      type: "expense",
      amountSatang: 129000,
      category: "bills",
      note: "ค่าไฟ",
      occurredOn: day(5),
    },
    {
      userId: nut.id,
      type: "expense",
      amountSatang: 59900,
      category: "shopping",
      note: "หูฟัง",
      occurredOn: day(7),
    },
    {
      userId: nut.id,
      type: "expense",
      amountSatang: 22000,
      category: "entertainment",
      note: "หนัง",
      occurredOn: day(8),
    },
    {
      userId: nut.id,
      type: "expense",
      amountSatang: 7500,
      category: "food",
      note: "กาแฟ",
      occurredOn: day(10),
    },
    {
      userId: nut.id,
      type: "expense",
      amountSatang: 35000,
      category: "health",
      note: "ยา",
      occurredOn: day(11),
    },
  ]);

  const [trip] = await db
    .insert(groups)
    .values({ name: "ทริปเขาใหญ่", inviteCode: "demoTripCode", createdBy: nut.id })
    .returning();
  await db.insert(groupMembers).values([nut, mint, boss].map((u) => ({ groupId: trip.id, userId: u.id })));

  const everyone = [nut.id, mint.id, boss.id];
  const expenses = [
    { description: "ค่าที่พัก", amount: 360000, paidBy: nut.id, members: everyone },
    { description: "ค่าน้ำมัน", amount: 150000, paidBy: mint.id, members: everyone },
    { description: "หมูกระทะ", amount: 89900, paidBy: boss.id, members: everyone },
    { description: "ตั๋วเข้าอุทยาน", amount: 80000, paidBy: nut.id, members: [nut.id, mint.id] },
  ];
  for (const e of expenses) {
    const [row] = await db
      .insert(groupExpenses)
      .values({
        groupId: trip.id,
        description: e.description,
        amountSatang: e.amount,
        paidBy: e.paidBy,
        splitType: "equal",
        occurredOn: day(6),
        createdBy: e.paidBy,
      })
      .returning();
    await db.insert(expenseShares).values(
      [...splitEqual(e.amount, e.members)].map(([userId, shareSatang]) => ({
        expenseId: row.id,
        userId,
        shareSatang,
      })),
    );
  }

  await pool.end();
  console.log("✓ seeded demo data (login: nut@example.com / password123)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
