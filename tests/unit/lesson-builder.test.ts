import { test } from "node:test";
import assert from "node:assert/strict";
import { lessonPatchSchema } from "../../features/content/schemas";
import { changedLessonFields, remainingLessonDraft, type LessonEditorValues } from "../../features/lessons/editor-state";

test("lesson settings accept relaxed and optional strict policies without injecting defaults", () => {
  assert.deepEqual(lessonPatchSchema.parse({ title: "Tên mới" }), { title: "Tên mới" });
  const settings = { completionMode: "MANUAL", stepNavigation: "FREE", quizTimeLimitMinutes: null, quizMaxAttempts: null, requireCompletionForNext: false };
  assert.deepEqual(lessonPatchSchema.parse(settings), settings);
  assert.equal(lessonPatchSchema.safeParse({ completionMode: "QUIZ_PASSED", quizPassPercent: 75, quizTimeLimitMinutes: 45, quizMaxAttempts: 3 }).success, true);
  for (const patch of [{ quizPassPercent: 0 }, { quizPassPercent: 101 }, { quizPassPercent: 1.5 }, { quizTimeLimitMinutes: 0 }, { quizMaxAttempts: -1 }, { stepNavigation: "other" }, { quizShuffleAnswers: "true" }]) {
    assert.equal(lessonPatchSchema.safeParse(patch).success, false);
  }
});

test("new PDF slots preserve Google Drive links and reject unsafe URLs", () => {
  const drive = "https://drive.google.com/file/d/example/view?resourcekey=key";
  assert.equal(lessonPatchSchema.parse({ theoryDocumentUrl: drive }).theoryDocumentUrl, drive);
  assert.equal(lessonPatchSchema.parse({ practiceDocumentUrl: "" }).practiceDocumentUrl, null);
  assert.equal(lessonPatchSchema.safeParse({ theoryDocumentUrl: "javascript:alert(1)" }).success, false);
  assert.equal(lessonPatchSchema.safeParse({ attachments: [] }).success, false);
  assert.equal(lessonPatchSchema.safeParse({ additionalDocuments: [
    { title: "Tài liệu 2", url: "https://drive.google.com/file/d/second-document/view" },
    { title: "Tài liệu 3", url: "https://drive.google.com/file/d/third-document/view" },
  ] }).success, true);
  assert.equal(lessonPatchSchema.safeParse({ additionalDocuments: [{ title: "Sai", url: "https://example.com/document.pdf" }] }).success, false);
});

test("saving one step keeps other drafts and newer in-flight edits", () => {
  assert.deepEqual(remainingLessonDraft({ title: "Title", documentUrl: "unsaved", videoTheoryUrl: "newer" }, { title: "Title", videoTheoryUrl: "older" }), { documentUrl: "unsaved", videoTheoryUrl: "newer" });
  assert.deepEqual(remainingLessonDraft({ documentUrl: "" }, { documentUrl: "" }), {});
  const saved = { title: "Title", documentUrl: "", quizTimeLimitMinutes: 45 } as LessonEditorValues;
  assert.deepEqual(changedLessonFields(saved, { title: "Title", documentUrl: "", quizTimeLimitMinutes: null }), { quizTimeLimitMinutes: null });
});
