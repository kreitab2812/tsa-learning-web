import { createHash } from "node:crypto";
import type { QuizResult, QuizSnapshot } from "@/features/learning/quiz-session";

type StoredAttempt = { session: { preview: boolean; snapshot: unknown; result: unknown } | null };
export function summarizeMistakes(attempts: StoredAttempt[]) {
  const groups = new Map<string, { key: string; questionId: string; content: string; imageUrl: string | null; wrong: number; total: number }>();
  let included = 0;
  for (const attempt of attempts) {
    if (!attempt.session || attempt.session.preview) continue;
    const snapshot = attempt.session.snapshot as QuizSnapshot | null;
    const result = attempt.session.result as QuizResult | null;
    if (!Array.isArray(snapshot?.questions) || !Array.isArray(result?.feedback)) continue;
    included++;
    for (const question of snapshot.questions) {
      const feedback = result.feedback.find(item => item.questionId === question.id);
      if (!feedback) continue;
      // Ignore shuffled display order, but never combine edited question/answer versions.
      const options = Array.isArray(question.options) ? [...question.options].sort((a, b) => a.id.localeCompare(b.id)) : question.options;
      const version = createHash("sha256").update(JSON.stringify({ type: question.type, content: question.content, imageUrl: question.imageUrl, options, answer: question.correctAnswer })).digest("hex").slice(0, 16);
      const key = `${question.id}:${version}`;
      const group = groups.get(key) ?? { key, questionId: question.id, content: question.content, imageUrl: question.imageUrl ?? null, wrong: 0, total: 0 };
      group.total++;
      if (!feedback.correct) group.wrong++;
      groups.set(key, group);
    }
  }
  return { included, questions: [...groups.values()].filter(item => item.wrong > 0).sort((a, b) => b.wrong - a.wrong || b.total - a.total) };
}
