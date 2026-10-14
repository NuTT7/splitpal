import { expect, test, type Browser, type Page } from "@playwright/test";

const PASSWORD = "correct-horse-1";
const uid = () => Math.random().toString(36).slice(2, 8);

async function register(page: Page, name: string, email: string) {
  await page.getByLabel("ชื่อผู้ใช้").fill(name);
  await page.getByLabel("อีเมล").fill(email);
  await page.getByLabel("รหัสผ่าน", { exact: true }).fill(PASSWORD);
  await page.getByLabel("ยืนยันรหัสผ่าน").fill(PASSWORD);
  await page.getByRole("button", { name: "สร้างบัญชี" }).click();
}

/** Register and wait until the session cookie is set (we've left /register). */
async function registerAndWait(page: Page, name: string, email: string) {
  await register(page, name, email);
  await expect(page).not.toHaveURL(/\/register/);
}

async function newUser(browser: Browser, name: string, startUrl = "/register") {
  const context = await browser.newContext();
  const page = await context.newPage();
  const email = `${name}-${uid()}@test.dev`;
  await page.goto(startUrl);
  await registerAndWait(page, name, email);
  return { page, email, context };
}

test.describe("auth", () => {
  test("protected pages redirect to login", async ({ page, request }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
    const res = await request.get("/api/transactions/export");
    expect(res.status()).toBe(401);
  });

  test("register, logout, failed login keeps email, login", async ({ page }) => {
    const email = `alice-${uid()}@test.dev`;
    await page.goto("/register");
    await register(page, "Alice", email);
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: "สวัสดี, Alice" })).toBeVisible();

    await page.getByRole("button", { name: "ออกจากระบบ" }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.getByLabel("อีเมล").fill(email);
    await page.getByLabel("รหัสผ่าน").fill("wrong-password");
    await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
    await expect(page.getByText("อีเมลหรือรหัสผ่านไม่ถูกต้อง")).toBeVisible();
    await expect(page.getByLabel("อีเมล")).toHaveValue(email);

    await page.getByLabel("รหัสผ่าน").fill(PASSWORD);
    await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("duplicate email is rejected", async ({ browser }) => {
    const { page, email } = await newUser(browser, "Dup");
    await expect(page).toHaveURL(/\/dashboard$/);
    const other = await (await browser.newContext()).newPage();
    await other.goto("/register");
    await register(other, "Dup2", email);
    await expect(other.getByText("อีเมลนี้มีบัญชีอยู่แล้ว")).toBeVisible();
  });
});

test("personal transactions: add, edit, delete, summary and CSV", async ({ browser }) => {
  const { page } = await newUser(browser, "Bob");
  await page.goto("/transactions");

  // expense
  await page.getByLabel("จำนวนเงิน (บาท)").fill("120.50");
  await page.getByLabel("หมวดหมู่").selectOption("food");
  await page.getByLabel("บันทึก (ถ้ามี)").fill("ข้าวผัด, ต้มยำ");
  await page.getByRole("button", { name: "เพิ่มรายการ" }).click();
  await expect(page.getByText("บันทึกแล้ว")).toBeVisible();
  await expect(page.getByText("ข้าวผัด, ต้มยำ")).toBeVisible();

  // income
  await page.getByText("รายรับ", { exact: true }).first().click();
  await page.getByLabel("จำนวนเงิน (บาท)").fill("1,000");
  await page.getByLabel("หมวดหมู่").selectOption("salary");
  await page.getByLabel("บันทึก (ถ้ามี)").fill("โบนัส");
  await page.getByRole("button", { name: "เพิ่มรายการ" }).click();
  await expect(page.getByText("โบนัส")).toBeVisible();

  // invalid amount shows an error and keeps the note
  await page.getByLabel("จำนวนเงิน (บาท)").fill("12.345");
  await page.getByLabel("หมวดหมู่").selectOption("gift");
  await page.getByLabel("บันทึก (ถ้ามี)").fill("ทดสอบ");
  await page.getByRole("button", { name: "เพิ่มรายการ" }).click();
  await expect(page.getByText("จำนวนเงินไม่ถูกต้อง")).toBeVisible();
  await expect(page.getByLabel("บันทึก (ถ้ามี)")).toHaveValue("ทดสอบ");

  // edit the expense
  await page.locator("li", { hasText: "ข้าวผัด" }).getByRole("link", { name: "แก้ไข" }).click();
  await expect(page.getByLabel("จำนวนเงิน (บาท)")).toHaveValue("120.50");
  await page.getByLabel("จำนวนเงิน (บาท)").fill("200");
  await page.getByRole("button", { name: "บันทึกการแก้ไข" }).click();
  await expect(page).toHaveURL(/\/transactions\?month=/);
  await expect(page.locator("li", { hasText: "ข้าวผัด" })).toContainText("-฿200");

  // dashboard numbers come from SQL aggregates
  await page.goto("/dashboard");
  await expect(page.getByText("รายรับ").locator("..")).toContainText("฿1,000");
  await expect(page.getByText("รายจ่าย").first().locator("..")).toContainText("฿200");
  await expect(page.getByText("คงเหลือ").locator("..")).toContainText("+฿800");

  // CSV export uses the same session cookie
  const csv = await (await page.request.get("/api/transactions/export")).text();
  expect(csv.charCodeAt(0)).toBe(0xfeff);
  expect(csv).toContain('"ข้าวผัด, ต้มยำ"');
  expect(csv).toContain("-200");

  // delete
  await page.goto("/transactions");
  await page.locator("li", { hasText: "โบนัส" }).getByRole("button", { name: "ลบรายการ" }).click();
  await expect(page.getByText("โบนัส")).toHaveCount(0);
});

