import { submitNewSession } from "../helpers/learning-workflow";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../../server/db/prisma";
import { createLesson, createQuestion, importQuestions, updateLesson, updateQuestion } from "../../server/admin/content-mutations";
import { duplicateQuestion, moveQuestion } from "../../server/admin/question-actions";
import { getLearningLesson } from "../../server/learning/service";
import { attachmentDownload } from "../../server/learning/attachment-access";
import { IMPORT_SAMPLE } from "../../features/lessons/quiz-import";
import type { SessionUser } from "../../features/auth/types";
import { questionSchema } from "../../features/content/schemas";

test("quiz builder persists, orders, imports atomically and withholds answers until submission", { timeout: 120000 }, async () => {
  assert.equal(process.env.ALLOW_INTEGRATION_TESTS, "1", "Use only the approved test database.");
  const student: SessionUser = { id: randomUUID(), email: `${randomUUID()}@example.invalid`, name: "Quiz fixture", role: "STUDENT" };
  const admin: SessionUser = { id: randomUUID(), email: `${randomUUID()}@example.invalid`, name: "Preview fixture", role: "ADMIN" };
  let courseId: string | undefined;
  try {
    await prisma.user.createMany({ data: [student, admin].map(user => ({ ...user, passwordHash: "test-only" })) });
    const course = await prisma.course.create({ data: { title: "Quiz phase 3 fixture", status: "PUBLISHED" } }); courseId = course.id;
    const stage = await prisma.stage.create({ data: { title: "Stage", courseId, order: 0 } });
    const subject = await prisma.subject.create({ data: { title: "Subject", stageId: stage.id, order: 0 } });
    const chapter = await prisma.chapter.create({ data: { title: "Chapter", subjectId: subject.id, order: 0, status: "PUBLISHED" } });
    const lesson = await createLesson({ title: "Quiz", chapterId: chapter.id, status: "PUBLISHED", answerUrl: "https://example.com/private-answers.pdf" });
    const rich = "**Lời giải bí mật** $x^2$ ![Giải](https://example.com/secret.png)";
    const question = await createQuestion({ ...questionSchema.parse(IMPORT_SAMPLE[0]), lessonId: lesson.id, explanation: rich });
    await updateQuestion(question.id, { content: "**Tính** $2^3$", explanation: rich });
    const clone = await duplicateQuestion(question.id);
    assert.equal(clone.explanation, rich); assert.notEqual(clone.id, question.id);
    await moveQuestion(clone.id, "up");
    assert.equal((await prisma.question.findFirstOrThrow({ where: { lessonId: lesson.id }, orderBy: { order: "asc" } })).id, clone.id);
    const imported = await importQuestions({ lessonId: lesson.id, questions: IMPORT_SAMPLE.map(value => questionSchema.parse(value)) });
    assert.equal(imported.length, 3);
    assert.throws(() => importQuestions({ lessonId: lesson.id, questions: [{ type: "SHORT_ANSWER", content: "Missing answer" }] }));
    assert.equal(await prisma.question.count({ where: { lessonId: lesson.id } }), 5);
    const saved = await updateLesson(lesson.id, { quizShuffleQuestions: true, quizShuffleAnswers: true, quizTimeLimitMinutes: 45, quizPassPercent: 70 });
    assert.equal(saved.quizShuffleQuestions, true); assert.equal(saved.quizShuffleAnswers, true); assert.equal(saved.quizTimeLimitMinutes, 45); assert.equal(saved.quizPassPercent, 70);

    const answer = await prisma.lessonAttachment.findUniqueOrThrow({ where: { lessonId_sourceKey: { lessonId: lesson.id, sourceKey: "answerUrl" } } });
    for (const [actor, options] of [[student, {}], [admin, { preview: true }]] as const) {
      const view = await getLearningLesson(actor, lesson.id, options);
      const payload = JSON.stringify(view);
      for (const secret of ["correctAnswer", "explanation", "isTrue", "secret.png", "private-answers.pdf"]) assert.ok(!payload.includes(secret), `Leaked ${secret}`);
      assert.equal(view.answerUrl, null);
    }
    await assert.rejects(attachmentDownload(student, answer.id), /nộp bài/);
    const previewResult = await submitNewSession(admin, lesson.id, { [question.id]: "B" }, { preview: true });
    assert.equal(previewResult.feedback?.find(item => item.questionId === question.id)?.explanation, rich);
    assert.equal(await prisma.exerciseAttempt.count({ where: { userId: admin.id } }), 0);
    const result = await submitNewSession(student, lesson.id, { [question.id]: "B" });
    assert.equal(result.feedback?.find(item => item.questionId === question.id)?.explanation, rich);
    assert.equal(result.view.attachments.find(file => file.sourceKey === "answerUrl")?.id, answer.id);
    assert.equal(await prisma.exerciseAttempt.count({ where: { userId: student.id } }), 1);
    assert.ok((await attachmentDownload(student, answer.id)).includes("private-answers.pdf"));
    assert.equal((await getLearningLesson(student, lesson.id)).answerUrl, lesson.answerUrl);
    assert.equal((await getLearningLesson(admin, lesson.id, { preview: true })).answerUrl, lesson.answerUrl, "only the Admin’s own submitted simulation grants preview answer access");
  } finally {
    if (courseId) await prisma.course.deleteMany({ where: { id: courseId } });
    await prisma.user.deleteMany({ where: { id: { in: [student.id, admin.id] } } });
    await prisma.$disconnect();
  }
});
