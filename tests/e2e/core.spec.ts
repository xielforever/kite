import { expect, test, type Page } from "@playwright/test";
import { execSync } from "node:child_process";

test.describe.configure({ mode: "serial" });

test.beforeEach(() => {
  execSync("npm.cmd run reset-db", { cwd: process.cwd(), stdio: "ignore" });
});

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator("form button").last().click();
}

async function loginAndChangeDefaultPassword(page: Page) {
  await login(page, "admin@example.com", "plane");
  await expect(page).toHaveURL(/\/setup\/change-password/);
  await page.locator('input[name="currentPassword"]').fill("plane");
  await page.locator('input[name="newPassword"]').fill("plane12345");
  await page.locator("form button").last().click();
  await expect(page).toHaveURL(/\/workspaces/);
}

test("default admin must change password on first login", async ({ page }) => {
  await login(page, "admin@example.com", "plane");

  await expect(page).toHaveURL(/\/setup\/change-password/);
  await expect(page.getByRole("heading", { name: "首次登录需要修改密码" })).toBeVisible();
});

test("super admin can use the default project and create an assigned issue", async ({ page }) => {
  await loginAndChangeDefaultPassword(page);

  await expect(page.getByText("默认工作区")).toBeVisible();
  await page.goto("/w/default/projects/DEMO/issues");
  await expect(page.getByRole("button", { name: "新建任务" })).toBeVisible();

  await page.getByRole("button", { name: "新建任务" }).click();
  await page.locator('input[name="title"]').fill("端到端创建任务");
  await page.locator('textarea[name="description"]').fill("覆盖项目成员创建任务并指派给自己。");
  await page.locator('select[name="assigneeId"]').selectOption({ label: "Super Admin" });
  await page.locator("form").filter({ has: page.locator('input[name="title"]') }).getByRole("button", { name: "创建任务" }).click();

  await expect(page.getByText("端到端创建任务")).toBeVisible();

  const exportResponse = await page.context().request.get("/api/admin/exports/issues");
  expect(exportResponse.ok()).toBe(true);
  expect(await exportResponse.text()).toContain("端到端创建任务");
});

test("viewer can access assigned project but cannot edit issues", async ({ page }) => {
  execSync("npx tsx scripts/seed-demo.ts", { cwd: process.cwd(), stdio: "ignore" });

  await login(page, "viewer@example.com", "plane");
  await expect(page).toHaveURL(/\/workspaces/);
  await page.goto("/w/kite-demo/projects/PLAT/issues");

  await expect(page.getByText("确认只读角色禁止编辑")).toBeVisible();
  await expect(page.getByRole("button", { name: "新建任务" })).toHaveCount(0);
});

test("project lead can search and add a member by email", async ({ page }) => {
  execSync("npx tsx scripts/seed-demo.ts", { cwd: process.cwd(), stdio: "ignore" });

  await login(page, "owner@example.com", "plane");
  await expect(page).toHaveURL(/\/workspaces/);
  await page.goto("/w/kite-demo/projects/PLAT/issues");

  await page.getByRole("button", { name: "成员管理" }).click();
  await page.locator('input[name="email"]').fill("outsider");
  await expect(page.getByText("outsider@example.com")).toBeVisible();
  await page.getByText("outsider@example.com").click();
  await page.getByRole("button", { name: "添加项目成员" }).click();

  await expect(page.getByRole("dialog").getByText("宋青书")).toBeVisible();
});

test("super admin can create a project with an explicit lead", async ({ page }) => {
  execSync("npx tsx scripts/seed-demo.ts", { cwd: process.cwd(), stdio: "ignore" });

  await login(page, "owner@example.com", "plane");
  await expect(page).toHaveURL(/\/workspaces/);
  await page.goto("/w/kite-demo/projects");

  await page.getByRole("button", { name: "新建项目" }).click();
  await page.locator('input[name="name"]').fill("专项验证");
  await page.locator('input[name="key"]').fill("TNEW");
  await page.locator('input[name="leadEmail"]').fill("lead@example.com");
  await expect(page.getByText("周芷若")).toBeVisible();
  await page.getByText("lead@example.com").click();
  await page.getByRole("button", { name: "创建项目" }).click();

  await expect(page.getByText("专项验证")).toBeVisible();
  await page.goto("/w/kite-demo/projects/TNEW/issues");
  await page.getByRole("button", { name: "成员管理" }).click();
  await expect(page.getByRole("dialog").getByText("周芷若")).toBeVisible();
});

test("promoted user can access system admin without signing out", async ({ page, browser }) => {
  execSync("npx tsx scripts/seed-demo.ts", { cwd: process.cwd(), stdio: "ignore" });

  await login(page, "outsider@example.com", "plane");
  await expect(page).toHaveURL(/\/workspaces/);

  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  await login(adminPage, "owner@example.com", "plane");
  await expect(adminPage).toHaveURL(/\/workspaces/);
  await adminPage.goto("/admin");

  const adminRow = adminPage.locator("tr", { hasText: "outsider@example.com" });
  await adminRow.locator('select[name="systemRole"]').selectOption("SUPER_ADMIN");
  await expect(adminRow.locator('select[name="systemRole"]')).toHaveValue("SUPER_ADMIN");
  await expect(adminRow.getByText("全局管理权限")).toBeVisible();
  await adminContext.close();

  const response = await page.goto("/admin");
  expect(response?.status()).toBe(200);
  await expect(page.locator('select[name="systemRole"]').first()).toBeVisible();
});

test("super admin can create a user from system admin", async ({ page, browser }) => {
  execSync("npx tsx scripts/seed-demo.ts", { cwd: process.cwd(), stdio: "ignore" });

  await login(page, "owner@example.com", "plane");
  await expect(page).toHaveURL(/\/workspaces/);
  await page.goto("/admin");

  await page.getByRole("button", { name: "新增用户" }).click();
  await page.locator('input[name="name"]').fill("杨逍");
  await page.locator('input[name="email"]').fill("yangxiao@example.com");
  await page.locator('input[name="password"]').fill("password123");
  await page.getByRole("button", { name: "创建用户" }).click();

  await expect(page.locator("tr", { hasText: "yangxiao@example.com" })).toBeVisible();

  const userContext = await browser.newContext();
  const userPage = await userContext.newPage();
  await login(userPage, "yangxiao@example.com", "password123");
  await expect(userPage).toHaveURL(/\/setup\/change-password/);
  await userContext.close();
});

test("non-admin cannot access system admin", async ({ page }) => {
  execSync("npx tsx scripts/seed-demo.ts", { cwd: process.cwd(), stdio: "ignore" });

  await login(page, "viewer@example.com", "plane");
  await expect(page).toHaveURL(/\/workspaces/);
  const response = await page.goto("/admin");

  expect(response?.status()).toBe(403);
});
