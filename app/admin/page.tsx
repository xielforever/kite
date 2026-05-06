import Link from "next/link";
import { requireSystemAdmin } from "@/lib/permissions";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, Building2, FolderKanban } from "lucide-react";
import { systemRoleLabels, systemRoles } from "@/lib/constants";
import { adminUpdateUserRoleAction, adminResetPasswordAction } from "@/lib/actions";
import { ActionForm } from "@/components/action-form";

export default async function AdminPage() {
  await requireSystemAdmin();

  const [userCount, workspaceCount, projectCount, recentUsers] = await Promise.all([
    prisma.user.count(),
    prisma.workspace.count(),
    prisma.project.count({ where: { archived: false } }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        name: true,
        email: true,
        systemRole: true,
        mustChangePassword: true,
        createdAt: true,
        memberships: { select: { workspace: { select: { name: true } } } },
      },
    }),
  ]);

  return (
    <AppShell title="系统管理" subtitle="系统管理员专属后台">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">注册用户</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">工作区</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workspaceCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">活跃项目</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>用户管理</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">姓名</th>
                  <th className="pb-2 pr-4 font-medium">邮箱</th>
                  <th className="pb-2 pr-4 font-medium">系统角色</th>
                  <th className="pb-2 pr-4 font-medium">工作区</th>
                  <th className="pb-2 pr-4 font-medium">注册时间</th>
                  <th className="pb-2 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map((user) => (
                  <tr key={user.id} className="border-b last:border-0">
                    <td className="py-2.5 pr-4 font-medium">
                      {user.name}
                      {user.mustChangePassword ? <span className="ml-1 text-xs text-orange-500">待改密</span> : null}
                    </td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{user.email}</td>
                    <td className="py-2.5 pr-4">
                      <ActionForm action={adminUpdateUserRoleAction} submitLabel="保存" pendingLabel="保存中...">
                        <input type="hidden" name="userId" value={user.id} />
                        <select
                          name="systemRole"
                          defaultValue={user.systemRole}
                          className="h-8 rounded-md border bg-background px-2 text-xs"
                        >
                          {systemRoles.map((role) => (
                            <option key={role} value={role}>{systemRoleLabels[role]}</option>
                          ))}
                        </select>
                      </ActionForm>
                    </td>
                    <td className="py-2.5 pr-4 text-muted-foreground">
                      {user.memberships.map((m) => m.workspace.name).join("、") || "—"}
                    </td>
                    <td className="py-2.5 pr-4 text-muted-foreground">
                      {user.createdAt.toLocaleDateString("zh-CN")}
                    </td>
                    <td className="py-2.5">
                      <details className="group inline-block">
                        <summary className="cursor-pointer text-xs text-primary hover:underline">重置密码</summary>
                        <div className="absolute z-10 mt-1 rounded-md border bg-card p-3 shadow-lg">
                          <ActionForm action={adminResetPasswordAction} submitLabel="重置" pendingLabel="重置中...">
                            <input type="hidden" name="userId" value={user.id} />
                            <div className="flex items-center gap-2">
                              <Input name="newPassword" type="password" placeholder="新密码（至少8位）" className="h-8 w-44 text-xs" required />
                            </div>
                          </ActionForm>
                        </div>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="mt-4">
        <Button asChild variant="outline">
          <Link href="/workspaces">返回工作区</Link>
        </Button>
      </div>
    </AppShell>
  );
}
