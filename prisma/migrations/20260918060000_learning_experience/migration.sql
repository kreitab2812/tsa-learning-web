CREATE TYPE "LearningActivityType" AS ENUM ('LESSON_OPENED', 'LESSON_COMPLETED', 'EXERCISE_SUBMITTED');

CREATE TABLE "LearningActivity" (
  "id" TEXT NOT NULL,
  "type" "LearningActivityType" NOT NULL,
  "userId" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LearningActivity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExerciseAttempt" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "score" DOUBLE PRECISION NOT NULL,
  "correctCount" INTEGER NOT NULL,
  "totalQuestions" INTEGER NOT NULL,
  "answers" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExerciseAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LearningActivity_userId_createdAt_idx" ON "LearningActivity"("userId", "createdAt");
CREATE INDEX "LearningActivity_lessonId_createdAt_idx" ON "LearningActivity"("lessonId", "createdAt");
CREATE INDEX "ExerciseAttempt_userId_createdAt_idx" ON "ExerciseAttempt"("userId", "createdAt");
CREATE INDEX "ExerciseAttempt_lessonId_createdAt_idx" ON "ExerciseAttempt"("lessonId", "createdAt");

ALTER TABLE "LearningActivity" ADD CONSTRAINT "LearningActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningActivity" ADD CONSTRAINT "LearningActivity_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExerciseAttempt" ADD CONSTRAINT "ExerciseAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExerciseAttempt" ADD CONSTRAINT "ExerciseAttempt_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExerciseAttempt" ADD CONSTRAINT "ExerciseAttempt_score_check" CHECK ("score" >= 0 AND "score" <= 100);
ALTER TABLE "ExerciseAttempt" ADD CONSTRAINT "ExerciseAttempt_counts_check" CHECK ("correctCount" >= 0 AND "totalQuestions" >= "correctCount");
