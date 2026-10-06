import "server-only";
import { randomInt } from "node:crypto";
import { Prisma, type LessonRun, type QuizSession } from "@prisma/client";
import { contentTransaction } from "@/server/db/transaction";
import { HttpError } from "@/server/http/errors";
import type { SessionUser } from "@/features/auth/types";
import { learningActionSchema, type LearningAction } from "@/features/learning/schemas";
import { canOpenStep, gradeSnapshot, quizView, snapshotQuestions, validateAnswers, type Answers, type QuizResult, type QuizSnapshot, type QuizView } from "@/features/learning/quiz-session";
import type { Question } from "@/features/lessons/types";
import { getLearningAccess, getLearningLesson } from "./service";
import type { LearningLessonView } from "@/features/learning/types";
import { availableLessonSteps } from "@/features/learning/lesson-steps";

const json = (value: object) => value as Prisma.InputJsonValue;

async function markComplete(tx: Prisma.TransactionClient, run: LessonRun, availableSteps: number[]) {
  if (run.completed) return;
  await tx.lessonRun.update({ where: { id: run.id }, data: { completed: true, completedSteps: availableSteps } });
  if (run.preview) return;
  const prior = await tx.progress.findUnique({ where: { userId_lessonId: { userId: run.userId, lessonId: run.lessonId } } });
  await tx.progress.upsert({ where: { userId_lessonId: { userId: run.userId, lessonId: run.lessonId } },
    create: { userId: run.userId, lessonId: run.lessonId, isCompleted: true }, update: { isCompleted: true } });
  if (!prior?.isCompleted) await tx.learningActivity.create({ data: { userId: run.userId, lessonId: run.lessonId, type: "LESSON_COMPLETED" } });
}

async function finalize(tx: Prisma.TransactionClient, run: LessonRun, session: QuizSession, answers: Answers, now: Date, availableSteps: number[]) {
  if (session.submittedAt) return session;
  const snapshot = session.snapshot as unknown as QuizSnapshot;
  const result = gradeSnapshot(snapshot, answers, !!session.deadlineAt && now >= session.deadlineAt);
  const updated = await tx.quizSession.update({ where: { id: session.id }, data: {
    answers: json(answers), result: json(result), submittedAt: now, activeKey: null, revision: { increment: 1 },
  } });
  const completedSteps = [...new Set([...run.completedSteps, 3])];
  await tx.lessonRun.update({ where: { id: run.id }, data: { completedSteps } });
  if (!run.preview) {
    // The unique sessionId and the serialized run row make retry/concurrent submission exactly-once.
    await tx.exerciseAttempt.create({ data: { sessionId: session.id, userId: run.userId, lessonId: run.lessonId,
      score: result.score, correctCount: result.correctCount, totalQuestions: result.totalQuestions, answers: json(answers) } });
    await tx.progress.upsert({ where: { userId_lessonId: { userId: run.userId, lessonId: run.lessonId } },
      create: { userId: run.userId, lessonId: run.lessonId, exerciseScore: result.score }, update: { exerciseScore: result.score } });
    await tx.learningActivity.create({ data: { userId: run.userId, lessonId: run.lessonId, type: "EXERCISE_SUBMITTED",
      metadata: { sessionId: session.id, score: result.score, correctCount: result.correctCount, totalQuestions: result.totalQuestions, timedOut: result.timedOut } } });
  }
  if (availableSteps.filter(step => step !== 3).every(step => completedSteps.includes(step)) &&
      (snapshot.completionMode === "QUIZ_SUBMITTED" || snapshot.completionMode === "QUIZ_PASSED" && result.passed)) {
    await markComplete(tx, { ...run, completedSteps }, availableSteps);
  }
  return updated;
}

