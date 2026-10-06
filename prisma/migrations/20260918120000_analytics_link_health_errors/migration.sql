CREATE TYPE "LinkHealthStatus" AS ENUM ('UNKNOWN', 'HEALTHY', 'BROKEN', 'BLOCKED');
CREATE TYPE "LearningErrorType" AS ENUM ('VIDEO_LOAD', 'DOCUMENT_LOAD', 'SUBMISSION');

CREATE TABLE "LessonLinkHealth" (
  "id" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "status" "LinkHealthStatus" NOT NULL DEFAULT 'UNKNOWN',
  "statusCode" INTEGER,
  "error" TEXT,
  "checkedAt" TIMESTAMP(3),
  CONSTRAINT "LessonLinkHealth_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LearningError" (
  "id" TEXT NOT NULL,
  "type" "LearningErrorType" NOT NULL,
  "message" TEXT NOT NULL,
  "resourceUrl" TEXT,
  "userId" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LearningError_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LessonLinkHealth_lessonId_kind_key" ON "LessonLinkHealth"("lessonId", "kind");
CREATE INDEX "LessonLinkHealth_status_checkedAt_idx" ON "LessonLinkHealth"("status", "checkedAt");
CREATE INDEX "LearningError_userId_createdAt_idx" ON "LearningError"("userId", "createdAt");
CREATE INDEX "LearningError_lessonId_type_createdAt_idx" ON "LearningError"("lessonId", "type", "createdAt");

ALTER TABLE "LessonLinkHealth" ADD CONSTRAINT "LessonLinkHealth_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningError" ADD CONSTRAINT "LearningError_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningError" ADD CONSTRAINT "LearningError_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
