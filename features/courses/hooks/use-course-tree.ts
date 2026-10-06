"use client";
import { useSearchParams } from "next/navigation";
import type { Course, Stage, Subject } from "../types";
import { useAdminResource } from "@/features/admin/use-admin-resource";

export function useCourseTree(courseId: string) {
  const params = useSearchParams();
  const stageId = params.get("stage");
  const subjectId = params.get("subject");
  const outline = useAdminResource<{ course: Course }>(`/api/admin/courses/${courseId}`);
  const course = outline.data?.course ?? null;
  const activeStage = course?.stages.find((stage) => subjectId ? stage.subjects.some((subject) => subject.id === subjectId) : stage.id === stageId) ?? null;
  const selected = activeStage?.subjects.find((subject) => subject.id === subjectId) ?? null;
  // Start the branch alongside the outline when opening a deep link.
  const branch = useAdminResource<{ subject: Subject }>(subjectId ? `/api/admin/subjects/${subjectId}` : null);
  return {
    course, activeStage, activeSubject: selected ? branch.data?.subject ?? selected : null,
    isLoading: !course && outline.isLoading, branchLoading: branch.isLoading,
    error: outline.error || branch.error,
    setActiveStage: (stage: Stage | null) => window.history.replaceState(null, "", `/dashboard/courses/${courseId}${stage ? `?stage=${stage.id}` : ""}`),
    setActiveSubject: (subject: Subject | null) => window.history.replaceState(null, "", `/dashboard/courses/${courseId}${subject ? `?subject=${subject.id}` : activeStage ? `?stage=${activeStage.id}` : ""}`),
    fetchCourse: outline.refresh,
    commitSubjectOrder: (subject: Subject) => branch.setData((previous) =>
      previous.subject.id === subject.id ? { subject } : previous),
    refreshSubject: async () => {
      const result = await branch.refresh();
      if (result) outline.setData((previous) => ({ course: { ...previous.course, stages: previous.course.stages.map((stage) => ({
        ...stage, subjects: stage.subjects.map((subject) => subject.id === result.subject.id
          ? { ...subject, _count: { chapters: result.subject.chapters.length } } : subject),
      })) } }));
    },
  };
}