type WorkflowResult = Partial<QuizResult> & { view: LearningLessonView; completed: boolean; preview: boolean };
type DraftAck = { draft: QuizView; serverTime: string };
export function performWorkflow(user: SessionUser, lessonId: string, raw: LearningAction): Promise<WorkflowResult>;
export function performWorkflow(user: SessionUser, lessonId: string, raw: LearningAction, compact: true): Promise<WorkflowResult | DraftAck>;
export async function performWorkflow(user: SessionUser, lessonId: string, raw: LearningAction, compact = false) {
  const input = learningActionSchema.parse(raw);
  const { base, found } = await getLearningAccess(user, lessonId, input);
  if (!found || found.lesson.locked) throw new HttpError(403, found?.lesson.lockReason || "Bài học đang bị khóa.");
  const preview = base.preview;
  const savedSession = await contentTransaction(async tx => {
    // Upsert/update takes the run lock before reading sessions. All state transitions share it.
    let run = await tx.lessonRun.upsert({ where: { userId_lessonId_preview: { userId: user.id, lessonId, preview } },
      create: { userId: user.id, lessonId, preview, completed: !preview && base.completed, completedSteps: !preview && base.completed ? [0, 1, 2, 3] : [] },
      update: { updatedAt: new Date() } });
    const lesson = await tx.lesson.findUniqueOrThrow({ where: { id: lessonId }, include: { _count: { select: { questions: true } }, attachments: { select: { section: true, sourceKey: true } } } });
    const latest = await tx.quizSession.findFirst({ where: { userId: user.id, lessonId, preview }, orderBy: [{ startedAt: "desc" }, { id: "desc" }] });
    const availableSteps = availableLessonSteps(lesson, !!latest);
    const now = new Date();
    let last = latest;
    if (last && !last.submittedAt && last.deadlineAt && now >= last.deadlineAt) {
      last = await finalize(tx, run, last, last.answers as Answers, now, availableSteps);
      run = await tx.lessonRun.findUniqueOrThrow({ where: { id: run.id } });
    }
    if (input.action === "SYNC") return;
    if (input.action === "OPEN") {
      if (!preview) await tx.learningActivity.create({ data: { userId: user.id, lessonId, type: "LESSON_OPENED" } });
      return;
    }
    if (input.action === "RESET_PREVIEW") {
      if (!preview || user.role !== "ADMIN") throw new HttpError(403, "Chỉ được đặt lại dữ liệu Preview.");
      await tx.quizSession.deleteMany({ where: { userId: user.id, lessonId, preview: true } });
      await tx.lessonRun.update({ where: { id: run.id }, data: { currentStep: 0, completedSteps: [], completed: false } });
      return;
    }
    if (input.action === "STEP") {
      if (!canOpenStep(input.step, run.completedSteps, lesson.stepNavigation, availableSteps)) throw new HttpError(403, "Phần này không có nội dung hoặc cần hoàn thành phần trước.");
      if (input.complete && input.step === 3) throw new HttpError(400, "Dùng chức năng nộp bài hoặc hoàn thành bài học.");
      const completedSteps = input.complete ? [...new Set([...run.completedSteps, input.step])] : run.completedSteps;
      const next = input.complete ? availableSteps.find(step => step > input.step) ?? input.step : input.step;
      await tx.lessonRun.update({ where: { id: run.id }, data: { completedSteps, currentStep: canOpenStep(next, completedSteps, lesson.stepNavigation, availableSteps) ? next : input.step } });
      if (input.complete && !availableSteps.includes(3) && availableSteps.every(step => completedSteps.includes(step))) {
        await markComplete(tx, { ...run, completedSteps }, availableSteps);
      }
      return;
    }
    if (input.action === "COMPLETE") {
      if (!availableSteps.length) throw new HttpError(400, "Bài học chưa có nội dung.");
      if (!availableSteps.filter(step => step !== 3).every(step => run.completedSteps.includes(step))) throw new HttpError(403, "Hãy hoàn thành các phần có nội dung trước.");
      if (last && !last.submittedAt) throw new HttpError(409, "Hãy nộp phiên làm bài đang mở trước khi hoàn thành.");
      if ((lesson._count.questions > 0 || last) && lesson.completionMode !== "MANUAL") {
        const results = await tx.quizSession.findMany({ where: { userId: user.id, lessonId, preview, submittedAt: { not: null } }, select: { result: true } });
        if (!results.some(item => lesson.completionMode === "QUIZ_SUBMITTED" || (item.result as unknown as QuizResult)?.passed)) throw new HttpError(403, lesson.completionMode === "QUIZ_PASSED" ? "Cần đạt điểm bài tập trước khi hoàn thành." : "Cần nộp bài tập trước khi hoàn thành.");
      }
      await markComplete(tx, run, availableSteps); return;
    }
    if (!canOpenStep(3, run.completedSteps, lesson.stepNavigation, availableSteps)) throw new HttpError(403, "Chưa mở bước Bài tập.");
    if (input.action === "START") {
      const retry = await tx.quizSession.findUnique({ where: { id: input.requestId } });
      if (retry) {
        if (retry.userId !== user.id || retry.lessonId !== lessonId || retry.preview !== preview) throw new HttpError(403, "Phiên không thuộc bài học/tài khoản này.");
        return;
      }
      if (last && !last.submittedAt) return;
      // If START discovered an expired session, show that result first instead of consuming a new attempt.
      if (latest && !latest.submittedAt && last?.submittedAt) return;
      const count = await tx.quizSession.count({ where: { userId: user.id, lessonId, preview } });
      const legacyCount = preview ? 0 : await tx.exerciseAttempt.count({ where: { userId: user.id, lessonId, sessionId: null } });
      if (lesson.quizMaxAttempts !== null && count + legacyCount >= lesson.quizMaxAttempts) throw new HttpError(403, "Đã hết số lần làm bài được phép.");
      const rows = await tx.question.findMany({ where: { lessonId }, orderBy: [{ order: "asc" }, { id: "asc" }], take: 201 });
      if (!rows.length || rows.length > 200) throw new HttpError(400, "Bài kiểm tra cần từ 1 đến 200 câu. Hãy liên hệ Admin.");
      const snapshot: QuizSnapshot = { questions: snapshotQuestions(rows as unknown as Question[], lesson.quizShuffleQuestions, lesson.quizShuffleAnswers, () => randomInt(0, 0x100000000) / 0x100000000),
        passPercent: lesson.quizPassPercent, timeLimitMinutes: lesson.quizTimeLimitMinutes, completionMode: lesson.completionMode,
        shuffleQuestions: lesson.quizShuffleQuestions, shuffleAnswers: lesson.quizShuffleAnswers };
      const startedAt = new Date();
      await tx.quizSession.create({ data: { id: input.requestId, userId: user.id, lessonId, preview, activeKey: `${user.id}:${lessonId}:${preview}`,
        snapshot: json(snapshot), startedAt, deadlineAt: lesson.quizTimeLimitMinutes === null ? null : new Date(startedAt.getTime() + lesson.quizTimeLimitMinutes * 60000) } });
      await tx.lessonRun.update({ where: { id: run.id }, data: { currentStep: 3 } }); return;
    }
    const session = await tx.quizSession.findUnique({ where: { id: input.sessionId } });
    if (!session || session.userId !== user.id || session.lessonId !== lessonId || session.preview !== preview) throw new HttpError(403, "Phiên làm bài không thuộc tài khoản, bài học hoặc chế độ này.");
    if (session.submittedAt) return;
    const receivedAt = new Date();
    if (session.deadlineAt && receivedAt >= session.deadlineAt) { await finalize(tx, run, session, session.answers as Answers, receivedAt, availableSteps); return; }
    if (session.revision !== input.revision) throw new HttpError(409, "Bản nháp đã thay đổi ở tab khác. Đồng bộ lại trước khi tiếp tục.");
    if (!validateAnswers(session.snapshot as unknown as QuizSnapshot, input.answers)) throw new HttpError(400, "Câu trả lời không khớp với đề của phiên này.");
    if (input.action === "SUBMIT") await finalize(tx, run, session, input.answers, receivedAt, availableSteps);
    else return tx.quizSession.update({ where: { id: session.id }, data: { answers: json(input.answers), revision: { increment: 1 } } });
  });
  // Autosave does not need to re-read the whole subject/media tree after each keystroke batch.
  if (compact && savedSession) return { draft: quizView(savedSession), serverTime: new Date().toISOString() };
  const updated = await getLearningLesson(user, lessonId, input);
  const result = updated.workflow?.session?.result;
  return { ...result, completed: updated.completed, preview, view: updated };
}
