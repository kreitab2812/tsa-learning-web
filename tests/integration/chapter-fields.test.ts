import { test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../../server/db/prisma";
import * as content from "../../server/admin/content-mutations";
import { getAdminSubjectTree } from "../../server/admin/course-queries";

test("chapter admin fields persist, query, and validate as one range", { timeout: 90000 }, async () => {
  assert.equal(process.env.ALLOW_INTEGRATION_TESTS, "1", "Run only against the test database with ALLOW_INTEGRATION_TESTS=1.");
  let courseId: string | undefined;
  try {
    const course = await content.createCourse({ title: "Chapter fields fixture" });
    courseId = course.id;
    const stage = await content.createStage({ courseId, title: "Stage" });
    const subject = await content.createSubject({ stageId: stage.id, title: "Subject" });
    const chapter = await content.createChapter({
      subjectId: subject.id, title: "Cụm", description: "Mô tả",
      status: "PUBLISHED", openAt: "2030-01-01T01:00:00Z", closeAt: "2030-01-02T01:00:00Z",
    });

    const queried = (await getAdminSubjectTree(subject.id)).chapters[0];
    assert.equal(queried.description, "Mô tả");
    assert.equal(queried.status, "PUBLISHED");
    assert.equal(queried.openAt?.toISOString(), "2030-01-01T01:00:00.000Z");
    assert.equal(queried.closeAt?.toISOString(), "2030-01-02T01:00:00.000Z");

    await assert.rejects(content.updateChapter(chapter.id, { closeAt: "2029-01-01T01:00:00Z" }), /Ngày đóng phải sau ngày mở/);
    const updated = await content.updateChapter(chapter.id, { description: null, status: "DRAFT", openAt: null, closeAt: null });
    assert.equal(updated.description, null);
    assert.equal(updated.status, "DRAFT");
    assert.equal(updated.openAt, null);
    assert.equal(updated.closeAt, null);
  } finally {
    if (courseId) await prisma.course.deleteMany({ where: { id: courseId } });
    await prisma.$disconnect();
  }
});
