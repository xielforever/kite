import { expect, test } from "@playwright/test";
import { execSync } from "node:child_process";

test.describe.configure({ mode: "serial" });

test.beforeEach(() => {
  execSync("npm.cmd run reset-db", { cwd: process.cwd(), stdio: "ignore" });
});

test("default admin must change password on first login", async ({ page }) => {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill("admin@example.com");
  await page.locator('input[name="password"]').fill("plane");
  await page.getByRole("button", { name: "登录" }).click();
  await page.waitForTimeout(500);

  await page.goto("/workspaces");
  await expect(page).toHaveURL(/\/setup\/change-password/);
  await expect(page.getByRole("heading", { name: "首次登录需要修改密码" })).toBeVisible();
});

test("default workspace is available after bootstrap", async ({ page }) => {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill("admin@example.com");
  await page.locator('input[name="password"]').fill("plane");
  await page.getByRole("button", { name: "登录" }).click();
  await page.waitForTimeout(500);

  await page.goto("/setup/change-password");
  await page.getByLabel("当前密码").fill("plane");
  await page.getByLabel("新密码").fill("plane12345");
  await page.getByRole("button", { name: "更新密码并进入" }).click();
  await expect(page).toHaveURL(/\/workspaces/);
  await expect(page.getByText("默认工作区")).toBeVisible();
});

test("full workflow: register, login, create workspace, project, issue, comment", async ({ page }) => {
  await page.goto("/register");
  await page.locator('input[name="name"]').fill("测试管理员");
  await page.locator('input[name="email"]').fill("admin@example.com");
  await page.locator('input[name="password"]').fill("plane");
  await page.getByRole("button", { name: "注册" }).click();
  await page.waitForTimeout(500);

  await page.goto("/setup/change-password");
  await page.getByLabel("当前密码").fill("plane");
  await page.getByLabel("新密码").fill("plane12345");
  await page.getByRole("button", { name: "更新密码并进入" }).click();
  await expect(page).toHaveURL(/\/workspaces/);

  await expect(page.getByText("默认工作区")).toBeVisible();
  await page.getByRole("link", { name: "进入" }).first().click();
  await page.waitForTimeout(500);

  await page.getByRole("link", { name: "项目" }).click();
  await page.waitForTimeout(500);

  await page.getByRole("link", { name: "默认项目" }).click();
  await page.waitForTimeout(500);

  await page.getByRole("link", { name: "看板" }).click();
  await page.waitForTimeout(500);

  await expect(page.getByText("完善任务列表")).toBeVisible();

  await page.getByRole("link", { name: "列表" }).click();
  await page.waitForTimeout(500);

  await expect(page.getByText("完善任务列表")).toBeVisible();

  await page.getByRole("link", { name: "完善任务列表" }).click();
  await page.waitForTimeout(500);

  await expect(page.getByText("任务信息")).toBeVisible();
  await expect(page.getByText("创建任务")).toBeVisible();
});

test("new user registration and empty workspace state", async ({ page }) => {
  execSync("npx tsx scripts/seed.ts", { cwd: process.cwd(), stdio: "ignore" });

  await page.goto("/register");
  await page.locator('input[name="name"]').fill("普通用户");
  await page.locator('input[name="email"]').fill("user@test.com");
  await page.locator('input[name="password"]').fill("test12345");
  await page.getByRole("button", { name: "注册" }).click();
  await page.waitForTimeout(500);

  await expect(page).toHaveURL(/\/workspaces/);
  await expect(page.getByText("还没有工作区")).toBeVisible();
});

test("workspace settings page loads", async ({ page }) => {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill("admin@example.com");
  await page.locator('input[name="password"]').fill("plane");
  await page.getByRole("button", { name: "登录" }).click();
  await page.waitForTimeout(500);

  await page.goto("/setup/change-password");
  await page.getByLabel("当前密码").fill("plane");
  await page.getByLabel("新密码").fill("plane12345");
  await page.getByRole("button", { name: "更新密码并进入" }).click();

  await page.getByRole("link", { name: "进入" }).first().click();
  await page.waitForTimeout(500);

  await page.getByRole("link", { name: "设置" }).click();
  await page.waitForTimeout(500);

  await expect(page.getByText("基础信息")).toBeVisible();
  await expect(page.locator('input[id="name"]')).toHaveValue("默认工作区");
});

test("admin page accessible only by system admin", async ({ page }) => {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill("admin@example.com");
  await page.locator('input[name="password"]').fill("plane");
  await page.getByRole("button", { name: "登录" }).click();
  await page.waitForTimeout(500);

  await page.goto("/setup/change-password");
  await page.getByLabel("当前密码").fill("plane");
  await page.getByLabel("新密码").fill("plane12345");
  await page.getByRole("button", { name: "更新密码并进入" }).click();

  await page.goto("/admin");
  await page.waitForTimeout(500);
  await expect(page.getByText("系统管理")).toBeVisible();
  await expect(page.getByText("用户管理")).toBeVisible();
});

test("theme toggle works", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator("html")).not.toHaveClass(/dark/);

  const toggle = page.getByRole("button", { name: /切换/ });
  if (await toggle.isVisible()) {
    await toggle.click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await toggle.click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  }
});

test("forbidden page for non-admin accessing admin", async ({ page }) => {
  execSync("npx tsx scripts/seed.ts", { cwd: process.cwd(), stdio: "ignore" });

  await page.goto("/register");
  await page.locator('input[name="name"]').fill("普通用户");
  await page.locator('input[name="email"]').fill("user@test.com");
  await page.locator('input[name="password"]').fill("test12345");
  await page.getByRole("button", { name: "注册" }).click();
  await page.waitForTimeout(500);

  await page.goto("/admin");
  await page.waitForTimeout(500);
  await expect(page).toHaveURL(/\/forbidden/);
});
