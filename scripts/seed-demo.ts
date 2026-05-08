import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_WORKSPACE_SLUG = "kite-demo";
const DEMO_PASSWORD = "plane";

type SystemRoleValue = "SUPER_ADMIN" | "USER";

const demoUsers: {
  key: "owner" | "admin" | "lead" | "member" | "viewer" | "outsider";
  email: string;
  name: string;
  systemRole?: SystemRoleValue;
}[] = [
  { key: "owner", email: "owner@example.com", name: "张无忌", systemRole: "SUPER_ADMIN" },
  { key: "admin", email: "pm-admin@example.com", name: "赵敏" },
  { key: "lead", email: "lead@example.com", name: "周芷若" },
  { key: "member", email: "member@example.com", name: "殷离" },
  { key: "viewer", email: "viewer@example.com", name: "小昭" },
  { key: "outsider", email: "outsider@example.com", name: "宋青书" },
] as const;

type UserKey = (typeof demoUsers)[number]["key"];
type WorkspaceRoleValue = "OWNER" | "ADMIN" | "MEMBER";
type ProjectRoleValue = "LEAD" | "MEMBER" | "VIEWER";
type IssueStatusValue = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | "CLOSED";
type IssuePriorityValue = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

type DemoIssue = {
  title: string;
  description: string;
  status: IssueStatusValue;
  priority: IssuePriorityValue;
  assigneeKey?: UserKey;
  dueInDays?: number;
  sortOrder: number;
  comments?: { authorKey: UserKey; body: string }[];
};

type DemoProject = {
  key: string;
  name: string;
  description: string;
  archived?: boolean;
  members: Partial<Record<UserKey, ProjectRoleValue>>;
  issues: DemoIssue[];
};

const workspaceMembers: { key: UserKey; role: WorkspaceRoleValue }[] = [
  { key: "owner", role: "OWNER" },
  { key: "admin", role: "ADMIN" },
  { key: "lead", role: "MEMBER" },
  { key: "member", role: "MEMBER" },
  { key: "viewer", role: "MEMBER" },
];

const projectSeeds: DemoProject[] = [
  {
    key: "PLAT",
    name: "平台改造",
    description: "用于验证项目级权限、看板拖拽、列表筛选和评论。",
    members: {
      owner: "LEAD",
      admin: "LEAD",
      lead: "LEAD",
      member: "MEMBER",
      viewer: "VIEWER",
    },
    issues: [
      {
        title: "完善项目级权限矩阵",
        description: "验证 LEAD、MEMBER、VIEWER 在项目页面、任务编辑和成员管理中的权限边界。",
        status: "IN_PROGRESS",
        priority: "HIGH",
        assigneeKey: "lead",
        dueInDays: 3,
        sortOrder: 1000,
        comments: [
          { authorKey: "owner", body: "优先覆盖项目成员增删改和只读角色限制。" },
          { authorKey: "lead", body: "已补充主要路径，接下来验证异常提示。" },
        ],
      },
      {
        title: "看板拖拽后保持排序",
        description: "同列拖拽和跨列拖拽后，需要刷新页面确认排序仍然一致。",
        status: "TODO",
        priority: "HIGH",
        assigneeKey: "member",
        dueInDays: 5,
        sortOrder: 1000,
      },
      {
        title: "列表筛选支持负责人和状态",
        description: "验证任务列表、看板视图共享同一套过滤条件。",
        status: "TODO",
        priority: "MEDIUM",
        assigneeKey: "member",
        dueInDays: 8,
        sortOrder: 2000,
      },
      {
        title: "确认只读角色禁止编辑",
        description: "viewer@example.com 可以查看 PLAT，但不能创建、编辑、拖拽任务。",
        status: "REVIEW",
        priority: "MEDIUM",
        assigneeKey: "viewer",
        dueInDays: -2,
        sortOrder: 1000,
      },
      {
        title: "补齐 README 部署检查项",
        description: "确认裸机 Node 部署步骤包含环境变量、迁移、构建和启动命令。",
        status: "DONE",
        priority: "LOW",
        assigneeKey: "lead",
        dueInDays: -1,
        sortOrder: 2000,
      },
    ],
  },
  {
    key: "OPS",
    name: "运维看板",
    description: "用于验证工作区成员只能看到自己加入的项目。",
    members: {
      owner: "LEAD",
      admin: "LEAD",
      member: "LEAD",
      viewer: "VIEWER",
    },
    issues: [
      {
        title: "巡检生产部署脚本",
        description: "按 README 在新机器上走一遍 migrate、build、start。",
        status: "IN_PROGRESS",
        priority: "HIGH",
        assigneeKey: "member",
        dueInDays: 2,
        sortOrder: 1000,
        comments: [{ authorKey: "member", body: "已完成环境变量检查，待验证服务重启。" }],
      },
      {
        title: "数据库备份演练",
        description: "验证备份、恢复和误删数据后的恢复步骤。",
        status: "TODO",
        priority: "URGENT",
        assigneeKey: "member",
        dueInDays: 1,
        sortOrder: 1000,
      },
      {
        title: "整理服务器访问清单",
        description: "补齐账号归属、权限范围和到期时间。",
        status: "CLOSED",
        priority: "MEDIUM",
        assigneeKey: "viewer",
        dueInDays: -4,
        sortOrder: 1000,
      },
    ],
  },
  {
    key: "MKT",
    name: "市场活动",
    description: "用于验证普通工作区成员没有项目成员身份时不可见。",
    members: {
      owner: "LEAD",
      admin: "LEAD",
    },
    issues: [
      {
        title: "准备内部试用反馈表",
        description: "收集试用团队对工作区、项目权限、任务流转的反馈。",
        status: "TODO",
        priority: "MEDIUM",
        assigneeKey: "admin",
        dueInDays: 10,
        sortOrder: 1000,
      },
      {
        title: "梳理发布公告文案",
        description: "整理 Kite MVP 的主要能力和使用注意事项。",
        status: "IN_PROGRESS",
        priority: "LOW",
        assigneeKey: "owner",
        dueInDays: 6,
        sortOrder: 1000,
      },
    ],
  },
  {
    key: "ARCH",
    name: "历史归档",
    description: "用于验证归档项目列表、恢复和删除流程。",
    archived: true,
    members: {
      owner: "LEAD",
      admin: "LEAD",
      lead: "MEMBER",
    },
    issues: [
      {
        title: "历史需求归档确认",
        description: "归档项目默认不出现在活跃项目列表。",
        status: "REVIEW",
        priority: "LOW",
        assigneeKey: "lead",
        dueInDays: -12,
        sortOrder: 1000,
      },
    ],
  },
];

