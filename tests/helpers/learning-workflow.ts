import { randomUUID } from "node:crypto";
import type { SessionUser } from "../../features/auth/types";
import type { Answers } from "../../features/learning/quiz-session";
import { getLearningLesson, performLearningAction, type AccessOptions } from "../../server/learning/service";

export async function finishContentSteps(user: SessionUser, lessonId: string, context: AccessOptions = {}) {
  const view = await getLearningLesson(user, lessonId, context);
  for (const step of view.workflow?.availableSteps.filter(step => step !== 3) ?? []) await performLearningAction(user, lessonId, { action: "STEP", step, complete: true, ...context });
}
export async function submitNewSession(user: SessionUser, lessonId: string, answers: Answers, context: AccessOptions = {}) {
  const started = await performLearningAction(user, lessonId, { action: "START", requestId: randomUUID(), ...context });
  const session = started.view.workflow!.session!;
  return performLearningAction(user, lessonId, { action: "SUBMIT", sessionId: session.id, revision: session.revision, answers, ...context });
}
