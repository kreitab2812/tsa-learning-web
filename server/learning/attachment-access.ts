import "server-only";
import type { SessionUser } from "@/features/auth/types";
import { prisma } from "@/server/db/prisma";
import { HttpError } from "@/server/http/errors";
import { getLearningLesson, type AccessOptions } from "./service";
import { getDocumentDownloadUrl } from "@/lib/media";

export async function attachmentDownload(user: SessionUser, id: string, options: AccessOptions = {}) {
  const file = await prisma.lessonAttachment.findUnique({ where: { id } });
  if (!file) throw new HttpError(404, "Không tìm thấy tài liệu.");
  // Admin may open files in Edit. Preview follows the real learner access rules.
  if (user.role !== "ADMIN" || options.preview || options.unlock || options.showDrafts || options.simulated?.length) {
    const view = await getLearningLesson(user, file.lessonId, options);
    if (view.locked) throw new HttpError(403, "Bài học đang bị khóa.");
    if (!view.attachments.some(item => item.id === file.id)) throw new HttpError(403, "Tài liệu chưa mở ở bước học này hoặc cần nộp bài trước.");
  }
  if (file.sourceKey === "answerUrl" && user.role !== "ADMIN" &&
      !await prisma.exerciseAttempt.findFirst({ where: { userId: user.id, lessonId: file.lessonId }, select: { id: true } })) {
    throw new HttpError(403, "Hãy nộp bài trước khi xem tài liệu đáp án.");
  }
  if (!file.allowDownload) throw new HttpError(403, "Tài liệu này đang tắt tải xuống trong LMS.");
  const url = getDocumentDownloadUrl(file.url);
  if (!url) throw new HttpError(400, "Link tài liệu không hợp lệ.");
  return url;
}
