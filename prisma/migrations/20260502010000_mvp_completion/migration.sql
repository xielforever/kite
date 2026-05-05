ALTER TABLE "Project" ADD COLUMN "nextIssueNumber" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Issue" ADD COLUMN "number" INTEGER;

WITH numbered AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (PARTITION BY "projectId" ORDER BY "createdAt", "id") AS rn
  FROM "Issue"
)
UPDATE "Issue"
SET "number" = numbered.rn
FROM numbered
WHERE "Issue"."id" = numbered."id";

ALTER TABLE "Issue" ALTER COLUMN "number" SET NOT NULL;

UPDATE "Project"
SET "nextIssueNumber" = COALESCE((
  SELECT MAX("number") + 1
  FROM "Issue"
  WHERE "Issue"."projectId" = "Project"."id"
), 1);

CREATE UNIQUE INDEX "Issue_projectId_number_key" ON "Issue"("projectId","number");

CREATE TABLE "IssueActivity" (
  "id" TEXT NOT NULL,
  "issueId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "detail" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IssueActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IssueActivity_issueId_createdAt_idx" ON "IssueActivity"("issueId","createdAt");
ALTER TABLE "IssueActivity" ADD CONSTRAINT "IssueActivity_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IssueActivity" ADD CONSTRAINT "IssueActivity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
