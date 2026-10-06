export const LESSON_LINK_FIELDS = [
  { kind: "VIDEO_THEORY", field: "videoTheoryUrl", label: "Video lý thuyết" },
  { kind: "VIDEO_PRACTICE", field: "videoPracticeUrl", label: "Video thực hành" },
  { kind: "THEORY_DOCUMENT", field: "theoryDocumentUrl", label: "PDF lý thuyết" },
  { kind: "PRACTICE_DOCUMENT", field: "practiceDocumentUrl", label: "PDF thực hành" },
  { kind: "DOCUMENT", field: "documentUrl", label: "Tài liệu học" },
  { kind: "EXERCISE", field: "exerciseUrl", label: "Bài tập PDF" },
  { kind: "ANSWER", field: "answerUrl", label: "Đáp án PDF" },
] as const;

type ResourceLesson = { id: string } & Partial<Record<typeof LESSON_LINK_FIELDS[number]["field"], string | null>> & {
  attachments?: { id: string; title: string; url: string; sourceKey: string | null; kind: string }[];
};
/** One resource per editable source: mirror attachments must not be scanned twice. */
export function lessonResources(lesson: ResourceLesson) {
  const base = `/dashboard/lessons/${lesson.id}/questions`;
  const fields = LESSON_LINK_FIELDS.flatMap(({ kind, field, label }) => {
    const url = lesson[field];
    if (!url) return [];
    const tab = field === "videoTheoryUrl" || field === "theoryDocumentUrl" ? "theory" : field === "videoPracticeUrl" || field === "practiceDocumentUrl" ? "practice" : "documents";
    return [{ kind: kind as string, category: kind as string, label, url, editHref: `${base}?tab=${tab}` }];
  });
  return [...fields, ...(lesson.attachments ?? []).filter(file => !file.sourceKey).map(file => ({
    kind: `ATTACHMENT:${file.id}`, category: "ATTACHMENT", label: `${file.kind} · ${file.title}`, url: file.url,
    editHref: `${base}?tab=documents&attachment=${file.id}#attachment-${file.id}`,
  }))];
}
