-- Add missing database indexes for performance optimization
-- M1: User.systemRole index for admin page role filtering
CREATE INDEX "User_systemRole_idx" ON "User"("systemRole");
-- M2: Issue.creatorId index for querying user-created issues
CREATE INDEX "Issue_creatorId_idx" ON "Issue"("creatorId");
-- M3: Workspace.createdById index for querying user-created workspaces
CREATE INDEX "Workspace_createdById_idx" ON "Workspace"("createdById");
-- M4: IssueComment.authorId index for querying user comments
CREATE INDEX "IssueComment_authorId_idx" ON "IssueComment"("authorId");
-- M5: IssueActivity.actorId index for querying user activity records
CREATE INDEX "IssueActivity_actorId_idx" ON "IssueActivity"("actorId");
