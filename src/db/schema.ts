import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: createdAt(),
});

/* ---------- Personal income / expenses ---------- */

export const txType = pgEnum("tx_type", ["income", "expense"]);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: txType("type").notNull(),
    /** Integer satang (1 baht = 100 satang); always positive, `type` gives the sign */
    amountSatang: integer("amount_satang").notNull(),
    category: text("category").notNull(),
    note: text("note").notNull().default(""),
    occurredOn: date("occurred_on", { mode: "string" }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("transactions_user_date_idx").on(t.userId, t.occurredOn),
    check("transactions_amount_positive", sql`${t.amountSatang} > 0`),
  ],
);

/* ---------- Groups & shared expenses ---------- */

export const groups = pgTable("groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  /** Secret token for the invite link /join/<code> */
  inviteCode: text("invite_code").notNull().unique(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: createdAt(),
});

export const groupMembers = pgTable(
  "group_members",
  {
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.groupId, t.userId] }), index("group_members_user_idx").on(t.userId)],
);

export const splitType = pgEnum("split_type", ["equal", "exact"]);

export const groupExpenses = pgTable(
  "group_expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    paidBy: uuid("paid_by")
      .notNull()
      .references(() => users.id),
    description: text("description").notNull(),
    amountSatang: integer("amount_satang").notNull(),
    splitType: splitType("split_type").notNull(),
    occurredOn: date("occurred_on", { mode: "string" }).notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [
    index("group_expenses_group_idx").on(t.groupId, t.occurredOn),
    check("group_expenses_amount_positive", sql`${t.amountSatang} > 0`),
  ],
);

/** How much of an expense each member owes. Shares always sum to the expense amount. */
export const expenseShares = pgTable(
  "expense_shares",
  {
    expenseId: uuid("expense_id")
      .notNull()
      .references(() => groupExpenses.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    shareSatang: integer("share_satang").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.expenseId, t.userId] }),
    check("expense_shares_non_negative", sql`${t.shareSatang} >= 0`),
  ],
);

/** A payment between two members that pays down debt ("A paid B 300 baht"). */
export const settlements = pgTable(
  "settlements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    fromUser: uuid("from_user")
      .notNull()
      .references(() => users.id),
    toUser: uuid("to_user")
      .notNull()
      .references(() => users.id),
    amountSatang: integer("amount_satang").notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [
    index("settlements_group_idx").on(t.groupId),
    check("settlements_amount_positive", sql`${t.amountSatang} > 0`),
    check("settlements_different_users", sql`${t.fromUser} <> ${t.toUser}`),
  ],
);

export type Transaction = typeof transactions.$inferSelect;
export type TxType = (typeof txType.enumValues)[number];
