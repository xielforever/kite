import Link from "next/link";
import { redirect } from "next/navigation";
import { registerAction } from "@/lib/actions";
import { publicRegistrationEnabled } from "@/lib/registration";
import { ActionForm } from "@/components/action-form";
import { KiteLogo } from "@/components/kite-logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import packageJson from "@/package.json";

export default function RegisterPage() {
  if (!publicRegistrationEnabled()) redirect("/login");

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <KiteLogo size={34} className="mb-2" />
          <CardTitle>创建账号</CardTitle>
          <p className="text-sm text-muted-foreground">注册后由项目负责人或系统管理员分配项目权限。</p>
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
          <div className="mt-5 border-t pt-4 text-xs leading-5 text-muted-foreground">
            <p>Kite v{packageJson.version} · 私有部署</p>
            <p>账号创建后不会自动加入任何项目。</p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
