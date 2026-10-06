type LessonContent = {
  videoTheoryUrl?: string | null; theoryDocumentUrl?: string | null;
  videoPracticeUrl?: string | null; practiceDocumentUrl?: string | null;
  documentUrl?: string | null; exerciseUrl?: string | null;
  attachments?: { section: string; sourceKey: string | null }[];
  _count?: { questions: number };
};

// Keep stable step IDs for saved progress; absent sections are not completed artificially.
export function availableLessonSteps(lesson: LessonContent, hasQuizSession = false): number[] {
  return [
    !!(lesson.videoTheoryUrl || lesson.theoryDocumentUrl),
    !!(lesson.videoPracticeUrl || lesson.practiceDocumentUrl),
    !!(lesson.documentUrl || lesson.attachments?.some(file => file.section === "DOCUMENTS" && !["answerUrl", "exerciseUrl"].includes(file.sourceKey ?? ""))),
    !!(lesson._count?.questions || lesson.exerciseUrl) || hasQuizSession,
  ].flatMap((present, index) => present ? [index] : []);
}

export function attachmentStep(file: { section: string; sourceKey: string | null }) {
  return file.section === "THEORY" ? 0 : file.section === "PRACTICE" ? 1 : ["exerciseUrl", "answerUrl"].includes(file.sourceKey ?? "") ? 3 : 2;
}
