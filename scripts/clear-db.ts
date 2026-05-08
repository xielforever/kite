import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function assertDevelopmentDatabase() {
  if (process.env.ALLOW_CLEAR_DB === "true") return;

  const databaseUrl = process.env.DATABASE_URL ?? "";
  const isLocal =
    databaseUrl.includes("localhost") ||
    databaseUrl.includes("127.0.0.1") ||
    databaseUrl.includes("@postgres:") ||
    databaseUrl.includes("@db:");

  if (process.env.NODE_ENV === "production" || !isLocal) {
    throw new Error("Refusing to clear a non-local database. Set ALLOW_CLEAR_DB=true only if you are sure.");
  }
}

async function main() {
  assertDevelopmentDatabase();

  await prisma.$transaction([
    prisma.session.deleteMany(),
    prisma.account.deleteMany(),
    prisma.verificationToken.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.issueActivity.deleteMany(),
    prisma.issueComment.deleteMany(),
    prisma.issue.deleteMany(),
    prisma.projectMember.deleteMany(),
    prisma.project.deleteMany(),
    prisma.workspace.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  console.log("Database business data cleared.");
  console.log("Schema and Prisma migration history were kept.");
  console.log("Visit /setup to initialize again.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
