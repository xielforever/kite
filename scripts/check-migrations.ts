import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

function prismaCliPath() {
  return path.join(process.cwd(), "node_modules", "prisma", "build", "index.js");
}

function localDatabaseInfo(databaseUrl: string) {
  const url = new URL(databaseUrl);
  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1";
  if (!isLocal) {
    throw new Error("Set SHADOW_DATABASE_URL to run migration drift checks against a non-local database.");
  }

  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!databaseName) throw new Error("DATABASE_URL must include a database name.");
  return { url, databaseName };
}

function deriveLocalShadowUrl(databaseUrl: string) {
  const { url, databaseName } = localDatabaseInfo(databaseUrl);
  url.pathname = `/${databaseName}_shadow`;
  return url.toString();
}

function shadowDatabaseUrl() {
  loadLocalEnv();
  if (process.env.SHADOW_DATABASE_URL) return process.env.SHADOW_DATABASE_URL;
  if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL or SHADOW_DATABASE_URL before running migration checks.");
  return deriveLocalShadowUrl(process.env.DATABASE_URL);
}

async function ensureDerivedShadowDatabase(shadowUrl: string) {
  if (process.env.SHADOW_DATABASE_URL || !process.env.DATABASE_URL) return;

  const { url, databaseName } = localDatabaseInfo(process.env.DATABASE_URL);
  const shadowDatabase = `${databaseName}_shadow`;
  if (!/^[A-Za-z0-9_]+$/.test(shadowDatabase)) {
    throw new Error(`Cannot auto-create shadow database with unsafe name: ${shadowDatabase}`);
  }

  const adminUrl = new URL(url.toString());
  adminUrl.pathname = "/postgres";
  const prisma = new PrismaClient({ datasources: { db: { url: adminUrl.toString() } } });
  try {
    await prisma.$executeRawUnsafe(`CREATE DATABASE "${shadowDatabase}"`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("already exists") && !message.includes("42P04") && !message.includes("已经存在")) {
      throw new Error(`Could not create local shadow database ${shadowDatabase}. Create it manually or set SHADOW_DATABASE_URL. ${message}`);
    }
  } finally {
    await prisma.$disconnect();
  }

  process.env.SHADOW_DATABASE_URL = shadowUrl;
}

function loadLocalEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    const rawValue = match[2].trim();
    process.env[match[1]] = rawValue.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
  }
}

async function main() {
  const shadowUrl = shadowDatabaseUrl();
  await ensureDerivedShadowDatabase(shadowUrl);
  execFileSync(
    process.execPath,
    [
      prismaCliPath(),
      "migrate",
      "diff",
      "--from-migrations",
      "prisma/migrations",
      "--to-schema-datamodel",
      "prisma/schema.prisma",
      "--shadow-database-url",
      shadowUrl,
      "--exit-code",
    ],
    {
      cwd: process.cwd(),
      env: { ...process.env, SHADOW_DATABASE_URL: shadowUrl },
      stdio: "pipe",
      windowsHide: true,
    },
  );
  console.log("Migration history matches prisma/schema.prisma.");
}

main().catch((error) => {
  const status = typeof error === "object" && error !== null && "status" in error ? Number((error as { status?: unknown }).status) : 1;
  const stderr = typeof error === "object" && error !== null && "stderr" in error ? String((error as { stderr?: Buffer }).stderr ?? "") : "";
  if (status === 2) {
    console.error("Migration drift detected: prisma/schema.prisma has changes that are not represented by migrations.");
  } else {
    console.error(stderr.trim() || (error instanceof Error ? error.message : "Migration check failed."));
  }
  process.exit(status || 1);
});
