import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">无权访问</h1>
        <p className="mt-2 text-sm text-muted-foreground">你没有访问此页面或执行此操作的权限。</p>
        <Button asChild className="mt-6">
          <Link href="/workspaces">返回工作区</Link>
        </Button>
      </div>
    </main>
  );
}
