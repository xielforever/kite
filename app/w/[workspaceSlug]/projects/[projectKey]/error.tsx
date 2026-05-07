"use client";

import { Button } from "@/components/ui/button";

export default function ProjectError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h2 className="text-xl font-semibold">项目加载失败</h2>
        <p className="mt-2 text-sm text-muted-foreground">请刷新后重试，或返回项目列表。</p>
        <div className="mt-4 flex justify-center gap-3">
          <Button variant="outline" onClick={() => history.back()}>
            返回
          </Button>
          <Button onClick={reset}>重试</Button>
        </div>
      </div>
    </div>
  );
}
