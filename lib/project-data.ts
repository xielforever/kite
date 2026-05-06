import { prisma } from "@/lib/prisma";
import { requireProject } from "@/lib/permissions";
import type { IssuePriorityValue, IssueStatusValue } from "@/lib/constants";

export const PAGE_SIZE = 20;

export type IssueFilterInput = {
  q?: string;
  status?: string;
  priority?: string;
  assignee?: string;
  page?: number;
};

export async function getProjectPageData(workspaceSlug: string, projectKey: string, filters: IssueFilterInput = {}) {
  const context = await requireProject(workspaceSlug, projectKey);
  const page = Math.max(1, filters.page ?? 1);
  const issueWhere = {
    projectId: context.project.id,
    ...(filters.status ? { status: filters.status as IssueStatusValue } : {}),
    ...(filters.priority ? { priority: filters.priority as IssuePriorityValue } : {}),
    ...(filters.assignee === "unassigned" ? { assigneeId: null } : {}),
    ...(filters.assignee && filters.assignee !== "unassigned" ? { assigneeId: filters.assignee } : {}),
    ...(filters.q
      ? {
          OR: [
            { title: { contains: filters.q, mode: "insensitive" as const } },
            { description: { contains: filters.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [members, issues, totalIssues] = await Promise.all([
    prisma.projectMember.findMany({
      where: { projectId: context.project.id },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.issue.findMany({
      where: issueWhere,
      include: {
        assignee: true,
      },
      orderBy: [{ status: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.issue.count({ where: issueWhere }),
  ]);

  return { ...context, members, issues, totalIssues, page, pageSize: PAGE_SIZE };
}
