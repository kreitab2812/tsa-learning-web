import "server-only";
import { prisma } from "@/server/db/prisma";
import { attachmentSelect } from "./attachment-service";
import { MAX_ATTACHMENTS } from "@/features/lessons/attachments";

export async function getAdminLesson(id: string) {
  return prisma.lesson.findUniqueOrThrow({
    where: { id },
    include: {
      chapter: { select: { id: true, title: true, subjectId: true, parentId: true,
        subject: { select: { stage: { select: { courseId: true } } } } } },
      _count: { select: { questions: true } },
      attachments: { select: attachmentSelect, orderBy: [{ order: "asc" }, { id: "asc" }], take: MAX_ATTACHMENTS },
    },
  });
}

export async function listAdminQuestions(lessonId: string, page = 1) {
  // One bounded query, no COUNT round-trip. Extra row indicates the next page.
  const rows = await prisma.question.findMany({
    where: { lessonId }, orderBy: [{ order: "asc" }, { id: "asc" }],
    skip: (page - 1) * 20, take: 21,
  });
  return { questions: rows.slice(0, 20), page, hasMore: rows.length > 20 };
}
