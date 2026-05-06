-- Remove unused User fields and add Workspace description
ALTER TABLE "User" DROP COLUMN IF EXISTS "emailVerified";
ALTER TABLE "User" DROP COLUMN IF EXISTS "image";
ALTER TABLE "Workspace" ADD COLUMN "description" TEXT;
