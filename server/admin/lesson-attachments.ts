import "server-only";
import type { Prisma, Lesson } from "@prisma/client";
import { MAX_ATTACHMENTS } from "@/features/lessons/attachments";
import { HttpError } from "@/server/http/errors";

const sources = [
  { key: "documentUrl", title: "Tài liệu học tập", section: "DOCUMENTS", order: 0 },
  { key: "exerciseUrl", title: "Bài tập gốc", section: "DOCUMENTS", order: 1 },
  { key: "answerUrl", title: "Đáp án gốc", section: "DOCUMENTS", order: 2 },
  { key: "theoryDocumentUrl", title: "Tài liệu lý thuyết", section: "THEORY", order: 0 },
  { key: "practiceDocumentUrl", title: "Tài liệu thực hành", section: "PRACTICE", order: 0 },
] as const;

/** Mirror only explicitly edited legacy slots; never touch future custom files. */
export async function syncLessonAttachments(tx: Prisma.TransactionClient, lesson: Lesson, patch: object) {
  for (const { key, ...metadata } of sources) {
    if (!Object.hasOwn(patch, key)) continue;
    const url = lesson[key];
    if (url) {
      const existing = await tx.lessonAttachment.findUnique({ where: { lessonId_sourceKey: { lessonId: lesson.id, sourceKey: key } }, select: { url: true } });
      if (!existing && await tx.lessonAttachment.count({ where: { lessonId: lesson.id } }) >= MAX_ATTACHMENTS) throw new HttpError(400, "Mỗi bài tối đa 100 tài liệu.");
      await tx.lessonAttachment.upsert({
        where: { lessonId_sourceKey: { lessonId: lesson.id, sourceKey: key } },
        create: { lessonId: lesson.id, sourceKey: key, url, ...metadata },
        update: { url, ...(url !== existing?.url
          ? { driveFileId: null, mimeType: null, sizeBytes: null, kind: "PDF" } : {}) },
      });
    } else {
      await tx.lessonAttachment.deleteMany({ where: { lessonId: lesson.id, sourceKey: key } });
    }
  }
}
