import "server-only";

import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { z } from "zod";

const execFileAsync = promisify(execFile);

export type SetupStatus = {
  initialized: boolean;
  envPath: string;
  hasDatabaseUrl: boolean;
  databaseReachable: boolean;
  migrationsApplied: boolean;
  hasSuperAdmin: boolean;
  message?: string;
};

export type SetupActionState = {
  ok?: boolean;
  error?: string;
  restartHint?: string;
};

const setupSchema = z.object({
  host: z.string().trim().min(1, "请输入 PostgreSQL 地址"),
  port: z
    .string()
    .trim()
    .regex(/^\d{2,5}$/, "请输入有效端口")
    .transform((value) => Number(value)),
  username: z.string().trim().min(1, "请输入数据库用户名"),
  password: z.string().min(1, "请输入数据库密码"),
  database: z.string().trim().min(1, "请输入数据库名"),
  adminName: z.string().trim().min(1, "请输入管理员姓名"),
  adminEmail: z.string().email("请输入有效邮箱").transform((value) => value.toLowerCase()),
  adminPassword: z.string().min(8, "管理员密码至少 8 位"),
  workspaceName: z.string().trim().min(1, "请输入默认工作区名称"),
  workspaceSlug: z
    .string()
    .trim()
    .min(2, "工作区 slug 至少 2 位")
    .regex(/^[a-z0-9-]+$/, "工作区 slug 只能包含小写字母、数字和连字符"),
});

type SetupInput = z.infer<typeof setupSchema>;

const databaseSchema = setupSchema.pick({
  host: true,
  port: true,
  username: true,
  password: true,
  database: true,
});

type DatabaseInput = z.infer<typeof databaseSchema>;

function projectRoot() {
  return process.cwd();
}

export function setupEnvPath() {
  return process.env.KITE_ENV_FILE || path.join(projectRoot(), ".env");
}

function parseDatabaseUrl(databaseUrl?: string | null) {
  if (!databaseUrl) {
    return {
      host: "",
      port: "5432",
      username: "",
      password: "",
      database: "",
    };
  }

  try {
    const url = new URL(databaseUrl);
    return {
      host: url.hostname,
      port: url.port || "5432",
      username: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: decodeURIComponent(url.pathname.replace(/^\//, "")),
    };
  } catch {
    return {
      host: "",
      port: "5432",
      username: "",
      password: "",
      database: "",
    };
  }
}

export function getSetupDefaults() {
  return parseDatabaseUrl(process.env.DATABASE_URL);
}

function buildDatabaseUrl(input: DatabaseInput) {
  const url = new URL("postgresql://localhost");
  url.hostname = input.host;
  url.port = String(input.port);
  url.username = input.username;
  url.password = input.password;
  url.pathname = `/${input.database}`;
  url.searchParams.set("schema", "public");
  return url.toString();
}

function databaseInputFromForm(formData: FormData) {
  return databaseSchema.safeParse({
    host: String(formData.get("host") ?? ""),
    port: String(formData.get("port") ?? ""),
    username: String(formData.get("username") ?? ""),
    password: String(formData.get("password") ?? ""),
    database: String(formData.get("database") ?? ""),
  });
}

function setupInputFromForm(formData: FormData) {
  return setupSchema.safeParse({
    host: String(formData.get("host") ?? ""),
    port: String(formData.get("port") ?? ""),
    username: String(formData.get("username") ?? ""),
    password: String(formData.get("password") ?? ""),
    database: String(formData.get("database") ?? ""),
    adminName: String(formData.get("adminName") ?? ""),
    adminEmail: String(formData.get("adminEmail") ?? ""),
    adminPassword: String(formData.get("adminPassword") ?? ""),
    workspaceName: String(formData.get("workspaceName") ?? ""),
    workspaceSlug: String(formData.get("workspaceSlug") ?? ""),
  });
}

async function readEnvFile(envPath: string) {
  try {
    return await readFile(envPath, "utf8");
  } catch {
    return "";
  }
}

function upsertEnvValue(content: string, key: string, value: string) {
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const line = `${key}="${escaped}"`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  if (pattern.test(content)) return content.replace(pattern, line);
  const prefix = content.trimEnd();
  return `${prefix}${prefix ? "\n" : ""}${line}\n`;
}

async function writeSetupEnv(databaseUrl: string) {
  const envPath = setupEnvPath();
  const authSecret = process.env.AUTH_SECRET || randomBytes(32).toString("hex");
  await mkdir(path.dirname(envPath), { recursive: true });
  let content = await readEnvFile(envPath);
  content = upsertEnvValue(content, "DATABASE_URL", databaseUrl);
  content = upsertEnvValue(content, "AUTH_SECRET", authSecret);
  content = upsertEnvValue(content, "KITE_SETUP_COMPLETE", "true");
  await writeFile(envPath, content, "utf8");
  process.env.DATABASE_URL = databaseUrl;
  process.env.AUTH_SECRET = authSecret;
  process.env.KITE_SETUP_COMPLETE = "true";
  return envPath;
}

async function withPrisma<T>(databaseUrl: string, callback: (prisma: PrismaClient) => Promise<T>) {
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
    log: ["error"],
  });
  try {
    return await callback(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

async function countMigrationFiles() {
  const migrationsDir = path.join(projectRoot(), "prisma", "migrations");
  try {
    const { readdir } = await import("node:fs/promises");
    const entries = await readdir(migrationsDir, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).length;
  } catch {
    return 0;
  }
}

async function tableExists(prisma: PrismaClient, tableName: string) {
  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = ${tableName}
  `;
  return Number(rows[0]?.count ?? 0) > 0;
}

async function verifySchemaWriteAccess(prisma: PrismaClient) {
  const probeTable = `__kite_setup_probe_${randomBytes(4).toString("hex")}`;
  try {
    await prisma.$executeRawUnsafe(`CREATE TABLE "${probeTable}" (id integer)`);
    await prisma.$executeRawUnsafe(`DROP TABLE "${probeTable}"`);
  } catch (error) {
    try {
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${probeTable}"`);
    } catch {
      // Ignore cleanup errors; the original permission error is more useful.
    }
    throw error;
  }
}

