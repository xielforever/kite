import { NextRequest, NextResponse } from "next/server";
import { issueStatuses, priorityLabels, statusLabels } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { requireSystemAdmin } from "@/lib/permissions";

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function csvRow(values: unknown[]) {
  return values.map(csvCell).join(",");
}

function formatDateTime(value?: Date | null) {
  return value ? value.toISOString() : "";
}

export async function GET(request: NextRequest) {
  await requireSystemAdmin();
  const workspaceSlug = request.nextUrl.searchParams.get("workspace")?.trim() || undefined;
  const projectKey = request.nextUrl.searchParams.get("project")?.trim() || undefined;
  const status = request.nextUrl.searchParams.get("status")?.trim() || undefined;
  const statusFilter = issueStatuses.includes(status as (typeof issueStatuses)[number])
    ? (status as (typeof issueStatuses)[number])
    : undefined;

  const issues = await prisma.issue.findMany({
    where: {
      ...(statusFilter ? { status: statusFilter } : {}),
      project: {
        ...(projectKey ? { key: projectKey } : {}),
        ...(workspaceSlug ? { workspace: { slug: workspaceSlug } } : {}),
      },
    },
    include: {
      project: { include: { workspace: true } },
      creator: { select: { name: true, email: true } },
      assignee: { select: { name: true, email: true } },
      comments: {
        include: { author: { select: { name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
      activities: {
        include: { actor: { select: { name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  issues.sort((a, b) => {
    const workspaceCompare = a.project.workspace.name.localeCompare(b.project.workspace.name, "zh-CN");
    if (workspaceCompare) return workspaceCompare;
    const projectCompare = a.project.key.localeCompare(b.project.key, "zh-CN");
    if (projectCompare) return projectCompare;
    return a.number - b.number;
  });

  const headers = [
    "工作区",
    "项目Key",
    "项目名称",
    "任务编号",
    "标题",
    "描述",
    "状态",
    "优先级",
    "创建人",
    "创建人邮箱",
    "负责人",
    "负责人邮箱",
    "截止日期",
    "创建时间",
    "更新时间",
    "评论",
    "活动记录",
  ];

  const rows = issues.map((issue) => {
    const comments = issue.comments
      .map((comment) => `${formatDateTime(comment.createdAt)} ${comment.author?.name ?? "已删除用户"}：${comment.body}`)
      .join("\n---\n");
    const activities = issue.activities
      .map((activity) => {
        const actor = activity.actor?.name ?? "已删除用户";
        const detail = activity.detail ? ` ${activity.detail}` : "";
        return `${formatDateTime(activity.createdAt)} ${actor} ${activity.action}${detail}`;
      })
      .join("\n---\n");

    return csvRow([
      issue.project.workspace.name,
      issue.project.key,
      issue.project.name,
      `${issue.project.key}-${issue.number}`,
      issue.title,
      issue.description,
      statusLabels[issue.status],
      priorityLabels[issue.priority],
      issue.creator.name,
      issue.creator.email,
      issue.assignee?.name,
      issue.assignee?.email,
      formatDateTime(issue.dueDate),
      formatDateTime(issue.createdAt),
      formatDateTime(issue.updatedAt),
      comments,
      activities,
    ]);
  });

  const csv = ["\uFEFF" + csvRow(headers), ...rows].join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="kite-issues-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
