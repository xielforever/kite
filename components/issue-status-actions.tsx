import type { ComponentType } from "react";
import { CheckCircle2, CircleDot, CircleSlash, ClipboardCheck, PlayCircle } from "lucide-react";
import { updateIssueStatusAction } from "@/lib/actions";
import { issueStatusTransitions, statusLabels, statusTransitionLabels, type IssueStatusValue } from "@/lib/constants";
import { Button } from "@/components/ui/button";

const statusIcons: Record<IssueStatusValue, ComponentType<{ className?: string }>> = {
  TODO: CircleDot,
  IN_PROGRESS: PlayCircle,
  REVIEW: ClipboardCheck,
  DONE: CheckCircle2,
  CLOSED: CircleSlash,
};

export function IssueStatusActions({
  workspaceSlug,
  projectKey,
  issueId,
  currentStatus,
}: {
  workspaceSlug: string;
  projectKey: string;
  issueId: string;
  currentStatus: IssueStatusValue;
}) {
  const nextStatuses = issueStatusTransitions[currentStatus];

  return (
    <div className="space-y-3">
      <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
        当前状态：<span className="font-medium">{statusLabels[currentStatus]}</span>
      </div>
      {nextStatuses.length ? (
        <div className="grid grid-cols-2 gap-2">
          {nextStatuses.map((status) => {
            const Icon = statusIcons[status];
            return (
              <form
                key={status}
                action={async () => {
                  "use server";
                  await updateIssueStatusAction(workspaceSlug, projectKey, issueId, status);
                }}
              >
                <Button type="submit" variant="outline" size="sm" className="w-full justify-start">
                  <Icon className="h-4 w-4" />
                  {statusTransitionLabels[status]}
                </Button>
              </form>
            );
          })}
        </div>
      ) : (
        <p className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">当前状态已进入终态，不能继续流转。</p>
      )}
    </div>
  );
}
