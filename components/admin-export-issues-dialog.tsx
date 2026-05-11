"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { statusColumns, statusLabels } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type ExportWorkspace = {
  id: string;
  name: string;
  slug: string;
  projects: { id: string; key: string; name: string }[];
};

export function AdminExportIssuesDialog({ workspaces }: { workspaces: ExportWorkspace[] }) {
  const [open, setOpen] = useState(false);
  const [workspaceSlug, setWorkspaceSlug] = useState("");
  const [projectKey, setProjectKey] = useState("");
  const [status, setStatus] = useState("");

  const projects = useMemo(
    () => workspaces.find((workspace) => workspace.slug === workspaceSlug)?.projects ?? [],
    [workspaceSlug, workspaces],
  );

  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    if (workspaceSlug) params.set("workspace", workspaceSlug);
    if (projectKey) params.set("project", projectKey);
    if (status) params.set("status", status);
    const query = params.toString();
    return query ? `/api/admin/exports/issues?${query}` : "/api/admin/exports/issues";
  }, [projectKey, status, workspaceSlug]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="outline" size="sm" className="shrink-0 bg-background" onClick={() => setOpen(true)}>
        <Download className="h-4 w-4" />
        导出项目任务
      </Button>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>导出项目任务</DialogTitle>
          <DialogDescription>按工作区、项目和任务状态筛选后导出 CSV，包含任务、评论和活动记录。</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="export-workspace">工作区</Label>
            <select
              id="export-workspace"
              value={workspaceSlug}
              onChange={(event) => {
                setWorkspaceSlug(event.currentTarget.value);
                setProjectKey("");
              }}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="">全部工作区</option>
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.slug}>
                  {workspace.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="export-project">项目</Label>
            <select
              id="export-project"
              value={projectKey}
              disabled={!workspaceSlug}
              onChange={(event) => setProjectKey(event.currentTarget.value)}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">全部项目</option>
              {projects.map((project) => (
                <option key={project.id} value={project.key}>
                  {project.key} · {project.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="export-status">任务状态</Label>
            <select
              id="export-status"
              value={status}
              onChange={(event) => setStatus(event.currentTarget.value)}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="">全部状态</option>
              {statusColumns.map((value) => (
                <option key={value} value={value}>
                  {statusLabels[value]}
                </option>
              ))}
            </select>
          </div>
          <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
            导出字段：工作区、项目、任务编号、标题、描述、状态、优先级、创建人、负责人、截止日期、创建/更新时间、评论、活动记录。
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button asChild>
              <a href={exportHref}>
                <Download className="h-4 w-4" />
                导出 CSV
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
