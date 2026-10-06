import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import * as s from "../../features/content/schemas";
import { loginSchema } from "../../features/auth/schemas";

const mc = { content: "1 + 1 = ?", options: ["A", "B", "C", "D"].map((id) => ({ id, text: id })), correctAnswer: "B" };

test("partial updates must never inject defaults into unchanged fields", () => {
  assert.deepEqual(s.coursePatchSchema.parse({ title: "Mới" }), { title: "Mới" });
  assert.deepEqual(s.stagePatchSchema.parse({ title: "Mới" }), { title: "Mới" });
  assert.deepEqual(s.chapterPatchSchema.parse({ title: "Mới" }), { title: "Mới" });
  assert.deepEqual(s.lessonPatchSchema.parse({ title: "Mới" }), { title: "Mới" });
  assert.deepEqual(s.questionPatchSchema.parse({ content: "Mới" }), { content: "Mới" });
});
test("course/stage scheduling requires an explicit timezone and a date", () => {
  assert.equal(s.courseSchema.safeParse({ title: "TSA", status: "SCHEDULED" }).success, false);
  assert.equal(s.courseSchema.safeParse({ title: "TSA", status: "SCHEDULED", publishAt: "2026-09-20T08:00" }).success, false);
  assert.equal(s.courseSchema.safeParse({ title: "TSA", status: "SCHEDULED", publishAt: "2026-09-20T08:00:00+07:00" }).success, true);
  assert.equal(s.stageCreateSchema.safeParse({ title: "TSA", courseId: randomUUID(), accessMode: "TIME_LOCKED" }).success, false);
  assert.equal(s.chapterCreateSchema.safeParse({ title: "Cụm", subjectId: randomUUID(), openAt: "2026-09-20T08:00:00+07:00", closeAt: "2026-09-20T07:00:00+07:00" }).success, false);
  assert.equal(s.chapterCreateSchema.safeParse({ title: "Cụm", subjectId: randomUUID(), openAt: "2026-09-20T08:00" }).success, false);
  assert.equal(s.chapterCreateSchema.safeParse({ title: "Cụm", subjectId: randomUUID(), openAt: "2026-09-20T08:00:00+07:00", closeAt: "2026-09-20T09:00:00+07:00" }).success, true);
  assert.equal(s.lessonPatchSchema.safeParse({ status: "SCHEDULED" }).success, false);
});
test("question validation covers every type and rejects malformed answer JSON", () => {
  assert.equal(s.questionSchema.safeParse(mc).success, true);
  assert.equal(s.questionSchema.safeParse({ ...mc, correctAnswer: "E" }).success, false);
  assert.equal(s.questionSchema.safeParse({ ...mc, options: mc.options.slice(1) }).success, false);
  assert.equal(s.questionSchema.safeParse({ ...mc, options: Array(4).fill(mc.options[0]) }).success, false);
  assert.equal(s.questionSchema.safeParse({ type: "TRUE_FALSE_GROUP", content: "TF", options: [{ id: "a", text: "True", isTrue: true }] }).success, true);
  assert.equal(s.questionSchema.safeParse({ type: "TRUE_FALSE_GROUP", content: "TF", options: [{ id: "a", text: "True", isTrue: "true" }] }).success, false);
  assert.equal(s.questionSchema.safeParse({ type: "SHORT_ANSWER", content: "SA", correctAnswer: "0", options: null }).success, true);
  assert.equal(s.questionSchema.safeParse({ type: "SHORT_ANSWER", content: "SA", correctAnswer: " " }).success, false);
  assert.equal(s.questionSchema.safeParse({ ...mc, type: 123 }).success, false);
});
test("reject oversized bulk, unsafe URLs, protected order and unknown fields", () => {
  assert.equal(s.bulkQuestionsSchema.safeParse({ lessonId: randomUUID(), questions: Array(101).fill(mc) }).success, false);
  assert.equal(s.lessonPatchSchema.safeParse({ videoTheoryUrl: "javascript:alert(1)" }).success, false);
  assert.equal(s.lessonPatchSchema.safeParse({ order: 100 }).success, false);
  assert.equal(s.chapterPatchSchema.safeParse({ title: "C", parentId: randomUUID() }).success, false);
  assert.equal(s.courseSchema.safeParse({ title: " " }).success, false);
  assert.equal(s.lessonPatchSchema.parse({ documentUrl: "" }).documentUrl, null);
  assert.equal(loginSchema.parse({ email: " C@example.COM ", password: "unchanged " }).email, "c@example.com");
});
