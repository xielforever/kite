import { Trash2 } from "lucide-react";
import { deleteLabelAction } from "@/lib/actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";

export function DeleteLabelForm({
  labelId,
}: {
  labelId: string;
}) {
  return (
    <form
      action={async () => {
        "use server";
        await deleteLabelAction(labelId);
      }}
      className="mt-2"
    >
      <ConfirmSubmitButton type="submit" variant="ghost" size="sm" message="确定删除这个全局标签？所有任务上的该标签都会被移除。">
        <Trash2 className="h-4 w-4" />
        删除
      </ConfirmSubmitButton>
    </form>
  );
}
