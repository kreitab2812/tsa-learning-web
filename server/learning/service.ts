import "server-only";

import { prisma } from "@/server/db/prisma";
import { HttpError } from "@/server/http/errors";
import type { SessionUser } from "@/features/auth/types";
import type { LearningAction } from "@/features/learning/schemas";
import type { LearningChapter, LearningLessonView } from "@/features/learning/types";
import { publishedChapterIds } from "@/features/learning/publication";
import { attachmentSelect } from "@/server/admin/attachment-service";
import { canOpenStep, quizView } from "@/features/learning/quiz-session";
import { performWorkflow } from "./workflow";
import { MAX_ATTACHMENTS } from "@/features/lessons/attachments";
import { attachmentStep, availableLessonSteps } from "@/features/learning/lesson-steps";

export type AccessOptions = { preview?: boolean; unlock?: string | null; showDrafts?: boolean; simulated?: string[] };

function previewContext(user: SessionUser, options: AccessOptions) {
  if ((options.preview || options.unlock || options.showDrafts || options.simulated?.length) && user.role !== "ADMIN") throw new HttpError(403, "Chế độ Preview chỉ dành cho quản trị viên.");
  const preview = options.preview === true && user.role === "ADMIN";
  if (!preview && (options.unlock || options.showDrafts || options.simulated?.length)) throw new HttpError(400, "Mô phỏng chỉ dùng trong Preview.");
  return { preview, unlock: options.unlock ?? null, showDrafts: options.showDrafts === true,
    simulated: preview ? [...new Set(options.simulated ?? [])].slice(0, 200) : [] };
}

export async function listLearningCourses() {
  const now = new Date();
  return prisma.course.findMany({
    where: { OR: [{ status: "PUBLISHED" }, { status: "SCHEDULED", publishAt: { lte: now } }] },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    select: { id: true, title: true, description: true, stages: { orderBy: { order: "asc" }, select: {
      id: true, title: true, subjects: { orderBy: { order: "asc" }, select: { id: true, title: true, description: true } },
    } } },
  });
}

