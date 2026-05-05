"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">操作失败</h1>
        <p className="mt-2 text-sm text-muted-foreground">请刷新后重试，或返回上一页检查输入。</p>
        <Button className="mt-6" onClick={reset}>
          重试
        </Button>
      </div>
    </main>
  );
}