export async function getSetupStatus(): Promise<SetupStatus> {
  const envPath = setupEnvPath();
  const databaseUrl = process.env.DATABASE_URL;
  const base = {
    envPath,
    hasDatabaseUrl: Boolean(databaseUrl),
    databaseReachable: false,
    migrationsApplied: false,
    hasSuperAdmin: false,
  };

  if (!databaseUrl) {
    return { ...base, initialized: false };
  }

  try {
    return await withPrisma(databaseUrl, async (prisma) => {
      await prisma.$queryRaw`SELECT 1`;

      const migrationsTableExists = await tableExists(prisma, "_prisma_migrations");
      const userTableExists = await tableExists(prisma, "User");

      let migrationsApplied = false;
      if (migrationsTableExists) {
        const expectedMigrations = await countMigrationFiles();
        const appliedMigrations = await prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*)::bigint AS count
          FROM "_prisma_migrations"
          WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
        `;
        migrationsApplied = Number(appliedMigrations[0]?.count ?? 0) >= expectedMigrations;
      }

      let hasSuperAdmin = false;
      if (userTableExists) {
        const superAdminCount = await prisma.user.count({ where: { systemRole: "SUPER_ADMIN" } });
        hasSuperAdmin = superAdminCount > 0;
      }

      return {
        ...base,
        databaseReachable: true,
        migrationsApplied,
        hasSuperAdmin,
        initialized: migrationsApplied && hasSuperAdmin,
      };
    });
  } catch {
    return {
      ...base,
      initialized: false,
      message: "数据库连接失败或权限不足",
    };
  }
}

async function runMigrations(databaseUrl: string) {
  const command = process.execPath;
  const args = [path.join(projectRoot(), "node_modules", "prisma", "build", "index.js"), "migrate", "deploy"];
  try {
    await execFileAsync(command, args, {
      cwd: projectRoot(),
      env: { ...process.env, DATABASE_URL: databaseUrl },
      windowsHide: true,
      timeout: 120_000,
      maxBuffer: 1024 * 1024 * 4,
    });
  } catch (error) {
    if (error instanceof Error && "stderr" in error) {
      const stderr = String((error as { stderr?: unknown }).stderr ?? "");
      throw new Error(stderr || error.message);
    }
    throw error;
  }
}

async function seedInitialData(input: SetupInput, databaseUrl: string) {
  await withPrisma(databaseUrl, async (prisma) => {
    const passwordHash = await hash(input.adminPassword, 12);
    await prisma.$transaction(async (tx) => {
      const existingSuperAdmin = await tx.user.count({ where: { systemRole: "SUPER_ADMIN" } });
      if (existingSuperAdmin > 0) {
        throw new Error("系统已完成初始化，不能重复创建 superAdmin");
      }

      const existingEmail = await tx.user.findUnique({ where: { email: input.adminEmail }, select: { id: true } });
      if (existingEmail) {
        throw new Error("该管理员邮箱已存在，请更换邮箱或登录现有账号");
      }

      const admin = await tx.user.create({
        data: {
          email: input.adminEmail,
          name: input.adminName,
          passwordHash,
          systemRole: "SUPER_ADMIN",
          mustChangePassword: false,
        },
      });

      const existingWorkspace = await tx.workspace.findUnique({ where: { slug: input.workspaceSlug }, select: { id: true } });
      if (existingWorkspace) {
        throw new Error("默认工作区 slug 已存在，请更换 slug");
      }

      const workspace = await tx.workspace.create({
        data: {
          name: input.workspaceName,
          slug: input.workspaceSlug,
          createdById: admin.id,
        },
      });

      await tx.workspaceMember.create({
        data: { workspaceId: workspace.id, userId: admin.id, role: "OWNER" },
      });
    });
  });
}

function restartHint(envPath: string) {
  if (process.env.KITE_SYSTEMD_SERVICE) {
    return `初始化完成。请执行 sudo systemctl restart ${process.env.KITE_SYSTEMD_SERVICE}`;
  }
  if (envPath !== path.join(projectRoot(), ".env")) {
    return `初始化完成。配置已写入 ${envPath}，请重启 Kite 服务。`;
  }
  return "初始化完成。请重启服务后登录。";
}

export async function initializeApp(_state: SetupActionState, formData: FormData): Promise<SetupActionState> {
  "use server";

  const parsed = setupInputFromForm(formData);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message };

  try {
    const databaseUrl = buildDatabaseUrl(parsed.data);
    await withPrisma(databaseUrl, async (prisma) => {
      await prisma.$queryRaw`SELECT 1`;
    });
    await runMigrations(databaseUrl);
    await seedInitialData(parsed.data, databaseUrl);
    const envPath = await writeSetupEnv(databaseUrl);
    return { ok: true, restartHint: restartHint(envPath) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "初始化失败，请检查数据库连接和权限" };
  }
}

export async function validateDatasourceAction(_state: SetupActionState, formData: FormData): Promise<SetupActionState> {
  "use server";

  const parsed = databaseInputFromForm(formData);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message };

  try {
    const databaseUrl = buildDatabaseUrl(parsed.data);
    await withPrisma(databaseUrl, async (prisma) => {
      await prisma.$queryRaw`SELECT 1`;
      await verifySchemaWriteAccess(prisma);
    });
    return { ok: true };
  } catch {
    return { error: "数据库连接失败，或该账号没有在 public schema 建表的权限" };
  }
}

export async function migrateDatabaseAction(_state: SetupActionState, formData: FormData): Promise<SetupActionState> {
  "use server";

  const parsed = databaseInputFromForm(formData);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message };

  try {
    const databaseUrl = buildDatabaseUrl(parsed.data);
    await withPrisma(databaseUrl, async (prisma) => {
      await prisma.$queryRaw`SELECT 1`;
    });
    await runMigrations(databaseUrl);
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "迁移失败，请检查数据库建表权限" };
  }
}

export async function createSuperAdminAction(_state: SetupActionState, formData: FormData): Promise<SetupActionState> {
  "use server";

  const parsed = setupInputFromForm(formData);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message };

  try {
    const databaseUrl = buildDatabaseUrl(parsed.data);
    await seedInitialData(parsed.data, databaseUrl);
    const envPath = await writeSetupEnv(databaseUrl);
    return { ok: true, restartHint: restartHint(envPath) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "创建 superAdmin 失败，请确认迁移已完成" };
  }
}

export function hasSetupEnvFile() {
  return existsSync(setupEnvPath());
}
