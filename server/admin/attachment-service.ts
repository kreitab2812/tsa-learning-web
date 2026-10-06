import "server-only";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { contentTransaction } from "@/server/db/transaction";
import { HttpError } from "@/server/http/errors";
import { attachmentInput, attachmentPatch, MAX_ATTACHMENTS } from "@/features/lessons/attachments";

export const attachmentSelect = { id: true, title: true, url: true, section: true, kind: true, allowDownload: true, watermark: true,
  sourceKey: true, sizeBytes: true, mimeType: true } as const;

export async function listLessonAttachments(lessonId: string) {
  return prisma.lessonAttachment.findMany({ where: { lessonId }, select: attachmentSelect, orderBy: [{ section: "asc" }, { order: "asc" }, { id: "asc" }], take: MAX_ATTACHMENTS });
}

export async function addLessonAttachment(lessonId: string, input: z.input<typeof attachmentInput>, upload?: { driveFileId: string; mimeType: string; sizeBytes: number }) {
  const data = attachmentInput.parse(input);
  return contentTransaction(async tx => {
    await tx.lesson.findUniqueOrThrow({ where: { id: lessonId }, select: { id: true } });
    const sourceKey = data.section === "THEORY" ? "theoryDocumentUrl" : data.section === "PRACTICE" ? "practiceDocumentUrl" : null;
    const existing = sourceKey ? await tx.lessonAttachment.findUnique({ where: { lessonId_sourceKey: { lessonId, sourceKey } } }) : null;
    if (!existing && await tx.lessonAttachment.count({ where: { lessonId } }) >= MAX_ATTACHMENTS) throw new HttpError(400, "Mỗi bài tối đa 100 tài liệu.");
    const metadata = { ...data, mimeType: upload?.mimeType ?? null, sizeBytes: upload?.sizeBytes ?? null, driveFileId: upload?.driveFileId ?? null };
    if (sourceKey) await tx.lesson.update({ where: { id: lessonId }, data: { [sourceKey]: data.url } });
    if (existing) return tx.lessonAttachment.update({ where: { id: existing.id }, data: metadata, select: attachmentSelect });
    const last = await tx.lessonAttachment.aggregate({ where: { lessonId }, _max: { order: true } });
    return tx.lessonAttachment.create({ data: { lessonId, sourceKey, order: (last._max.order ?? -1) + 1, ...metadata }, select: attachmentSelect });
  });
}

export async function patchLessonAttachment(lessonId: string, input: z.input<typeof attachmentPatch>) {
  const { id, ...data } = attachmentPatch.parse(input);
  return contentTransaction(async tx => {
    const current = await tx.lessonAttachment.findFirstOrThrow({ where: { id, lessonId } });
    if (current.kind !== "PDF" && data.watermark) throw new HttpError(400, "Watermark chỉ áp dụng PDF.");
    return tx.lessonAttachment.update({ where: { id }, data, select: attachmentSelect });
  });
}

export async function removeLessonAttachment(lessonId: string, id: string) {
  return contentTransaction(async tx => {
    const current = await tx.lessonAttachment.findFirstOrThrow({ where: { id, lessonId } });
    if (current.sourceKey && ["documentUrl", "exerciseUrl", "answerUrl", "theoryDocumentUrl", "practiceDocumentUrl"].includes(current.sourceKey)) {
      await tx.lesson.update({ where: { id: lessonId }, data: { [current.sourceKey]: null } });
    }
    await tx.lessonAttachment.delete({ where: { id } });
  }); // Removing a lesson reference never deletes a Google Drive file.
}
