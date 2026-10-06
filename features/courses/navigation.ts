export function editorHref(courseId: string, subjectId: string, chapterId?: string | null) {
  const params = new URLSearchParams({ subject: subjectId });
  if (chapterId) params.set("chapter", chapterId);
  return `/dashboard/courses/${courseId}?${params}`;
}

export function previewQuery(options: { showDrafts?: boolean; unlock?: string | null; simulated?: string[] }) {
  const params = new URLSearchParams({ preview: "1" });
  if (options.showDrafts) params.set("drafts", "1");
  if (options.unlock) params.set("unlock", options.unlock);
  if (options.simulated?.length) params.set("done", options.simulated.join(","));
  return `?${params}`;
}
