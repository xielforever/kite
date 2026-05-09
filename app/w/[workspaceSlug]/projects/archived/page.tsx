import Link from "next/link";
import { Archive, ArchiveRestore, ArrowLeft, CalendarClock, FolderKanban, Trash2, Users } from "lucide-react";
import { deleteProjectAction, restoreProjectAction } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/permissions";
import { canAccessAllWorkspaces, canManageProject } from "@/lib/role-rules";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { formatDateTime } from "@/lib/utils";

export default async function ArchivedProjectsPage({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params;
  const { user, workspace } = await requireWorkspace(workspaceSlug);
  const isSystemAdmin = canAccessAllWorkspaces(user.systemRole);
  const projects = await prisma.project.findMany({
    where: {
      workspaceId: workspace.id,
      archived: true,
      ...(isSystemAdmin ? {} : { members: { some: { userId: user.id, role: "LEAD" } } }),
    },
    include: {
      members: true,
      _count: { select: { issues: true, members: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  const projectIds = projects.map((project) => project.id);
  const issueCounts = projectIds.length
    ? Object.fromEntries(
        (await prisma.issue.groupBy({
          by: ["projectId", "status"],
          where: { projectId: { in: projectIds } },
          _count: true,
        })).map((row) => [`${row.projectId}:${row.status}`, row._count]),
      )
    : ({} as Record<string, number>);
  const canManageArchivedProject = (project: (typeof projects)[number]) => {
    const projectMembership = project.members.find((member) => member.userId === user.id);
    return isSystemAdmin || canManageProject(projectMembership?.role);
  };
  const totalIssueCount = projects.reduce((sum, project) => sum + project._count.issues, 0);
  const totalMemberCount = new Set(projects.flatMap((project) => project.members.map((member) => member.userId))).size;
  const restorableProjectCount = projects.filter(canManageArchivedProject).length;

  return (
    <AppShell title="归档项目" subtitle={workspace.name} workspaceSlug={workspaceSlug}>
      <section className="mb-6 rounded-lg border bg-card">
        <div className="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Archive className="h-4 w-4" />
              历史项目
            </div>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              当前归档 {projects.length} 个项目，包含 {totalIssueCount} 项任务、{totalMemberCount} 名历史成员。
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={`/w/${workspaceSlug}/projects`}>
              <ArrowLeft className="h-4 w-4" />
              返回项目
            </Link>
          </Button>
        </div>
        <div className="grid gap-px bg-border md:grid-cols-4">
          <div className="bg-card p-4">
            <p className="text-xs text-muted-foreground">归档项目</p>
            <p className="mt-1 text-2xl font-semibold">{projects.length}</p>
          </div>
          <div className="bg-card p-4">
            <p className="text-xs text-muted-foreground">历史任务</p>
            <p className="mt-1 text-2xl font-semibold">{totalIssueCount}</p>
          </div>
          <div className="bg-card p-4">
            <p className="text-xs text-muted-foreground">历史成员</p>
            <p className="mt-1 text-2xl font-semibold">{totalMemberCount}</p>
          </div>
          <div className="bg-card p-4">
            <p className="text-xs text-muted-foreground">可恢复项目</p>
            <p className="mt-1 text-2xl font-semibold">{restorableProjectCount}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {projects.map((project) => {
          const canManage = canManageArchivedProject(project);
          const openIssueCount =
            (issueCounts[`${project.id}:TODO`] ?? 0) +
            (issueCounts[`${project.id}:IN_PROGRESS`] ?? 0) +
            (issueCounts[`${project.id}:REVIEW`] ?? 0);
          const doneIssueCount = issueCounts[`${project.id}:DONE`] ?? 0;
          const closedIssueCount = issueCounts[`${project.id}:CLOSED`] ?? 0;
          return (
            <Card key={project.id}>
              <CardHeader className="border-b">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="truncate">{project.name}</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">最后更新：{formatDateTime(project.updatedAt)}</p>
                  </div>
                  <Badge>{project.key}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-5">
                <p className="line-clamp-2 text-sm text-muted-foreground">{project.description || "暂无描述"}</p>
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <div className="rounded-md border bg-background px-3 py-2">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <FolderKanban className="h-4 w-4" />
                      任务
                    </div>
                    <div className="mt-1 font-semibold">{project._count.issues}</div>
                  </div>
                  <div className="rounded-md border bg-background px-3 py-2">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      成员
                    </div>
                    <div className="mt-1 font-semibold">{project._count.members}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge>流转中 {openIssueCount}</Badge>
                  <Badge>已完成 {doneIssueCount}</Badge>
                  <Badge>已关闭 {closedIssueCount}</Badge>
                  <Badge className={project.defaultDueDays ? "" : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"}>
                    <CalendarClock className="mr-1 h-3 w-3" />
                    默认截止 {project.defaultDueDays ? `${project.defaultDueDays} 天` : "未设置"}
                  </Badge>
                </div>
                {canManage ? (
                  <div className="flex flex-wrap gap-2 border-t pt-4">
                    <form
                      action={async () => {
                        "use server";
                        await restoreProjectAction(workspaceSlug, project.id);
                      }}
                    >
                      <ConfirmSubmitButton size="sm" message="确定恢复这个项目？">
                        <ArchiveRestore className="h-4 w-4" />
                        恢复
                      </ConfirmSubmitButton>
                    </form>
                    <form
                      action={async () => {
                        "use server";
                        await deleteProjectAction(workspaceSlug, project.id);
                      }}
                    >
                      <ConfirmSubmitButton size="sm" variant="destructive" message="确定永久删除这个归档项目？相关任务和评论都会删除。">
                        <Trash2 className="h-4 w-4" />
                        永久删除
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
        {!projects.length ? (
          <Card className="md:col-span-2">
            <CardContent className="p-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Archive className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-lg font-semibold">暂无归档项目</h2>
              <p className="mt-2 text-sm text-muted-foreground">当前工作区没有已归档的项目。</p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
