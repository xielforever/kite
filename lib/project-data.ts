import { prisma } from "@/lib/prisma";
import { requireProject } from "@/lib/permissions";
import type { IssuePriorityValue, IssueStatusValue } from "@/lib/constants";

export type IssueFilterInput = {
  q?: string;
  status?: string;
  priority?: string;
  assignee?: string;
  label?: string;
};

export async function getProjectPageData(workspaceSlug: string, projectKey: string, filters: IssueFilterInput = {}) {
  const context = await requireProject(workspaceSlug, projectKey);
  const issueWhere = {
    projectId: context.project.id,
    ...(filters.status ? { status: filters.status as IssueStatusValue } : {}),
    ...(filters.priority ? { priority: filters.priority as IssuePriorityValue } : {}),
    ...(filters.assignee === "unassigned" ? { assigneeId: null } : {}),
    ...(filters.assignee && filters.assignee !== "unassigned" ? { assigneeId: filters.assignee } : {}),
    ...(filters.label ? { labels: { some: { labelId: filters.label } } } : {}),
    ...(filters.q
      ? {
          OR: [
            { title: { contains: filters.q, mode: "insensitive" as const } },
            { description: { contains: filters.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [members, labels, issues] = await Promise.all([
    prisma.projectMember.findMany({
      where: { projectId: context.project.id },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.label.findMany({
      orderBy: { name: "asc" },
    }),
    prisma.issue.findMany({
      where: issueWhere,
      include: {
        assignee: true,
        labels: { include: { label: true } },
      },
      orderBy: [{ status: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  return { ...context, members, labels, issues };
}
