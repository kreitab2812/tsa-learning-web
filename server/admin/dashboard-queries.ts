import "server-only";
import { prisma } from "@/server/db/prisma";

export async function getAdminSummary() {
  const [summary] = await prisma.$queryRaw<{ courses: number; subjects: number; lessons: number; questions: number }[]>`
    SELECT (SELECT COUNT(*)::int FROM "Course") AS courses,
      (SELECT COUNT(*)::int FROM "Subject") AS subjects,
      (SELECT COUNT(*)::int FROM "Lesson") AS lessons,
      (SELECT COUNT(*)::int FROM "Question") AS questions`;
  return summary;
}
