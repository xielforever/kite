import Link from "next/link";
import { FolderKanban, Palette, SlidersHorizontal, Tags } from "lucide-react";
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
  const labels = await prisma.label.findMany({
    include: {
      _count: { select: { issues: true } },
    },
    orderBy: { name: "asc" },
  });
  const globalLabels = labels.map((label) => ({
    id: label.id,
    name: label.name,
    color: label.color,
    issueCount: label._count.issues,
  }));
  const issueUsageCount = globalLabels.reduce((sum, label) => sum + label.issueCount, 0);
  const colorCount = new Set(globalLabels.map((label) => label.color)).size;

  return (
    <AppShell title="标签配置" subtitle="系统管理员统一维护全局标签，普通用户只在任务表单和筛选器中选择。">
      <section className="mb-6 rounded-lg border bg-card">
        <div className="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <SlidersHorizontal className="h-4 w-4" />
              全局配置
            </div>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              标签不再归属于某个项目。这里维护一套全局标签目录，所有工作区和项目共享同一批标签。
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
            <p className="text-xs text-muted-foreground">全局标签</p>
            <p className="mt-1 text-2xl font-semibold">{globalLabels.length}</p>
          </div>
          <div className="bg-card p-4">
            <p className="text-xs text-muted-foreground">任务引用</p>
            <p className="mt-1 text-2xl font-semibold">{issueUsageCount}</p>
          </div>
          <div className="bg-card p-4">
            <p className="text-xs text-muted-foreground">颜色数量</p>
            <p className="mt-1 text-2xl font-semibold">{colorCount}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tags className="h-4 w-4" />
                新增标签
              </CardTitle>
              <p className="text-sm text-muted-foreground">新增后，所有项目的任务表单和筛选器都会使用这套标签。</p>
            </CardHeader>
            <CardContent>
              <LabelForm />
            </CardContent>
          </Card>

          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Palette className="h-4 w-4 text-primary" />
              管理规则
            </div>
            <div className="mt-3 space-y-3 text-sm text-muted-foreground">
              <p>标签名称全局唯一，避免不同项目出现同名但含义不同的标签。</p>
              <p>删除标签会从所有任务上移除该标签，请优先改名或调色。</p>
            </div>
          </div>
        </aside>

        <Card>
          <CardHeader className="border-b">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>全局标签列表</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">一处维护，所有项目共用。</p>
              </div>
              <Badge>{globalLabels.length} 个标签</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            <LabelList labels={globalLabels} />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
