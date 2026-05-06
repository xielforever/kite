-- Fix cascade delete: preserve comments and activities when user is removed
-- Change IssueComment.author and IssueActivity.actor from CASCADE to SET NULL

-- Step 1: Drop existing foreign key constraints
ALTER TABLE "IssueComment" DROP CONSTRAINT "IssueComment_authorId_fkey";
ALTER TABLE "IssueActivity" DROP CONSTRAINT "IssueActivity_actorId_fkey";

-- Step 2: Make authorId/actorId nullable
ALTER TABLE "IssueComment" ALTER COLUMN "authorId" DROP NOT NULL;
ALTER TABLE "IssueActivity" ALTER COLUMN "actorId" DROP NOT NULL;

-- Step 3: Re-add foreign keys with SET NULL
ALTER TABLE "IssueComment" ADD CONSTRAINT "IssueComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IssueActivity" ADD CONSTRAINT "IssueActivity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
