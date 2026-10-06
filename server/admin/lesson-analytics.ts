import "server-only";
import { prisma } from "@/server/db/prisma";
import { summarizeMistakes } from "@/features/analytics/attempt-summary";
import { lessonResources } from "@/features/analytics/link-fields";
import { getYoutubeEmbedUrl } from "@/lib/media";
import { watchedSeconds } from "@/features/analytics/video-progress";
import { availableLessonSteps } from "@/features/learning/lesson-steps";
import { HttpError } from "@/server/http/errors";

export async function getLessonAnalytics(lessonId: string, page = 1, studentId?: string) {
  const [student, lesson] = await Promise.all([
    prisma.user.findFirst({ where: { role: "STUDENT", ...(studentId ? { id: studentId } : {}) }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { id: true, name: true, email: true } }),
    prisma.lesson.findUnique({ where: { id: lessonId }, include: { _count: { select: { questions: true } }, attachments: true, linkHealth: true, chapter: { include: { subject: true } } } }),
  ]);
  if (!lesson) return null;
  if (studentId && !student) throw new HttpError(404, "Không tìm thấy học sinh cần phân tích.");
  const userId = student?.id ?? "no-student";
  const where = { userId, lessonId, OR: [{ sessionId: null }, { session: { preview: false } }] };
  const [run, progress, count, history, samples, videos, errors] = await Promise.all([
    prisma.lessonRun.findUnique({ where: { userId_lessonId_preview: { userId, lessonId, preview: false } } }),
    prisma.progress.findUnique({ where: { userId_lessonId: { userId, lessonId } } }),
    prisma.exerciseAttempt.count({ where }),
    prisma.exerciseAttempt.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * 20, take: 20,
      select: { id: true, score: true, correctCount: true, totalQuestions: true, createdAt: true, sessionId: true } }),
    prisma.exerciseAttempt.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 200,
      select: { session: { select: { preview: true, snapshot: true, result: true } } } }),
    prisma.videoWatch.findMany({ where: { userId, lessonId } }),
    prisma.learningError.findMany({ where: { userId, lessonId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 20 }),
  ]);
  const resources = lessonResources(lesson);
  const links = resources.map(resource => {
    const check = lesson.linkHealth.find(item => item.kind === resource.kind && item.url === resource.url);
    return { ...resource, lessonId, lessonTitle: lesson.title, chapterTitle: lesson.chapter.title, subjectTitle: lesson.chapter.subject.title,
      status: check?.status ?? "UNKNOWN" as const, statusCode: check?.statusCode ?? null, error: check?.error ?? null, checkedAt: check?.checkedAt?.toISOString() ?? null };
  });
  return { student, availableSteps: availableLessonSteps(lesson, count > 0), lesson: { id: lesson.id, title: lesson.title, chapterId: lesson.chapterId, subjectId: lesson.chapter.subjectId }, run, progress,
    count, history, sampleCount: samples.length, mistakes: summarizeMistakes(samples), links,
    videos: (["THEORY", "PRACTICE"] as const).map(section => {
      const url = section === "THEORY" ? lesson.videoTheoryUrl : lesson.videoPracticeUrl;
      const embed = url ? getYoutubeEmbedUrl(url) : null;
      const videoId = embed?.split("/").at(-1);
      const record = videos.find(item => item.section === section && item.videoId === videoId);
      return { section, supported: !!embed, configured: !!url, duration: record?.duration ?? null,
        seconds: record ? watchedSeconds(record.ranges as [number, number][]) : null, updatedAt: record?.updatedAt ?? null };
    }),
    errors: errors.map(item => ({ ...item, editHref: resources.find(resource => resource.url === item.resourceUrl)?.editHref ?? `/dashboard/lessons/${lessonId}/questions?tab=${item.type === "SUBMISSION" ? "questions" : item.type === "VIDEO_LOAD" ? "theory" : "documents"}` })),
  };
}
