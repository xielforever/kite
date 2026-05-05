"use client";

import { createCommentAction } from "@/lib/actions";
import { ActionForm } from "@/components/action-form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function CommentForm({
  workspaceSlug,
  projectKey,
  issueId,
}: {
  workspaceSlug: string;
  projectKey: string;
  issueId: string;
}) {
  const action = createCommentAction.bind(null, workspaceSlug, projectKey, issueId);
  return (
    <ActionForm action={action} submitLabel="发表评论">
      <div className="space-y-2">
        <Label htmlFor="body">评论</Label>
        <Textarea id="body" name="body" required rows={3} />
      </div>
    </ActionForm>
  );
}
