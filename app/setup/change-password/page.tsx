import { redirect } from "next/navigation";
import { forceChangePasswordAction } from "@/lib/actions";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ActionForm } from "@/components/action-form";
import { KiteLogo } from "@/components/kite-logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function ForceChangePasswordPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { mustChangePassword: true },
  });
  if (!user) redirect("/api/auth/session-expired");
  if (!user?.mustChangePassword) redirect("/workspaces");

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <KiteLogo size={34} className="mb-2" />
          <CardTitle>首次登录需要修改密码</CardTitle>
          <p className="text-sm text-muted-foreground">默认管理员密码只能用于初始化，请设置新的安全密码。</p>
        </CardHeader>
        <CardContent>
          <ActionForm action={forceChangePasswordAction} submitLabel="更新密码并进入">
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
    </main>
  );
}
