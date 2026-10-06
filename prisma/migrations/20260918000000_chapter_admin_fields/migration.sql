ALTER TABLE "Chapter"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "status" "LessonStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "openAt" TIMESTAMP(3),
  ADD COLUMN "closeAt" TIMESTAMP(3);

ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_valid_availability_check"
  CHECK ("openAt" IS NULL OR "closeAt" IS NULL OR "closeAt" > "openAt");
