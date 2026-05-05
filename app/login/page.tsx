import Link from "next/link";
import { redirect } from "next/navigation";
import { loginAction } from "@/lib/actions";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ActionForm } from "@/components/action-form";
import { KiteLogo } from "@/components/kite-logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; reason?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  if (params.reason !== "expired" && session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { mustChangePassword: true },
    });
    if (user?.mustChangePassword) redirect("/setup/change-password");
    if (user) redirect("/workspaces");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <KiteLogo size={34} className="mb-2" />
          <CardTitle>登录 Kite</CardTitle>
          <p className="text-sm text-muted-foreground">进入你的工作区和项目。</p>
        </CardHeader>
        <CardContent>
          {params.reason === "expired" ? (
            <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              登录状态已失效，请重新登录。
            </p>
          ) : null}
          <ActionForm action={loginAction} submitLabel="登录" pendingLabel="登录中...">
            <input type="hidden" name="callbackUrl" value={params.callbackUrl ?? ""} />
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input id="password" name="password" type="password" autoComplete="current-password" required />
            </div>
          </ActionForm>
          <p className="mt-4 text-sm text-muted-foreground">
            还没有账号？{" "}
            <Link href="/register" className="font-medium text-primary">
              注册
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
