import type { Lesson } from "./types";

export function lessonEditorValues(lesson: Lesson) {
  return {
    title: lesson.title,
    videoTheoryUrl: lesson.videoTheoryUrl ?? "",
    videoPracticeUrl: lesson.videoPracticeUrl ?? "",
    documentUrl: lesson.documentUrl ?? "",
    exerciseUrl: lesson.exerciseUrl ?? "",
    answerUrl: lesson.answerUrl ?? "",
    theoryDocumentUrl: lesson.theoryDocumentUrl ?? "",
    practiceDocumentUrl: lesson.practiceDocumentUrl ?? "",
    theorySplitView: lesson.theorySplitView,
    practiceSplitView: lesson.practiceSplitView,
    completionMode: lesson.completionMode,
    stepNavigation: lesson.stepNavigation,
    requireCompletionForNext: lesson.requireCompletionForNext,
    quizTimeLimitMinutes: lesson.quizTimeLimitMinutes,
    quizPassPercent: lesson.quizPassPercent,
    quizMaxAttempts: lesson.quizMaxAttempts,
    quizShuffleQuestions: lesson.quizShuffleQuestions,
    quizShuffleAnswers: lesson.quizShuffleAnswers,
  };
}

export type LessonEditorValues = ReturnType<typeof lessonEditorValues>;
export type LessonDraft = Partial<LessonEditorValues>;

export function changedLessonFields(saved: LessonEditorValues, draft: LessonDraft): LessonDraft {
  return Object.fromEntries(Object.entries(draft).filter(([key, value]) => value !== saved[key as keyof LessonEditorValues]));
}

/** Keep edits made while a request was in flight, including edits in other steps. */
export function remainingLessonDraft(draft: LessonDraft, submitted: LessonDraft): LessonDraft {
  return Object.fromEntries(Object.entries(draft).filter(([key, value]) =>
    !Object.hasOwn(submitted, key) || value !== submitted[key as keyof LessonEditorValues]));
}
