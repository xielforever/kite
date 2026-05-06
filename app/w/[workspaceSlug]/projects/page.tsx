import Link from "next/link";
import { Archive, BarChart3, CheckCircle2, KanbanSquare, LayoutList, ListTodo, Plus } from "lucide-react";
import { archiveProjectAction } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/permissions";
import { canManageProject, canManageWorkspace } from "@/lib/role-rules";
import { AppShell } from "@/components/app-shell";
import { ProjectEditForm } from "@/components/project-edit-form";
import { ProjectForm } from "@/components/project-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { projectRoleLabels } from "@/lib/constants";

function memberInitial(name?: string | null, email?: string | null) {
  return (name?.trim() || email?.trim() || "U").slice(0, 1).toUpperCase();
}

function percent(done: number, total: number) {
  if (!total) return 0;
  return Math.round((done / total) * 100);
}

export default async function ProjectsPage({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params;
  const { user, workspace, membership } = await requireWorkspace(workspaceSlug);
  const isWorkspaceAdmin = canManageWorkspace(membership.role);
  const projects = await prisma.project.findMany({
    where: {
      workspaceId: workspace.id,
      archived: false,
      ...(isWorkspaceAdmin ? {} : { members: { some: { userId: user.id } } }),
    },
    include: {
      issues: true,
      members: {
        include: { user: true },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  const canCreateProject = isWorkspaceAdmin;
  const totalIssues = projects.reduce((sum, project) => sum + project.issues.length, 0);
  const doneIssues = projects.reduce((sum, project) => sum + project.issues.filter((issue) => issue.status === "DONE").length, 0);
  const openIssues = totalIssues - doneIssues;
  const uniqueMembers = new Set(projects.flatMap((project) => project.members.map((member) => member.userId))).size;
  const completionRate = percent(doneIssues, totalIssues);

  return (
    <AppShell title="项目" subtitle={`${workspace.name} · ${isWorkspaceAdmin ? "工作区管理视图" : "项目成员视图"}`} workspaceSlug={workspaceSlug}>
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
          <Button asChild variant="outline" size="sm">
            <Link href={`/w/${workspaceSlug}/projects/archived`}>
              <Archive className="h-4 w-4" />
              归档项目
            </Link>
          </Button>
        </div>
        <div className="grid gap-px bg-border md:grid-cols-4">
          <div className="bg-card p-4">
            <p className="text-xs text-muted-foreground">活跃项目</p>
            <p className="mt-1 text-2xl font-semibold">{projects.length}</p>
          </div>
          <div className="bg-card p-4">
            <p className="text-xs text-muted-foreground">未完成任务</p>
            <p className="mt-1 text-2xl font-semibold">{openIssues}</p>
          </div>
          <div className="bg-card p-4">
            <p className="text-xs text-muted-foreground">涉及成员</p>
            <p className="mt-1 text-2xl font-semibold">{uniqueMembers}</p>
          </div>
          <div className="bg-card p-4">
            <p className="text-xs text-muted-foreground">整体完成率</p>
            <p className="mt-1 text-2xl font-semibold">{completionRate}%</p>
          </div>
        </div>
      </section>

      <div className={canCreateProject ? "grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]" : "grid gap-6"}>
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
              const canManage = isWorkspaceAdmin || canManageProject(projectMembership?.role);
              const todoCount = project.issues.filter((issue) => issue.status === "TODO").length;
              const inProgressCount = project.issues.filter((issue) => issue.status === "IN_PROGRESS").length;
              const doneCount = project.issues.filter((issue) => issue.status === "DONE").length;
              const projectCompletion = percent(doneCount, project.issues.length);
              const visibleMembers = project.members.slice(0, 4);
              const roleText = isWorkspaceAdmin ? "工作区管理" : projectMembership?.role ? projectRoleLabels[projectMembership.role] : "未加入";

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
                            <Badge>{roleText}</Badge>
                            {canManage ? <Badge className="border-primary/30 bg-primary/5 text-primary">可管理</Badge> : null}
                          </div>
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{project.description || "暂无描述"}</p>
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
                        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                          <div className="rounded-md border bg-card px-2 py-1.5">
                            <div className="text-muted-foreground">待处理</div>
                            <div className="mt-0.5 font-semibold">{todoCount}</div>
                          </div>
                          <div className="rounded-md border bg-card px-2 py-1.5">
                            <div className="text-muted-foreground">进行中</div>
                            <div className="mt-0.5 font-semibold">{inProgressCount}</div>
                          </div>
                          <div className="rounded-md border bg-card px-2 py-1.5">
                            <div className="text-muted-foreground">已完成</div>
                            <div className="mt-0.5 font-semibold">{doneCount}</div>
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

                    {canManage ? (
                      <details className="rounded-md border bg-background p-3">
                        <summary className="cursor-pointer text-sm font-medium">编辑项目资料</summary>
                        <div className="mt-3">
                          <ProjectEditForm workspaceSlug={workspaceSlug} project={project} />
                        </div>
                      </details>
                    ) : null}
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

        {canCreateProject ? (
          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  新建项目
                </CardTitle>
                <p className="text-sm text-muted-foreground">项目 Key 会用于任务编号和 URL 识别。</p>
              </CardHeader>
              <CardContent>
                <ProjectForm workspaceSlug={workspaceSlug} />
              </CardContent>
            </Card>
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <BarChart3 className="h-4 w-4 text-primary" />
                项目规则
              </div>
              <div className="mt-3 space-y-3 text-sm text-muted-foreground">
                <p>工作区管理员可以创建项目，并自动成为项目负责人。</p>
                <p>项目负责人管理成员；项目成员可处理任务；只读成员仅查看。</p>
              </div>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                当前状态
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-md border bg-background px-3 py-2">
                  <div className="text-muted-foreground">任务总数</div>
                  <div className="mt-1 font-semibold">{totalIssues}</div>
                </div>
                <div className="rounded-md border bg-background px-3 py-2">
                  <div className="text-muted-foreground">完成任务</div>
                  <div className="mt-1 font-semibold">{doneIssues}</div>
                </div>
                <div className="rounded-md border bg-background px-3 py-2">
                  <div className="text-muted-foreground">项目成员</div>
                  <div className="mt-1 font-semibold">{uniqueMembers}</div>
                </div>
                <div className="rounded-md border bg-background px-3 py-2">
                  <div className="text-muted-foreground">完成率</div>
                  <div className="mt-1 font-semibold">{completionRate}%</div>
                </div>
              </div>
            </div>
          </aside>
        ) : null}
      </div>
    </AppShell>
  );
}
