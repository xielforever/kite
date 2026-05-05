CREATE TYPE "SystemRole" AS ENUM ('SUPER_ADMIN', 'USER');

ALTER TABLE "User"
ADD COLUMN "systemRole" "SystemRole" NOT NULL DEFAULT 'USER';

UPDATE "User"
SET "systemRole" = 'SUPER_ADMIN'
WHERE "email" = 'admin@example.com';
