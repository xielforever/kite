import Link from "next/link";
import { Archive, CalendarClock, KanbanSquare, LayoutList, ListTodo, UserPlus } from "lucide-react";
import { archiveProjectAction } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/permissions";
import { canAccessAllWorkspaces, canManageProject } from "@/lib/role-rules";
import { AppShell } from "@/components/app-shell";
import { CreateProjectDialog, ProjectSettingsDialog } from "@/components/project-dialogs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { projectRoleLabels, userPublicFields } from "@/lib/constants";

function memberInitial(name?: string | null, email?: string | null) {
  return (name?.trim() || email?.trim() || "U").slice(0, 1).toUpperCase();
}

function percent(done: number, total: number) {
  if (!total) return 0;
  return Math.round((done / total) * 100);
}

export default async function ProjectsPage({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params;
  const { user, workspace } = await requireWorkspace(workspaceSlug);
  const isSystemAdmin = canAccessAllWorkspaces(user.systemRole);
  const projects = await prisma.project.findMany({
    where: {
      workspaceId: workspace.id,
      archived: false,
      ...(isSystemAdmin ? {} : { members: { some: { userId: user.id } } }),
    },
    include: {
      _count: {
        select: {
          issues: true,
        },
      },
      members: {
        include: { user: { select: userPublicFields } },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  const canCreateProject = isSystemAdmin;
  const projectIds = projects.map((p) => p.id);
  const issueCounts = projectIds.length
    ? Object.fromEntries(
        (await prisma.issue.groupBy({
          by: ["projectId", "status"],
          where: { projectId: { in: projectIds } },
          _count: true,
        })).map((r) => [`${r.projectId}:${r.status}`, r._count]),
      )
    : ({} as Record<string, number>);
  const totalIssues = projects.reduce((sum, p) => sum + (p._count.issues ?? 0), 0);
  const reviewIssues = projects.reduce((sum, p) => sum + (issueCounts[`${p.id}:REVIEW`] ?? 0), 0);
  const doneIssues = projects.reduce((sum, p) => sum + (issueCounts[`${p.id}:DONE`] ?? 0), 0);
  const closedIssues = projects.reduce((sum, p) => sum + (issueCounts[`${p.id}:CLOSED`] ?? 0), 0);
  const openIssues = totalIssues - doneIssues - closedIssues;
  const uniqueMembers = new Set(projects.flatMap((project) => project.members.map((member) => member.userId))).size;

  return (
    <AppShell title="项目" subtitle={`${workspace.name} · ${isSystemAdmin ? "系统管理视图" : "项目成员视图"}`} workspaceSlug={workspaceSlug}>
      <section className="mb-6 rounded-lg border bg-card">
        <div className="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <KanbanSquare className="h-4 w-4" />
              项目台账
            </div>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              用于快速判断项目规模、任务完成度和负责人范围。进入看板处理流转，进入列表做筛选和批量浏览。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/w/${workspaceSlug}/projects/archived`}>
                <Archive className="h-4 w-4" />
                归档项目
              </Link>
            </Button>
            {canCreateProject ? <CreateProjectDialog workspaceSlug={workspaceSlug} /> : null}
          </div>
        </div>
        <div className="grid gap-px bg-border md:grid-cols-4">
          <div className="bg-card p-4">
            <p className="text-xs text-muted-foreground">活跃项目</p>
            <p className="mt-1 text-2xl font-semibold">{projects.length}</p>
          </div>
          <div className="bg-card p-4">
            <p className="text-xs text-muted-foreground">流转中任务</p>
            <p className="mt-1 text-2xl font-semibold">{openIssues}</p>
          </div>
          <div className="bg-card p-4">
            <p className="text-xs text-muted-foreground">涉及成员</p>
            <p className="mt-1 text-2xl font-semibold">{uniqueMembers}</p>
          </div>
          <div className="bg-card p-4">
            <p className="text-xs text-muted-foreground">待评审 / 已关闭</p>
            <p className="mt-1 text-2xl font-semibold">{reviewIssues} / {closedIssues}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6">
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">项目列表</h2>
              <p className="text-sm text-muted-foreground">{projects.length ? `共 ${projects.length} 个活跃项目` : "暂无活跃项目"}</p>
            </div>
          </div>

          {projects.length ? (
            projects.map((project) => {
              const projectMembership = project.members.find((member) => member.userId === user.id);
              const canManage = isSystemAdmin || canManageProject(projectMembership?.role);
              const todoCount = issueCounts[`${project.id}:TODO`] ?? 0;
              const inProgressCount = issueCounts[`${project.id}:IN_PROGRESS`] ?? 0;
              const reviewCount = issueCounts[`${project.id}:REVIEW`] ?? 0;
              const doneCount = issueCounts[`${project.id}:DONE`] ?? 0;
              const closedCount = issueCounts[`${project.id}:CLOSED`] ?? 0;
              const projectTotal = project._count.issues ?? 0;
              const projectCompletion = percent(doneCount, projectTotal);
              const visibleMembers = project.members.slice(0, 4);
              const roleText = isSystemAdmin ? "系统管理" : projectMembership?.role ? projectRoleLabels[projectMembership.role] : "未加入";

              return (
                <article key={project.id} className="rounded-lg border bg-card p-4 shadow-sm transition hover:border-primary/50 hover:shadow-md">
                  <div className="flex flex-col gap-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="flex min-w-0 gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border bg-background text-sm font-semibold text-primary">
                          {project.key}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-base font-semibold">{project.name}</h3>
                            <Badge className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">活跃</Badge>
                            <Badge>{roleText}</Badge>
                            {canManage ? <Badge className="border-primary/30 bg-primary/5 text-primary">可管理</Badge> : null}
                          </div>
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{project.description || "暂无描述"}</p>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1">
                              <CalendarClock className="h-3.5 w-3.5" />
                              默认截止：{project.defaultDueDays ? `${project.defaultDueDays} 天` : "未设置"}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1">
                              <UserPlus className="h-3.5 w-3.5" />
                              自动加入：{project.autoJoin ? "开启" : "关闭"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Button asChild size="sm">
                          <Link href={`/w/${workspaceSlug}/projects/${project.key}/board`}>
                            <KanbanSquare className="h-4 w-4" />
                            看板
                          </Link>
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/w/${workspaceSlug}/projects/${project.key}/issues`}>
                            <LayoutList className="h-4 w-4" />
                            列表
                          </Link>
                        </Button>
                        {canManage ? (
                          <ProjectSettingsDialog workspaceSlug={workspaceSlug} project={project} />
                        ) : null}
                        {canManage ? (
                          <form
                            action={async () => {
                              "use server";
                              await archiveProjectAction(workspaceSlug, project.key);
                            }}
                          >
                            <ConfirmSubmitButton size="sm" variant="ghost" message="确定归档这个项目？归档后可在归档页恢复。">
                              <Archive className="h-4 w-4" />
                              归档
                            </ConfirmSubmitButton>
                          </form>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                      <div className="rounded-md border bg-background p-3">
                        <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                          <span className="font-medium">完成进度</span>
                          <span className="text-muted-foreground">{projectCompletion}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${projectCompletion}%` }} />
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
                          <div className="rounded-md border bg-card px-2 py-1.5">
                            <div className="text-muted-foreground">待处理</div>
                            <div className="mt-0.5 font-semibold">{todoCount}</div>
                          </div>
                          <div className="rounded-md border bg-card px-2 py-1.5">
                            <div className="text-muted-foreground">进行中</div>
                            <div className="mt-0.5 font-semibold">{inProgressCount}</div>
                          </div>
                          <div className="rounded-md border bg-card px-2 py-1.5">
                            <div className="text-muted-foreground">待评审</div>
                            <div className="mt-0.5 font-semibold">{reviewCount}</div>
                          </div>
                          <div className="rounded-md border bg-card px-2 py-1.5">
                            <div className="text-muted-foreground">已完成</div>
                            <div className="mt-0.5 font-semibold">{doneCount}</div>
                          </div>
                          <div className="rounded-md border bg-card px-2 py-1.5">
                            <div className="text-muted-foreground">已关闭</div>
                            <div className="mt-0.5 font-semibold">{closedCount}</div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-md border bg-background p-3">
                        <div className="mb-3 flex items-center justify-between text-sm">
                          <span className="font-medium">项目成员</span>
                          <span className="text-muted-foreground">{project.members.length}</span>
                        </div>
                        <div className="flex -space-x-2">
                          {visibleMembers.map((member) => (
                            <span
                              key={member.id}
                              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-primary text-xs font-semibold text-primary-foreground"
                              title={`${member.user.name} ${member.user.email}`}
                            >
                              {memberInitial(member.user.name, member.user.email)}
                            </span>
                          ))}
                          {project.members.length > visibleMembers.length ? (
                            <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium text-muted-foreground">
                              +{project.members.length - visibleMembers.length}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-lg border border-dashed bg-card p-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
                <ListTodo className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-lg font-semibold">还没有项目</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                {canCreateProject ? "创建项目后，就可以添加任务和成员。" : "当前账号还没有可访问的项目，请联系工作区管理员添加项目权限。"}
              </p>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
