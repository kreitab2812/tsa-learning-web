import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../../server/db/prisma";
import { addLessonAttachment, patchLessonAttachment, removeLessonAttachment } from "../../server/admin/attachment-service";
import { updateLesson } from "../../server/admin/content-mutations";
import { getLearningLesson } from "../../server/learning/service";
import { attachmentDownload } from "../../server/learning/attachment-access";
import { HttpError } from "../../server/http/errors";
import type { SessionUser } from "../../features/auth/types";

test("media is hidden for locked learners; settings, legacy sync and preview access remain server controlled", { timeout: 120000 }, async () => {
  assert.equal(process.env.ALLOW_INTEGRATION_TESTS, "1");
  let courseId: string | undefined;
  const student: SessionUser = { id: randomUUID(), email: "media-student@example.invalid", name: "Student", role: "STUDENT" };
  const admin: SessionUser = { ...student, id: randomUUID(), email: "media-admin@example.invalid", role: "ADMIN" };
  const denied = (error: unknown) => error instanceof HttpError && error.status === 403;
  try {
    const course = await prisma.course.create({ data: { title: "Media phase 2 fixture", status: "PUBLISHED" } }); courseId = course.id;
    const stage = await prisma.stage.create({ data: { title: "Stage", order: 0, courseId } });
    const subject = await prisma.subject.create({ data: { title: "Subject", order: 0, stageId: stage.id } });
    const first = await prisma.chapter.create({ data: { title: "First", order: 0, subjectId: subject.id, status: "PUBLISHED" } });
    const second = await prisma.chapter.create({ data: { title: "Second", order: 1, subjectId: subject.id, status: "PUBLISHED" } });
    const open = await prisma.lesson.create({ data: { title: "Open", order: 0, chapterId: first.id, status: "PUBLISHED" } });
    const locked = await prisma.lesson.create({ data: { title: "Locked", order: 0, chapterId: second.id, status: "PUBLISHED" } });
    const input = { title: "PDF", url: "https://drive.google.com/file/d/example-id/view", section: "THEORY" as const };
    const file = await addLessonAttachment(open.id, input);
    assert.equal((await prisma.lesson.findUniqueOrThrow({ where: { id: open.id } })).theoryDocumentUrl, input.url);
    const view = await getLearningLesson(student, open.id);
    assert.equal(view.attachments[0].id, file.id); assert.equal(view.viewerEmail, student.email);
    assert.equal(view.videoTheoryUrl, null, "PDF-only lessons remain supported");
    assert.match(await attachmentDownload(student, file.id), /export=download/);
    await patchLessonAttachment(open.id, { id: file.id, title: "Private PDF", allowDownload: false, watermark: true });
    await assert.rejects(attachmentDownload(student, file.id), denied);
    await assert.rejects(attachmentDownload(admin, file.id, { preview: true }), denied);
    assert.equal((await getLearningLesson(student, open.id)).attachments[0].watermark, true);
    const hidden = await addLessonAttachment(locked.id, { ...input, section: "DOCUMENTS" });
    const hiddenView = await getLearningLesson(student, locked.id);
    assert.equal(hiddenView.locked, true); assert.deepEqual(hiddenView.attachments, []); assert.equal(hiddenView.theoryDocumentUrl, null);
    await assert.rejects(attachmentDownload(student, hidden.id), denied);
    await assert.rejects(attachmentDownload(student, hidden.id, { preview: true, unlock: second.id }), denied);
    assert.match(await attachmentDownload(admin, hidden.id, { preview: true, unlock: second.id }), /drive.google.com/);
    await assert.rejects(patchLessonAttachment(locked.id, { id: file.id, title: "Wrong lesson", allowDownload: true, watermark: false }));
    await updateLesson(open.id, { theoryDocumentUrl: "https://drive.google.com/file/d/changed-id/view" });
    assert.equal((await getLearningLesson(student, open.id)).attachments[0].url, "https://drive.google.com/file/d/changed-id/view");
    await removeLessonAttachment(open.id, file.id);
    assert.equal((await prisma.lesson.findUniqueOrThrow({ where: { id: open.id } })).theoryDocumentUrl, null);
    assert.equal(await prisma.lessonAttachment.count({ where: { lessonId: open.id } }), 0);
    assert.equal(await prisma.progress.count({ where: { userId: admin.id } }), 0);
    assert.equal(await prisma.exerciseAttempt.count({ where: { userId: admin.id } }), 0);
  } finally {
    if (courseId) await prisma.course.deleteMany({ where: { id: courseId } });
    await prisma.$disconnect();
  }
});
