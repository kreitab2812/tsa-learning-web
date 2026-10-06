import type { LessonAttachmentView } from "./attachments";
export type QuestionType = "MULTIPLE_CHOICE" | "TRUE_FALSE_GROUP" | "SHORT_ANSWER";
export type Option = { id: string; text: string };
export type Statement = { id: string; text: string; isTrue: boolean };

export type Question = {
  id: string;
  type: QuestionType;
  content: string;
  imageUrl: string | null;
  options: Option[] | Statement[] | null;
  correctAnswer: string | null;
  explanation: string | null;
  order: number;
};

export type Lesson = {
  id: string;
  title: string;
  status: "DRAFT" | "PUBLISHED";
  videoTheoryUrl: string | null;
  videoPracticeUrl: string | null;
  documentUrl: string | null;
  exerciseUrl: string | null;
  answerUrl: string | null;
  theoryDocumentUrl: string | null;
  practiceDocumentUrl: string | null;
  theorySplitView: boolean;
  practiceSplitView: boolean;
  completionMode: "MANUAL" | "QUIZ_SUBMITTED" | "QUIZ_PASSED";
  stepNavigation: "FREE" | "SEQUENTIAL";
  requireCompletionForNext: boolean;
  quizTimeLimitMinutes: number | null;
  quizPassPercent: number;
  quizMaxAttempts: number | null;
  quizShuffleQuestions: boolean;
  quizShuffleAnswers: boolean;
  chapter: { id: string; title: string; subjectId: string; subject: { stage: { courseId: string } } };
  _count: { questions: number };
  attachments: LessonAttachmentView[];
};
