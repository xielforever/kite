import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDot,
  FolderKanban,
  KanbanSquare,
  LayoutList,
  ListTodo,
  ShieldCheck,
  Users,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/permissions";
import { canAccessAllWorkspaces } from "@/lib/role-rules";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { projectRoleLabels, statusLabels, type IssueStatusValue, type ProjectRoleValue, userPublicFields } from "@/lib/constants";

type StatusCounts = Record<IssueStatusValue, number>;

const openStatuses: IssueStatusValue[] = ["TODO", "IN_PROGRESS", "REVIEW"];

function percent(done: number, total: number) {
  if (!total) return 0;
  return Math.round((done / total) * 100);
}

function roleTone(role?: ProjectRoleValue | null) {
  if (role === "LEAD") return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200";
  if (role === "MEMBER") return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200";
  if (role === "VIEWER") return "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200";
  return "border-primary/30 bg-primary/5 text-primary";
}

function statusTone(status: IssueStatusValue) {
  if (status === "TODO") return "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200";
  if (status === "IN_PROGRESS") return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200";
  if (status === "REVIEW") return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200";
  return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200";
}

function formatDate(value?: Date | null) {
  if (!value) return "未设置";
  return value.toISOString().slice(0, 10);
}

function projectInitial(key: string) {
  return key.slice(0, 2).toUpperCase();
}

