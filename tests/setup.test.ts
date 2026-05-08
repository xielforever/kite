import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const state = {
    queryFails: false,
    tables: new Set<string>(),
    appliedMigrations: 0,
    superAdminCount: 0,
  };
  const instances: unknown[] = [];

  const PrismaClient = vi.fn(function (this: {
    user: { count: ReturnType<typeof vi.fn> };
    $queryRaw: ReturnType<typeof vi.fn>;
    $disconnect: ReturnType<typeof vi.fn>;
  }) {
    this.user = {
      count: vi.fn(async () => state.superAdminCount),
    };
    this.$queryRaw = vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const sql = Array.from(strings).join("?");
      if (state.queryFails) throw new Error("connection failed");
      if (sql.includes("information_schema.tables")) {
        return [{ count: BigInt(state.tables.has(String(values[0])) ? 1 : 0) }];
      }
      if (sql.includes('FROM "_prisma_migrations"')) {
        return [{ count: BigInt(state.appliedMigrations) }];
      }
      return [{ count: 1n }];
    });
    this.$disconnect = vi.fn(async () => undefined);
    instances.push(this);
  });

  return { PrismaClient, instances, state };
});

vi.mock("server-only", () => ({}));
vi.mock("@prisma/client", () => ({
  PrismaClient: mocks.PrismaClient,
}));

const originalDatabaseUrl = process.env.DATABASE_URL;
const originalAuthUrl = process.env.AUTH_URL;

import { getSetupDefaults, getSetupStatus } from "@/lib/setup";

describe("setup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.instances.length = 0;
    mocks.state.queryFails = false;
    mocks.state.tables = new Set<string>();
    mocks.state.appliedMigrations = 0;
    mocks.state.superAdminCount = 0;
    process.env.DATABASE_URL = "postgresql://kite_user:secret@localhost:5432/kite?schema=public";
    process.env.AUTH_URL = "http://localhost:3000";
  });

  afterAll(() => {
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
    if (originalAuthUrl === undefined) {
      delete process.env.AUTH_URL;
    } else {
      process.env.AUTH_URL = originalAuthUrl;
    }
  });

  it("reports uninitialized when DATABASE_URL is missing", async () => {
    delete process.env.DATABASE_URL;

    const status = await getSetupStatus();

    expect(status.initialized).toBe(false);
    expect(status.hasDatabaseUrl).toBe(false);
    expect(mocks.PrismaClient).not.toHaveBeenCalled();
  });

  it("parses structured database defaults from DATABASE_URL", () => {
    process.env.DATABASE_URL = "postgresql://kite_user:p%40ss@db.example.com:6543/kite?schema=public";

    expect(getSetupDefaults()).toEqual({
      host: "db.example.com",
      port: "6543",
      username: "kite_user",
      password: "p@ss",
      database: "kite",
      appUrl: "http://localhost:3000",
    });
  });

  it("does not query _prisma_migrations when the table is missing", async () => {
    mocks.state.tables = new Set(["User"]);
    mocks.state.superAdminCount = 1;

    const status = await getSetupStatus();

    expect(status.databaseReachable).toBe(true);
    expect(status.migrationsApplied).toBe(false);
    expect(status.hasSuperAdmin).toBe(true);
    expect(status.initialized).toBe(false);
  });

  it("reports initialized only when migrations and superAdmin are both present", async () => {
    mocks.state.tables = new Set(["_prisma_migrations", "User"]);
    mocks.state.appliedMigrations = 999;
    mocks.state.superAdminCount = 1;

    const status = await getSetupStatus();

    expect(status.databaseReachable).toBe(true);
    expect(status.migrationsApplied).toBe(true);
    expect(status.hasSuperAdmin).toBe(true);
    expect(status.initialized).toBe(true);
  });

  it("keeps setup open when the database cannot be reached", async () => {
    mocks.state.queryFails = true;

    const status = await getSetupStatus();

    expect(status.initialized).toBe(false);
    expect(status.databaseReachable).toBe(false);
    expect(status.message).toBeTruthy();
  });
});
