import Link from "next/link";
import { LogOut, Moon, SlidersHorizontal, Sun } from "lucide-react";
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
            {workspaceSlug ? <WorkspaceNav workspaceSlug={workspaceSlug} /> : null}
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <ThemeToggle />
            {isSystemAdmin ? (
              <Button asChild variant="outline" size="sm">
                <Link href="/admin" title="系统后台">
                  <SlidersHorizontal className="h-4 w-4" />
                  <span className="hidden sm:inline">后台</span>
                </Link>
              </Button>
            ) : null}
            <Link
              href="/settings/profile"
              className="flex min-w-0 items-center gap-2 rounded-md border bg-background px-2 py-1.5 text-left transition-colors hover:bg-muted"
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
            <form action={logoutAction}>
              <Button variant="ghost" size="sm" title="退出登录">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">退出</span>
              </Button>
            </form>
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
