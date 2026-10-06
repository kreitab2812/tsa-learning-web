import { z } from "zod";

export const healthFilterSchema = z.object({
  subject: z.uuid().optional(), chapter: z.uuid().optional(),
  student: z.uuid().optional(),
  view: z.enum(["progress", "activity", "links", "errors"]).catch("progress"),
  days: z.enum(["7", "30", "90", "all"]).catch("30"),
  activityPage: z.coerce.number().int().min(1).max(10000).catch(1),
  attemptPage: z.coerce.number().int().min(1).max(10000).catch(1),
  errorPage: z.coerce.number().int().min(1).max(10000).catch(1),
  errorType: z.enum(["all", "VIDEO_LOAD", "DOCUMENT_LOAD", "SUBMISSION"]).catch("all"),
});
export type HealthFilters = z.infer<typeof healthFilterSchema>;
export const HEALTH_PAGE_SIZE = 20;

export function descendantIds<T extends { id: string; parentId: string | null }>(chapters: T[], root: string) {
  const ids = new Set<string>();
  function visit(id: string) {
    if (ids.has(id)) return;
    ids.add(id);
    for (const chapter of chapters) if (chapter.parentId === id) visit(chapter.id);
  }
  if (chapters.some((chapter) => chapter.id === root)) visit(root);
  return ids;
}

export function lessonEditorHref(lessonId: string, kind: string) {
  const tab = kind === "VIDEO_THEORY" || kind === "VIDEO_LOAD" ? "theory" : kind === "VIDEO_PRACTICE" ? "practice" : kind === "SUBMISSION" ? "questions" : "documents";
  return `/dashboard/lessons/${lessonId}/questions?tab=${tab}`;
}
