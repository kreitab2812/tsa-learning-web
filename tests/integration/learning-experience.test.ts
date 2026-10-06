import { finishContentSteps, submitNewSession } from "../helpers/learning-workflow";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../../server/db/prisma";
import { getLearningLesson, getLearningSubject, performLearningAction } from "../../server/learning/service";
import { HttpError } from "../../server/http/errors";
import type { SessionUser } from "../../features/auth/types";

test("learning access, Magic Unlock, progress, activity and attempts are server enforced", { timeout: 120000 }, async () => {
  assert.equal(process.env.ALLOW_INTEGRATION_TESTS, "1", "Run only against the test database with ALLOW_INTEGRATION_TESTS=1.");
  const studentId = randomUUID(), adminId = randomUUID();
  let courseId: string | undefined;
  const student: SessionUser = { id: studentId, email: `${studentId}@example.invalid`, name: "Student", role: "STUDENT" };
  const admin: SessionUser = { id: adminId, email: `${adminId}@example.invalid`, name: "Admin", role: "ADMIN" };
  try {
    await prisma.user.createMany({ data: [student, admin].map((user) => ({ id: user.id, email: user.email, name: user.name, role: user.role, passwordHash: "test-only" })) });
    const course = await prisma.course.create({ data: { title: "Learning fixture", status: "PUBLISHED" } });
    courseId = course.id;
    const stage = await prisma.stage.create({ data: { title: "Stage", courseId, order: 0 } });
    const subject = await prisma.subject.create({ data: { title: "Subject", stageId: stage.id, order: 0 } });
    const first = await prisma.chapter.create({ data: { title: "First", subjectId: subject.id, status: "PUBLISHED", order: 0 } });
    const second = await prisma.chapter.create({ data: { title: "Second", subjectId: subject.id, status: "PUBLISHED", order: 1 } });
    const draft = await prisma.chapter.create({ data: { title: "Draft", subjectId: subject.id, status: "DRAFT", order: 2 } });
    const lesson1 = await prisma.lesson.create({ data: { title: "Lesson 1", chapterId: first.id, status: "PUBLISHED", order: 0, videoTheoryUrl: "https://youtu.be/dQw4w9WgXcQ" } });
    const lesson2 = await prisma.lesson.create({ data: { title: "Lesson 2", chapterId: second.id, status: "PUBLISHED", order: 0 } });
    const draftLesson = await prisma.lesson.create({ data: { title: "Draft lesson", chapterId: draft.id, status: "DRAFT", order: 0 } });
    const question = await prisma.question.create({ data: { lessonId: lesson1.id, order: 0, type: "MULTIPLE_CHOICE", content: "1+1?", options: [{ id: "A", text: "1" }, { id: "B", text: "2" }, { id: "C", text: "3" }, { id: "D", text: "4" }], correctAnswer: "B", explanation: "1+1=2" } });

    const initial = await getLearningSubject(student, subject.id);
    assert.equal(initial.chapters.length, 2);
    assert.equal(initial.chapters[0].locked, false);
    assert.equal(initial.chapters[1].locked, true);
    assert.equal((await getLearningLesson(student, lesson2.id)).locked, true);
    await assert.rejects(performLearningAction(student, lesson2.id, { action: "OPEN" }), (error: unknown) => error instanceof HttpError && error.status === 403);
    await assert.rejects(getLearningSubject(student, subject.id, { preview: true }), (error: unknown) => error instanceof HttpError && error.status === 403);

    const normalPreview = await getLearningSubject(admin, subject.id, { preview: true });
    assert.equal(normalPreview.chapters.length, 2, "default preview hides drafts just like the learner");
    await assert.rejects(getLearningSubject(student, subject.id, { simulated: [lesson1.id] }), (error: unknown) => error instanceof HttpError && error.status === 403);
    const simulated = await getLearningSubject(admin, subject.id, { preview: true, simulated: [lesson1.id] });
    assert.equal(simulated.chapters[1].locked, false);
    assert.equal((await getLearningSubject(student, subject.id)).chapters[1].locked, true, "simulation cannot change learner access");
    await finishContentSteps(admin, lesson1.id, { preview: true });
    await performLearningAction(admin, lesson1.id, { action: "COMPLETE", preview: true });
    const preview = await getLearningSubject(admin, subject.id, { preview: true, showDrafts: true, unlock: draft.id });
    assert.equal(preview.chapters.length, 3);
    assert.equal(preview.chapters[2].magicUnlocked, true);
    assert.equal((await getLearningLesson(admin, draftLesson.id, { preview: true, showDrafts: true, unlock: draft.id })).locked, false);
    await performLearningAction(admin, draftLesson.id, { action: "SYNC", preview: true, showDrafts: true, unlock: draft.id });
    assert.equal(await prisma.exerciseAttempt.count({ where: { userId: admin.id } }), 0);
    assert.equal(await prisma.progress.count({ where: { userId: admin.id } }), 0);

    const result = await submitNewSession(student, lesson1.id, { [question.id]: "B" });
    assert.equal(result.score, 100);
    await performLearningAction(student, lesson1.id, { action: "OPEN" });
    await finishContentSteps(student, lesson1.id);
    await performLearningAction(student, lesson1.id, { action: "COMPLETE" });
    assert.equal(await prisma.exerciseAttempt.count({ where: { userId: student.id, lessonId: lesson1.id } }), 1);
    assert.equal(await prisma.learningActivity.count({ where: { userId: student.id } }), 3);
    assert.equal((await prisma.progress.findUniqueOrThrow({ where: { userId_lessonId: { userId: student.id, lessonId: lesson1.id } } })).isCompleted, true);
    assert.equal((await getLearningSubject(student, subject.id)).chapters[1].locked, false);
  } finally {
    if (courseId) await prisma.course.deleteMany({ where: { id: courseId } });
    await prisma.user.deleteMany({ where: { id: { in: [studentId, adminId] } } });
    await prisma.$disconnect();
  }
});
