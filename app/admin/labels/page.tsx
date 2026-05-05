import Link from "next/link";
import { FolderKanban, SlidersHorizontal, Tags } from "lucide-react";
import { LabelForm } from "@/components/label-form";
import { LabelList } from "@/components/label-list";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireSystemAdmin } from "@/lib/permissions";

export default async function AdminLabelsPage() {
  await requireSystemAdmin();
  const workspaces = await prisma.workspace.findMany({
    include: {
      projects: {
        include: {
          labels: { orderBy: { name: "asc" } },
        },
        orderBy: [{ archived: "asc" }, { createdAt: "desc" }],
      },
    },
    orderBy: { createdAt: "asc" },
  });
  const projectCount = workspaces.reduce((sum, workspace) => sum + workspace.projects.length, 0);
  const labelCount = workspaces.reduce(
    (sum, workspace) => sum + workspace.projects.reduce((projectSum, project) => projectSum + project.labels.length, 0),
    0,
  );

  return (
    <AppShell title="标签配置" subtitle="系统管理员统一维护项目标签，普通用户在任务表单和筛选器中选择已有标签。">
      <section className="mb-6 rounded-lg border bg-card">
        <div className="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <SlidersHorizontal className="h-4 w-4" />
              全局配置
            </div>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              标签仍然归属到项目，用于任务分类、筛选和看板识别。这里集中管理创建、改名、调色和删除操作。
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/workspaces">
              <FolderKanban className="h-4 w-4" />
              返回工作区
            </Link>
          </Button>
        </div>
        <div className="grid gap-px bg-border sm:grid-cols-3">
          <div className="bg-card p-4">
            <p className="text-xs text-muted-foreground">工作区</p>
            <p className="mt-1 text-2xl font-semibold">{workspaces.length}</p>
          </div>
          <div className="bg-card p-4">
            <p className="text-xs text-muted-foreground">项目</p>
            <p className="mt-1 text-2xl font-semibold">{projectCount}</p>
          </div>
          <div className="bg-card p-4">
            <p className="text-xs text-muted-foreground">标签</p>
            <p className="mt-1 text-2xl font-semibold">{labelCount}</p>
          </div>
        </div>
      </section>

      {workspaces.length ? (
        <div className="space-y-6">
          {workspaces.map((workspace) => (
            <section key={workspace.id} className="rounded-lg border bg-card">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold">{workspace.name}</h2>
                    <Badge>/w/{workspace.slug}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">共 {workspace.projects.length} 个项目</p>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/w/${workspace.slug}/projects`}>查看项目</Link>
                </Button>
              </div>

              {workspace.projects.length ? (
                <div className="grid gap-px bg-border xl:grid-cols-2">
                  {workspace.projects.map((project) => (
                    <article key={project.id} className="bg-card p-5">
                      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-sm font-semibold">{project.name}</h3>
                            <Badge>{project.key}</Badge>
                            {project.archived ? <Badge className="border-amber-200 bg-amber-50 text-amber-700">已归档</Badge> : null}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{project.labels.length} 个标签</p>
                        </div>
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/w/${workspace.slug}/projects/${project.key}/board`}>打开看板</Link>
                        </Button>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(220px,280px)]">
                        <div className="rounded-md border p-3">
                          <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                            <Tags className="h-4 w-4 text-primary" />
                            标签列表
                          </div>
                          <LabelList workspaceSlug={workspace.slug} projectKey={project.key} labels={project.labels} />
                        </div>
                        <div className="rounded-md border p-3">
                          <div className="mb-3 text-sm font-medium">新增标签</div>
                          <LabelForm workspaceSlug={workspace.slug} projectKey={project.key} />
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="p-5 text-sm text-muted-foreground">该工作区还没有项目，创建项目后可在这里配置标签。</div>
              )}
            </section>
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>暂无工作区</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">创建工作区和项目后，可在这里集中管理标签。</CardContent>
        </Card>
      )}
    </AppShell>
  );
}
