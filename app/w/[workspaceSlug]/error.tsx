"use client";

import { Button } from "@/components/ui/button";

export default function WorkspaceError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h2 className="text-xl font-semibold">工作区加载失败</h2>
        <p className="mt-2 text-sm text-muted-foreground">请刷新后重试，或返回工作区列表。</p>
        <div className="mt-4 flex justify-center gap-3">
          <Button variant="outline" onClick={() => (window.location.href = "/workspaces")}>
            返回列表
          </Button>
          <Button onClick={reset}>重试</Button>
        </div>
      </div>
    </div>
  );
}
