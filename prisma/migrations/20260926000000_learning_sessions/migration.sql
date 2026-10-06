CREATE TABLE "LessonRun" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "lessonId" TEXT NOT NULL,
  "preview" BOOLEAN NOT NULL DEFAULT false, "currentStep" INTEGER NOT NULL DEFAULT 0,
  "completedSteps" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  "completed" BOOLEAN NOT NULL DEFAULT false, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LessonRun_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LessonRun_currentStep_check" CHECK ("currentStep" BETWEEN 0 AND 3),
  CONSTRAINT "LessonRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LessonRun_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "LessonRun_userId_lessonId_preview_key" ON "LessonRun"("userId", "lessonId", "preview");
CREATE INDEX "LessonRun_lessonId_idx" ON "LessonRun"("lessonId");
CREATE TABLE "QuizSession" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "lessonId" TEXT NOT NULL,
  "preview" BOOLEAN NOT NULL DEFAULT false, "activeKey" TEXT,
  "snapshot" JSONB NOT NULL, "answers" JSONB NOT NULL DEFAULT '{}', "revision" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "deadlineAt" TIMESTAMP(3),
  "submittedAt" TIMESTAMP(3), "result" JSONB,
  CONSTRAINT "QuizSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "QuizSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "QuizSession_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "QuizSession_activeKey_key" ON "QuizSession"("activeKey");
CREATE INDEX "QuizSession_userId_lessonId_preview_startedAt_idx" ON "QuizSession"("userId", "lessonId", "preview", "startedAt");
ALTER TABLE "ExerciseAttempt" ADD COLUMN "sessionId" TEXT;
CREATE UNIQUE INDEX "ExerciseAttempt_sessionId_key" ON "ExerciseAttempt"("sessionId");
ALTER TABLE "ExerciseAttempt" ADD CONSTRAINT "ExerciseAttempt_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "QuizSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