export default async function WorkspaceHomePage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const { user, workspace } = await requireWorkspace(workspaceSlug);
  const isSystemAdmin = canAccessAllWorkspaces(user.systemRole);
  const visibleProjectWhere = {
    workspaceId: workspace.id,
    archived: false,
    ...(isSystemAdmin ? {} : { members: { some: { userId: user.id } } }),
  };
  const now = new Date();
  const dueSoonCutoff = new Date(now);
  dueSoonCutoff.setDate(now.getDate() + 7);

  const [projects, issueGroups, focusIssues, overdueIssueCount, dueSoonIssueCount, unassignedOpenIssueCount, reviewIssueCount] = await Promise.all([
    prisma.project.findMany({
      where: visibleProjectWhere,
      include: {
        _count: { select: { issues: true } },
        members: {
          include: { user: { select: userPublicFields } },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.issue.groupBy({
      by: ["projectId", "status"],
      where: { project: visibleProjectWhere },
      _count: true,
    }),
    prisma.issue.findMany({
      where: {
        project: visibleProjectWhere,
        status: { in: openStatuses },
        ...(isSystemAdmin ? {} : { OR: [{ assigneeId: user.id }, { creatorId: user.id }] }),
      },
      include: {
        project: { select: { key: true, name: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
      take: 6,
    }),
    prisma.issue.count({
      where: { project: visibleProjectWhere, status: { in: openStatuses }, dueDate: { lt: now } },
    }),
    prisma.issue.count({
      where: { project: visibleProjectWhere, status: { in: openStatuses }, dueDate: { gte: now, lte: dueSoonCutoff } },
    }),
    prisma.issue.count({
      where: { project: visibleProjectWhere, status: { in: openStatuses }, assigneeId: null },
    }),
    prisma.issue.count({
      where: { project: visibleProjectWhere, status: "REVIEW" },
    }),
  ]);

  const statusCountsByProject = new Map<string, StatusCounts>();
  for (const project of projects) {
    statusCountsByProject.set(project.id, { TODO: 0, IN_PROGRESS: 0, REVIEW: 0, DONE: 0, CLOSED: 0 });
  }
  for (const group of issueGroups) {
    const counts = statusCountsByProject.get(group.projectId);
    if (counts) counts[group.status] = group._count;
  }

  const projectCount = projects.length;
  const memberCount = new Set(projects.flatMap((project) => project.members.map((member) => member.userId))).size;
  const openIssueCount = projects.reduce((sum, project) => {
    const counts = statusCountsByProject.get(project.id);
    return sum + (counts?.TODO ?? 0) + (counts?.IN_PROGRESS ?? 0) + (counts?.REVIEW ?? 0);
  }, 0);
  const doneIssueCount = projects.reduce((sum, project) => sum + (statusCountsByProject.get(project.id)?.DONE ?? 0), 0);
  const totalIssueCount = projects.reduce((sum, project) => sum + (project._count.issues ?? 0), 0);
  const completionRate = percent(doneIssueCount, totalIssueCount);
  const roleCounts = projects.reduce(
    (acc, project) => {
      if (isSystemAdmin) {
        acc.admin += 1;
        return acc;
      }
      const membership = project.members.find((member) => member.userId === user.id);
      if (membership?.role === "LEAD") acc.lead += 1;
      if (membership?.role === "MEMBER") acc.member += 1;
      if (membership?.role === "VIEWER") acc.viewer += 1;
      return acc;
    },
    { admin: 0, lead: 0, member: 0, viewer: 0 },
  );

  return (
    <AppShell title={workspace.name} subtitle="工作区总览" workspaceSlug={workspaceSlug}>
      <section className="mb-6 rounded-lg border bg-card">
        <div className="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <FolderKanban className="h-4 w-4" />
              工作区工作台
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              当前范围内有 {projectCount} 个可访问项目、{openIssueCount} 项流转中任务，完成率 {completionRate}%。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="w-fit">{isSystemAdmin ? "系统管理视图" : "项目权限视图"}</Badge>
            <Button asChild size="sm">
              <Link href={`/w/${workspaceSlug}/projects`}>
                <LayoutList className="h-4 w-4" />
                项目台账
              </Link>
            </Button>
          </div>
        </div>
        <div className="grid gap-px bg-border md:grid-cols-4">
          <div className="bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">可访问项目</p>
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-1 text-2xl font-semibold">{projectCount}</p>
          </div>
          <div className="bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">流转中任务</p>
              <ListTodo className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-1 text-2xl font-semibold">{openIssueCount}</p>
          </div>
          <div className="bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">涉及成员</p>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-1 text-2xl font-semibold">{memberCount}</p>
          </div>
          <div className="bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">完成率</p>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-1 text-2xl font-semibold">{completionRate}%</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="rounded-lg border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
              <div>
                <h2 className="text-base font-semibold">任务处理</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isSystemAdmin ? "显示该工作区最近需要推进的流转中任务。" : "优先显示与你相关的未完成任务。"}
                </p>
              </div>
              <Badge className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
                {focusIssues.length} 项
              </Badge>
            </div>
            <div className="divide-y">
              {focusIssues.length ? (
                focusIssues.map((issue) => (
                  <Link
                    key={issue.id}
                    href={`/w/${workspaceSlug}/projects/${issue.project.key}/issues/${issue.id}`}
                    className="group flex flex-col gap-3 p-4 transition-colors hover:bg-muted/35 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={statusTone(issue.status)}>{statusLabels[issue.status]}</Badge>
                        <span className="text-xs text-muted-foreground">{issue.project.key}-{issue.number}</span>
                        <span className="text-xs text-muted-foreground">截止：{formatDate(issue.dueDate)}</span>
                      </div>
                      <p className="mt-2 truncate font-medium">{issue.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {issue.project.name} · 负责人：{issue.assignee?.name ?? issue.assignee?.email ?? "未分配"}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                  </Link>
                ))
              ) : (
                <div className="p-8 text-center">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <h3 className="mt-3 font-semibold">暂无待处理任务</h3>
                  <p className="mt-1 text-sm text-muted-foreground">当前可访问项目中没有需要你立即处理的任务。</p>
                </div>
              )}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">项目台账</h2>
                <p className="text-sm text-muted-foreground">展示最近创建的可访问项目及当前任务分布。</p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={`/w/${workspaceSlug}/projects`}>
                  查看全部
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            {projects.length ? (
              <div className="grid gap-3">
                {projects.slice(0, 5).map((project) => {
                  const counts = statusCountsByProject.get(project.id);
                  const openTotal = (counts?.TODO ?? 0) + (counts?.IN_PROGRESS ?? 0) + (counts?.REVIEW ?? 0);
                  const done = counts?.DONE ?? 0;
                  const projectCompletion = percent(done, project._count.issues ?? 0);
                  const membership = project.members.find((member) => member.userId === user.id);
                  const role = isSystemAdmin ? null : membership?.role;
                  const roleLabel = isSystemAdmin ? "系统管理" : role ? projectRoleLabels[role] : "未加入";

                  return (
                    <article key={project.id} className="rounded-lg border bg-card p-4 shadow-sm">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex min-w-0 gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border bg-background text-sm font-semibold text-primary">
                            {projectInitial(project.key)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate font-semibold">{project.name}</h3>
                              <Badge className={roleTone(role)}>{roleLabel}</Badge>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                              <span>{project.key}</span>
                              <span>流转中 {openTotal}</span>
                              <span>成员 {project.members.length}</span>
                              <span>完成率 {projectCompletion}%</span>
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
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-sm text-muted-foreground">当前账号在该工作区下暂无可访问项目。</CardContent>
              </Card>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-lg border bg-card">
            <div className="border-b p-5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-base font-semibold">权限范围</h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">工作区可见性由项目成员关系决定。</p>
            </div>
            <div className="grid gap-px bg-border text-sm">
              <div className="flex items-center justify-between bg-card p-4">
                <span className="text-muted-foreground">系统管理项目</span>
                <span className="font-semibold">{roleCounts.admin}</span>
              </div>
              <div className="flex items-center justify-between bg-card p-4">
                <span className="text-muted-foreground">项目负责人</span>
                <span className="font-semibold">{roleCounts.lead}</span>
              </div>
              <div className="flex items-center justify-between bg-card p-4">
                <span className="text-muted-foreground">项目成员</span>
                <span className="font-semibold">{roleCounts.member}</span>
              </div>
              <div className="flex items-center justify-between bg-card p-4">
                <span className="text-muted-foreground">只读项目</span>
                <span className="font-semibold">{roleCounts.viewer}</span>
              </div>
            </div>
          </section>

          <section className="rounded-lg border bg-card p-5">
            <div className="flex items-center gap-2">
              <CircleDot className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-base font-semibold">任务状态</h2>
            </div>
            <div className="mt-4 space-y-3">
              {(["TODO", "IN_PROGRESS", "REVIEW", "DONE", "CLOSED"] as IssueStatusValue[]).map((status) => {
                const count = projects.reduce((sum, project) => sum + (statusCountsByProject.get(project.id)?.[status] ?? 0), 0);
                const width = totalIssueCount ? Math.max(4, Math.round((count / totalIssueCount) * 100)) : 0;
                return (
                  <div key={status} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{statusLabels[status]}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-lg border bg-card">
            <div className="border-b p-5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-base font-semibold">风险提示</h2>
              </div>
            </div>
            <div className="grid gap-px bg-border text-sm">
              <div className="flex items-center justify-between bg-card p-4">
                <span className="text-muted-foreground">已逾期任务</span>
                <span className={overdueIssueCount ? "font-semibold text-destructive" : "font-semibold"}>{overdueIssueCount}</span>
              </div>
              <div className="flex items-center justify-between bg-card p-4">
                <span className="text-muted-foreground">7 日内到期</span>
                <span className="font-semibold">{dueSoonIssueCount}</span>
              </div>
              <div className="flex items-center justify-between bg-card p-4">
                <span className="text-muted-foreground">待评审</span>
                <span className="font-semibold">{reviewIssueCount}</span>
              </div>
              <div className="flex items-center justify-between bg-card p-4">
                <span className="text-muted-foreground">未分配流转任务</span>
                <span className="font-semibold">{unassignedOpenIssueCount}</span>
              </div>
            </div>
          </section>

          <section className="rounded-lg border bg-card p-5">
            <div className="flex items-center gap-2">
              <CircleDot className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-base font-semibold">当前视图</h2>
            </div>
            <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>{isSystemAdmin ? "系统管理" : "项目成员"}</span>
                <span className="font-medium text-foreground">{projectCount} 项目</span>
              </div>
              <div className="flex items-center justify-between">
                <span>流转任务</span>
                <span className="font-medium text-foreground">{openIssueCount}</span>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
