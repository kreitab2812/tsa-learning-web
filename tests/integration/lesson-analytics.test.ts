import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../../server/db/prisma";
import { getLessonAnalytics } from "../../server/admin/lesson-analytics";
import { recordVideoProgress } from "../../server/learning/video-progress";
import { recordLearningError } from "../../server/learning/error-logs";
import { getAdminHealthDashboard } from "../../server/admin/health-queries";
import type { SessionUser } from "../../features/auth/types";

test("Phase 5: real lesson analytics, Preview isolation, media access and Health resource routing", { timeout: 180000 }, async () => {
  assert.equal(process.env.ALLOW_INTEGRATION_TESTS, "1", "Approved test database only.");
  const student: SessionUser = { id: randomUUID(), email: `${randomUUID()}@example.invalid`, name: "Phase 5 fixture", role: "STUDENT" };
  const admin: SessionUser = { ...student, id: randomUUID(), role: "ADMIN" };
  let courseId: string | undefined;
  try {
    await prisma.user.create({ data: { ...student, passwordHash: "test-only", createdAt: new Date(0) } });
    const course = await prisma.course.create({ data: { title: "Phase 5 fixture", status: "PUBLISHED", stages: { create: { title: "Stage", order: 0, subjects: { create: { title: "Subject", order: 0, chapters: { create: { title: "Chapter", order: 0, status: "PUBLISHED" } } } } } } }, include: { stages: { include: { subjects: { include: { chapters: true } } } } } });
    courseId = course.id;
    const chapter = course.stages[0].subjects[0].chapters[0];
    const lesson = await prisma.lesson.create({ data: { chapterId: chapter.id, title: "Measured lesson", status: "PUBLISHED", order: 0, stepNavigation: "SEQUENTIAL", videoTheoryUrl: "https://youtu.be/abcdefghijk", videoPracticeUrl: "https://youtu.be/12345678901", practiceDocumentUrl: "https://drive.google.com/file/d/practice/view" } });
    const file = await prisma.lessonAttachment.create({ data: { lessonId: lesson.id, title: "Attachment", url: "https://drive.google.com/file/d/archive/view", kind: "ZIP", section: "DOCUMENTS", order: 0 } });
    const sample = { section: "THEORY" as const, videoId: "abcdefghijk", duration: 100, ranges: [[0, 10]] as [number, number][] };
    await assert.rejects(recordVideoProgress(admin, lesson.id, sample), /Preview/);
    await assert.rejects(recordVideoProgress(student, lesson.id, { ...sample, section: "PRACTICE", videoId: "12345678901" }), /chưa mở/);
    await assert.rejects(recordVideoProgress(student, lesson.id, { ...sample, videoId: "xxxxxxxxxxx" }), /thay đổi/);
    await recordVideoProgress(student, lesson.id, sample);
    await recordVideoProgress(student, lesson.id, { ...sample, ranges: [[5, 15]] });
    await prisma.lessonRun.create({ data: { userId: student.id, lessonId: lesson.id, currentStep: 2, completedSteps: [0, 1] } });
    await prisma.lessonRun.create({ data: { userId: student.id, lessonId: lesson.id, preview: true, currentStep: 3, completedSteps: [0, 1, 2, 3], completed: true } });
    const questionId = randomUUID();
    const snapshot = { questions: [{ id: questionId, type: "SHORT_ANSWER", content: "Frozen question", imageUrl: null, correctAnswer: "2", options: null }] };
    const result = { feedback: [{ questionId, correct: false }] };
    const session = await prisma.quizSession.create({ data: { id: randomUUID(), userId: student.id, lessonId: lesson.id, snapshot, result, submittedAt: new Date() } });
    await prisma.quizSession.create({ data: { id: randomUUID(), userId: student.id, lessonId: lesson.id, preview: true, snapshot, result, submittedAt: new Date() } });
    await prisma.exerciseAttempt.create({ data: { userId: student.id, lessonId: lesson.id, sessionId: session.id, score: 0, correctCount: 0, totalQuestions: 1, answers: {} } });
    await recordLearningError(student, { lessonId: lesson.id, type: "DOCUMENT_LOAD", message: "Cannot download ZIP", resourceUrl: file.url });
    await assert.rejects(recordLearningError(admin, { lessonId: lesson.id, type: "DOCUMENT_LOAD", message: "Preview" }), /Preview/);
    await assert.rejects(recordLearningError(student, { lessonId: lesson.id, type: "DOCUMENT_LOAD", message: "Unknown file", resourceUrl: "https://example.com/other" }), /không thuộc/);
    const report = await getLessonAnalytics(lesson.id);
    assert.equal(report?.student?.id, student.id);
    assert.deepEqual(report?.run?.completedSteps, [0, 1]);
    assert.equal(report?.count, 1);
    assert.equal(report?.mistakes.included, 1);
    assert.equal(report?.mistakes.questions[0].wrong, 1);
    assert.equal(report?.videos[0].seconds, 15);
    assert.ok(report?.errors[0].editHref.endsWith(`#attachment-${file.id}`));
    const health = await getAdminHealthDashboard({ subject: chapter.subjectId, days: "all" });
    assert.equal(health.links.length, 4);
    assert.match(health.links.find(link => link.kind === "PRACTICE_DOCUMENT")!.editHref, /tab=practice$/);
    assert.ok(health.errors[0].editHref.endsWith(`#attachment-${file.id}`));
    await prisma.lesson.update({ where: { id: lesson.id }, data: { videoTheoryUrl: "https://youtu.be/xxxxxxxxxxx" } });
    assert.equal((await getLessonAnalytics(lesson.id))?.videos[0].seconds, null, "Changed source must not inherit old watch coverage");
  } finally {
    if (courseId) await prisma.course.deleteMany({ where: { id: courseId } });
    await prisma.user.deleteMany({ where: { id: student.id } });
    await prisma.$disconnect();
  }
});
