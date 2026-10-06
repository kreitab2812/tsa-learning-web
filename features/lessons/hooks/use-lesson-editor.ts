"use client";
import { useState } from "react";
import { useAdminResource } from "@/features/admin/use-admin-resource";
import type { Lesson } from "../types";
import { changedLessonFields, lessonEditorValues, remainingLessonDraft, type LessonDraft, type LessonEditorValues } from "../editor-state";

type MediaField = "videoTheoryUrl" | "videoPracticeUrl" | "documentUrl" | "exerciseUrl" | "answerUrl";
export function useLessonEditor(lessonId: string) {
  const resource = useAdminResource<{ lesson: Lesson }>(`/api/admin/lessons/${lessonId}`);
  // Drafts are separate from loaded data; saving one field never resets others.
  const [drafts, setDrafts] = useState<Record<string, LessonDraft>>({});
  const lesson = resource.data?.lesson ?? null;
  const draft = drafts[lessonId] ?? {};
  const values = lesson ? { ...lessonEditorValues(lesson), ...draft } : null;
  const changedFields = lesson ? changedLessonFields(lessonEditorValues(lesson), draft) : {};
  const editField = <K extends keyof LessonEditorValues>(key: K, value: LessonEditorValues[K]) =>
    setDrafts(previous => ({ ...previous, [lessonId]: { ...previous[lessonId], [key]: value } }));
  const value = (key: MediaField) => values?.[key] ?? "";
  const edit = (key: MediaField) => (text: string) => editField(key, text);
  const commitSaved = (saved: Partial<Lesson>, submitted: LessonDraft) => {
    resource.setData(previous => ({ lesson: { ...previous.lesson, ...saved } }));
    setDrafts(previous => ({ ...previous, [lessonId]: remainingLessonDraft(previous[lessonId] ?? {}, submitted) }));
  };
  return {
    values, editField, changedFields, dirty: Object.keys(changedFields).length > 0, commitSaved,
    discardChanges: () => setDrafts(previous => ({ ...previous, [lessonId]: {} })),
    lesson, isLoading: resource.isLoading, error: resource.error, refreshLesson: resource.refresh,
    videoTheoryUrl: value("videoTheoryUrl"), setVideoTheoryUrl: edit("videoTheoryUrl"),
    videoPracticeUrl: value("videoPracticeUrl"), setVideoPracticeUrl: edit("videoPracticeUrl"),
    documentUrl: value("documentUrl"), setDocumentUrl: edit("documentUrl"),
    exerciseUrl: value("exerciseUrl"), setExerciseUrl: edit("exerciseUrl"),
    answerUrl: value("answerUrl"), setAnswerUrl: edit("answerUrl"),
  };
}
