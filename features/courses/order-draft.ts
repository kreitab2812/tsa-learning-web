import type { Chapter, Subject } from "./types";
import { sameIds, type OrderGroup } from "./order-schema";

export type Direction = "up" | "down";
/** Drag within the same sibling group; it shares the explicit-save contract. */
export function moveSubjectItemTo(subject: Subject, kind: "chapter" | "lesson", id: string, targetId: string): Subject {
  let siblings: { id: string }[] | undefined;
  function locate(chapters: Chapter[]) {
    if (kind === "chapter" && chapters.some((item) => item.id === id)) siblings = chapters;
    for (const chapter of chapters) {
      if (kind === "lesson" && chapter.lessons.some((item) => item.id === id)) siblings = chapter.lessons;
      locate(chapter.children);
    }
  }
  locate(subject.chapters);
  if (!siblings) return subject;
  const from = siblings.findIndex((item) => item.id === id), to = siblings.findIndex((item) => item.id === targetId);
  if (from < 0 || to < 0 || from === to) return subject;
  let value = subject;
  for (let step = 0; step < Math.abs(to - from); step++) value = moveSubjectItem(value, kind, id, to > from ? "down" : "up");
  return value;
}
function move<T extends { id: string; order: number }>(items: T[], id: string, direction: Direction): T[] {
  const from = items.findIndex((item) => item.id === id);
  const to = from + (direction === "up" ? -1 : 1);
  if (from < 0 || to < 0 || to >= items.length) return items;
  const result = [...items];
  [result[from], result[to]] = [result[to], result[from]];
  return result.map((item, order) => ({ ...item, order }));
}

/** Immutable local-only operation: never moves an item to another parent. */
export function moveSubjectItem(subject: Subject, kind: "chapter" | "lesson", id: string, direction: Direction): Subject {
  function visit(chapters: Chapter[]): Chapter[] {
    if (kind === "chapter" && chapters.some((chapter) => chapter.id === id)) return move(chapters, id, direction);
    let changed = false;
    const result = chapters.map((chapter) => {
      const children = visit(chapter.children);
      const lessons = kind === "lesson" ? move(chapter.lessons, id, direction) : chapter.lessons;
      if (children === chapter.children && lessons === chapter.lessons) return chapter;
      changed = true;
      return { ...chapter, children, lessons };
    });
    return changed ? result : chapters;
  }
  const chapters = visit(subject.chapters);
  return chapters === subject.chapters ? subject : { ...subject, chapters };
}

function siblingGroups(subject: Subject) {
  const groups = new Map<string, { kind: "chapter" | "lesson"; parentId: string | null; ids: string[] }>();
  function visit(chapters: Chapter[], parentId: string | null) {
    groups.set(`chapter:${parentId}`, { kind: "chapter", parentId, ids: chapters.map((chapter) => chapter.id) });
    for (const chapter of chapters) {
      groups.set(`lesson:${chapter.id}`, { kind: "lesson", parentId: chapter.id, ids: chapter.lessons.map((lesson) => lesson.id) });
      visit(chapter.children, chapter.id);
    }
  }
  visit(subject.chapters, null);
  return groups;
}

export function changedOrderGroups(base: Subject, draft: Subject): OrderGroup[] {
  const before = siblingGroups(base);
  return [...siblingGroups(draft)].flatMap(([key, group]) => {
    const beforeIds = before.get(key)?.ids ?? [];
    return sameIds(beforeIds, group.ids) ? [] : [{ kind: group.kind, parentId: group.parentId, beforeIds, afterIds: group.ids }];
  });
}
