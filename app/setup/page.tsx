import Link from "next/link";
import { redirect } from "next/navigation";
import { DatabaseZap } from "lucide-react";
import { SetupForm } from "@/components/setup-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createSuperAdminAction, getSetupDefaults, getSetupStatus, migrateDatabaseAction, validateDatasourceAction } from "@/lib/setup";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const status = await getSetupStatus();
  if (status.initialized) redirect("/login");

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,hsl(var(--background)),hsl(var(--secondary)))] px-4 py-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <header className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <DatabaseZap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-accent">Kite Setup</p>
              <h1 className="text-2xl font-semibold tracking-normal text-foreground sm:text-3xl">初始化数据库与管理员</h1>
            </div>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            按步骤验证 PostgreSQL 连接、执行 Prisma 迁移，并创建第一个 superAdmin。数据库需要事先手动创建，账号需具备 public schema 建表权限。
          </p>
        </header>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <SetupForm
              validateAction={validateDatasourceAction}
              migrateAction={migrateDatabaseAction}
              createAdminAction={createSuperAdminAction}
              defaultValues={getSetupDefaults()}
            />
          </CardContent>
        </Card>

        <footer className="flex flex-col gap-3 rounded-md border bg-muted/50 px-3 py-3 text-xs leading-5 text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p>配置文件写入位置：{status.envPath}</p>
            <p>
              systemd 部署时建议设置 <code>KITE_ENV_FILE=/etc/kite/kite.env</code>。
            </p>
          </div>
          <Button asChild variant="ghost" size="sm" className="self-start sm:self-center">
            <Link href="/login">返回登录</Link>
          </Button>
        </footer>
      </div>
    </main>
  );
}
