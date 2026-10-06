import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../../server/db/prisma";
import { createLesson, updateLesson } from "../../server/admin/content-mutations";
import { getAdminLesson } from "../../server/admin/lesson-queries";

test("lesson builder persists settings and synchronizes attachments without changing learning history", { timeout: 120000 }, async () => {
  assert.equal(process.env.ALLOW_INTEGRATION_TESTS, "1", "Use only the approved test database.");
  let courseId: string | undefined;
  const userId = randomUUID();
  try {
    const course = await prisma.course.create({ data: { title: "Lesson builder fixture" } });
    courseId = course.id;
    const stage = await prisma.stage.create({ data: { title: "Stage", order: 0, courseId } });
    const subject = await prisma.subject.create({ data: { title: "Subject", order: 0, stageId: stage.id } });
    const chapter = await prisma.chapter.create({ data: { title: "Chapter", order: 0, subjectId: subject.id } });
    const lesson = await createLesson({ title: "Existing lesson", chapterId: chapter.id, documentUrl: "https://drive.google.com/file/d/old/view", answerUrl: "https://example.com/answers.pdf" });
    assert.equal(lesson.completionMode, "MANUAL");
    assert.equal(lesson.stepNavigation, "FREE");
    assert.equal(lesson.quizTimeLimitMinutes, null);
    assert.equal(lesson.quizMaxAttempts, null);
    assert.equal(lesson.requireCompletionForNext, false);
    await prisma.user.create({ data: { id: userId, email: `${userId}@example.invalid`, passwordHash: "test-only" } });
    const question = await prisma.question.create({ data: { lessonId: lesson.id, type: "SHORT_ANSWER", content: "1+1?", correctAnswer: "2", order: 0 } });
    const progress = await prisma.progress.create({ data: { userId, lessonId: lesson.id, isCompleted: true, exerciseScore: 80 } });
    const attempt = await prisma.exerciseAttempt.create({ data: { userId, lessonId: lesson.id, score: 80, correctCount: 4, totalQuestions: 5, answers: { original: "2" } } });

    await updateLesson(lesson.id, { title: "Edited lesson", theoryDocumentUrl: "https://drive.google.com/file/d/theory/view", completionMode: "QUIZ_PASSED", quizPassPercent: 70, quizTimeLimitMinutes: 45, quizShuffleAnswers: true });
    const loaded = await getAdminLesson(lesson.id);
    assert.equal(loaded.chapter.subject.stage.courseId, courseId);
    assert.equal(loaded._count.questions, 1);
    assert.equal(loaded.documentUrl, lesson.documentUrl);
    assert.equal(loaded.quizPassPercent, 70);
    assert.equal(loaded.quizTimeLimitMinutes, 45);
    assert.equal(loaded.quizShuffleAnswers, true);
    assert.equal(await prisma.lessonAttachment.count({ where: { lessonId: lesson.id } }), 3);
    const attachment = await prisma.lessonAttachment.findUniqueOrThrow({ where: { lessonId_sourceKey: { lessonId: lesson.id, sourceKey: "theoryDocumentUrl" } } });
    assert.equal(attachment.section, "THEORY");
    await updateLesson(lesson.id, { theoryDocumentUrl: "https://drive.google.com/file/d/new/view", quizTimeLimitMinutes: null });
    assert.equal((await prisma.lessonAttachment.findUniqueOrThrow({ where: { id: attachment.id } })).url, "https://drive.google.com/file/d/new/view");
    await updateLesson(lesson.id, { theoryDocumentUrl: "" });
    assert.equal(await prisma.lessonAttachment.count({ where: { lessonId: lesson.id } }), 2);
    assert.throws(() => updateLesson(lesson.id, { documentUrl: "https://example.com/changed.pdf", quizPassPercent: 101 }));
    assert.equal((await getAdminLesson(lesson.id)).documentUrl, lesson.documentUrl);
    assert.deepEqual(await prisma.progress.findUnique({ where: { id: progress.id } }), progress);
    assert.deepEqual(await prisma.exerciseAttempt.findUnique({ where: { id: attempt.id } }), attempt);
    assert.deepEqual(await prisma.question.findUnique({ where: { id: question.id } }), question);
  } finally {
    if (courseId) await prisma.course.deleteMany({ where: { id: courseId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  }
});
