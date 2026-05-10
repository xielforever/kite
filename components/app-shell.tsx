import Link from "next/link";
import { LogOut, SlidersHorizontal, UserRound } from "lucide-react";
import { logoutAction } from "@/lib/actions";
import { auth } from "@/lib/auth";
import { enforcePasswordReset } from "@/lib/password-guard";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { KiteLogo } from "@/components/kite-logo";
import { WorkspaceNav } from "@/components/workspace-nav";
import { ThemeToggle } from "@/components/theme-toggle";

function userInitial(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "U";
  return source.slice(0, 1).toUpperCase();
}

export async function AppShell({
  children,
  title,
  subtitle,
  workspaceSlug,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  workspaceSlug?: string;
}) {
  await enforcePasswordReset();
  const session = await auth();
  const currentUser = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { email: true, name: true, systemRole: true },
      })
    : session?.user;
  const displayName = currentUser?.name?.trim() || currentUser?.email || "当前用户";
  const email = currentUser?.email || "未设置邮箱";
  const isSystemAdmin = currentUser && "systemRole" in currentUser && currentUser.systemRole === "SUPER_ADMIN";

  return (
    <div className="min-h-screen">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex flex-wrap items-center gap-5">
            <Link href="/workspaces" className="text-sm">
              <KiteLogo size={26} />
            </Link>
            {workspaceSlug ? <WorkspaceNav workspaceSlug={workspaceSlug} showSettings={Boolean(isSystemAdmin)} /> : null}
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <ThemeToggle />
            {isSystemAdmin ? (
              <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
                <Link href="/admin" title="系统后台">
                  <SlidersHorizontal className="h-4 w-4" />
                  <span className="hidden sm:inline">后台</span>
                </Link>
              </Button>
            ) : null}
            <Link
              href="/settings/profile"
              className="hidden min-w-0 items-center gap-2 rounded-md border bg-background px-2 py-1.5 text-left transition-colors hover:bg-muted sm:flex"
              title={`当前账号：${email}`}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
                {userInitial(currentUser?.name, currentUser?.email)}
              </span>
              <span className="hidden min-w-0 leading-tight sm:block">
                <span className="block max-w-36 truncate text-sm font-medium text-foreground">{displayName}</span>
                <span className="block max-w-44 truncate text-xs text-muted-foreground">{email}</span>
              </span>
            </Link>
            <form action={logoutAction} className="hidden sm:block">
              <Button variant="ghost" size="sm" title="退出登录">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">退出</span>
              </Button>
            </form>
            <details className="group relative sm:hidden">
              <summary
                className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-md border bg-background text-xs font-semibold text-primary shadow-sm transition hover:bg-muted"
                title={`当前账号：${email}`}
                aria-label="打开账号菜单"
              >
                {userInitial(currentUser?.name, currentUser?.email)}
              </summary>
              <div className="fixed right-4 top-14 z-30 w-56 rounded-md border bg-card p-2 shadow-lg">
                <div className="border-b px-2 py-2">
                  <p className="truncate text-sm font-medium">{displayName}</p>
                  <p className="truncate text-xs text-muted-foreground">{email}</p>
                </div>
                <div className="grid gap-1 py-2">
                  <Link href="/settings/profile" className="flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted">
                    <UserRound className="h-4 w-4" />
                    个人资料
                  </Link>
                  {isSystemAdmin ? (
                    <Link href="/admin" className="flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted">
                      <SlidersHorizontal className="h-4 w-4" />
                      系统后台
                    </Link>
                  ) : null}
                </div>
                <form action={logoutAction} className="border-t pt-2">
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    <LogOut className="h-4 w-4" />
                    退出登录
                  </Button>
                </form>
              </div>
            </details>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        {children}
      </main>
    </div>
  );
}
