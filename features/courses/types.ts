export type Lesson = {
  id: string; title: string; order: number; status: "DRAFT" | "PUBLISHED";
  videoTheoryUrl: string | null; videoPracticeUrl: string | null;
  documentUrl: string | null; exerciseUrl: string | null; answerUrl: string | null;
};
export type Chapter = {
  id: string; title: string; description: string | null; status: "DRAFT" | "PUBLISHED";
  openAt: string | null; closeAt: string | null; order: number; parentId: string | null;
  children: Chapter[]; lessons: Lesson[];
};
export type Subject = { id: string; title: string; description: string | null; teacherName: string | null; order: number; chapters: Chapter[]; _count?: { chapters: number }; };
export type Stage = {
  id: string; title: string; description: string | null; color: string | null; order: number;
  timeframe: string | null; accessMode: "FREE" | "TIME_LOCKED" | "SEQUENTIAL"; unlockAt: string | null;
  subjects: Subject[];
};
export type Course = { id: string; title: string; description: string | null; stages: Stage[]; };
