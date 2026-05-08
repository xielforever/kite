import Link from "next/link";
import { requireSystemAdmin } from "@/lib/permissions";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, Download, FolderKanban, KeyRound, ShieldCheck, Users } from "lucide-react";
import { projectRoleLabels, systemRoleLabels, systemRoles, type ProjectRoleValue } from "@/lib/constants";
import { adminUpdateUserRoleAction, adminResetPasswordAction } from "@/lib/actions";
import { ActionForm } from "@/components/action-form";
import { Badge } from "@/components/ui/badge";

type ProjectMembershipSummary = {
  role: ProjectRoleValue;
  project: {
    key: string;
    name: string;
    workspace: { name: string };
  };
};

function userInitial(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "U";
}

function projectRoleTone(role: ProjectRoleValue) {
  if (role === "LEAD") return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200";
  if (role === "MEMBER") return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200";
  return "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200";
}

function ProjectPermissionBadges({
  memberships,
  isSystemAdmin,
}: {
  memberships: ProjectMembershipSummary[];
  isSystemAdmin: boolean;
}) {
  const badges = memberships.map((membership) => (
    <Badge
      key={`${membership.project.workspace.name}-${membership.project.key}-${membership.role}`}
      className={`max-w-full gap-1.5 px-2 py-1 ${projectRoleTone(membership.role)}`}
      title={`${membership.project.workspace.name}/${membership.project.key} ${projectRoleLabels[membership.role]}`}
    >
      <span className="max-w-36 truncate font-medium">
        {membership.project.workspace.name}/{membership.project.key}
      </span>
      <span className="shrink-0 opacity-75">{projectRoleLabels[membership.role]}</span>
    </Badge>
  ));

  if (isSystemAdmin) {
    return (
      <div className="space-y-2">
        <Badge className="gap-1.5 border-primary/30 bg-primary/5 px-2 py-1 text-primary">
          <ShieldCheck className="h-3 w-3" />
          全局管理权限
        </Badge>
        {memberships.length ? (
          <details className="group">
            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
              显式项目身份 {memberships.length} 项
            </summary>
            <div className="mt-2 max-h-24 overflow-y-auto pr-1">
              <div className="flex flex-wrap gap-1.5">{badges}</div>
            </div>
          </details>
        ) : null}
      </div>
    );
  }

  if (!memberships.length) return <span className="text-muted-foreground">无</span>;

  return (
    <div className="max-h-24 overflow-y-auto pr-1">
      <div className="flex flex-wrap gap-1.5">{badges}</div>
    </div>
  );
}

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
        projectMemberships: {
          select: {
            role: true,
            project: { select: { key: true, name: true, workspace: { select: { name: true } } } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
  ]);
  const systemAdminCount = recentUsers.filter((user) => user.systemRole === "SUPER_ADMIN").length;
  const pendingPasswordCount = recentUsers.filter((user) => user.mustChangePassword).length;
  const projectMemberCount = recentUsers.filter((user) => user.projectMemberships.length > 0).length;

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

      <Card className="mt-6 overflow-hidden">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <CardTitle>用户管理</CardTitle>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge className="border-primary/25 bg-primary/5 text-primary">
                  系统管理员 {systemAdminCount}
                </Badge>
                <Badge className="border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200">
                  项目成员 {projectMemberCount}
                </Badge>
                <Badge className="border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-200">
                  待改密 {pendingPasswordCount}
                </Badge>
              </div>
            </div>
            <Button asChild variant="outline" size="sm" className="shrink-0 bg-background">
              <Link href="/api/admin/exports/issues">
                <Download className="h-4 w-4" />
                导出项目任务
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-[1180px] table-fixed text-sm">
              <colgroup>
                <col className="w-[220px]" />
                <col className="w-[260px]" />
                <col className="w-[220px]" />
                <col className="w-[360px]" />
                <col className="w-[130px]" />
                <col className="w-[190px]" />
              </colgroup>
              <thead className="bg-background/95">
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="px-5 py-3 font-medium">姓名</th>
                  <th className="px-5 py-3 font-medium">邮箱</th>
                  <th className="px-5 py-3 font-medium">系统角色</th>
                  <th className="px-5 py-3 font-medium">项目权限</th>
                  <th className="px-5 py-3 font-medium">注册时间</th>
                  <th className="px-5 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map((user) => (
                  <tr key={user.id} className="border-b bg-card transition-colors hover:bg-muted/35 last:border-0">
                    <td className="px-5 py-4 align-top">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-background text-sm font-semibold text-primary shadow-sm">
                          {userInitial(user.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium" title={user.name}>{user.name}</p>
                          {user.mustChangePassword ? (
                            <span className="mt-1 inline-flex items-center gap-1 rounded-md border border-orange-200 bg-orange-50 px-1.5 py-0.5 text-[11px] font-medium text-orange-700 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-200">
                              <KeyRound className="h-3 w-3" />
                              待改密
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="break-all px-5 py-4 align-top text-muted-foreground">{user.email}</td>
                    <td className="px-5 py-4 align-top">
                      <ActionForm action={adminUpdateUserRoleAction} submitLabel="保存" pendingLabel="保存中..." className="flex flex-wrap items-center gap-2 [&>button]:h-8 [&>button]:px-3 [&>button]:text-xs [&>p]:basis-full [&>p]:py-1.5 [&>p]:text-xs">
                        <input type="hidden" name="userId" value={user.id} />
                        <select
                          name="systemRole"
                          defaultValue={user.systemRole}
                          className="h-8 w-28 rounded-md border bg-background px-2 text-xs font-medium shadow-sm"
                          aria-label={`修改 ${user.name} 的系统角色`}
                        >
                          {systemRoles.map((role) => (
                            <option key={role} value={role}>{systemRoleLabels[role]}</option>
                          ))}
                        </select>
                      </ActionForm>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <ProjectPermissionBadges
                        memberships={user.projectMemberships}
                        isSystemAdmin={user.systemRole === "SUPER_ADMIN"}
                      />
                    </td>
                    <td className="px-5 py-4 align-top text-muted-foreground">
                      {user.createdAt.toLocaleDateString("zh-CN")}
                    </td>
                    <td className="px-5 py-4 align-top">
                      <details className="group relative inline-block">
                        <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground shadow-sm transition hover:border-primary/40 hover:text-primary">
                          <KeyRound className="h-3.5 w-3.5" />
                          重置密码
                        </summary>
                        <div className="absolute right-0 z-10 mt-2 rounded-md border bg-card p-3 shadow-lg">
                          <ActionForm action={adminResetPasswordAction} submitLabel="重置" pendingLabel="重置中..." className="space-y-3">
                            <input type="hidden" name="userId" value={user.id} />
                            <div className="flex items-center gap-2">
                              <Input name="newPassword" type="password" placeholder="新密码（至少8位）" className="h-8 w-44 text-xs" aria-label={`重置 ${user.name} 的密码`} required />
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
