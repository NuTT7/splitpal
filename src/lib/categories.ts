import type { TxType } from "@/db/schema";

export interface Category {
  id: string;
  label: string;
  emoji: string;
  color: string;
}

export const EXPENSE_CATEGORIES: Category[] = [
  { id: "food", label: "อาหาร/เครื่องดื่ม", emoji: "🍜", color: "#f97316" },
  { id: "transport", label: "เดินทาง", emoji: "🚇", color: "#0ea5e9" },
  { id: "shopping", label: "ช้อปปิ้ง", emoji: "🛍️", color: "#ec4899" },
  { id: "bills", label: "บิล/ค่าน้ำไฟ", emoji: "🧾", color: "#8b5cf6" },
  { id: "housing", label: "ที่พัก", emoji: "🏠", color: "#14b8a6" },
  { id: "entertainment", label: "บันเทิง", emoji: "🎬", color: "#eab308" },
  { id: "health", label: "สุขภาพ", emoji: "💊", color: "#ef4444" },
  { id: "education", label: "การศึกษา", emoji: "📚", color: "#6366f1" },
  { id: "other_expense", label: "อื่นๆ", emoji: "📦", color: "#78716c" },
];

export const INCOME_CATEGORIES: Category[] = [
  { id: "salary", label: "เงินเดือน", emoji: "💼", color: "#16a34a" },
  { id: "freelance", label: "ฟรีแลนซ์", emoji: "💻", color: "#22c55e" },
  { id: "gift", label: "ของขวัญ/เงินให้", emoji: "🎁", color: "#84cc16" },
  { id: "investment", label: "ลงทุน", emoji: "📈", color: "#10b981" },
  { id: "other_income", label: "อื่นๆ", emoji: "💰", color: "#78716c" },
];

const ALL = new Map([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].map((c) => [c.id, c]));

export function categoriesFor(type: TxType): Category[] {
  return type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

export function isValidCategory(type: TxType, id: string): boolean {
  return categoriesFor(type).some((c) => c.id === id);
}

export function getCategory(id: string): Category {
  return ALL.get(id) ?? { id, label: id, emoji: "•", color: "#78716c" };
}
