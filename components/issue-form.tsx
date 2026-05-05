"use client";

import { createIssueAction, updateIssueAction } from "@/lib/actions";
import { priorityLabels, statusLabels, type IssuePriorityValue, type IssueStatusValue } from "@/lib/constants";
import { ActionForm } from "@/components/action-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type MemberOption = { id: string; name: string; email: string };
type LabelOption = { id: string; name: string; color: string };
type IssueDefaults = {
  id: string;
  title: string;
  description?: string | null;
  status: IssueStatusValue;
  priority: IssuePriorityValue;
  assigneeId?: string | null;
  dueDate?: Date | string | null;
  labelIds: string[];
};

export function IssueForm({
  workspaceSlug,
  projectKey,
  members,
  labels,
  defaults,
}: {
  workspaceSlug: string;
  projectKey: string;
  members: MemberOption[];
  labels: LabelOption[];
  defaults?: IssueDefaults;
}) {
  const action = defaults
    ? updateIssueAction.bind(null, workspaceSlug, projectKey, defaults.id)
    : createIssueAction.bind(null, workspaceSlug, projectKey);

  return (
    <ActionForm action={action} submitLabel={defaults ? "保存任务" : "创建任务"}>
      <div className="space-y-2">
        <Label htmlFor="title">标题</Label>
        <Input id="title" name="title" defaultValue={defaults?.title} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">描述</Label>
        <Textarea id="description" name="description" defaultValue={defaults?.description ?? ""} rows={4} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="status">状态</Label>
          <select id="status" name="status" defaultValue={defaults?.status ?? "TODO"} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="priority">优先级</Label>
          <select id="priority" name="priority" defaultValue={defaults?.priority ?? "MEDIUM"} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
            {Object.entries(priorityLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="assigneeId">负责人</Label>
          <select id="assigneeId" name="assigneeId" defaultValue={defaults?.assigneeId ?? ""} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
            <option value="">未分配</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>{member.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="dueDate">截止日期</Label>
          <Input
            id="dueDate"
            name="dueDate"
            type="date"
            defaultValue={defaults?.dueDate ? new Date(defaults.dueDate).toISOString().slice(0, 10) : ""}
          />
        </div>
      </div>
      {labels.length ? (
        <div className="space-y-2">
          <Label>标签</Label>
          <div className="flex flex-wrap gap-2">
            {labels.map((label) => (
              <label key={label.id} className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-sm">
                <input
                  type="checkbox"
                  name="labelIds"
                  value={label.id}
                  defaultChecked={defaults?.labelIds.includes(label.id)}
                />
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: label.color }} />
                {label.name}
              </label>
            ))}
          </div>
        </div>
      ) : null}
    </ActionForm>
  );
}
