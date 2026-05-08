"use client";

import { updateProjectAction } from "@/lib/actions";
import { ActionForm } from "@/components/action-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ProjectEditForm({
  workspaceSlug,
  project,
  onSuccess,
}: {
  workspaceSlug: string;
  project: { id: string; name: string; key: string; description?: string | null; defaultDueDays?: number | null };
  onSuccess?: () => void;
}) {
  const action = updateProjectAction.bind(null, workspaceSlug, project.id);

  return (
    <ActionForm action={action} submitLabel="保存项目" onSuccess={onSuccess}>
      <div className="space-y-2">
        <Label htmlFor={`project-name-${project.id}`}>名称</Label>
        <Input id={`project-name-${project.id}`} name="name" defaultValue={project.name} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`project-key-${project.id}`}>Key</Label>
        <Input id={`project-key-${project.id}`} name="key" defaultValue={project.key} readOnly className="cursor-not-allowed bg-muted" />
        <p className="text-xs text-muted-foreground">项目 Key 创建后不可修改</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`project-description-${project.id}`}>描述</Label>
        <Textarea id={`project-description-${project.id}`} name="description" defaultValue={project.description ?? ""} rows={3} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`project-default-due-days-${project.id}`}>默认截止天数</Label>
        <Input
          id={`project-default-due-days-${project.id}`}
          name="defaultDueDays"
          type="number"
          min={1}
          max={365}
          placeholder="留空则不设默认截止日期"
          defaultValue={project.defaultDueDays ?? ""}
        />
        <p className="text-xs text-muted-foreground">新建任务时自动设置截止日期为创建后的 N 天</p>
      </div>
    </ActionForm>
  );
}
