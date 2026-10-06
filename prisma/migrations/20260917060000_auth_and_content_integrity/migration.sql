-- Preserve existing hashes. Legacy plaintext credentials are intentionally not
-- accepted by the new verifier and must be replaced through account tooling.
ALTER TABLE "User" RENAME COLUMN "password" TO "passwordHash";

CREATE TYPE "LessonStatus" AS ENUM ('DRAFT', 'PUBLISHED');
ALTER TABLE "Lesson" ALTER COLUMN "status" DROP DEFAULT;
-- Previously unsupported scheduled lessons become drafts until reviewed.
ALTER TABLE "Lesson" ALTER COLUMN "status" TYPE "LessonStatus"
  USING (CASE WHEN "status"::text = 'PUBLISHED' THEN 'PUBLISHED' ELSE 'DRAFT' END)::"LessonStatus";
ALTER TABLE "Lesson" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

CREATE TABLE "Session" (
  "tokenHash" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
CREATE TABLE "LoginThrottle" (
  "key" TEXT NOT NULL PRIMARY KEY,
  "attempts" INTEGER NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "LoginThrottle_expiresAt_idx" ON "LoginThrottle"("expiresAt");
CREATE INDEX "Chapter_parentId_idx" ON "Chapter"("parentId");

-- Business constraints are additionally enforced by shared input schemas.
ALTER TABLE "Course" ADD CONSTRAINT "Course_scheduled_publishAt_check"
  CHECK ("status" <> 'SCHEDULED' OR "publishAt" IS NOT NULL);
ALTER TABLE "Stage" ADD CONSTRAINT "Stage_time_locked_unlockAt_check"
  CHECK ("accessMode" <> 'TIME_LOCKED' OR "unlockAt" IS NOT NULL);
ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_not_own_parent_check" CHECK ("id" <> "parentId");
ALTER TABLE "Stage" ADD CONSTRAINT "Stage_order_nonnegative" CHECK ("order" >= 0);
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_order_nonnegative" CHECK ("order" >= 0);
ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_order_nonnegative" CHECK ("order" >= 0);
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_order_nonnegative" CHECK ("order" >= 0);
ALTER TABLE "Question" ADD CONSTRAINT "Question_order_nonnegative" CHECK ("order" >= 0);
