import Link from "next/link";
import { registerAction } from "@/lib/actions";
import { ActionForm } from "@/components/action-form";
import { KiteLogo } from "@/components/kite-logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <KiteLogo size={34} className="mb-2" />
          <CardTitle>创建账号</CardTitle>
          <p className="text-sm text-muted-foreground">注册后需要系统管理员添加到工作区。</p>
        </CardHeader>
        <CardContent>
          <ActionForm action={registerAction} submitLabel="注册并登录" pendingLabel="创建中...">
            <div className="space-y-2">
              <Label htmlFor="name">姓名</Label>
              <Input id="name" name="name" autoComplete="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
            </div>
          </ActionForm>
          <p className="mt-4 text-sm text-muted-foreground">
            已有账号？{" "}
            <Link href="/login" className="font-medium text-primary">
              登录
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
