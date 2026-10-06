import type { Chapter } from "./types";

export function matchesChapter(chapter: Chapter, query: string, status: string): boolean {
  const text = query.trim().toLocaleLowerCase("vi-VN");
  const own = (status === "all" || chapter.status === status) &&
    (!text || `${chapter.title} ${chapter.description ?? ""} ${chapter.lessons.map((lesson) => lesson.title).join(" ")}`.toLocaleLowerCase("vi-VN").includes(text));
  return own || chapter.children.some((child) => matchesChapter(child, query, status));
}
export function allChapterIds(chapters: Chapter[]): string[] {
  return chapters.flatMap((chapter) => [chapter.id, ...allChapterIds(chapter.children)]);
}
export function chapterSchedule(chapter: Pick<Chapter, "status" | "openAt" | "closeAt">, now = Date.now()) {
  if (chapter.status === "DRAFT") return "Chưa xuất bản";
  if (chapter.closeAt && new Date(chapter.closeAt).getTime() <= now) return "Đã đóng";
  if (chapter.openAt && new Date(chapter.openAt).getTime() > now) return "Sắp mở";
  return "Trong thời gian mở";
}
