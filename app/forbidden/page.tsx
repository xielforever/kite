import Link from "next/link";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <ShieldX className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="mt-4 text-2xl font-semibold">访问受限</h1>
        <p className="mt-2 text-sm text-muted-foreground">你没有权限访问此页面。如需权限，请联系管理员。</p>
        <div className="mt-6">
          <Button asChild>
            <Link href="/workspaces">返回工作区</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
