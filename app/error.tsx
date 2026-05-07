"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h2 className="text-xl font-semibold">出了点问题</h2>
        <p className="mt-2 text-sm text-muted-foreground">页面加载时发生了意外错误，请尝试刷新。</p>
        <div className="mt-4">
          <Button onClick={reset}>重试</Button>
        </div>
      </div>
    </div>
  );
}