export async function getLearningSubject(user: SessionUser, subjectId: string, options: AccessOptions = {}) {
  const { preview, unlock, showDrafts, simulated } = previewContext(user, options);
  const previewStudent = preview ? await prisma.user.findFirst({ where: { role: "STUDENT" }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { id: true, name: true, email: true } }) : null;
  const progressUserId = preview ? previewStudent?.id ?? "no-preview-student" : user.id;
  const now = new Date();
  const subject = await prisma.subject.findUnique({ where: { id: subjectId }, select: {
    id: true, title: true, description: true, teacherName: true,
    stage: { select: { id: true, title: true, order: true, accessMode: true, unlockAt: true,
      course: { select: { id: true, title: true, status: true, publishAt: true } } } },
    chapters: { orderBy: [{ order: "asc" }, { id: "asc" }], select: {
      id: true, title: true, description: true, status: true, openAt: true, closeAt: true, parentId: true,
      lessons: { orderBy: [{ order: "asc" }, { id: "asc" }], select: {
        id: true, title: true, status: true, requireCompletionForNext: true,
        lessonRuns: { where: { userId: user.id, preview: true }, select: { completed: true } }, progress: { where: { userId: progressUserId }, select: { isCompleted: true } },
      } },
    } },
  } });
  if (!subject) throw new HttpError(404, "Không tìm thấy môn học.");

  let globalReason: string | null = null;
  const course = subject.stage.course;
  if (course.status === "DRAFT") globalReason = "Khóa học chưa được xuất bản.";
  if (course.status === "SCHEDULED" && (!course.publishAt || course.publishAt > now)) globalReason = "Khóa học chưa đến thời gian mở.";
  if (!preview && globalReason) throw new HttpError(403, globalReason);
  if (subject.stage.accessMode === "TIME_LOCKED" && (!subject.stage.unlockAt || subject.stage.unlockAt > now)) globalReason ||= "Giai đoạn chưa đến thời gian mở.";
  if (subject.stage.accessMode === "SEQUENTIAL") {
    const previous = await prisma.chapter.findMany({ where: { subject: { stage: {
      courseId: course.id, order: { lt: subject.stage.order },
    } } }, select: { id: true, parentId: true, status: true, lessons: { where: { status: "PUBLISHED" }, select: {
      id: true, lessonRuns: { where: { userId: user.id, preview: true, completed: true }, select: { id: true } }, progress: { where: { userId: progressUserId, isCompleted: true }, select: { id: true } },
    } } } });
    const published = publishedChapterIds(previous);
    if (previous.some((chapter) => published.has(chapter.id) && chapter.lessons.some((lesson) => !lesson.progress.length && !(preview && lesson.lessonRuns.length)))) globalReason ||= "Hãy hoàn thành giai đoạn trước để mở nội dung này.";
  }

  const flat = subject.chapters;
  const published = publishedChapterIds(flat);
  const visibleIds = preview && showDrafts ? new Set(flat.map((chapter) => chapter.id)) : published;
  const simulatedIds = new Set(simulated.filter((id) => flat.some((chapter) => published.has(chapter.id) && chapter.lessons.some((lesson) => lesson.id === id && lesson.status === "PUBLISHED"))));
  const isComplete = (lesson: (typeof flat)[number]["lessons"][number]) => lesson.progress[0]?.isCompleted || simulatedIds.has(lesson.id) || (preview && lesson.lessonRuns.some(run => run.completed));
  const childrenByParent = new Map<string | null, typeof flat>();
  for (const chapter of flat) {
    if (!visibleIds.has(chapter.id) || (chapter.parentId && !visibleIds.has(chapter.parentId))) continue;
    const siblings = childrenByParent.get(chapter.parentId) ?? [];
    siblings.push(chapter); childrenByParent.set(chapter.parentId, siblings);
  }
  const descendants = new Set<string>();
  const collect = (id: string) => {
    if (descendants.has(id)) return;
    descendants.add(id);
    for (const child of childrenByParent.get(id) ?? []) collect(child.id);
  };
  if (unlock) {
    if (!preview || !visibleIds.has(unlock)) throw new HttpError(400, "Cụm Magic Unlock không hợp lệ.");
    collect(unlock);
  }
  const chapterById = new Map(flat.map((chapter) => [chapter.id, chapter]));
  const subtreeComplete = (id: string): boolean => {
    const chapter = chapterById.get(id);
    if (!chapter) return true;
    const lessons = chapter.lessons.filter((lesson) => lesson.status === "PUBLISHED");
    return lessons.every(isComplete) && (childrenByParent.get(id) ?? []).filter((child) => child.status === "PUBLISHED").every((child) => subtreeComplete(child.id));
  };
  const build = (parentId: string | null, parentReason: string | null): LearningChapter[] => {
    const siblings = childrenByParent.get(parentId) ?? [];
    return siblings.map((chapter, index) => {
      const magic = descendants.has(chapter.id);
      let reason = magic ? null : parentReason || globalReason;
      if (!magic && !reason && chapter.status !== "PUBLISHED") reason = "Cụm đang ở bản nháp.";
      if (!magic && !reason && chapter.openAt && chapter.openAt > now) reason = "Cụm chưa đến thời gian mở.";
      if (!magic && !reason && chapter.closeAt && chapter.closeAt <= now) reason = "Cụm đã hết thời gian học.";
      if (!magic && !reason && siblings.slice(0, index).some((item) => item.status === "PUBLISHED" && !subtreeComplete(item.id))) reason = "Hãy hoàn thành cụm trước để mở nội dung này.";
      const lessons = chapter.lessons.filter((lesson) => (preview && showDrafts) || lesson.status === "PUBLISHED").map((lesson, lessonIndex, visibleLessons) => {
        const previousIncomplete = visibleLessons.slice(0, lessonIndex).some(item => item.status === "PUBLISHED" && item.requireCompletionForNext && !isComplete(item));
        const lessonReason = !magic && lesson.status !== "PUBLISHED" ? "Bài học đang ở bản nháp." : reason || (!magic && previousIncomplete ? "Hãy hoàn thành bài học trước." : null);
        return { id: lesson.id, title: lesson.title, status: lesson.status, completed: !!isComplete(lesson),
          locked: !!lessonReason, lockReason: lessonReason };
      });
      return {
        id: chapter.id, title: chapter.title, description: chapter.description, status: chapter.status,
        openAt: chapter.openAt?.toISOString() ?? null, closeAt: chapter.closeAt?.toISOString() ?? null,
        locked: !!reason, lockReason: reason, magicUnlocked: magic,
        canMagicUnlock: preview && (!!reason || lessons.some((lesson) => lesson.locked)),
        lessons, children: build(chapter.id, reason),
      };
    });
  };
  return { id: subject.id, title: subject.title, description: subject.description, teacherName: subject.teacherName,
    courseId: course.id, courseTitle: course.title, stageTitle: subject.stage.title, preview, showDrafts, simulated: [...simulatedIds],
    previewStudentName: previewStudent ? previewStudent.name || previewStudent.email : null,
    globalReason, unlockedChapterId: unlock, chapters: build(null, null) };
}

function findLesson(chapters: LearningChapter[], lessonId: string): { chapter: LearningChapter; lesson: LearningChapter["lessons"][number] } | null {
  for (const chapter of chapters) {
    const lesson = chapter.lessons.find((item) => item.id === lessonId);
    if (lesson) return { chapter, lesson };
    const nested = findLesson(chapter.children, lessonId);
    if (nested) return nested;
  }
  return null;
}

