import { prisma } from "@/lib/prisma";
import { requireProject } from "@/lib/permissions";
import { userPublicFields } from "@/lib/constants";
import { sanitizeIssueFilters } from "@/lib/validators";

export const PAGE_SIZE = 20;

export type IssueFilterInput = {
  q?: string;
  status?: string;
  priority?: string;
  assignee?: string;
  page?: number | string;
};

export async function getProjectPageData(workspaceSlug: string, projectKey: string, filters: IssueFilterInput = {}) {
  const context = await requireProject(workspaceSlug, projectKey);
  const normalizedFilters = sanitizeIssueFilters(filters);
  const page = normalizedFilters.page;
  const issueWhere = {
    projectId: context.project.id,
    ...(normalizedFilters.status ? { status: normalizedFilters.status } : {}),
    ...(normalizedFilters.priority ? { priority: normalizedFilters.priority } : {}),
    ...(normalizedFilters.assignee === "unassigned" ? { assigneeId: null } : {}),
    ...(normalizedFilters.assignee && normalizedFilters.assignee !== "unassigned" ? { assigneeId: normalizedFilters.assignee } : {}),
    ...(normalizedFilters.q
      ? {
          OR: [
            { title: { contains: normalizedFilters.q, mode: "insensitive" as const } },
            { description: { contains: normalizedFilters.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [members, issues, totalIssues] = await Promise.all([
    prisma.projectMember.findMany({
      where: { projectId: context.project.id },
      include: { user: { select: userPublicFields } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.issue.findMany({
      where: issueWhere,
      include: {
        assignee: { select: userPublicFields },
      },
      orderBy: [{ status: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.issue.count({ where: issueWhere }),
  ]);

  return { ...context, members, issues, totalIssues, page, pageSize: PAGE_SIZE };
}
