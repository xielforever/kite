import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.$transaction([
    prisma.session.deleteMany(),
    prisma.account.deleteMany(),
    prisma.verificationToken.deleteMany(),
    prisma.issueActivity.deleteMany(),
    prisma.issueComment.deleteMany(),
    prisma.issue.deleteMany(),
    prisma.projectMember.deleteMany(),
    prisma.project.deleteMany(),
    prisma.workspaceInvitation.deleteMany(),
    prisma.workspaceMember.deleteMany(),
    prisma.workspace.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const passwordHash = await hash("plane", 12);
  const admin = await prisma.user.create({
    data: {
      email: "admin@example.com",
      name: "Super Admin",
      passwordHash,
      systemRole: "SUPER_ADMIN",
      mustChangePassword: true,
    },
  });
  const workspace = await prisma.workspace.create({
    data: {
      name: "默认工作区",
      slug: "default",
      createdById: admin.id,
    },
  });
  await prisma.workspaceMember.create({
    data: {
      workspaceId: workspace.id,
      userId: admin.id,
      role: "OWNER",
    },
  });

  console.log("Database reset complete.");
  console.log("Default admin: admin@example.com / plane");
  console.log("System role: SUPER_ADMIN");
  console.log("First login must change password.");
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
