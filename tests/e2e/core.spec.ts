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
