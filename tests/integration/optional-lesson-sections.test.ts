import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../../server/db/prisma";
import { createLesson, createQuestion } from "../../server/admin/content-mutations";
import { getLearningLesson, performLearningAction as act } from "../../server/learning/service";
import type { SessionUser } from "../../features/auth/types";

test("optional lesson sections: real progress, multiple documents, sequential access and quiz-only completion", { timeout: 180000 }, async () => {
  assert.equal(process.env.ALLOW_INTEGRATION_TESTS, "1", "Test database only.");
  const student: SessionUser = { id: randomUUID(), email: `${randomUUID()}@example.invalid`, name: "Optional sections fixture", role: "STUDENT" };
  const admin: SessionUser = { ...student, id: randomUUID(), email: `${randomUUID()}@example.invalid`, role: "ADMIN" };
  const courseId = randomUUID(), chapterId = randomUUID();
  try {
    await prisma.user.createMany({ data: [student, admin].map(user => ({ ...user, passwordHash: "test-only" })) });
    await prisma.course.create({ data: { id: courseId, title: "Optional sections fixture", status: "PUBLISHED", stages: { create: {
      title: "Stage", order: 0, subjects: { create: { title: "Subject", order: 0, chapters: { create: { id: chapterId, title: "Chapter", order: 0, status: "PUBLISHED" } } } },
    } } } });
    const practice = await createLesson({ chapterId, title: "Practice only", status: "PUBLISHED", videoPracticeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXc", stepNavigation: "SEQUENTIAL", completionMode: "QUIZ_PASSED" });
    const before = await getLearningLesson(student, practice.id);
    assert.deepEqual(before.workflow!.availableSteps, [1]);
    assert.equal(before.workflow!.currentStep, 1);
    assert.equal(before.workflow!.completionMode, "MANUAL");
    await assert.rejects(act(student, practice.id, { action: "STEP", step: 0 }), /không có nội dung/);
    const completed = await act(student, practice.id, { action: "STEP", step: 1, complete: true });
    assert.equal(completed.view.completed, true);
    assert.deepEqual(completed.view.workflow!.completedSteps, [1]);
    await act(student, practice.id, { action: "STEP", step: 1, complete: true });
    assert.equal(await prisma.learningActivity.count({ where: { userId: student.id, lessonId: practice.id, type: "LESSON_COMPLETED" } }), 1);
    assert.equal((await getLearningLesson(student, practice.id)).completed, true);

    const docs = await createLesson({ chapterId, title: "Documents only", status: "PUBLISHED", stepNavigation: "SEQUENTIAL", completionMode: "QUIZ_SUBMITTED", additionalDocuments: [
      { title: "Notes 1", url: "https://drive.google.com/file/d/optional-notes-one/view" },
      { title: "Notes 2", url: "https://drive.google.com/file/d/optional-notes-two/view" },
    ] });
    const docView = await getLearningLesson(student, docs.id);
    assert.deepEqual(docView.workflow!.availableSteps, [2]);
    assert.equal(docView.attachments.length, 2);
    assert.equal((await act(student, docs.id, { action: "STEP", step: 2, complete: true })).completed, true);
    assert.equal((await act(admin, docs.id, { action: "STEP", step: 2, complete: true, preview: true })).completed, true);
    assert.equal(await prisma.progress.count({ where: { userId: admin.id } }), 0);

    const quiz = await createLesson({ chapterId, title: "Quiz only", status: "PUBLISHED", stepNavigation: "SEQUENTIAL", completionMode: "QUIZ_PASSED" });
    const question = await createQuestion({ lessonId: quiz.id, type: "SHORT_ANSWER", content: "1 + 1", correctAnswer: "2", explanation: "secret-solution" });
    assert.deepEqual((await getLearningLesson(student, quiz.id)).workflow!.availableSteps, [3]);
    await assert.rejects(act(student, quiz.id, { action: "COMPLETE" }), /đạt điểm/);
    const started = await act(student, quiz.id, { action: "START", requestId: randomUUID() });
    assert.ok(!JSON.stringify(started.view).includes("secret-solution"));
    const session = started.view.workflow!.session!;
    const result = await act(student, quiz.id, { action: "SUBMIT", sessionId: session.id, revision: 0, answers: { [question.id]: "2" } });
    assert.equal(result.completed, true);
    assert.deepEqual(result.view.workflow!.completedSteps, [3]);

    const mixed = await createLesson({ chapterId, title: "Theory then quiz", status: "PUBLISHED", stepNavigation: "SEQUENTIAL", videoTheoryUrl: "https://www.youtube.com/watch?v=dQw4w9WgXc" });
    await createQuestion({ lessonId: mixed.id, type: "SHORT_ANSWER", content: "1 + 1", correctAnswer: "2" });
    await assert.rejects(act(student, mixed.id, { action: "START", requestId: randomUUID() }), /Chưa mở/);
    const moved = await act(student, mixed.id, { action: "STEP", step: 0, complete: true });
    assert.equal(moved.view.workflow!.currentStep, 3);
    const pdfQuiz = await createLesson({ chapterId, title: "PDF exercise only", status: "PUBLISHED", completionMode: "QUIZ_PASSED", exerciseUrl: "https://drive.google.com/file/d/exercise-only/view" });
    const pdfView = await getLearningLesson(student, pdfQuiz.id);
    assert.deepEqual(pdfView.workflow!.availableSteps, [3]);
    assert.equal(pdfView.workflow!.completionMode, "MANUAL");
    assert.equal(pdfView.attachments.length, 1);
    assert.equal((await act(student, pdfQuiz.id, { action: "COMPLETE" })).completed, true);
    const empty = await createLesson({ chapterId, title: "Empty draft content", status: "PUBLISHED" });
    assert.deepEqual((await getLearningLesson(student, empty.id)).workflow!.availableSteps, []);
    await assert.rejects(act(student, empty.id, { action: "COMPLETE" }), /chưa có nội dung/);
  } finally {
    await prisma.course.deleteMany({ where: { id: courseId } });
    await prisma.user.deleteMany({ where: { id: { in: [student.id, admin.id] } } });
    await prisma.$disconnect();
  }
});
