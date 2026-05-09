import { CheckCircle2, FolderKanban, KeyRound, ShieldCheck, UserRound } from "lucide-react";
import { updatePasswordAction, updateProfileAction } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { projectRoleLabels, systemRoleLabels } from "@/lib/constants";
import { ActionForm } from "@/components/action-form";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateTime } from "@/lib/utils";

export default async function ProfilePage() {
  const sessionUser = await requireUser();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: sessionUser.id },
    select: {
      id: true,
      name: true,
      email: true,
      systemRole: true,
      mustChangePassword: true,
      createdAt: true,
      updatedAt: true,
      projectMemberships: {
        select: {
          id: true,
          role: true,
          project: { select: { key: true, name: true, workspace: { select: { name: true, slug: true } } } },
        },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { assignedIssues: true, createdIssues: true, comments: true } },
    },
  });
  const leadCount = user.projectMemberships.filter((membership) => membership.role === "LEAD").length;

  return (
    <AppShell title="个人资料" subtitle="更新账号信息和密码">
      <div className="space-y-6">
        <Card>
          <CardHeader className="border-b">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>账号概览</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className="border-primary/30 bg-primary/5 text-primary">
                  <ShieldCheck className="mr-1 h-3 w-3" />
                  {systemRoleLabels[user.systemRole]}
                </Badge>
                <Badge className={user.mustChangePassword ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200" : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"}>
                  {user.mustChangePassword ? <KeyRound className="mr-1 h-3 w-3" /> : <CheckCircle2 className="mr-1 h-3 w-3" />}
                  {user.mustChangePassword ? "待改密" : "密码正常"}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-px bg-border p-0 sm:grid-cols-4">
            <div className="bg-card p-4">
              <p className="text-xs text-muted-foreground">项目权限</p>
              <p className="mt-1 text-2xl font-semibold">{user.projectMemberships.length}</p>
            </div>
            <div className="bg-card p-4">
              <p className="text-xs text-muted-foreground">负责项目</p>
              <p className="mt-1 text-2xl font-semibold">{leadCount}</p>
            </div>
            <div className="bg-card p-4">
              <p className="text-xs text-muted-foreground">指派任务</p>
              <p className="mt-1 text-2xl font-semibold">{user._count.assignedIssues}</p>
            </div>
            <div className="bg-card p-4">
              <p className="text-xs text-muted-foreground">创建任务</p>
              <p className="mt-1 text-2xl font-semibold">{user._count.createdIssues}</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid self-start gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>账号信息</CardTitle>
              </CardHeader>
              <CardContent>
                <ActionForm action={updateProfileAction} submitLabel="保存资料">
                  <div className="space-y-2">
                    <Label htmlFor="name">姓名</Label>
                    <Input id="name" name="name" defaultValue={user.name} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">邮箱</Label>
                    <Input id="email" name="email" type="email" defaultValue={user.email} required />
                  </div>
                </ActionForm>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>修改密码</CardTitle>
              </CardHeader>
              <CardContent>
                <ActionForm action={updatePasswordAction} submitLabel="更新密码">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">当前密码</Label>
                    <Input id="currentPassword" name="currentPassword" type="password" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">新密码</Label>
                    <Input id="newPassword" name="newPassword" type="password" minLength={8} required />
                  </div>
                </ActionForm>
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-6">
            <Card>
              <CardHeader className="border-b">
                <div className="flex items-center gap-2">
                  <UserRound className="h-4 w-4 text-muted-foreground" />
                  <CardTitle>账号状态</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-5 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">注册时间</span>
                  <span className="text-right">{formatDateTime(user.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">最近更新</span>
                  <span className="text-right">{formatDateTime(user.updatedAt)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">评论数</span>
                  <span className="font-medium">{user._count.comments}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b">
                <div className="flex items-center gap-2">
                  <FolderKanban className="h-4 w-4 text-muted-foreground" />
                  <CardTitle>项目身份</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="max-h-72 space-y-3 overflow-y-auto pt-5">
                {user.projectMemberships.length ? (
                  user.projectMemberships.map((membership) => (
                    <div key={membership.id} className="rounded-md border bg-background p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{membership.project.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{membership.project.workspace.name}/{membership.project.key}</p>
                        </div>
                        <Badge>{projectRoleLabels[membership.role]}</Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">当前账号暂未加入项目。</p>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
