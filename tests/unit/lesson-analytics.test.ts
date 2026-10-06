import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { summarizeMistakes } from "../../features/analytics/attempt-summary";
import { lessonResources } from "../../features/analytics/link-fields";
import { mergeWatchRanges, watchedSeconds, playedInterval, videoProgressSchema } from "../../features/analytics/video-progress";
import { linkScanSchema } from "../../features/learning/schemas";

test("mistakes count actual attempts, ignore Preview/legacy and separate changed question versions", () => {
  const question = { id: randomUUID(), type: "MULTIPLE_CHOICE", content: "Original", imageUrl: null, correctAnswer: "A", options: [{ id: "A", text: "One" }, { id: "B", text: "Two" }] };
  const attempt = (correct: boolean, preview = false, changed = false, reversed = false) => ({ session: {
    preview, snapshot: { questions: [{ ...question, content: changed ? "Edited" : question.content, options: reversed ? [...question.options].reverse() : question.options }] },
    result: { feedback: [{ questionId: question.id, correct }] },
  } });
  const result = summarizeMistakes([attempt(false), attempt(false, false, false, true), attempt(false), attempt(true), attempt(true), attempt(false, true), { session: null }, attempt(false, false, true)]);
  assert.equal(result.included, 6);
  assert.equal(result.questions.length, 2);
  assert.deepEqual([result.questions[0].wrong, result.questions[0].total], [3, 5]);
  assert.equal(result.questions[1].content, "Edited");
});

test("link library includes paired PDFs and attachments once, with exact editor destinations", () => {
  const lessonId = randomUUID(), fileId = randomUUID();
  const links = lessonResources({ id: lessonId, theoryDocumentUrl: "https://example.com/theory", practiceDocumentUrl: "https://example.com/practice", attachments: [
    { id: randomUUID(), title: "Mirror", url: "https://example.com/theory", kind: "PDF", sourceKey: "theoryDocumentUrl" },
    { id: fileId, title: "Archive", url: "https://example.com/file.zip", kind: "ZIP", sourceKey: null },
  ] });
  assert.equal(links.length, 3);
  assert.match(links[1].editHref, /tab=practice$/);
  assert.ok(links[2].editHref.endsWith(`#attachment-${fileId}`));
  assert.equal(linkScanSchema.safeParse({ lessonId, kind: links[2].kind }).success, true);
  assert.equal(linkScanSchema.safeParse({ lessonId }).success, true);
  assert.equal(linkScanSchema.safeParse({ kind: links[2].kind }).success, false);
  assert.equal(linkScanSchema.safeParse({ lessonId, kind: "ATTACHMENT:invalid" }).success, false);
});

test("video measurement unions replays, excludes jumps and limits incoming samples", () => {
  const merged = mergeWatchRanges([[0, 10], [5, 15], [50, 60], [0, 10]], 55);
  assert.deepEqual(merged, [[0, 15], [50, 55]]);
  assert.equal(watchedSeconds(merged), 20);
  const previous = { time: 10, wall: 1000, rate: 1 };
  assert.deepEqual(playedInterval(previous, { time: 11, wall: 2000, rate: 1 }), [10, 11]);
  assert.equal(playedInterval(previous, { time: 50, wall: 2000, rate: 1 }), null);
  assert.equal(playedInterval(previous, { time: 9, wall: 2000, rate: 1 }), null);
  assert.equal(playedInterval(previous, { time: 20, wall: 11000, rate: 1 }), null);
  const input = { section: "THEORY", videoId: "abcdefghijk", duration: 100, ranges: [[0, 10]] };
  assert.equal(videoProgressSchema.safeParse(input).success, true);
  assert.equal(videoProgressSchema.safeParse({ ...input, preview: true }).success, false);
  assert.equal(videoProgressSchema.safeParse({ ...input, ranges: [[0, 200]] }).success, false);
  assert.equal(videoProgressSchema.safeParse({ ...input, ranges: [[9, 2]] }).success, false);
  assert.equal(videoProgressSchema.safeParse({ ...input, ranges: Array(121).fill([0, 1]) }).success, false);
});
