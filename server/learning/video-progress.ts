import "server-only";
import type { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { HttpError } from "@/server/http/errors";
import type { SessionUser } from "@/features/auth/types";
import { getLearningAccess } from "./service";
import { getYoutubeEmbedUrl } from "@/lib/media";
import { canOpenStep } from "@/features/learning/quiz-session";
import { availableLessonSteps } from "@/features/learning/lesson-steps";
import { mergeWatchRanges, videoProgressSchema, type WatchRange } from "@/features/analytics/video-progress";

export async function recordVideoProgress(user: SessionUser, lessonId: string, raw: z.input<typeof videoProgressSchema>) {
  if (user.role !== "STUDENT") throw new HttpError(403, "Preview không ghi dữ liệu xem thật.");
  const input = videoProgressSchema.parse(raw);
  const access = await getLearningAccess(user, lessonId);
  if (!access.found || access.found.lesson.locked) throw new HttpError(403, "Bài học chưa mở.");
  const [lesson, run] = await Promise.all([
    prisma.lesson.findUniqueOrThrow({ where: { id: lessonId }, select: { videoTheoryUrl: true, theoryDocumentUrl: true, videoPracticeUrl: true, practiceDocumentUrl: true, stepNavigation: true } }),
    prisma.lessonRun.findUnique({ where: { userId_lessonId_preview: { userId: user.id, lessonId, preview: false } } }),
  ]);
  const step = input.section === "THEORY" ? 0 : 1;
  if (!canOpenStep(step, run?.completedSteps ?? (access.base.completed ? [0, 1, 2, 3] : []), lesson.stepNavigation, availableLessonSteps(lesson))) throw new HttpError(403, "Bước học chưa mở.");
  const url = step === 0 ? lesson.videoTheoryUrl : lesson.videoPracticeUrl;
  if (!url || getYoutubeEmbedUrl(url)?.split("/").at(-1) !== input.videoId) throw new HttpError(409, "Video đã thay đổi hoặc không hỗ trợ đo mức xem.");
  await prisma.$transaction(async tx => {
    const key = { userId: user.id, lessonId, section: input.section, videoId: input.videoId };
    // The upsert locks this row until commit, so simultaneous tabs merge safely.
    const previous = await tx.videoWatch.upsert({ where: { userId_lessonId_section_videoId: key },
      create: { ...key, duration: input.duration, ranges: [] }, update: { duration: input.duration } });
    const ranges = mergeWatchRanges([...(previous.ranges as WatchRange[]), ...input.ranges], input.duration);
    if (ranges.length > 2000) throw new HttpError(400, "Dữ liệu xem quá phân mảnh.");
    await tx.videoWatch.update({ where: { userId_lessonId_section_videoId: key }, data: { ranges } });
  }, { timeout: 15000 });
}
