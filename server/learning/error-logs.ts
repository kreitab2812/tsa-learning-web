import "server-only";
import { HttpError } from "@/server/http/errors";
import { prisma } from "@/server/db/prisma";
import { getLearningLesson } from "./service";
import type { SessionUser } from "@/features/auth/types";
import type { z } from "zod";
import type { learningErrorSchema } from "@/features/learning/schemas";

export async function recordLearningError(user: SessionUser, input: z.output<typeof learningErrorSchema>) {
  if (user.role !== "STUDENT") throw new HttpError(403, "Preview không ghi nhật ký lỗi học viên.");
  const lesson = await getLearningLesson(user, input.lessonId);
  if (lesson.locked) throw new HttpError(403, "Bài học chưa mở.");
  if (input.resourceUrl) {
    const allowed = input.type === "VIDEO_LOAD" ? [lesson.videoTheoryUrl, lesson.videoPracticeUrl] : input.type === "DOCUMENT_LOAD" ? [lesson.documentUrl, lesson.exerciseUrl, lesson.answerUrl, lesson.theoryDocumentUrl, lesson.practiceDocumentUrl, ...lesson.attachments.map(file => file.url)] : [];
    if (!allowed.includes(input.resourceUrl)) throw new HttpError(400, "Tài nguyên không thuộc bước học đã mở.");
  }
  const recent = await prisma.learningError.findFirst({ where: {
    userId: user.id, lessonId: input.lessonId, type: input.type, message: input.message,
    resourceUrl: input.resourceUrl ?? null, createdAt: { gte: new Date(Date.now() - 60000) },
  }, select: { id: true } });
  if (recent) return;
  await prisma.learningError.create({ data: {
    userId: user.id, lessonId: input.lessonId, type: input.type,
    message: input.message, resourceUrl: input.resourceUrl ?? null,
  } });
}
