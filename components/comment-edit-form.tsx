"use client";

import { updateCommentAction } from "@/lib/actions";
import { ActionForm } from "@/components/action-form";
import { Textarea } from "@/components/ui/textarea";

export function CommentEditForm({
  workspaceSlug,
  projectKey,
  comment,
}: {
  workspaceSlug: string;
  projectKey: string;
  comment: { id: string; body: string };
}) {
  const action = updateCommentAction.bind(null, workspaceSlug, projectKey, comment.id);

  return (
    <ActionForm action={action} submitLabel="保存评论" className="space-y-3">
      <Textarea name="body" defaultValue={comment.body} rows={3} required />
    </ActionForm>
  );
}
