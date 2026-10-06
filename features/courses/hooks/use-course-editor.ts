"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toUtcISOString } from "@/lib/datetime";
import { useCourseTree } from "./use-course-tree";
import type { Stage, Subject, Chapter, Lesson } from "../types";
import { useSubjectOrder } from "./use-subject-order";
import { useUnsavedChapters } from "./use-unsaved-chapters";

export function useCourseEditor() {
  const params = useParams();
  const courseId = params.id as string;
  const router = useRouter();

  const { course, isLoading, activeStage, setActiveStage: selectStage, activeSubject: loadedSubject, setActiveSubject: selectSubject, fetchCourse, refreshSubject, commitSubjectOrder, error, branchLoading } = useCourseTree(courseId);
  const order = useSubjectOrder(loadedSubject, commitSubjectOrder);
  const activeSubject = order.subject;
  const contentChanges = useUnsavedChapters();
  const setActiveStage = (stage: Stage | null) => { if (contentChanges.confirmLeave() && order.confirmLeave()) selectStage(stage); };
  const setActiveSubject = (subject: Subject | null) => { if (contentChanges.confirmLeave() && order.confirmLeave()) selectSubject(subject); };
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const queryChapter = useSearchParams().get("chapter");
  const subjectKey = loadedSubject?.id;
  useEffect(() => {
    if (!subjectKey || branchLoading) return;
    let frame = 0;
    let active = true;
    const key = `tsa:subject:${subjectKey}`;
    const restore = () => {
      if (!active) return;
      let ids: string[] = [];
      try { ids = JSON.parse(sessionStorage.getItem(`${key}:expanded`) || "[]"); } catch { /* Optional workspace memory. */ }
      if (queryChapter) {
        const findPath = (chapters: Chapter[], parents: string[] = []): string[] => {
          for (const chapter of chapters) {
            if (chapter.id === queryChapter) return [...parents, chapter.id];
            const result = findPath(chapter.children, [...parents, chapter.id]);
            if (result.length) return result;
          }
          return [];
        };
        ids = [...ids, ...findPath(loadedSubject?.chapters ?? [])];
      }
      setExpandedChapters(new Set(Array.isArray(ids) ? ids : []));
      frame = requestAnimationFrame(() => {
        if (queryChapter) document.getElementById(`chapter-${queryChapter}`)?.scrollIntoView({ block: "center" });
        else { try { window.scrollTo(0, Number(sessionStorage.getItem(`${key}:scroll`) || 0)); } catch { /* Optional. */ } }
      });
    };
    queueMicrotask(restore);
    const remember = () => { try { sessionStorage.setItem(`${key}:scroll`, String(window.scrollY)); } catch { /* Optional. */ } };
    window.addEventListener("scroll", remember, { passive: true });
    return () => { active = false; cancelAnimationFrame(frame); window.removeEventListener("scroll", remember); };
    // Restore only when changing the selected subject or loading its branch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectKey, branchLoading, queryChapter]);
  function expandChapters(ids: string[]) {
    setExpandedChapters(new Set(ids));
    if (subjectKey) { try { sessionStorage.setItem(`tsa:subject:${subjectKey}:expanded`, JSON.stringify(ids)); } catch { /* Optional. */ } }
  }

  const [stageModal, setStageModal] = useState<{ open: boolean; editing: Stage | null }>({ open: false, editing: null });
  const [subjectModal, setSubjectModal] = useState<{ open: boolean; stageId: string | null; editing: Subject | null }>({ open: false, stageId: null, editing: null });
  const [chapterModal, setChapterModal] = useState<{ open: boolean; parentId: string | null; editing: Chapter | null }>({ open: false, parentId: null, editing: null });
  const [lessonModal, setLessonModal] = useState<{ open: boolean; chapterId: string | null; editing: Lesson | null }>({ open: false, chapterId: null, editing: null });

  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string; type: 'stage' | 'subject' | 'chapter' | 'lesson' | ''; step: 1 | 2 }>({ open: false, id: "", type: "", step: 1 });

  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [stageTimeframe, setStageTimeframe] = useState("");
  const [stageAccessMode, setStageAccessMode] = useState<"FREE" | "TIME_LOCKED" | "SEQUENTIAL">("FREE");
  const [stageUnlockAt, setStageUnlockAt] = useState("");
  const [subjectTeacherName, setSubjectTeacherName] = useState("");
  const [lessonVideoTheoryUrl, setLessonVideoTheoryUrl] = useState("");
  const [lessonVideoPracticeUrl, setLessonVideoPracticeUrl] = useState("");
  const [lessonDocUrl, setLessonDocUrl] = useState("");
  const [lessonExerciseUrl, setLessonExerciseUrl] = useState("");
  const [lessonAnswerUrl, setLessonAnswerUrl] = useState("");
  const [lessonStatus, setLessonStatus] = useState<"DRAFT" | "PUBLISHED">("DRAFT");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleExpand = (id: string) => {
    if (!contentChanges.confirmLeave()) return;
    setExpandedChapters(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (subjectKey) { try { sessionStorage.setItem(`tsa:subject:${subjectKey}:expanded`, JSON.stringify([...next])); } catch { /* Optional. */ } }
      return next;
    });
  };

  // --- Stage handlers ---
  const handleStageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!formTitle) return;
    if (stageAccessMode === "TIME_LOCKED" && !stageUnlockAt) {
      alert("Vui lòng chọn ngày mở khi dùng chế độ Khóa theo thời gian.");
      return;
    }
    setIsSubmitting(true);
    try {
      const editing = stageModal.editing;
      const payload = {
        ...(editing ? {} : { courseId }),
        title: formTitle,
        description: formDesc,
        color: "#10b981",
        timeframe: stageTimeframe,
        accessMode: stageAccessMode,
        unlockAt: stageAccessMode === "TIME_LOCKED" ? toUtcISOString(stageUnlockAt) : null,
      };
      const res = await fetch(editing ? `/api/admin/stages/${editing.id}` : "/api/admin/stages", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.message || "Không thể lưu dữ liệu.");
      if (result.success) { await fetchCourse(); setStageModal({ open: false, editing: null }); }
    } catch (error) { alert(error instanceof Error ? error.message : "Lỗi kết nối máy chủ."); } finally { setIsSubmitting(false); }
  };

  // --- Subject handlers ---
  const handleSubjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!formTitle) return;
    setIsSubmitting(true);
    try {
      const editing = subjectModal.editing;
      const res = await fetch(editing ? `/api/admin/subjects/${editing.id}` : "/api/admin/subjects", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editing
            ? { title: formTitle, description: formDesc, teacherName: subjectTeacherName }
            : { stageId: subjectModal.stageId, title: formTitle, description: formDesc, teacherName: subjectTeacherName }
        ),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.message || "Không thể lưu dữ liệu.");
      if (result.success) { await fetchCourse(); setSubjectModal({ open: false, stageId: null, editing: null }); }
    } catch (error) { alert(error instanceof Error ? error.message : "Lỗi kết nối máy chủ."); } finally { setIsSubmitting(false); }
  };

  // --- Chapter handlers ---
  const handleChapterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!formTitle || !activeSubject) return;
    setIsSubmitting(true);
    try {
      const editing = chapterModal.editing;
      const payload = editing
        ? { title: formTitle }
        : { subjectId: activeSubject.id, parentId: chapterModal.parentId, title: formTitle };
      const res = await fetch(editing ? `/api/admin/chapters/${editing.id}` : "/api/admin/chapters", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.message || "Không thể lưu dữ liệu.");
      if (result.success) { await refreshSubject(); setChapterModal({ open: false, parentId: null, editing: null }); }
    } catch (error) { alert(error instanceof Error ? error.message : "Lỗi kết nối máy chủ."); } finally { setIsSubmitting(false); }
  };

  const handleReorderChapter = (id: string, direction: "up" | "down") => {
    if (!isSubmitting && !branchLoading) order.move("chapter", id, direction);
  };

  const handleEditChapterClick = (chapter: Chapter) => {
    setChapterModal({ open: true, parentId: chapter.parentId, editing: chapter });
    setFormTitle(chapter.title);
  };
  const handleUpdateChapter = async (id: string, patch: {
    title: string; description: string | null; status: "DRAFT" | "PUBLISHED";
    openAt: string | null; closeAt: string | null;
  }) => {
    if (order.dirty || isSubmitting) return "Hãy lưu hoặc hủy thứ tự trước khi sửa cụm.";
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/chapters/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
      });
      const result = await res.json();
      if (!res.ok || !result.success) return result.message || "Không thể lưu cụm kiến thức.";
      await refreshSubject();
      return null;
    } catch {
      return "Không thể kết nối máy chủ. Vui lòng thử lại.";
    } finally { setIsSubmitting(false); }
  };
  const handleAddChildClick = (parentId: string) => {
    setChapterModal({ open: true, parentId, editing: null });
    setFormTitle("");
  };
  const handleDeleteChapterClick = (id: string) => initiateDelete(id, 'chapter');

  // --- Lesson handlers ---
  const resetLessonForm = () => {
    setLessonVideoTheoryUrl(""); setLessonVideoPracticeUrl("");
    setLessonDocUrl(""); setLessonExerciseUrl(""); setLessonAnswerUrl("");
    setLessonStatus("DRAFT");
  };

  const handleAddLessonClick = (chapterId: string) => {
    setLessonModal({ open: true, chapterId, editing: null });
    setFormTitle("");
    resetLessonForm();
  };

  const handleEditLessonClick = (chapterId: string, lesson: Lesson) => {
    setLessonModal({ open: true, chapterId, editing: lesson });
    setFormTitle(lesson.title);
    setLessonVideoTheoryUrl(lesson.videoTheoryUrl || "");
    setLessonVideoPracticeUrl(lesson.videoPracticeUrl || "");
    setLessonDocUrl(lesson.documentUrl || "");
    setLessonExerciseUrl(lesson.exerciseUrl || "");
    setLessonAnswerUrl(lesson.answerUrl || "");
    setLessonStatus(lesson.status);
  };
  const handleDeleteLessonClick = (id: string) => initiateDelete(id, 'lesson');

  const handleLessonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const form = new FormData(e.currentTarget as HTMLFormElement);
    const documentTitles = form.getAll("additionalDocumentTitle").map(value => String(value).trim());
    const documentUrls = form.getAll("additionalDocumentUrl").map(value => String(value).trim());
    const additionalDocuments = documentUrls.flatMap((url, index) => url ? [{ title: documentTitles[index] || `Tài liệu ${index + 2}`, url }] : []);
    const submitter = (e.nativeEvent as SubmitEvent).submitter;
    const intent = submitter instanceof HTMLButtonElement ? submitter.value : "stay";
    setIsSubmitting(true);
    try {
      const editing = lessonModal.editing;
      const payload = {
        title: formTitle,
        videoTheoryUrl: lessonVideoTheoryUrl, videoPracticeUrl: lessonVideoPracticeUrl,
        documentUrl: lessonDocUrl, exerciseUrl: lessonExerciseUrl, answerUrl: lessonAnswerUrl,
        additionalDocuments,
        status: lessonStatus,
        ...(editing ? {} : { chapterId: lessonModal.chapterId }),
      };
      const res = await fetch(editing ? `/api/admin/lessons/${editing.id}` : "/api/admin/lessons", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.message || "Không thể lưu dữ liệu.");
      if (result.success) {
        if (!editing && intent === "open") { router.push(`/dashboard/lessons/${result.lesson.id}/questions`); return; }
        await refreshSubject(); setLessonModal({ open: false, chapterId: null, editing: null });
      }
    } catch (error) { alert(error instanceof Error ? error.message : "Lỗi kết nối máy chủ."); } finally { setIsSubmitting(false); }
  };

  const handleReorderLesson = (id: string, direction: "up" | "down") => {
    if (!isSubmitting && !branchLoading) order.move("lesson", id, direction);
  };

  const handleQuickToggleLessonStatus = async (lesson: Lesson) => {
    if (order.dirty || isSubmitting) return;
    setIsSubmitting(true);
    try {
    const newStatus = lesson.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    const res = await fetch(`/api/admin/lessons/${lesson.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    const data = await res.json();
    if (data.success) refreshSubject(); else alert(data.message);
    } catch { alert("Lỗi kết nối đến máy chủ. Vui lòng thử lại."); } finally { setIsSubmitting(false); }
  };

  // --- Xóa 2 bước ---
  const initiateDelete = (id: string, type: 'stage' | 'subject' | 'chapter' | 'lesson') => {
    setDeleteModal({ open: true, id, type, step: 1 });
  };

  const handleConfirmDelete = async () => {
    if (order.dirty || isSubmitting) return;
    if (deleteModal.step === 1) {
      setDeleteModal(prev => ({ ...prev, step: 2 }));
      return;
    }
    const { id, type } = deleteModal;
    let endpoint = "";
    if (type === 'stage') endpoint = `/api/admin/stages/${id}`;
    else if (type === 'subject') endpoint = `/api/admin/subjects/${id}`;
    else if (type === 'chapter') endpoint = `/api/admin/chapters/${id}`;
    else if (type === 'lesson') endpoint = `/api/admin/lessons/${id}`;

    setIsSubmitting(true);
    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        if (type === 'stage' && activeStage?.id === id) { setActiveStage(null); setActiveSubject(null); }
        if (type === 'subject' && activeSubject?.id === id) setActiveSubject(null);
        if (type === "chapter" || type === "lesson") await refreshSubject();
        else await fetchCourse();
        setDeleteModal({ open: false, id: "", type: "", step: 1 });
      } else {
        alert(data.message || "Lỗi khi xóa!");
      }
    } catch {
      alert("Lỗi kết nối đến máy chủ.");
    } finally { setIsSubmitting(false); }
  };

  return { contentChanges, expandChapters, order, course, isLoading, activeStage, setActiveStage, activeSubject, setActiveSubject, fetchCourse, refreshSubject, error, branchLoading, expandedChapters, stageModal, setStageModal, subjectModal, setSubjectModal, chapterModal, setChapterModal, lessonModal, setLessonModal, deleteModal, setDeleteModal, formTitle, setFormTitle, formDesc, setFormDesc, stageTimeframe, setStageTimeframe, stageAccessMode, setStageAccessMode, stageUnlockAt, setStageUnlockAt, subjectTeacherName, setSubjectTeacherName, lessonVideoTheoryUrl, setLessonVideoTheoryUrl, lessonVideoPracticeUrl, setLessonVideoPracticeUrl, lessonDocUrl, setLessonDocUrl, lessonExerciseUrl, setLessonExerciseUrl, lessonAnswerUrl, setLessonAnswerUrl, lessonStatus, setLessonStatus, isSubmitting, toggleExpand, handleStageSubmit, handleSubjectSubmit, handleChapterSubmit, handleReorderChapter, handleEditChapterClick, handleUpdateChapter, handleAddChildClick, handleDeleteChapterClick, handleAddLessonClick, handleEditLessonClick, handleDeleteLessonClick, handleLessonSubmit, handleReorderLesson, handleQuickToggleLessonStatus, initiateDelete, handleConfirmDelete };
}
