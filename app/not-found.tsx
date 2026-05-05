import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">页面不存在</h1>
        <p className="mt-2 text-sm text-muted-foreground">这个页面可能已被删除，或者你没有访问权限。</p>
        <Button asChild className="mt-6">
          <Link href="/workspaces">返回工作区</Link>
        </Button>
      </div>
    </main>
  );
}
