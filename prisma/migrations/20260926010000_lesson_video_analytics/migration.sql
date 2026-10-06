CREATE TABLE "VideoWatch" (
  "userId" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "section" TEXT NOT NULL,
  "videoId" TEXT NOT NULL,
  "duration" DOUBLE PRECISION NOT NULL,
  "ranges" JSONB NOT NULL DEFAULT '[]',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VideoWatch_pkey" PRIMARY KEY ("userId", "lessonId", "section", "videoId"),
  CONSTRAINT "VideoWatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "VideoWatch_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "VideoWatch_lessonId_idx" ON "VideoWatch"("lessonId");
