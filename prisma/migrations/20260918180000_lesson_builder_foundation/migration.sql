BEGIN;

CREATE TYPE "LessonCompletionMode" AS ENUM ('MANUAL', 'QUIZ_SUBMITTED', 'QUIZ_PASSED');
CREATE TYPE "LessonStepNavigation" AS ENUM ('FREE', 'SEQUENTIAL');
CREATE TYPE "LessonSection" AS ENUM ('THEORY', 'PRACTICE', 'DOCUMENTS');

ALTER TABLE "Lesson"
  ADD COLUMN "theoryDocumentUrl" TEXT,
  ADD COLUMN "practiceDocumentUrl" TEXT,
  ADD COLUMN "theorySplitView" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "practiceSplitView" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "completionMode" "LessonCompletionMode" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN "stepNavigation" "LessonStepNavigation" NOT NULL DEFAULT 'FREE',
  ADD COLUMN "requireCompletionForNext" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "quizTimeLimitMinutes" INTEGER,
  ADD COLUMN "quizPassPercent" INTEGER NOT NULL DEFAULT 60,
  ADD COLUMN "quizMaxAttempts" INTEGER,
  ADD COLUMN "quizShuffleQuestions" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "quizShuffleAnswers" BOOLEAN NOT NULL DEFAULT false,
  ADD CONSTRAINT "Lesson_quiz_limits_check" CHECK (
    "quizPassPercent" BETWEEN 1 AND 100
    AND ("quizTimeLimitMinutes" IS NULL OR "quizTimeLimitMinutes" BETWEEN 1 AND 1440)
    AND ("quizMaxAttempts" IS NULL OR "quizMaxAttempts" BETWEEN 1 AND 100)
  );

CREATE TABLE "LessonAttachment" (
  "id" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "section" "LessonSection" NOT NULL DEFAULT 'DOCUMENTS',
  "order" INTEGER NOT NULL,
  "sourceKey" TEXT,
  "allowDownload" BOOLEAN NOT NULL DEFAULT true,
  "watermark" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "LessonAttachment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LessonAttachment_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "LessonAttachment_lessonId_sourceKey_key" ON "LessonAttachment"("lessonId", "sourceKey");
CREATE INDEX "LessonAttachment_lessonId_section_order_idx" ON "LessonAttachment"("lessonId", "section", "order");

-- Copy, never remove or reassign existing learning resources/history.
INSERT INTO "LessonAttachment" ("id", "lessonId", "title", "url", "order", "sourceKey")
SELECT 'legacy:' || lesson."id" || ':' || resource.key, lesson."id", resource.title, resource.url, resource.position, resource.key
FROM "Lesson" lesson
CROSS JOIN LATERAL (VALUES
  ('documentUrl', 'Tài liệu học tập', lesson."documentUrl", 0),
  ('exerciseUrl', 'Bài tập gốc', lesson."exerciseUrl", 1),
  ('answerUrl', 'Đáp án gốc', lesson."answerUrl", 2)
) AS resource(key, title, url, position)
WHERE resource.url IS NOT NULL AND btrim(resource.url) <> '';

COMMIT;