test("groups: invite, split, balances, settle up and access control", async ({ browser }) => {
  const a = await newUser(browser, "Ann");
  await a.page.goto("/groups");
  await a.page.getByLabel("สร้างกลุ่มใหม่").fill("ทริปทะเล");
  await a.page.getByRole("button", { name: "สร้าง", exact: true }).click();
  await expect(a.page.getByRole("heading", { name: "ทริปทะเล" })).toBeVisible();
  const groupUrl = a.page.url();
  const inviteUrl = await a.page.getByLabel("ลิงก์ชวนเข้ากลุ่ม").inputValue();
  expect(inviteUrl).toMatch(/\/join\/[\w-]{12}$/);

  // Ben signs up through the invite link and lands back on the join page
  const invitePath = new URL(inviteUrl).pathname;
  const b = await (await browser.newContext()).newPage();
  await b.goto(invitePath);
  await b.getByRole("link", { name: "สมัครสมาชิกแล้วเข้าร่วม" }).click();
  await register(b, "Ben", `ben-${uid()}@test.dev`);
  await expect(b).toHaveURL(new RegExp(invitePath));
  await b.getByRole("button", { name: "เข้าร่วมกลุ่ม" }).click();
  await expect(b.getByRole("heading", { name: "ทริปทะเล" })).toBeVisible();

  // Ben pays 300 split equally → Ann owes Ben 150
  await b.getByLabel("รายการ").fill("ค่าเรือ");
  await b.getByLabel("จำนวนเงิน (บาท)").fill("300");
  await expect(b.getByText("฿150").first()).toBeVisible(); // live preview
  await b.getByRole("button", { name: "เพิ่มค่าใช้จ่าย" }).click();
  await expect(b.getByText("เพิ่มรายการแล้ว")).toBeVisible();
  await expect(b.getByText("ได้คืน ฿150").first()).toBeVisible();

  // Exact split that doesn't add up is rejected
  await b.getByLabel("รายการ").fill("ข้าว");
  await b.getByLabel("จำนวนเงิน (บาท)").fill("100");
  await b.getByRole("button", { name: "ระบุยอดเอง" }).click();
  await b.getByLabel("ยอดของ Ann").fill("30");
  await b.getByLabel("ยอดของ Ben").fill("60");
  await expect(b.getByText("ขาด ฿10")).toBeVisible();
  await b.getByRole("button", { name: "เพิ่มค่าใช้จ่าย" }).click();
  await expect(b.getByText(/ไม่เท่ากับยอดบิล/)).toBeVisible();

  await a.page.reload();
  await expect(a.page.getByText("ค้างจ่าย ฿150").first()).toBeVisible();
  await a.page.getByRole("button", { name: "บันทึกว่าโอนแล้ว" }).click();
  await expect(a.page.getByText("ทุกคนเคลียร์กันหมดแล้ว")).toBeVisible();
  await expect(a.page.getByText("เคลียร์แล้ว").first()).toBeVisible();

  // An outsider gets a 404 for the group page (no information leak)
  const c = await newUser(browser, "Cat");
  await expect(c.page).toHaveURL(/\/dashboard$/);
  const res = await c.page.goto(groupUrl);
  expect(res?.status()).toBe(404);
});
