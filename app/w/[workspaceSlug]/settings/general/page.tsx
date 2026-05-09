import { Archive, CalendarClock, FolderKanban, ShieldCheck, Users } from "lucide-react";
import { updateWorkspaceAction } from "@/lib/actions";
import { requireWorkspaceAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { ActionForm } from "@/components/action-form";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/utils";

export default async function WorkspaceSettingsPage({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params;
  const { workspace, user, isSystemAdmin } = await requireWorkspaceAdmin(workspaceSlug);
  const action = updateWorkspaceAction.bind(null, workspaceSlug);
  const projects = await prisma.project.findMany({
    where: { workspaceId: workspace.id },
    select: {
      id: true,
      archived: true,
      members: { select: { userId: true } },
      _count: { select: { issues: true } },
    },
  });
  const activeProjectCount = projects.filter((project) => !project.archived).length;
  const archivedProjectCount = projects.filter((project) => project.archived).length;
  const totalIssueCount = projects.reduce((sum, project) => sum + project._count.issues, 0);
  const uniqueMemberCount = new Set(projects.flatMap((project) => project.members.map((member) => member.userId))).size;

  return (
    <AppShell title="工作区设置" subtitle={workspace.name} workspaceSlug={workspaceSlug}>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader className="border-b">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>基础信息</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">/w/{workspace.slug}</p>
              </div>
              <Badge className="w-fit border-primary/30 bg-primary/5 text-primary">
                <ShieldCheck className="mr-1 h-3 w-3" />
                {isSystemAdmin ? "系统管理" : "工作区管理"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            <ActionForm action={action} submitLabel="保存工作区">
              <div className="space-y-2">
                <Label htmlFor="ws-name">名称</Label>
                <Input id="ws-name" name="name" defaultValue={workspace.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ws-slug">Slug</Label>
                <Input id="ws-slug" name="slug" defaultValue={workspace.slug} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ws-description">描述</Label>
                <Textarea id="ws-description" name="description" defaultValue={workspace.description ?? ""} rows={4} placeholder="可选，简要描述工作区用途" />
              </div>
            </ActionForm>
          </CardContent>
        </Card>

        <aside className="space-y-6">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>空间状态</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-px bg-border p-0">
              <div className="flex items-center justify-between bg-card p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FolderKanban className="h-4 w-4" />
                  活跃项目
                </div>
                <span className="font-semibold">{activeProjectCount}</span>
              </div>
              <div className="flex items-center justify-between bg-card p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Archive className="h-4 w-4" />
                  归档项目
                </div>
                <span className="font-semibold">{archivedProjectCount}</span>
              </div>
              <div className="flex items-center justify-between bg-card p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  项目成员
                </div>
                <span className="font-semibold">{uniqueMemberCount}</span>
              </div>
              <div className="flex items-center justify-between bg-card p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarClock className="h-4 w-4" />
                  任务总数
                </div>
                <span className="font-semibold">{totalIssueCount}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>审计信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">创建时间</span>
                <span className="text-right">{formatDateTime(workspace.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">最近更新</span>
                <span className="text-right">{formatDateTime(workspace.updatedAt)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">当前操作人</span>
                <span className="text-right font-medium">{user.name}</span>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}