function dueDate(daysFromNow?: number) {
  if (daysFromNow === undefined) return null;
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(18, 0, 0, 0);
  return date;
}

function activityDate(projectIndex: number, issueNumber: number, step: number) {
  const date = new Date();
  date.setDate(date.getDate() - (projectIndex * 4 + issueNumber));
  date.setHours(9, step * 11, step * 7, 0);
  return date;
}

function lifecycleActivities(issueSeed: DemoIssue, projectKey: string, issueNumber: number, projectIndex: number, users: Record<UserKey, { id: string; name: string }>) {
  const actorKey = issueSeed.assigneeKey ?? "owner";
  const activities: { actorKey: UserKey; action: string; detail?: string; createdAt: Date }[] = [
    {
      actorKey: "owner",
      action: "创建任务",
      detail: `${projectKey}-${issueNumber}`,
      createdAt: activityDate(projectIndex, issueNumber, 0),
    },
  ];

  let step = 1;
  if (issueSeed.assigneeKey) {
    activities.push({
      actorKey: "owner",
      action: "分配负责人",
      detail: users[issueSeed.assigneeKey].name,
      createdAt: activityDate(projectIndex, issueNumber, step),
    });
    step += 1;
  }

  if (["IN_PROGRESS", "REVIEW", "DONE", "CLOSED"].includes(issueSeed.status)) {
    activities.push({
      actorKey,
      action: "移动任务",
      detail: "进行中",
      createdAt: activityDate(projectIndex, issueNumber, step),
    });
    step += 1;
  }

  if (["REVIEW", "DONE"].includes(issueSeed.status)) {
    activities.push({
      actorKey,
      action: "提交评审",
      detail: "待评审",
      createdAt: activityDate(projectIndex, issueNumber, step),
    });
    step += 1;
  }

  if (issueSeed.status === "DONE") {
    activities.push({
      actorKey: "owner",
      action: "完成任务",
      detail: "已完成",
      createdAt: activityDate(projectIndex, issueNumber, step),
    });
  }

  if (issueSeed.status === "CLOSED") {
    activities.push({
      actorKey: "owner",
      action: "关闭任务",
      detail: "已关闭",
      createdAt: activityDate(projectIndex, issueNumber, step),
    });
  }

  return activities;
}

