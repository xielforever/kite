import Link from "next/link";
import { ArrowRight, CheckCircle2, FolderKanban, LayoutList, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/permissions";
import { canAccessAllWorkspaces } from "@/lib/role-rules";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

function percent(done: number, total: number) {
  if (!total) return 0;
  return Math.round((done / total) * 100);
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
  const [visibleProjects, openIssueCount, doneIssueCount] = await Promise.all([
    prisma.project.findMany({
      where: visibleProjectWhere,
      include: { members: { select: { userId: true } } },
    }),
    prisma.issue.count({
      where: { project: visibleProjectWhere, status: { notIn: ["DONE", "CLOSED"] } },
    }),
    prisma.issue.count({
      where: { project: visibleProjectWhere, status: "DONE" },
    }),
  ]);
  const projectCount = visibleProjects.length;
  const memberCount = new Set(visibleProjects.flatMap((project) => project.members.map((member) => member.userId))).size;
  const totalIssueCount = openIssueCount + doneIssueCount;
  const completionRate = percent(doneIssueCount, totalIssueCount);

  return (
    <AppShell title={workspace.name} subtitle="工作区总览" workspaceSlug={workspaceSlug}>
      <section className="mb-6 rounded-lg border bg-card">
        <div className="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <FolderKanban className="h-4 w-4" />
              工作区驾驶舱
            </div>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              通过下方卡片进入对应功能区。卡片本身就是快捷入口，顶部菜单保留用于跨页面切换。
            </p>
          </div>
          <Badge className="w-fit">{isSystemAdmin ? "系统管理视图" : "项目权限视图"}</Badge>
        </div>
        <div className="grid gap-px bg-border md:grid-cols-4">
          <div className="bg-card p-4">
            <p className="text-xs text-muted-foreground">活跃项目</p>
            <p className="mt-1 text-2xl font-semibold">{projectCount}</p>
          </div>
          <div className="bg-card p-4">
            <p className="text-xs text-muted-foreground">未完成任务</p>
            <p className="mt-1 text-2xl font-semibold">{openIssueCount}</p>
          </div>
          <div className="bg-card p-4">
            <p className="text-xs text-muted-foreground">项目成员</p>
            <p className="mt-1 text-2xl font-semibold">{memberCount}</p>
          </div>
          <div className="bg-card p-4">
            <p className="text-xs text-muted-foreground">任务完成率</p>
            <p className="mt-1 text-2xl font-semibold">{completionRate}%</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Link href={`/w/${workspaceSlug}/projects`} className="group block">
          <Card className="h-full transition hover:border-primary/50 hover:shadow-md">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-md border bg-background text-primary">
                  <LayoutList className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
              <div className="mt-5">
                <h2 className="text-base font-semibold">项目台账</h2>
                <p className="mt-2 text-sm text-muted-foreground">查看项目进度、成员规模和任务状态分布。</p>
              </div>
              <div className="mt-5 flex items-end justify-between border-t pt-4">
                <span className="text-xs text-muted-foreground">活跃项目</span>
                <span className="text-2xl font-semibold">{projectCount}</span>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/w/${workspaceSlug}/projects`} className="group block">
          <Card className="h-full transition hover:border-primary/50 hover:shadow-md">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-md border bg-background text-primary">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
              <div className="mt-5">
                <h2 className="text-base font-semibold">任务处理</h2>
                <p className="mt-2 text-sm text-muted-foreground">从项目进入看板或列表，继续处理待办和进行中的任务。</p>
              </div>
              <div className="mt-5 space-y-3 border-t pt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">未完成</span>
                  <span className="font-semibold">{openIssueCount}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${completionRate}%` }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/w/${workspaceSlug}/projects`} className="group block">
          <Card className="h-full transition hover:border-primary/50 hover:shadow-md">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-md border bg-background text-primary">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
              <div className="mt-5">
                <h2 className="text-base font-semibold">项目权限</h2>
                <p className="mt-2 text-sm text-muted-foreground">成员可见范围由项目角色决定，只能进入已加入的项目。</p>
              </div>
              <div className="mt-5 flex items-end justify-between border-t pt-4">
                <span className="text-xs text-muted-foreground">成员数量</span>
                <span className="text-2xl font-semibold">{memberCount}</span>
              </div>
            </CardContent>
          </Card>
        </Link>
      </section>
    </AppShell>
  );
}
