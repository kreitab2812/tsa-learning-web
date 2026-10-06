type PublishedNode = { id: string; parentId: string | null; status: string };

/** A published child is visible only when every ancestor is published. */
export function publishedChapterIds(chapters: PublishedNode[]) {
  const byId = new Map(chapters.map((chapter) => [chapter.id, chapter]));
  const result = new Set<string>();
  const memo = new Map<string, boolean>();
  function visible(id: string, visiting = new Set<string>()): boolean {
    if (memo.has(id)) return memo.get(id)!;
    const chapter = byId.get(id);
    if (!chapter || chapter.status !== "PUBLISHED" || visiting.has(id)) return false;
    visiting.add(id);
    const value = !chapter.parentId || visible(chapter.parentId, visiting);
    visiting.delete(id); memo.set(id, value);
    return value;
  }
  for (const chapter of chapters) if (visible(chapter.id)) result.add(chapter.id);
  return result;
}