async function main() {
  const passwordHash = await hash(DEMO_PASSWORD, 12);

  const result = await prisma.$transaction(async (tx) => {
    await tx.workspace.deleteMany({ where: { slug: DEMO_WORKSPACE_SLUG } });

    const users = {} as Record<UserKey, { id: string; email: string; name: string }>;
    for (const demoUser of demoUsers) {
      users[demoUser.key] = await tx.user.upsert({
        where: { email: demoUser.email },
        update: {
          name: demoUser.name,
          passwordHash,
          systemRole: demoUser.systemRole ?? "USER",
          mustChangePassword: false,
        },
        create: {
          email: demoUser.email,
          name: demoUser.name,
          passwordHash,
          systemRole: demoUser.systemRole ?? "USER",
          mustChangePassword: false,
        },
      });
    }

    const workspace = await tx.workspace.create({
      data: {
        name: "Kite Demo 工作区",
        slug: DEMO_WORKSPACE_SLUG,
        createdById: users.owner.id,
      },
    });

    await tx.workspaceMember.createMany({
      data: workspaceMembers.map((member) => ({
        workspaceId: workspace.id,
        userId: users[member.key].id,
        role: member.role,
      })),
    });

    let issueCount = 0;
    let commentCount = 0;
    let activityCount = 0;

    for (const [projectIndex, projectSeed] of projectSeeds.entries()) {
      const project = await tx.project.create({
        data: {
          workspaceId: workspace.id,
          key: projectSeed.key,
          name: projectSeed.name,
          description: projectSeed.description,
          archived: projectSeed.archived ?? false,
          nextIssueNumber: projectSeed.issues.length + 1,
        },
      });

      await tx.projectMember.createMany({
        data: Object.entries(projectSeed.members).map(([userKey, role]) => ({
          projectId: project.id,
          userId: users[userKey as UserKey].id,
          role: role as ProjectRoleValue,
        })),
      });

      for (const [index, issueSeed] of projectSeed.issues.entries()) {
        const issueNumber = index + 1;
        const issue = await tx.issue.create({
          data: {
            projectId: project.id,
            number: issueNumber,
            title: issueSeed.title,
            description: issueSeed.description,
            status: issueSeed.status,
            priority: issueSeed.priority,
            creatorId: users.owner.id,
            assigneeId: issueSeed.assigneeKey ? users[issueSeed.assigneeKey].id : null,
            dueDate: dueDate(issueSeed.dueInDays),
            sortOrder: issueSeed.sortOrder,
          },
        });

        const activitySeeds = lifecycleActivities(issueSeed, project.key, issueNumber, projectIndex, users);
        await tx.issueActivity.createMany({
          data: activitySeeds.map((activity) => ({
            issueId: issue.id,
            actorId: users[activity.actorKey].id,
            action: activity.action,
            detail: activity.detail,
            createdAt: activity.createdAt,
          })),
        });
        activityCount += activitySeeds.length;

        if (issueSeed.comments?.length) {
          await tx.issueComment.createMany({
            data: issueSeed.comments.map((comment, commentIndex) => ({
              issueId: issue.id,
              authorId: users[comment.authorKey].id,
              body: comment.body,
              createdAt: activityDate(projectIndex, issueNumber, activitySeeds.length + commentIndex),
            })),
          });
          await tx.issueActivity.createMany({
            data: issueSeed.comments.map((comment, commentIndex) => ({
              issueId: issue.id,
              actorId: users[comment.authorKey].id,
              action: "添加评论",
              createdAt: activityDate(projectIndex, issueNumber, activitySeeds.length + commentIndex),
            })),
          });
          commentCount += issueSeed.comments.length;
          activityCount += issueSeed.comments.length;
        }

        issueCount += 1;
      }
    }

    return {
      workspaceSlug: workspace.slug,
      userCount: demoUsers.length,
      workspaceMemberCount: workspaceMembers.length,
      projectCount: projectSeeds.length,
      issueCount,
      commentCount,
      activityCount,
    };
  });

  console.log("Kite demo seed complete.");
  console.log(`Workspace: ${result.workspaceSlug}`);
  console.log(`Created/updated users: ${result.userCount}`);
  console.log(`Workspace members: ${result.workspaceMemberCount}`);
  console.log(`Projects: ${result.projectCount}`);
  console.log(`Issues: ${result.issueCount}`);
  console.log(`Comments: ${result.commentCount}`);
  console.log(`Activities: ${result.activityCount}`);
  console.log("");
  console.log("Login accounts (password: plane):");
  console.log("- owner@example.com      张无忌, workspace OWNER, can see/manage all projects");
  console.log("- pm-admin@example.com   赵敏, workspace ADMIN, can see/manage all projects");
  console.log("- lead@example.com       周芷若, workspace MEMBER, PLAT LEAD, ARCH MEMBER");
  console.log("- member@example.com     殷离, workspace MEMBER, PLAT MEMBER, OPS LEAD");
  console.log("- viewer@example.com     小昭, workspace MEMBER, PLAT/OPS VIEWER");
  console.log("- outsider@example.com   宋青书, no workspace membership");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
