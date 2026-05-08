import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hash("plane", 12);
  const user = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: { name: "张无忌", passwordHash, systemRole: "SUPER_ADMIN", mustChangePassword: false },
    create: { email: "demo@example.com", name: "张无忌", passwordHash, systemRole: "SUPER_ADMIN", mustChangePassword: false },
  });

  const workspace = await prisma.workspace.upsert({
    where: { slug: "demo" },
    update: { name: "光明顶工作区" },
    create: { name: "光明顶工作区", slug: "demo", createdById: user.id },
  });

  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
    update: { role: "OWNER" },
    create: { workspaceId: workspace.id, userId: user.id, role: "OWNER" },
  });

  const project = await prisma.project.upsert({
    where: { workspaceId_key: { workspaceId: workspace.id, key: "DEMO" } },
    update: { name: "明教总坛", description: "用于快速体验 Kite 的任务流转、看板和成员协作。", archived: false },
    create: {
      workspaceId: workspace.id,
      key: "DEMO",
      name: "明教总坛",
      description: "用于快速体验 Kite 的任务流转、看板和成员协作。",
      nextIssueNumber: 4,
    },
  });

  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId: project.id, userId: user.id } },
    update: { role: "LEAD" },
    create: { projectId: project.id, userId: user.id, role: "LEAD" },
  });

  for (const issue of [
    { number: 1, title: "整理光明顶议事清单", status: "TODO" as const },
    { number: 2, title: "确认六大门派来访安排", status: "IN_PROGRESS" as const },
    { number: 3, title: "发布总坛值守轮班表", status: "REVIEW" as const },
  ]) {
    const savedIssue = await prisma.issue.upsert({
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

    await prisma.issueActivity.deleteMany({ where: { issueId: savedIssue.id } });
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - issue.number);
    createdAt.setHours(9, 0, 0, 0);
    const activities = [
      { action: "创建任务", detail: `DEMO-${issue.number}`, createdAt },
    ];
    if (issue.status === "IN_PROGRESS" || issue.status === "REVIEW") {
      const startedAt = new Date(createdAt);
      startedAt.setMinutes(12, 7, 0);
      activities.push({ action: "移动任务", detail: "进行中", createdAt: startedAt });
    }
    if (issue.status === "REVIEW") {
      const reviewedAt = new Date(createdAt);
      reviewedAt.setMinutes(24, 14, 0);
      activities.push({ action: "提交评审", detail: "待评审", createdAt: reviewedAt });
    }
    await prisma.issueActivity.createMany({
      data: activities.map((activity) => ({
        issueId: savedIssue.id,
        actorId: user.id,
        ...activity,
      })),
    });
  }

  console.log("Seed complete: demo@example.com / plane (张无忌)");
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
