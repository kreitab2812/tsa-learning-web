import type { Option, QuestionType } from "@/features/lessons/types";
import type { LessonAttachmentView } from "@/features/lessons/attachments";
import type { WorkflowView } from "./quiz-session";

export type LearningLessonSummary = {
  id: string; title: string; status: "DRAFT" | "PUBLISHED";
  completed: boolean; locked: boolean; lockReason: string | null;
};
export type LearningChapter = {
  id: string; title: string; description: string | null; status: "DRAFT" | "PUBLISHED";
  openAt: string | null; closeAt: string | null; locked: boolean; lockReason: string | null;
  canMagicUnlock: boolean; magicUnlocked: boolean;
  lessons: LearningLessonSummary[]; children: LearningChapter[];
};
export type LearningQuestion = {
  id: string; type: QuestionType; content: string; imageUrl: string | null;
  options: Option[] | null; order: number;
};
export type LearningLessonView = {
  id: string; title: string; chapterId: string; chapterTitle: string; subjectId: string; subjectTitle: string; courseId: string;
  locked: boolean; lockReason: string | null; preview: boolean; magicUnlocked: boolean;
  showDrafts: boolean; simulated: string[]; previewStudentName: string | null;
  completed: boolean; videoTheoryUrl: string | null; videoPracticeUrl: string | null;
  documentUrl: string | null; exerciseUrl: string | null; answerUrl: string | null;
  questions: LearningQuestion[];
  theoryDocumentUrl: string | null; practiceDocumentUrl: string | null;
  theorySplitView: boolean; practiceSplitView: boolean;
  attachments: LessonAttachmentView[]; viewerEmail: string;
  workflow: WorkflowView | null;
};
export type AttemptFeedback = {
  questionId: string; correct: boolean; correctAnswer: string | Record<string, boolean> | null; explanation: string | null;
};
