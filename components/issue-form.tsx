"use client";

import { createIssueAction, updateIssueAction } from "@/lib/actions";
import { priorityLabels, type IssuePriorityValue, type IssueStatusValue } from "@/lib/constants";
import { ActionForm } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type MemberOption = { id: string; name: string; email: string };
type IssueDefaults = {
  id: string;
  title: string;
  description?: string | null;
  status: IssueStatusValue;
  priority: IssuePriorityValue;
  assigneeId?: string | null;
  dueDate?: Date | string | null;
};

export function IssueForm({
  workspaceSlug,
  projectKey,
  members,
  defaults,
  currentUserId,
  onSuccess,
}: {
  workspaceSlug: string;
  projectKey: string;
  members: MemberOption[];
  defaults?: IssueDefaults;
  currentUserId?: string;
  onSuccess?: () => void;
}) {
  const action = defaults
    ? updateIssueAction.bind(null, workspaceSlug, projectKey, defaults.id)
    : createIssueAction.bind(null, workspaceSlug, projectKey);

  return (
    <ActionForm action={action} submitLabel={defaults ? "保存任务" : "创建任务"} onSuccess={onSuccess}>
      <input type="hidden" name="status" value={defaults?.status ?? "TODO"} />
      <div className="space-y-2">
        <Label htmlFor="issue-title">标题</Label>
        <Input id="issue-title" name="title" defaultValue={defaults?.title} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="issue-description">描述</Label>
        <Textarea id="issue-description" name="description" defaultValue={defaults?.description ?? ""} rows={4} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="issue-priority">优先级</Label>
          <select id="issue-priority" name="priority" defaultValue={defaults?.priority ?? "MEDIUM"} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
            {Object.entries(priorityLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="issue-assignee">负责人</Label>
            {currentUserId && !defaults ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto px-1 py-0 text-xs text-primary"
                onClick={() => {
                  const select = document.getElementById("issue-assignee") as HTMLSelectElement | null;
                  if (select) select.value = currentUserId;
                }}
              >
                指派给我
              </Button>
            ) : null}
          </div>
          <select id="issue-assignee" name="assigneeId" defaultValue={defaults?.assigneeId ?? ""} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
            <option value="">未分配</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>{member.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="issue-due-date">截止日期</Label>
          <Input
            id="issue-due-date"
            name="dueDate"
            type="date"
            defaultValue={defaults?.dueDate ? new Date(defaults.dueDate).toISOString().slice(0, 10) : ""}
          />
        </div>
      </div>
    </ActionForm>
  );
}
