import { test } from "node:test";
import assert from "node:assert/strict";
import { publishedChapterIds } from "../../features/learning/publication";
import { descendantIds, healthFilterSchema, lessonEditorHref } from "../../features/analytics/filters";
import { chapterSchedule } from "../../features/courses/chapter-filter";
import { linkScanSchema } from "../../features/learning/schemas";
import { randomUUID } from "node:crypto";
import { studentCreateSchema, studentPatchSchema } from "../../features/students/schemas";

test("publication excludes descendants of drafts, missing parents and cycles", () => {
  const chapters = [
    { id: "a", parentId: null, status: "DRAFT" }, { id: "b", parentId: "a", status: "PUBLISHED" },
    { id: "c", parentId: null, status: "PUBLISHED" }, { id: "d", parentId: "c", status: "PUBLISHED" },
    { id: "e", parentId: "f", status: "PUBLISHED" }, { id: "f", parentId: "e", status: "PUBLISHED" },
    { id: "orphan", parentId: "missing", status: "PUBLISHED" },
  ];
  assert.deepEqual([...publishedChapterIds(chapters)], ["c", "d"]);
  assert.deepEqual([...descendantIds(chapters, "a")], ["a", "b"]);
});
test("health filters and targeted scan reject malformed scope and keep bounded pages", () => {
  assert.equal(healthFilterSchema.safeParse({ subject: "foreign-id" }).success, false);
  assert.equal(healthFilterSchema.parse({ activityPage: -1 }).activityPage, 1);
  const studentId = randomUUID();
  assert.equal(healthFilterSchema.parse({ student: studentId, view: "links" }).student, studentId);
  assert.equal(healthFilterSchema.parse({ view: "not-a-tab" }).view, "progress");
  // Phase 5 supports scanning all resources in a single lesson, still capped at 20.
  assert.equal(linkScanSchema.safeParse({ lessonId: randomUUID() }).success, true);
  assert.equal(linkScanSchema.safeParse({ kind: "DOCUMENT" }).success, false);
  assert.equal(linkScanSchema.safeParse({ lessonId: randomUUID(), kind: "DOCUMENT", limit: 1 }).success, true);
  assert.match(lessonEditorHref("lesson", "ANSWER"), /tab=documents$/);
  assert.match(lessonEditorHref("lesson", "VIDEO_PRACTICE"), /tab=practice$/);
});
test("student account input only accepts valid profile fields and strong passwords", () => {
  assert.equal(studentCreateSchema.safeParse({ name: "Học sinh", email: "student@example.com", password: "123456789012" }).success, true);
  assert.equal(studentCreateSchema.safeParse({ name: "Học sinh", email: "student@example.com", password: "short" }).success, false);
  assert.equal(studentPatchSchema.safeParse({ name: "Tên mới", email: "new@example.com", role: "ADMIN" }).success, false);
});
test("schedule labels cover draft, future, open and closed boundaries", () => {
  const now = Date.parse("2026-09-18T12:00:00Z");
  assert.equal(chapterSchedule({ status: "DRAFT", openAt: null, closeAt: null }, now), "Chưa xuất bản");
  assert.equal(chapterSchedule({ status: "PUBLISHED", openAt: "2026-09-19T12:00:00Z", closeAt: null }, now), "Sắp mở");
  assert.equal(chapterSchedule({ status: "PUBLISHED", openAt: null, closeAt: "2026-09-18T12:00:00Z" }, now), "Đã đóng");
  assert.equal(chapterSchedule({ status: "PUBLISHED", openAt: null, closeAt: null }, now), "Trong thời gian mở");
});