export async function getLearningAccess(user: SessionUser, lessonId: string, options: AccessOptions = {}) {
  const identity = await prisma.lesson.findUnique({ where: { id: lessonId }, select: {
    id: true, title: true, chapter: { select: { subjectId: true } },
  } });
  if (!identity) throw new HttpError(404, "Không tìm thấy bài học.");
  const subject = await getLearningSubject(user, identity.chapter.subjectId, options);
  const found = findLesson(subject.chapters, lessonId);
  const base = { id: identity.id, title: identity.title, chapterId: found?.chapter.id ?? "", chapterTitle: found?.chapter.title ?? "",
    subjectId: subject.id, subjectTitle: subject.title, courseId: subject.courseId, preview: subject.preview, magicUnlocked: found?.chapter.magicUnlocked ?? false,
    completed: found?.lesson.completed ?? false, showDrafts: subject.showDrafts, simulated: subject.simulated,
    previewStudentName: subject.previewStudentName, viewerEmail: user.email };
  return { base, found, subject };
}

export async function getLearningLesson(user: SessionUser, lessonId: string, options: AccessOptions = {}): Promise<LearningLessonView> {
  const { base, found, subject } = await getLearningAccess(user, lessonId, options);
  if (!found || found.lesson.locked) return { ...base, locked: true, lockReason: found?.lesson.lockReason ?? "Nội dung chưa được xuất bản.",
    videoTheoryUrl: null, videoPracticeUrl: null, documentUrl: null, exerciseUrl: null, answerUrl: null, questions: [],
    theoryDocumentUrl: null, practiceDocumentUrl: null, theorySplitView: true, practiceSplitView: true, attachments: [], workflow: null };

  const [run, session, legacyCount] = await Promise.all([
    prisma.lessonRun.findUnique({ where: { userId_lessonId_preview: { userId: user.id, lessonId, preview: subject.preview } } }),
    prisma.quizSession.findFirst({ where: { userId: user.id, lessonId, preview: subject.preview }, orderBy: [{ startedAt: "desc" }, { id: "desc" }] }),
    subject.preview ? Promise.resolve(0) : prisma.exerciseAttempt.count({ where: { userId: user.id, lessonId, sessionId: null } }),
  ]);
  const completedSteps = run?.completedSteps ?? (!subject.preview && base.completed ? [0, 1, 2, 3] : []);
  const canSeeAnswers = !!session?.submittedAt || !subject.preview && legacyCount > 0;
  const [lesson, attemptCount] = await Promise.all([
    prisma.lesson.findUniqueOrThrow({ where: { id: lessonId }, select: {
      videoTheoryUrl: true, videoPracticeUrl: true, documentUrl: true, exerciseUrl: true, answerUrl: true,
      theoryDocumentUrl: true, practiceDocumentUrl: true, theorySplitView: true, practiceSplitView: true,
      completionMode: true, stepNavigation: true, quizPassPercent: true, quizTimeLimitMinutes: true, quizMaxAttempts: true,
      _count: { select: { questions: true } },
      attachments: { where: canSeeAnswers ? {} : { OR: [{ sourceKey: null }, { sourceKey: { not: "answerUrl" } }] }, select: attachmentSelect, orderBy: [{ section: "asc" }, { order: "asc" }, { id: "asc" }], take: MAX_ATTACHMENTS },
    } }),
    prisma.quizSession.count({ where: { userId: user.id, lessonId, preview: subject.preview } }),
  ]);
  const availableSteps = availableLessonSteps(lesson, !!session);
  const open = (step: number) => canOpenStep(step, completedSteps, lesson.stepNavigation, availableSteps);
  const currentStep = open(run?.currentStep ?? -1) ? run!.currentStep : availableSteps.find(step => !completedSteps.includes(step)) ?? availableSteps[0] ?? -1;
  const publicSession = session && open(3) ? quizView(session) : null;
  return { ...base, completed: subject.preview ? run?.completed ?? false : base.completed, locked: false, lockReason: null,
    videoTheoryUrl: open(0) ? lesson.videoTheoryUrl : null, videoPracticeUrl: open(1) ? lesson.videoPracticeUrl : null,
    theoryDocumentUrl: open(0) ? lesson.theoryDocumentUrl : null, practiceDocumentUrl: open(1) ? lesson.practiceDocumentUrl : null,
    theorySplitView: lesson.theorySplitView, practiceSplitView: lesson.practiceSplitView,
    documentUrl: open(2) ? lesson.documentUrl : null, exerciseUrl: open(3) ? lesson.exerciseUrl : null,
    answerUrl: open(3) && canSeeAnswers ? lesson.answerUrl : null,
    attachments: lesson.attachments.filter(file => open(attachmentStep(file))),
    questions: publicSession?.questions ?? [],
    workflow: { currentStep, availableSteps, completedSteps: completedSteps.filter(step => availableSteps.includes(step)), navigation: lesson.stepNavigation, completionMode: lesson._count.questions || session ? lesson.completionMode : "MANUAL",
      timeLimitMinutes: lesson.quizTimeLimitMinutes, passPercent: lesson.quizPassPercent, maxAttempts: lesson.quizMaxAttempts,
      attemptCount: attemptCount + legacyCount, questionCount: lesson._count.questions, session: publicSession, serverTime: new Date().toISOString() },
  };
}

export async function performLearningAction(user: SessionUser, lessonId: string, input: LearningAction) {
  return performWorkflow(user, lessonId, input);
}
