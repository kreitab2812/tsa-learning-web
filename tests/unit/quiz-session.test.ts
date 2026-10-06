import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { canOpenStep, snapshotQuestions, gradeSnapshot, validateAnswers, quizView, type QuizSnapshot } from "../../features/learning/quiz-session";
import type { Question } from "../../features/lessons/types";
import { learningActionSchema } from "../../features/learning/schemas";
import { availableLessonSteps } from "../../features/learning/lesson-steps";

const questions: Question[] = [
  { id: randomUUID(), type: "MULTIPLE_CHOICE", content: "MC", imageUrl: null, options: ["A", "B", "C", "D"].map(id => ({ id, text: id })), correctAnswer: "B", explanation: "secret MC", order: 0 },
  { id: randomUUID(), type: "TRUE_FALSE_GROUP", content: "TF", imageUrl: null, options: [{ id: "a", text: "A", isTrue: true }, { id: "b", text: "B", isTrue: false }], correctAnswer: null, explanation: "secret TF", order: 1 },
  { id: randomUUID(), type: "SHORT_ANSWER", content: "Short", imageUrl: null, options: null, correctAnswer: "X", explanation: "secret short", order: 2 },
];
const snapshot: QuizSnapshot = { questions, passPercent: 60, timeLimitMinutes: 45, completionMode: "QUIZ_PASSED", shuffleQuestions: true, shuffleAnswers: true };
test("steps follow configured policy and cannot skip prerequisites", () => {
  assert.equal(canOpenStep(0, [], "SEQUENTIAL"), true);
  assert.equal(canOpenStep(3, [0, 2], "SEQUENTIAL"), false);
  assert.equal(canOpenStep(3, [0, 1, 2], "SEQUENTIAL"), true);
  assert.equal(canOpenStep(3, [], "FREE"), true);
});
test("optional sections skip empty prerequisites without bypassing configured content", () => {
  assert.deepEqual(availableLessonSteps({}), []);
  assert.deepEqual(availableLessonSteps({ videoPracticeUrl: "video" }), [1]);
  assert.deepEqual(availableLessonSteps({ attachments: [{ section: "DOCUMENTS", sourceKey: null }] }), [2]);
  assert.deepEqual(availableLessonSteps({ attachments: [{ section: "DOCUMENTS", sourceKey: "answerUrl" }] }), []);
  assert.deepEqual(availableLessonSteps({ _count: { questions: 1 } }), [3]);
  assert.deepEqual(availableLessonSteps({ exerciseUrl: "https://example.com/exercise.pdf", attachments: [{ section: "DOCUMENTS", sourceKey: "exerciseUrl" }] }), [3]);
  assert.deepEqual(availableLessonSteps({}, true), [3], "An existing quiz snapshot stays accessible even when questions are removed");
  assert.equal(canOpenStep(1, [], "SEQUENTIAL", [1]), true);
  assert.equal(canOpenStep(3, [], "SEQUENTIAL", [3]), true);
  assert.equal(canOpenStep(3, [], "SEQUENTIAL", [1, 3]), false);
  assert.equal(canOpenStep(3, [1], "SEQUENTIAL", [1, 3]), true);
  assert.equal(canOpenStep(0, [], "FREE", [1, 3]), false);
});
test("snapshot shuffle preserves keys, does not mutate source and hides all solutions before submission", () => {
  const before = structuredClone(questions);
  const ordered = snapshotQuestions(questions, true, true, () => 0);
  assert.deepEqual(questions, before);
  assert.notDeepEqual(ordered.map(q => q.id), questions.map(q => q.id));
  assert.notDeepEqual(ordered.find(q => q.type === "MULTIPLE_CHOICE")?.options?.map(o => o.id), ["A", "B", "C", "D"]);
  const view = quizView({ id: randomUUID(), revision: 0, startedAt: new Date(), deadlineAt: null, submittedAt: null, snapshot: { ...snapshot, questions: ordered }, answers: {}, result: { secret: true } });
  const serialized = JSON.stringify(view);
  for (const forbidden of ["correctAnswer", "explanation", "isTrue", "secret"]) assert.ok(!serialized.includes(forbidden));
});
test("three answer types, absent/partial answers and pass boundary grade consistently", () => {
  const answers = { [questions[0].id]: "B", [questions[1].id]: { a: true, b: false }, [questions[2].id]: " x " };
  assert.equal(gradeSnapshot(snapshot, answers, false).score, 100);
  assert.equal(gradeSnapshot(snapshot, {}, true).timedOut, true);
  assert.equal(gradeSnapshot(snapshot, { [questions[1].id]: { a: true } }, false).correctCount, 0);
  const two = { ...snapshot, questions: questions.slice(0, 2), passPercent: 50 };
  assert.equal(gradeSnapshot(two, { [questions[0].id]: "B" }, false).passed, true);
  assert.equal(gradeSnapshot({ ...two, passPercent: 51 }, { [questions[0].id]: "B" }, false).passed, false);
  assert.equal(validateAnswers(snapshot, { [randomUUID()]: "A" }), false);
  assert.equal(validateAnswers(snapshot, { [questions[0].id]: "Z" }), false);
  assert.equal(validateAnswers(snapshot, { [questions[1].id]: { extra: true } }), false);
});
test("API requires session identity/revision and rejects legacy unbound submissions", () => {
  assert.equal(learningActionSchema.safeParse({ action: "SUBMIT", answers: {} }).success, false);
  assert.equal(learningActionSchema.safeParse({ action: "SUBMIT", answers: {}, sessionId: randomUUID(), revision: 0 }).success, true);
  assert.equal(learningActionSchema.safeParse({ action: "SAVE", answers: {}, sessionId: randomUUID(), revision: -1 }).success, false);
  assert.equal(learningActionSchema.safeParse({ action: "STEP", step: 4 }).success, false);
});
