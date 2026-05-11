import { requireSystemAdmin } from "@/lib/permissions";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, FolderKanban, KeyRound, Search, ShieldCheck, Users } from "lucide-react";
import { projectRoleLabels, type ProjectRoleValue } from "@/lib/constants";
import { adminResetPasswordAction } from "@/lib/actions";
import { ActionForm } from "@/components/action-form";
import { AdminCreateUserDialog } from "@/components/admin-create-user-dialog";
import { AdminExportIssuesDialog } from "@/components/admin-export-issues-dialog";
import { AdminRoleSelect } from "@/components/admin-role-select";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/pagination";

const ADMIN_USER_PAGE_SIZE = 20;

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

  if (memberships.length > 2) {
    return (
      <details className="group">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-primary">
          {memberships.length} 项项目权限
        </summary>
        <div className="mt-2 max-h-28 overflow-y-auto pr-1">
          <div className="flex flex-wrap gap-1.5">{badges}</div>
        </div>
      </details>
    );
  }

  return (
    <div className="max-h-24 overflow-y-auto pr-1">
      <div className="flex flex-wrap gap-1.5">{badges}</div>
    </div>
  );
}

function ResetPasswordControl({ user, inline = false }: { user: { id: string; name: string }; inline?: boolean }) {
  return (
    <details className={inline ? "group w-full" : "group relative inline-block"}>
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground shadow-sm transition hover:border-primary/40 hover:text-primary">
        <KeyRound className="h-3.5 w-3.5" />
        重置密码
      </summary>
      <div className={inline ? "mt-2 rounded-md border bg-card p-3" : "absolute right-0 z-10 mt-2 rounded-md border bg-card p-3 shadow-lg"}>
        <ActionForm action={adminResetPasswordAction} submitLabel="重置" pendingLabel="重置中..." className="space-y-3">
          <input type="hidden" name="userId" value={user.id} />
          <div className="flex items-center gap-2">
            <Input name="newPassword" type="password" placeholder="新密码（至少8位）" className={inline ? "h-8 text-xs" : "h-8 w-44 text-xs"} aria-label={`重置 ${user.name} 的密码`} required />
          </div>
        </ActionForm>
      </div>
    </details>
  );
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const adminUser = await requireSystemAdmin();
  const params = await searchParams;
  const query = params.q?.trim().slice(0, 120) ?? "";
  const parsedPage = Number(params.page);
  const requestedPage = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const userWhere = query
    ? {
        OR: [
          { name: { contains: query, mode: "insensitive" as const } },
          { email: { contains: query, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [userCount, workspaceCount, projectCount, systemAdminCount, pendingPasswordCount, projectMemberCount, totalFilteredUsers] = await Promise.all([
    prisma.user.count(),
    prisma.workspace.count(),
    prisma.project.count({ where: { archived: false } }),
    prisma.user.count({ where: { systemRole: "SUPER_ADMIN" } }),
    prisma.user.count({ where: { mustChangePassword: true } }),
    prisma.user.count({ where: { projectMemberships: { some: {} } } }),
    prisma.user.count({ where: userWhere }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalFilteredUsers / ADMIN_USER_PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const recentUsers = await prisma.user.findMany({
    where: userWhere,
    orderBy: { createdAt: "desc" },
    skip: (currentPage - 1) * ADMIN_USER_PAGE_SIZE,
    take: ADMIN_USER_PAGE_SIZE,
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
  });
  const exportWorkspaces = await prisma.workspace.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      projects: {
        where: { archived: false },
        select: { id: true, key: true, name: true },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

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

      <Card className="mt-6 overflow-hidden" aria-labelledby="admin-users-title">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <CardTitle id="admin-users-title">用户管理</CardTitle>
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
              <p className="mt-3 max-w-2xl text-xs text-muted-foreground">
                系统管理员拥有全局访问和管理权限；项目权限列中的显式项目身份仅用于记录其在具体项目中的业务角色。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <form action="/admin" method="get" className="flex min-w-0 items-center gap-2">
                <div className="relative min-w-0">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    name="q"
                    defaultValue={query}
                    placeholder="搜索姓名或邮箱"
                    className="h-9 w-56 pl-8 text-sm"
                    aria-label="搜索用户"
                  />
                </div>
                <Button type="submit" variant="outline" size="sm" className="bg-background">
                  搜索
                </Button>
              </form>
              <AdminCreateUserDialog />
              <AdminExportIssuesDialog workspaces={exportWorkspaces} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border-b bg-card px-5 py-3 text-sm text-muted-foreground">
            {query ? `搜索「${query}」：${totalFilteredUsers} 个用户` : `共 ${userCount} 个用户`}，当前第 {currentPage}/{totalPages} 页
          </div>
          <div className="hidden overflow-x-auto lg:block">
            <table className="min-w-[1210px] table-fixed text-sm">
              <caption className="sr-only">系统后台用户管理列表，可创建用户、调整系统角色、查看项目权限并重置密码。</caption>
              <colgroup>
                <col className="w-[190px]" />
                <col className="w-[220px]" />
                <col className="w-[250px]" />
                <col className="w-[300px]" />
                <col className="w-[110px]" />
                <col className="w-[140px]" />
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
                      <AdminRoleSelect
                        userId={user.id}
                        userName={user.name}
                        value={user.systemRole}
                        disabled={user.id === adminUser.id}
                      />
                    </td>
                    <td className="px-5 py-4 align-top">
                      <ProjectPermissionBadges
                        memberships={user.projectMemberships}
                        isSystemAdmin={user.systemRole === "SUPER_ADMIN"}
                      />
                    </td>
                    <td className="px-5 py-4 align-top text-muted-foreground">
                      <time dateTime={user.createdAt.toISOString()}>{user.createdAt.toLocaleDateString("zh-CN")}</time>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <ResetPasswordControl user={user} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="divide-y lg:hidden">
            {recentUsers.map((user) => (
              <article key={user.id} className="space-y-4 bg-card p-4">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-background text-sm font-semibold text-primary shadow-sm">
                    {userInitial(user.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-medium" title={user.name}>{user.name}</h3>
                      {user.mustChangePassword ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-orange-200 bg-orange-50 px-1.5 py-0.5 text-[11px] font-medium text-orange-700 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-200">
                          <KeyRound className="h-3 w-3" />
                          待改密
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 break-all text-sm text-muted-foreground">{user.email}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      注册于 <time dateTime={user.createdAt.toISOString()}>{user.createdAt.toLocaleDateString("zh-CN")}</time>
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 rounded-md border bg-background p-3">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">系统角色</p>
                    <AdminRoleSelect
                      userId={user.id}
                      userName={user.name}
                      value={user.systemRole}
                      disabled={user.id === adminUser.id}
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">项目权限</p>
                    <ProjectPermissionBadges
                      memberships={user.projectMemberships}
                      isSystemAdmin={user.systemRole === "SUPER_ADMIN"}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <ResetPasswordControl user={user} inline />
                </div>
              </article>
            ))}
          </div>
          <div className="border-t px-5 py-3">
            <Pagination total={totalFilteredUsers} pageSize={ADMIN_USER_PAGE_SIZE} currentPage={currentPage} />
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
