import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../../server/db/prisma";
import * as content from "../../server/admin/content-mutations";
import { getAdminCourse, getAdminSubjectTree } from "../../server/admin/course-queries";
import { findSessionUser, issueSession, revokeSession, tokenHash } from "../../server/auth/session-store";
import { consumeLoginAttempt } from "../../server/auth/throttle";
import { hashPassword } from "../../server/auth/password";
import { HttpError } from "../../server/http/errors";
import { createHash } from "node:crypto";

test("database integration: content integrity and session lifecycle", { timeout: 180000 }, async (t) => {
  assert.equal(process.env.ALLOW_INTEGRATION_TESTS, "1", "Run only against the test database with ALLOW_INTEGRATION_TESTS=1.");
  let courseId: string | undefined;
  let userId: string | undefined;
  const email = `integration-${randomUUID()}@example.invalid`;
  try {
    const course = await content.createCourse({ title: "Integration fixture", status: "SCHEDULED", publishAt: "2030-01-01T00:00:00Z", showCountdown: false });
    courseId = course.id;
    const stage = await content.createStage({ courseId, title: "Giai đoạn" });
    const subject = await content.createSubject({ stageId: stage.id, title: "Toán" });
    const otherSubject = await content.createSubject({ stageId: stage.id, title: "Lý" });
    const chapter = await content.createChapter({ subjectId: subject.id, title: "Cụm gốc" });

    await t.test("patch preserves schedule and rejects inconsistent merged state", async () => {
      const updated = await content.updateCourse(courseId!, { title: "Renamed fixture" });
      assert.equal(updated.status, "SCHEDULED");
      assert.equal(updated.showCountdown, false);
      await assert.rejects(content.updateCourse(courseId!, { publishAt: null }));
    });
    await t.test("chapter parent must share subject; tree handles depth beyond three", async () => {
      await assert.rejects(content.createChapter({ subjectId: otherSubject.id, parentId: chapter.id, title: "Invalid" }), (error: unknown) => error instanceof HttpError && error.status === 400);
      let parent = chapter;
      for (let i = 0; i < 4; i++) parent = await content.createChapter({ subjectId: subject.id, parentId: parent.id, title: `Depth ${i}` });
      const tree = await getAdminCourse(courseId!);
      assert.equal(tree!.stages[0].subjects[0].chapters.length, 0);
      let node = (await getAdminSubjectTree(subject.id)).chapters[0];
      for (let i = 0; i < 4; i++) node = node.children[0];
      assert.equal(node.id, parent.id);
    });
    const a = await content.createLesson({ chapterId: chapter.id, title: "A" });
    const b = await content.createLesson({ chapterId: chapter.id, title: "B" });
    const c = await content.createLesson({ chapterId: chapter.id, title: "C" });
    await content.deleteContent("lesson", b.id);
    await t.test("delete then concurrent insert keeps ordering distinct", async () => {
      const created = await Promise.all(["D", "E", "F"].map((title) => content.createLesson({ chapterId: chapter.id, title })));
      const rows = await prisma.lesson.findMany({ where: { chapterId: chapter.id }, orderBy: { order: "asc" } });
      assert.equal(new Set(rows.map((row) => row.order)).size, 5);
      assert.ok(created.every((row) => row.order > c.order));
      await content.reorderContent("lesson", { id: c.id, direction: "up" });
      const reordered = await prisma.lesson.findMany({ where: { chapterId: chapter.id }, orderBy: { order: "asc" } });
      assert.equal(reordered[0].id, c.id);
    });
    await t.test("batch questions are validated atomically and returned in order", async () => {
      const questions = [{ type: "SHORT_ANSWER" as const, content: "1+1", correctAnswer: "2" }, { type: "TRUE_FALSE_GROUP" as const, content: "TF", options: [{ id: "a", text: "True", isTrue: true }] }];
      const rows = await content.importQuestions({ lessonId: a.id, questions });
      assert.deepEqual(rows.map((row) => row.order), [0, 1]);
      await assert.rejects(async () => content.importQuestions({ lessonId: a.id, questions: [...questions, { type: "SHORT_ANSWER", content: "Missing answer" }] }));
      assert.equal(await prisma.question.count({ where: { lessonId: a.id } }), 2);
      await assert.rejects(content.updateQuestion(rows[0].id, { correctAnswer: null }));
    });

    const user = await prisma.user.create({ data: { email, name: "Integration", role: "STUDENT", passwordHash: await hashPassword(randomUUID()) } });
    userId = user.id;
    await t.test("session token is hashed; role is re-read; rotation/logout/expiry revoke access", async () => {
      const first = await issueSession(user.id);
      assert.equal((await findSessionUser(first.token))?.role, "STUDENT");
      assert.equal(await prisma.session.findUnique({ where: { tokenHash: first.token } }), null);
      await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
      assert.equal((await findSessionUser(first.token))?.role, "ADMIN");
      const second = await issueSession(user.id, first.token);
      assert.equal(await findSessionUser(first.token), null);
      await revokeSession(second.token);
      assert.equal(await findSessionUser(second.token), null);
      const expired = await issueSession(user.id);
      await prisma.session.update({ where: { tokenHash: tokenHash(expired.token) }, data: { expiresAt: new Date(0) } });
      assert.equal(await findSessionUser(expired.token), null);
      assert.equal(await findSessionUser("forged"), null);
      await assert.rejects(issueSession(user.id, undefined, "outdated-password-hash"), (error: unknown) => error instanceof HttpError && error.status === 401);
    });
    await t.test("login rate limit persists across attempts", async () => {
      for (let i = 0; i < 10; i++) await consumeLoginAttempt(email);
      await assert.rejects(consumeLoginAttempt(email), (error: unknown) => error instanceof HttpError && error.status === 429);
    });
    await t.test("course deletion cascades through its fixtures", async () => {
      await content.deleteContent("course", courseId!);
      assert.equal(await prisma.lesson.findUnique({ where: { id: a.id } }), null);
      assert.equal(await prisma.question.count({ where: { lessonId: a.id } }), 0);
      courseId = undefined;
    });
  } finally {
    if (courseId) await prisma.course.deleteMany({ where: { id: courseId } });
    if (userId) await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.loginThrottle.deleteMany({ where: { key: createHash("sha256").update(`login:${email}`).digest("hex") } });
    await prisma.$disconnect();
  }
});
