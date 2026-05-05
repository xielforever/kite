-- Convert project-scoped labels into one global label catalog.
-- If multiple projects had labels with the same name, keep one canonical label
-- and repoint every issue-label relation to it before removing projectId.
CREATE TEMP TABLE "LabelCanonical" AS
SELECT
  "name",
  MIN("id") AS "keepId"
FROM "Label"
GROUP BY "name";

UPDATE "IssueLabel" AS issue_label
SET "labelId" = canonical."keepId"
FROM "Label" AS old_label
JOIN "LabelCanonical" AS canonical
  ON canonical."name" = old_label."name"
WHERE issue_label."labelId" = old_label."id"
  AND issue_label."labelId" <> canonical."keepId";

DELETE FROM "Label" AS old_label
USING "LabelCanonical" AS canonical
WHERE old_label."name" = canonical."name"
  AND old_label."id" <> canonical."keepId";

DROP TABLE "LabelCanonical";

ALTER TABLE "Label" DROP CONSTRAINT "Label_projectId_fkey";
DROP INDEX "Label_projectId_name_key";
ALTER TABLE "Label" DROP COLUMN "projectId";
CREATE UNIQUE INDEX "Label_name_key" ON "Label"("name");
