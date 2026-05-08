"use client";

import { useEffect, useMemo, useState } from "react";
import { createProjectAction } from "@/lib/actions";
import { projectKey } from "@/lib/utils";
import { ActionForm } from "@/components/action-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ProjectForm({ workspaceSlug, onSuccess }: { workspaceSlug: string; onSuccess?: () => void }) {
  const [name, setName] = useState("");
  const [keyValue, setKeyValue] = useState("");
  const [keyTouched, setKeyTouched] = useState(false);
  const defaultKey = useMemo(() => projectKey(name), [name]);
  const action = createProjectAction.bind(null, workspaceSlug);

  useEffect(() => {
    if (!keyTouched) setKeyValue(defaultKey);
  }, [defaultKey, keyTouched]);

  return (
    <ActionForm action={action} submitLabel="创建项目" onSuccess={onSuccess}>
      <div className="space-y-2">
        <Label htmlFor="new-project-name">项目名称</Label>
        <Input id="new-project-name" name="name" value={name} onChange={(event) => setName(event.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="new-project-key">项目 Key</Label>
        <Input
          id="new-project-key"
          name="key"
          value={keyValue}
          onChange={(event) => {
            setKeyTouched(true);
            setKeyValue(projectKey(event.target.value));
          }}
          placeholder="PL"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="new-project-description">描述</Label>
        <Textarea id="new-project-description" name="description" rows={3} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="new-project-default-due-days">默认截止天数</Label>
        <Input
          id="new-project-default-due-days"
          name="defaultDueDays"
          type="number"
          min={1}
          max={365}
          placeholder="留空则不设默认截止日期"
        />
        <p className="text-xs text-muted-foreground">新建任务时自动设置截止日期为创建后的 N 天</p>
      </div>
      <div className="flex items-center gap-2">
        <input id="new-project-auto-join" name="autoJoin" type="checkbox" value="on" className="h-4 w-4 rounded border" />
        <Label htmlFor="new-project-auto-join" className="cursor-pointer">新成员自动加入此项目</Label>
      </div>
    </ActionForm>
  );
}
