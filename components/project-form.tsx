"use client";

import { useMemo, useState } from "react";
import { createProjectAction } from "@/lib/actions";
import { projectKey } from "@/lib/utils";
import { ActionForm } from "@/components/action-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ProjectForm({ workspaceSlug }: { workspaceSlug: string }) {
  const [name, setName] = useState("");
  const defaultKey = useMemo(() => projectKey(name), [name]);
  const action = createProjectAction.bind(null, workspaceSlug);

  return (
    <ActionForm action={action} submitLabel="创建项目">
      <div className="space-y-2">
        <Label htmlFor="name">项目名称</Label>
        <Input id="name" name="name" value={name} onChange={(event) => setName(event.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="key">项目 Key</Label>
        <Input id="key" name="key" defaultValue={defaultKey} placeholder="PL" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">描述</Label>
        <Textarea id="description" name="description" rows={3} />
      </div>
    </ActionForm>
  );
}
