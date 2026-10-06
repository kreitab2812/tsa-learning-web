import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { learningActionSchema } from "../../features/learning/schemas";

test("learning actions accept bounded real answers and reject malformed payloads", () => {
  const questionId = randomUUID();
  assert.equal(learningActionSchema.safeParse({ action: "OPEN" }).success, true);
  assert.equal(learningActionSchema.safeParse({ action: "COMPLETE", preview: true, unlock: randomUUID() }).success, true);
  assert.equal(learningActionSchema.safeParse({ action: "SUBMIT", sessionId: randomUUID(), revision: 0, answers: { [questionId]: "A" } }).success, true);
  assert.equal(learningActionSchema.safeParse({ action: "SUBMIT", sessionId: randomUUID(), revision: 0, answers: { [questionId]: { a: true, b: false } } }).success, true);
  assert.equal(learningActionSchema.safeParse({ action: "SUBMIT", sessionId: randomUUID(), revision: 0, answers: { not_an_id: "A" } }).success, false);
  assert.equal(learningActionSchema.safeParse({ action: "UNLOCK", answers: {} }).success, false);
});
