import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Chapter, Lesson, Subject } from "../../features/courses/types";
import { changedOrderGroups, moveSubjectItem, moveSubjectItemTo } from "../../features/courses/order-draft";
import { subjectOrderSchema } from "../../features/courses/order-schema";

const lesson = (order: number): Lesson => ({ id: randomUUID(), title: `L${order}`, order, status: "DRAFT", videoTheoryUrl: null, videoPracticeUrl: null, documentUrl: null, exerciseUrl: null, answerUrl: null });
const chapter = (order: number, parentId: string | null = null): Chapter => ({
  id: randomUUID(), title: `C${order}`, description: null, status: "DRAFT", openAt: null, closeAt: null,
  order, parentId, children: [], lessons: [lesson(0), lesson(4), lesson(8)],
});
function fixture(): Subject {
  const a = chapter(0), b = chapter(5), c = chapter(9);
  a.children = [chapter(0, a.id), chapter(1, a.id)];
  return { id: randomUUID(), title: "Subject", description: null, teacherName: null, order: 0, chapters: [a, b, c] };
}

test("drag reorders siblings locally and rejects cross-parent drops", () => {
  const base = fixture(), original = structuredClone(base);
  const draft = moveSubjectItemTo(base, "chapter", base.chapters[0].id, base.chapters[2].id);
  assert.equal(draft.chapters[2].id, base.chapters[0].id);
  assert.equal(changedOrderGroups(base, draft).length, 1);
  assert.deepEqual(base, original);
  assert.equal(moveSubjectItemTo(base, "lesson", base.chapters[0].lessons[0].id, base.chapters[1].lessons[0].id), base);
});

test("local arrows never mutate the loaded snapshot; root/nested/lesson ordering stays within siblings", () => {
  const base = fixture(), original = structuredClone(base);
  let draft = moveSubjectItem(base, "chapter", base.chapters[1].id, "up");
  draft = moveSubjectItem(draft, "chapter", base.chapters[0].children[1].id, "up");
  draft = moveSubjectItem(draft, "lesson", base.chapters[0].lessons[1].id, "up");
  assert.deepEqual(base, original);
  const groups = changedOrderGroups(base, draft);
  assert.equal(groups.length, 3);
  assert.equal(subjectOrderSchema.safeParse({ groups }).success, true);
  assert.equal(draft.chapters[0].id, base.chapters[1].id);
  assert.equal(draft.chapters[1].children[0].id, base.chapters[0].children[1].id);
  assert.equal(draft.chapters[1].lessons[0].id, base.chapters[0].lessons[1].id);
});
test("moving back to original removes dirty state; discard uses untouched loaded data", () => {
  const base = fixture();
  const moved = moveSubjectItem(base, "chapter", base.chapters[1].id, "up");
  assert.equal(changedOrderGroups(base, moved).length, 1);
  const restored = moveSubjectItem(moved, "chapter", base.chapters[1].id, "down");
  assert.deepEqual(changedOrderGroups(base, restored), []);
  assert.equal(base.chapters[0].order, 0);
  assert.equal(base.chapters[1].order, 5);
});
test("boundary/unknown item moves are no-ops, including nested first/last items", () => {
  const base = fixture();
  assert.equal(moveSubjectItem(base, "chapter", base.chapters[0].id, "up"), base);
  assert.equal(moveSubjectItem(base, "chapter", base.chapters[2].id, "down"), base);
  assert.equal(moveSubjectItem(base, "chapter", base.chapters[0].children[0].id, "up"), base);
  assert.equal(moveSubjectItem(base, "lesson", base.chapters[0].lessons[2].id, "down"), base);
  assert.equal(moveSubjectItem(base, "lesson", randomUUID(), "up"), base);
});
test("save contract rejects duplicates, omitted/foreign ids, repeated groups and lessons without parent", () => {
  const [a, b, c] = [randomUUID(), randomUUID(), randomUUID()];
  const group = { kind: "chapter", parentId: null, beforeIds: [a, b], afterIds: [b, a] };
  for (const groups of [
    [{ ...group, afterIds: [a, a] }], [{ ...group, afterIds: [a] }],
    [{ ...group, afterIds: [a, c] }], [{ ...group, beforeIds: [a, a] }],
    [group, group], [{ ...group, kind: "lesson" }], [],
  ]) assert.equal(subjectOrderSchema.safeParse({ groups }).success, false);
});
