import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hash("plane", 12);
  const user = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: { name: "Demo User", passwordHash, systemRole: "SUPER_ADMIN", mustChangePassword: false },
    create: { email: "demo@example.com", name: "Demo User", passwordHash, systemRole: "SUPER_ADMIN", mustChangePassword: false },
  });

  const workspace = await prisma.workspace.upsert({
    where: { slug: "demo" },
    update: { name: "Demo 工作区" },
    create: { name: "Demo 工作区", slug: "demo", createdById: user.id },
  });

  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
    update: { role: "OWNER" },
    create: { workspaceId: workspace.id, userId: user.id, role: "OWNER" },
  });

  const project = await prisma.project.upsert({
    where: { workspaceId_key: { workspaceId: workspace.id, key: "DEMO" } },
    update: { name: "Demo 项目", description: "用于快速体验 Kite", archived: false },
    create: {
      workspaceId: workspace.id,
      key: "DEMO",
      name: "Demo 项目",
      description: "用于快速体验 Kite",
      nextIssueNumber: 4,
    },
  });

  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId: project.id, userId: user.id } },
    update: { role: "LEAD" },
    create: { projectId: project.id, userId: user.id, role: "LEAD" },
  });

  const label = await prisma.label.upsert({
    where: { name: "前端" },
    update: { color: "#2563eb" },
    create: { name: "前端", color: "#2563eb" },
  });

  for (const issue of [
    { number: 1, title: "完善任务列表", status: "TODO" as const },
    { number: 2, title: "优化看板拖拽", status: "IN_PROGRESS" as const },
    { number: 3, title: "发布内部试用", status: "DONE" as const },
  ]) {
    const created = await prisma.issue.upsert({
      where: { projectId_number: { projectId: project.id, number: issue.number } },
      update: { title: issue.title, status: issue.status },
      create: {
        projectId: project.id,
        number: issue.number,
        title: issue.title,
        status: issue.status,
        priority: "MEDIUM",
        creatorId: user.id,
        assigneeId: user.id,
        sortOrder: issue.number * 1000,
      },
    });

    await prisma.issueLabel.upsert({
      where: { issueId_labelId: { issueId: created.id, labelId: label.id } },
      update: {},
      create: { issueId: created.id, labelId: label.id },
    });
  }

  console.log("Seed complete: demo@example.com / plane");
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
