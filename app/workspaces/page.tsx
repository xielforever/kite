import Link from "next/link";
import { ArrowRight, Building2, FolderKanban, RefreshCw, ShieldCheck, Users } from "lucide-react";
import { createWorkspaceAction } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { AppShell } from "@/components/app-shell";
import { CreateWorkspaceDialog } from "@/components/create-workspace-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { canAccessAllWorkspaces, canCreateWorkspace } from "@/lib/role-rules";

type WorkspaceCard = {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  membershipId: string;
  viaSystemAdmin: boolean;
  projectCount: number;
  memberCount: number;
};

function workspaceInitial(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "K";
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export default async function WorkspacesPage() {
  const user = await requireUser();
  const canCreate = canCreateWorkspace(user.systemRole);
  const canAccessAll = canAccessAllWorkspaces(user.systemRole);
  const workspaces = await prisma.workspace.findMany({
    where: canAccessAll ? {} : { projects: { some: { members: { some: { userId: user.id } } } } },
    include: {
      projects: {
        where: canAccessAll ? {} : { members: { some: { userId: user.id } } },
        include: { members: { select: { userId: true } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  const workspaceCards: WorkspaceCard[] = workspaces.map((workspace) => ({
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    createdAt: workspace.createdAt,
    membershipId: workspace.id,
    viaSystemAdmin: canAccessAll,
    projectCount: workspace.projects.length,
    memberCount: new Set(workspace.projects.flatMap((project) => project.members.map((member) => member.userId))).size,
  }));

  const totalProjects = workspaceCards.reduce((sum, workspace) => sum + workspace.projectCount, 0);
  const totalMembers = workspaceCards.reduce((sum, workspace) => sum + workspace.memberCount, 0);
  const managedWorkspaces = canAccessAll ? workspaceCards.length : 0;

  return (
    <AppShell title="工作区" subtitle={canAccessAll ? "系统管理员可查看和管理全部工作区。" : "选择你拥有项目权限的工作区。"}>
      <section className="mb-6 rounded-lg border bg-card">
        <div className="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Building2 className="h-4 w-4" />
              工作区目录
            </div>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              统一查看团队空间和项目范围。系统管理员可以跨工作区进入管理，普通用户只看到拥有项目权限的空间。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canAccessAll ? <Badge className="border-primary/30 bg-primary/5 text-primary">全局后台视图</Badge> : null}
            {canCreate ? <CreateWorkspaceDialog action={createWorkspaceAction} /> : null}
          </div>
        </div>
        <div className="grid gap-px bg-border md:grid-cols-4">
          <div className="bg-card p-4">
            <p className="text-xs text-muted-foreground">可访问工作区</p>
            <p className="mt-1 text-2xl font-semibold">{workspaceCards.length}</p>
          </div>
          <div className="bg-card p-4">
            <p className="text-xs text-muted-foreground">项目总数</p>
            <p className="mt-1 text-2xl font-semibold">{totalProjects}</p>
          </div>
          <div className="bg-card p-4">
            <p className="text-xs text-muted-foreground">项目成员</p>
            <p className="mt-1 text-2xl font-semibold">{totalMembers}</p>
          </div>
          <div className="bg-card p-4">
            <p className="text-xs text-muted-foreground">可新建空间</p>
            <p className="mt-1 text-2xl font-semibold">{managedWorkspaces}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6">
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">空间列表</h2>
              <p className="text-sm text-muted-foreground">{workspaceCards.length ? `共 ${workspaceCards.length} 个工作区` : "暂无可访问工作区"}</p>
            </div>
            <Button asChild variant="outline" size="sm" aria-label="刷新工作区目录">
              <Link href="/workspaces">
                <RefreshCw className="h-4 w-4" />
                刷新目录
              </Link>
            </Button>
          </div>

          {workspaceCards.length ? (
            workspaceCards.map((workspace) => {
              const href = `/w/${workspace.slug}`;
              return (
                <article
                  key={workspace.membershipId}
                  className="group rounded-lg border bg-card p-4 shadow-sm transition hover:border-primary/50 hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex min-w-0 gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border bg-background text-lg font-semibold text-primary">
                        {workspaceInitial(workspace.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-base font-semibold">{workspace.name}</h3>
                          <Badge className={workspace.viaSystemAdmin ? "border-primary/30 bg-primary/5 text-primary" : ""}>
                            {workspace.viaSystemAdmin ? (
                              <>
                                <ShieldCheck className="mr-1 h-3 w-3" />
                                全局可见
                              </>
                            ) : "项目授权"}
                          </Badge>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span>/w/{workspace.slug}</span>
                          <span>创建于 {formatDate(workspace.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div className="grid min-w-44 grid-cols-2 overflow-hidden rounded-md border text-sm">
                        <div className="border-r bg-background px-3 py-2">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <FolderKanban className="h-4 w-4" />
                            项目
                          </div>
                          <div className="mt-1 font-semibold">{workspace.projectCount}</div>
                        </div>
                        <div className="bg-background px-3 py-2">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Users className="h-4 w-4" />
                            成员
                          </div>
                          <div className="mt-1 font-semibold">{workspace.memberCount}</div>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Button asChild>
                          <Link href={href}>
                            进入
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-lg border border-dashed bg-card p-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
                <FolderKanban className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-lg font-semibold">还没有工作区</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                {canCreate ? "创建第一个工作区后，就可以继续添加项目和任务。" : "当前账号还没有任何项目权限。请联系项目负责人将你加入项目。"}
              </p>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
