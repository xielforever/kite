import type { ComponentType } from "react";
import { CheckCircle2, CircleDot, CircleSlash, ClipboardCheck, PlayCircle } from "lucide-react";
import { updateIssueStatusAction } from "@/lib/actions";
import { issueStatusTransitions, statusLabels, statusTransitionLabels, type IssueStatusValue } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";

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
  const normalTransitions = nextStatuses.filter((status) => status !== "CLOSED");
  const canClose = nextStatuses.includes("CLOSED");

  return (
    <div className="space-y-3">
      <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
        当前状态：<span className="font-medium">{statusLabels[currentStatus]}</span>
      </div>
      {nextStatuses.length ? (
        <>
          {normalTransitions.length ? (
            <div className="grid grid-cols-2 gap-2">
              {normalTransitions.map((status) => {
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
          ) : null}
          {canClose ? (
            <div className="rounded-md border border-destructive/25 bg-destructive/5 p-3">
              <p className="mb-2 text-xs text-muted-foreground">关闭表示该任务不再继续处理，操作会写入活动记录。</p>
              <form
                action={async () => {
                  "use server";
                  await updateIssueStatusAction(workspaceSlug, projectKey, issueId, "CLOSED");
                }}
              >
                <ConfirmSubmitButton
                  type="submit"
                  variant="destructive"
                  size="sm"
                  className="w-full justify-start"
                  message="确定关闭这个任务？关闭后不能继续流转。"
                >
                  <CircleSlash className="h-4 w-4" />
                  关闭任务
                </ConfirmSubmitButton>
              </form>
            </div>
          ) : null}
        </>
      ) : (
        <p className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">当前状态已进入终态，不能继续流转。</p>
      )}
    </div>
  );
}
