import type { Question } from "@/features/lessons/types";
import type { AttemptFeedback, LearningQuestion } from "./types";

export type Answers = Record<string, string | Record<string, boolean>>;
export type QuizSnapshot = {
  questions: Question[]; passPercent: number; timeLimitMinutes: number | null;
  completionMode: "MANUAL" | "QUIZ_SUBMITTED" | "QUIZ_PASSED";
  shuffleQuestions: boolean; shuffleAnswers: boolean;
};
export type QuizResult = { score: number; correctCount: number; totalQuestions: number; passed: boolean; timedOut: boolean; feedback: AttemptFeedback[] };
export type QuizView = {
  id: string; revision: number; startedAt: string; deadlineAt: string | null; submittedAt: string | null;
  answers: Answers; questions: LearningQuestion[]; result: QuizResult | null; passPercent: number;
};
export type WorkflowView = {
  availableSteps: number[];
  currentStep: number; completedSteps: number[]; navigation: "FREE" | "SEQUENTIAL";
  completionMode: QuizSnapshot["completionMode"]; timeLimitMinutes: number | null; passPercent: number;
  maxAttempts: number | null; attemptCount: number; questionCount: number;
  session: QuizView | null; serverTime: string;
};
export const LEARNING_STEPS = ["Lý thuyết", "Thực hành", "Tài liệu", "Bài tập"] as const;
export function canOpenStep(step: number, completed: number[], navigation: "FREE" | "SEQUENTIAL", available: number[] = [0, 1, 2, 3]) {
  return available.includes(step) && (navigation === "FREE" || available.filter(i => i < step).every(i => completed.includes(i)));
}
export function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}
export function snapshotQuestions(questions: Question[], shuffleQuestions: boolean, shuffleAnswers: boolean, random: () => number) {
  const ordered = shuffleQuestions ? shuffle(questions, random) : questions;
  return ordered.map((q, order) => ({ ...q, order, options: q.options && (shuffleAnswers && q.type === "MULTIPLE_CHOICE" ? shuffle(q.options, random) : q.options.map(o => ({ ...o }))) }));
}
export function publicQuestions(questions: Question[]): LearningQuestion[] {
  return questions.map(q => ({ id: q.id, type: q.type, content: q.content, imageUrl: q.imageUrl, order: q.order,
    options: q.options?.map(o => ({ id: o.id, text: o.text })) ?? null }));
}
export function validateAnswers(snapshot: QuizSnapshot, answers: Answers): boolean {
  return Object.entries(answers).every(([id, answer]) => {
    const q = snapshot.questions.find(q => q.id === id);
    if (!q) return false;
    if (q.type === "TRUE_FALSE_GROUP") return typeof answer === "object" && Object.keys(answer).every(key => q.options?.some(o => o.id === key));
    return typeof answer === "string" && (q.type === "SHORT_ANSWER" || answer === "" || !!q.options?.some(o => o.id === answer));
  });
}
export function gradeSnapshot(snapshot: QuizSnapshot, answers: Answers, timedOut: boolean): QuizResult {
  const feedback = snapshot.questions.map((q): AttemptFeedback => {
    const actual = answers[q.id]; let correctAnswer: AttemptFeedback["correctAnswer"] = q.correctAnswer; let correct = false;
    if (q.type === "TRUE_FALSE_GROUP") {
      const expected = Object.fromEntries((q.options ?? []).map(o => [o.id, "isTrue" in o && o.isTrue === true]));
      correctAnswer = expected;
      correct = typeof actual === "object" && actual !== null && Object.keys(expected).every(key => expected[key] === actual[key]);
    } else if (typeof actual === "string") {
      const normalize = (s: string) => s.trim().toLocaleLowerCase("vi-VN");
      correct = q.type === "MULTIPLE_CHOICE" ? actual === q.correctAnswer : normalize(actual) === normalize(q.correctAnswer ?? "");
    }
    return { questionId: q.id, correct, correctAnswer, explanation: q.explanation };
  });
  const correctCount = feedback.filter(f => f.correct).length, totalQuestions = feedback.length;
  const score = totalQuestions ? Math.round(correctCount / totalQuestions * 10000) / 100 : 0;
  return { score, correctCount, totalQuestions, passed: totalQuestions > 0 && correctCount * 100 >= snapshot.passPercent * totalQuestions, timedOut, feedback };
}
export function quizView(session: { id: string; revision: number; startedAt: Date; deadlineAt: Date | null; submittedAt: Date | null; snapshot: unknown; answers: unknown; result: unknown }): QuizView {
  const snapshot = session.snapshot as QuizSnapshot;
  return { id: session.id, revision: session.revision, startedAt: session.startedAt.toISOString(), deadlineAt: session.deadlineAt?.toISOString() ?? null,
    submittedAt: session.submittedAt?.toISOString() ?? null, answers: session.answers as Answers, questions: publicQuestions(snapshot.questions),
    result: session.submittedAt ? session.result as QuizResult : null, passPercent: snapshot.passPercent };
}
