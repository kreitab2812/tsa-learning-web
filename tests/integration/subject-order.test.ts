import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../../server/db/prisma";
import { saveSubjectOrder } from "../../server/admin/subject-order";
import { HttpError } from "../../server/http/errors";
import type { OrderGroup } from "../../features/courses/order-schema";
import { issueSession, SESSION_COOKIE } from "../../server/auth/session-store";

test("subject order: atomic batches, boundaries, conflicts and protected HTTP", { timeout: 150000 }, async (t) => {
  assert.equal(process.env.ALLOW_INTEGRATION_TESTS, "1", "Test database only; creates and removes its own fixture IDs.");
  const courseId = randomUUID(), stageId = randomUUID(), subjectId = randomUUID(), otherId = randomUUID();
  const roots = [randomUUID(), randomUUID(), randomUUID()], children = [randomUUID(), randomUUID()];
  const lessons = [randomUUID(), randomUUID(), randomUUID()], foreignChapter = randomUUID(), foreignLessons = [randomUUID(), randomUUID()];
  const userId = randomUUID();
  const chapterIds = async (parentId: string | null) => (await prisma.chapter.findMany({ where: { subjectId, parentId }, orderBy: [{ order: "asc" }, { id: "asc" }] })).map((row) => row.id);
  const lessonIds = async (chapterId: string) => (await prisma.lesson.findMany({ where: { chapterId }, orderBy: [{ order: "asc" }, { id: "asc" }] })).map((row) => row.id);
  const conflict = (error: unknown) => error instanceof HttpError && error.status === 409;
  try {
    await prisma.course.create({ data: { id: courseId, title: "Phase 1 order fixture", stages: { create: {
      id: stageId, title: "Fixture", order: 0, subjects: { create: [
        { id: subjectId, title: "Subject", order: 0 }, { id: otherId, title: "Other subject", order: 1 },
      ] },
    } } } });
    await prisma.chapter.createMany({ data: [...roots.map((id, order) => ({ id, title: id, subjectId, order: order * 5 })), { id: foreignChapter, title: "Other", subjectId: otherId, order: 0 }] });
    await prisma.chapter.createMany({ data: children.map((id, order) => ({ id, subjectId, parentId: roots[0], title: id, order })) });
    await prisma.lesson.createMany({ data: [
      ...lessons.map((id, order) => ({ id, title: id, chapterId: roots[0], order: order * 3 })),
      ...foreignLessons.map((id, order) => ({ id, title: id, chapterId: foreignChapter, order })),
    ] });
    const groups: OrderGroup[] = [
      { kind: "chapter", parentId: null, beforeIds: roots, afterIds: [...roots].reverse() },
      { kind: "chapter", parentId: roots[0], beforeIds: children, afterIds: [...children].reverse() },
      { kind: "lesson", parentId: roots[0], beforeIds: lessons, afterIds: [...lessons].reverse() },
    ];
    await t.test("save root, nested and lesson groups together; retry is idempotent", async () => {
      await saveSubjectOrder(subjectId, { groups });
      assert.deepEqual(await chapterIds(null), groups[0].afterIds);
      assert.deepEqual(await chapterIds(roots[0]), groups[1].afterIds);
      assert.deepEqual(await lessonIds(roots[0]), groups[2].afterIds);
      await saveSubjectOrder(subjectId, { groups });
      assert.deepEqual(await chapterIds(null), groups[0].afterIds);
    });
    await t.test("stale inserted sibling rejects entire batch without partially saving root order", async () => {
      await prisma.chapter.create({ data: { title: "Concurrent addition", subjectId, parentId: roots[0], order: 2 } });
      await assert.rejects(saveSubjectOrder(subjectId, { groups: [
        { ...groups[0], beforeIds: groups[0].afterIds, afterIds: roots },
        { ...groups[1], beforeIds: groups[1].afterIds, afterIds: children },
      ] }), conflict);
      assert.deepEqual(await chapterIds(null), groups[0].afterIds);
    });
    await t.test("cannot reorder lessons from another subject or omit siblings", async () => {
      await assert.rejects(saveSubjectOrder(subjectId, { groups: [{ kind: "lesson", parentId: foreignChapter, beforeIds: foreignLessons, afterIds: [...foreignLessons].reverse() }] }), conflict);
      await assert.rejects(saveSubjectOrder(subjectId, { groups: [{ kind: "chapter", parentId: null, beforeIds: roots.slice(0, 2), afterIds: roots.slice(0, 2).reverse() }] }), conflict);
      assert.deepEqual(await lessonIds(foreignChapter), foreignLessons);
    });
    await t.test("simultaneous incompatible saves produce one winner and one conflict", async () => {
      const beforeIds = await chapterIds(null);
      const results = await Promise.allSettled([
        saveSubjectOrder(subjectId, { groups: [{ kind: "chapter", parentId: null, beforeIds, afterIds: [beforeIds[1], beforeIds[2], beforeIds[0]] }] }),
        saveSubjectOrder(subjectId, { groups: [{ kind: "chapter", parentId: null, beforeIds, afterIds: [...beforeIds].reverse() }] }),
      ]);
      assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
      const rejected = results.find((result) => result.status === "rejected");
      assert.ok(rejected?.status === "rejected" && conflict(rejected.reason));
    });
    await t.test("HTTP order endpoint enforces auth, role, origin and saves a valid batch", { skip: process.env.RUN_HTTP_TESTS !== "1" }, async () => {
      const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
      assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
      const url = `${base}/api/admin/subjects/${subjectId}/order`;
      const beforeIds = await chapterIds(null);
      const body = JSON.stringify({ groups: [{ kind: "chapter", parentId: null, beforeIds, afterIds: [...beforeIds].reverse() }] });
      const send = (cookie = "", origin = base) => fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json", Origin: origin, Cookie: cookie }, body });
      assert.equal((await send()).status, 401);
      await prisma.user.create({ data: { id: userId, email: `order-${userId}@example.invalid`, passwordHash: "unused-test-account", role: "STUDENT" } });
      const session = await issueSession(userId), cookie = `${SESSION_COOKIE}=${session.token}`;
      assert.equal((await send(cookie)).status, 403);
      await prisma.user.update({ where: { id: userId }, data: { role: "ADMIN" } });
      assert.equal((await send(cookie, "https://evil.invalid")).status, 403);
      const saved = await send(cookie);
      assert.equal(saved.status, 200);
      assert.equal(saved.headers.get("cache-control"), "private, no-store");
      assert.deepEqual(await chapterIds(null), [...beforeIds].reverse());
    });
  } finally {
    await prisma.course.deleteMany({ where: { id: courseId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  }
});
