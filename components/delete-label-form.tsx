import { Trash2 } from "lucide-react";
import { deleteLabelAction } from "@/lib/actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";

export function DeleteLabelForm({
  workspaceSlug,
  projectKey,
  labelId,
}: {
  workspaceSlug: string;
  projectKey: string;
  labelId: string;
}) {
  return (
    <form
      action={async () => {
        "use server";
        await deleteLabelAction(workspaceSlug, projectKey, labelId);
      }}
      className="mt-2"
    >
      <ConfirmSubmitButton type="submit" variant="ghost" size="sm" message="确定删除这个标签？任务上的该标签也会被移除。">
        <Trash2 className="h-4 w-4" />
        删除
      </ConfirmSubmitButton>
    </form>
  );
}
