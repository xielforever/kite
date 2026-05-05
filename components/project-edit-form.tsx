"use client";

import { updateProjectAction } from "@/lib/actions";
import { ActionForm } from "@/components/action-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ProjectEditForm({
  workspaceSlug,
  project,
}: {
  workspaceSlug: string;
  project: { id: string; name: string; key: string; description?: string | null };
}) {
  const action = updateProjectAction.bind(null, workspaceSlug, project.id);

  return (
    <ActionForm action={action} submitLabel="保存项目">
      <div className="space-y-2">
        <Label htmlFor={`project-name-${project.id}`}>名称</Label>
        <Input id={`project-name-${project.id}`} name="name" defaultValue={project.name} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`project-key-${project.id}`}>Key</Label>
        <Input id={`project-key-${project.id}`} name="key" defaultValue={project.key} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`project-description-${project.id}`}>描述</Label>
        <Textarea id={`project-description-${project.id}`} name="description" defaultValue={project.description ?? ""} rows={3} />
      </div>
    </ActionForm>
  );
}
