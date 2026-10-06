BEGIN;
CREATE TABLE "GoogleDriveConnection" (
  "userId" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL,
  "refreshToken" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GoogleDriveConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
ALTER TABLE "LessonAttachment"
  ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'PDF',
  ADD COLUMN "mimeType" TEXT,
  ADD COLUMN "sizeBytes" INTEGER,
  ADD COLUMN "driveFileId" TEXT;
CREATE UNIQUE INDEX "LessonAttachment_driveFileId_key" ON "LessonAttachment"("driveFileId");
COMMIT;
