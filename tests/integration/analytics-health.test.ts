import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../../server/db/prisma";
import { recordLearningError } from "../../server/learning/error-logs";
import { getAdminHealthDashboard } from "../../server/admin/health-queries";
import type { SessionUser } from "../../features/auth/types";

test("scoped analytics, full counts, pagination, publication ancestry and grouped logs use real data", { timeout: 180000 }, async () => {
  assert.equal(process.env.ALLOW_INTEGRATION_TESTS, "1", "Run only against the test database with ALLOW_INTEGRATION_TESTS=1.");
  const userId = randomUUID();
  let courseId: string | undefined;
  const user: SessionUser = { id: userId, email: `${userId}@example.invalid`, name: "Health fixture", role: "STUDENT" };
  try {
    await prisma.user.create({ data: { ...user, passwordHash: "test-only", createdAt: new Date(0) } });
    const course = await prisma.course.create({ data: { title: "Health fixture", status: "PUBLISHED" } });
    courseId = course.id;
    const stage = await prisma.stage.create({ data: { title: "Stage", order: 0, courseId } });
    const subject = await prisma.subject.create({ data: { title: "Subject", order: 0, stageId: stage.id } });
    const chapter = await prisma.chapter.create({ data: { title: "Chapter", order: 0, subjectId: subject.id, status: "PUBLISHED" } });
    const lesson = await prisma.lesson.create({ data: { title: "Lesson", order: 0, chapterId: chapter.id, status: "PUBLISHED", documentUrl: "https://example.com/file.pdf" } });

    await recordLearningError(user, { lessonId: lesson.id, type: "DOCUMENT_LOAD", message: "Không mở được tài liệu.", resourceUrl: lesson.documentUrl });
    await prisma.lessonLinkHealth.create({ data: { lessonId: lesson.id, kind: "DOCUMENT", url: lesson.documentUrl!, status: "BROKEN", statusCode: 404, error: "HTTP 404", checkedAt: new Date() } });
    const error = await prisma.learningError.findFirstOrThrow({ where: { lessonId: lesson.id } });
    const health = await prisma.lessonLinkHealth.findUniqueOrThrow({ where: { lessonId_kind: { lessonId: lesson.id, kind: "DOCUMENT" } } });
    assert.equal(error.type, "DOCUMENT_LOAD");
    assert.equal(error.userId, user.id);
    assert.equal(health.status, "BROKEN");
    assert.equal(health.statusCode, 404);
    await recordLearningError(user, { lessonId: lesson.id, type: "DOCUMENT_LOAD", message: "Không mở được tài liệu.", resourceUrl: lesson.documentUrl });
    assert.equal(await prisma.learningError.count({ where: { lessonId: lesson.id } }), 1, "immediate duplicate reports are suppressed");
    const hidden = await prisma.chapter.create({ data: { subjectId: subject.id, title: "Draft parent", status: "DRAFT", order: 1 } });
    const hiddenChild = await prisma.chapter.create({ data: { subjectId: subject.id, title: "Published child", status: "PUBLISHED", parentId: hidden.id, order: 0 } });
    await prisma.lesson.create({ data: { title: "Hidden lesson", chapterId: hiddenChild.id, status: "PUBLISHED", order: 0 } });
    await prisma.question.create({ data: { lessonId: lesson.id, order: 0, type: "SHORT_ANSWER", content: "1+1?", correctAnswer: "2" } });
    await prisma.progress.create({ data: { userId, lessonId: lesson.id, isCompleted: true } });
    await prisma.exerciseAttempt.createMany({ data: Array.from({ length: 25 }, (_, index) => ({
      userId, lessonId: lesson.id, score: index * 4, correctCount: 0, totalQuestions: 1, answers: {}, createdAt: new Date(Date.now() - index * 1000),
    })) });
    await prisma.learningError.create({ data: { userId, lessonId: lesson.id, type: "DOCUMENT_LOAD", message: "Không mở được tài liệu.", resourceUrl: lesson.documentUrl, createdAt: new Date(Date.now() - 120000) } });
    const first = await getAdminHealthDashboard({ subject: subject.id, days: "all" });
    assert.deepEqual(first.progress, { total: 1, completed: 1 }, "hidden descendant must not inflate the denominator");
    assert.equal(first.attemptCount, 25);
    assert.equal(first.attempts.length, 20);
    assert.deepEqual(first.exerciseProgress, { total: 1, attempted: 1 });
    assert.equal(first.chapterProgress.find((item) => item.id === chapter.id)?.lessons[0].best, 96);
    assert.equal(first.chapterProgress.find((item) => item.id === chapter.id)?.lessons[0].latest, 0);
    assert.equal(first.errors[0].count, 2);
    const second = await getAdminHealthDashboard({ subject: subject.id, chapter: chapter.id, days: "all", attemptPage: 2 });
    assert.equal(second.attempts.length, 5);
    assert.equal(second.attemptCount, 25);
    assert.equal(second.links.length, 1);
  } finally {
    if (courseId) await prisma.course.deleteMany({ where: { id: courseId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  }
});
