import "server-only";
import { prisma } from "@/server/db/prisma";
import { lessonResources } from "@/features/analytics/link-fields";
import { descendantIds, HEALTH_PAGE_SIZE, healthFilterSchema, type HealthFilters } from "@/features/analytics/filters";
import { publishedChapterIds } from "@/features/learning/publication";
import { HttpError } from "@/server/http/errors";

export async function getAdminHealthDashboard(input: Partial<HealthFilters> = {}) {
  const filters = healthFilterSchema.parse(input);
  const students = await prisma.user.findMany({ where: { role: "STUDENT" }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { id: true, name: true, email: true } });
  const student = filters.student ? students.find(item => item.id === filters.student) : students[0];
  if (filters.student && !student) throw new HttpError(404, "Không tìm thấy học sinh cần phân tích.");
  const [subjects, chapters] = await Promise.all([
    prisma.subject.findMany({ orderBy: [{ title: "asc" }, { id: "asc" }], select: { id: true, title: true, stage: { select: { courseId: true, course: { select: { title: true } } } } } }),
    prisma.chapter.findMany({ where: filters.subject ? { subjectId: filters.subject } : {}, orderBy: [{ order: "asc" }, { id: "asc" }],
      select: { id: true, title: true, parentId: true, status: true, subjectId: true,
        subject: { select: { title: true, stage: { select: { course: { select: { status: true, publishAt: true } } } } } },
        lessons: { orderBy: [{ order: "asc" }, { id: "asc" }], select: {
          id: true, title: true, status: true, videoTheoryUrl: true, videoPracticeUrl: true, documentUrl: true, exerciseUrl: true, answerUrl: true, theoryDocumentUrl: true, practiceDocumentUrl: true,
          attachments: { select: { id: true, title: true, url: true, sourceKey: true, kind: true } },
          _count: { select: { questions: true } }, progress: { where: { userId: student?.id ?? "no-student" }, select: { isCompleted: true } },
          linkHealth: { select: { kind: true, url: true, status: true, statusCode: true, error: true, checkedAt: true } },
        } },
      } }),
  ]);
  const subject = subjects.find((item) => item.id === filters.subject) ?? null;
  if (filters.subject && !subject) throw new HttpError(404, "Không tìm thấy môn học.");
  if (filters.chapter && !chapters.some((item) => item.id === filters.chapter)) throw new HttpError(404, "Cụm không thuộc môn đang xem.");
  const scopeIds = filters.chapter ? descendantIds(chapters, filters.chapter) : new Set(chapters.map((chapter) => chapter.id));
  const scoped = chapters.filter((chapter) => scopeIds.has(chapter.id));
  const lessonIds = scoped.flatMap((chapter) => chapter.lessons.map((lesson) => lesson.id));
  const now = new Date();
  const published = publishedChapterIds(chapters);
  const visibleChapters = scoped.filter((chapter) => {
    const course = chapter.subject.stage.course;
    return published.has(chapter.id) && (course.status === "PUBLISHED" || (course.status === "SCHEDULED" && course.publishAt && course.publishAt <= now));
  });
  const visibleLessons = visibleChapters.flatMap((chapter) => chapter.lessons.filter((lesson) => lesson.status === "PUBLISHED"));
  const visibleLessonIds = new Set(visibleLessons.map((lesson) => lesson.id));
  const since = filters.days === "all" ? undefined : new Date(now.getTime() - Number(filters.days) * 86400000);
  const where = { userId: student?.id ?? "no-student", lessonId: { in: lessonIds }, ...(since ? { createdAt: { gte: since } } : {}) };
  const take = HEALTH_PAGE_SIZE;
  const errorWhere = { ...where, ...(filters.errorType === "all" ? {} : { type: filters.errorType }) };
  const [activities, activityCount, attempts, attemptCount, scoreGroups, latest, chart, errors] = await Promise.all([
    prisma.learningActivity.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (filters.activityPage - 1) * take, take,
      select: { id: true, type: true, createdAt: true, lesson: { select: { id: true, title: true } } } }),
    prisma.learningActivity.count({ where }),
    prisma.exerciseAttempt.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (filters.attemptPage - 1) * take, take,
      select: { id: true, score: true, correctCount: true, totalQuestions: true, createdAt: true, lesson: { select: { id: true, title: true } } } }),
    prisma.exerciseAttempt.count({ where }),
    prisma.exerciseAttempt.groupBy({ by: ["lessonId"], where, _max: { score: true }, _count: { _all: true } }),
    prisma.exerciseAttempt.findMany({ where, distinct: ["lessonId"], orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { lessonId: true, score: true } }),
    prisma.exerciseAttempt.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 30,
      select: { id: true, score: true, createdAt: true, lesson: { select: { title: true } } } }),
    prisma.learningError.groupBy({ by: ["lessonId", "type", "message", "resourceUrl"], where: errorWhere,
      _count: { _all: true }, _max: { createdAt: true }, orderBy: [{ _max: { createdAt: "desc" } }, { lessonId: "asc" }, { type: "asc" }, { message: "asc" }, { resourceUrl: "asc" }],
      skip: (filters.errorPage - 1) * take, take: take + 1 }),
  ]);
  const byLesson = new Map(scoreGroups.map((item) => [item.lessonId, item]));
  const latestByLesson = new Map(latest.map((item) => [item.lessonId, item.score]));
  const lessonTitles = new Map(scoped.flatMap((chapter) => chapter.lessons.map((lesson) => [lesson.id, lesson.title] as const)));
  const progress = { completed: visibleLessons.filter((lesson) => lesson.progress[0]?.isCompleted).length, total: visibleLessons.length };
  const chapterProgress = scoped.map((chapter) => {
    const descendants = descendantIds(scoped, chapter.id);
    const lessons = scoped.filter((item) => descendants.has(item.id)).flatMap((item) => item.lessons).filter((lesson) => visibleLessonIds.has(lesson.id));
    return { id: chapter.id, title: chapter.title, subjectId: chapter.subjectId, subjectTitle: chapter.subject.title,
      total: lessons.length, completed: lessons.filter((lesson) => lesson.progress[0]?.isCompleted).length,
      exercises: lessons.filter((lesson) => lesson._count.questions > 0).length,
      attempted: lessons.filter((lesson) => lesson._count.questions > 0 && byLesson.has(lesson.id)).length,
      lessons: lessons.map((lesson) => ({ id: lesson.id, title: lesson.title, completed: !!lesson.progress[0]?.isCompleted,
        questions: lesson._count.questions, attempts: byLesson.get(lesson.id)?._count._all ?? 0,
        best: byLesson.get(lesson.id)?._max.score ?? null, latest: latestByLesson.get(lesson.id) ?? null })),
    };
  });
  const links = scoped.flatMap((chapter) => chapter.lessons.flatMap((lesson) => lessonResources(lesson).flatMap((definition) => {
    const { url } = definition;
    const check = lesson.linkHealth.find((item) => item.kind === definition.kind && item.url === url);
    return [{ lessonId: lesson.id, lessonTitle: lesson.title, chapterTitle: chapter.title, subjectTitle: chapter.subject.title,
      kind: definition.kind, category: definition.category, editHref: definition.editHref, label: definition.label, url, status: check?.status ?? "UNKNOWN" as const,
      statusCode: check?.statusCode ?? null, error: check?.error ?? null, checkedAt: check?.checkedAt?.toISOString() ?? null }];
  })));
  return {
    filters, student: student ?? null, students, subject: subject ? { id: subject.id, title: subject.title, courseId: subject.stage.courseId } : null,
    subjects: subjects.map((item) => ({ id: item.id, title: item.title, courseTitle: item.stage.course.title })),
    chapters: chapters.map((item) => ({ id: item.id, title: item.title })), progress, chapterProgress,
    exerciseProgress: { total: visibleLessons.filter((lesson) => lesson._count.questions > 0).length,
      attempted: visibleLessons.filter((lesson) => lesson._count.questions > 0 && byLesson.has(lesson.id)).length },
    activities: activities.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() })), activityCount,
    attempts: attempts.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() })), attemptCount,
    chart: chart.reverse().map((item) => ({ ...item, createdAt: item.createdAt.toISOString() })), links,
    errors: errors.slice(0, take).map((item) => ({ lessonId: item.lessonId, lessonTitle: lessonTitles.get(item.lessonId) ?? "Bài học",
      editHref: links.find(link => link.lessonId === item.lessonId && link.url === item.resourceUrl)?.editHref ?? `/dashboard/lessons/${item.lessonId}/questions?tab=${item.type === "SUBMISSION" ? "questions" : item.type === "VIDEO_LOAD" ? "theory" : "documents"}`,
      type: item.type, message: item.message, resourceUrl: item.resourceUrl, count: item._count._all, createdAt: item._max.createdAt!.toISOString() })),
    hasMoreErrors: errors.length > take,
  };
}
export type HealthDashboard = Awaited<ReturnType<typeof getAdminHealthDashboard>>;
