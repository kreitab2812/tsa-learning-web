"use client";
import { useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { questionSchema } from "@/features/content/schemas";
import { useAdminResource } from "@/features/admin/use-admin-resource";
import { adminJson, errorMessage } from "@/features/admin/api";
import type { LessonDraft } from "../editor-state";
import { useLessonEditor } from "./use-lesson-editor";
import type { Lesson, QuestionType, Option, Statement, Question } from "../types";
import { getYoutubeEmbedUrl } from "@/lib/media";
import { EMPTY_OPTIONS, EMPTY_STATEMENTS, TabKey, LessonFieldValue } from "../constants";
export function useLessonWorkspace() {
  const params = useParams();
  const router = useRouter();
  const lessonId = params.lessonId as string;

  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab: TabKey = tabParam === "practice" || tabParam === "documents" || tabParam === "questions" ? tabParam : "theory";
  const activeTab = initialTab;
  const setActiveTab = (tab: TabKey) => {
    if (activeTab === "questions" && bulkMode && !confirm("Chuyển bước sẽ đóng phần nhập và bỏ bản xem trước chưa lưu. Tiếp tục?")) return;
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  };
  const [savingField, setSavingField] = useState<string | null>(null);
  const [mediaBusy, setMediaBusy] = useState(false);
  const savePending = useRef(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const editor = useLessonEditor(lessonId);
  const { lesson, videoTheoryUrl, videoPracticeUrl } = editor;
  const [page, setPage] = useState(1);
  const questionList = useAdminResource<{ questions: Question[]; hasMore: boolean }>(activeTab === "questions" ? `/api/admin/lessons/${lessonId}/questions?page=${page}` : null);
  const questions = questionList.data?.questions ?? [];
  const fetchLesson = questionList.refresh;

  // --- Modal Câu hỏi ---
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);
  const [qType, setQType] = useState<QuestionType>("MULTIPLE_CHOICE");
  const [qContent, setQContent] = useState("");
  const [qImageUrl, setQImageUrl] = useState<string | null>(null);
  const [qOptions, setQOptions] = useState<Option[]>(EMPTY_OPTIONS);
  const [qStatements, setQStatements] = useState<Statement[]>(EMPTY_STATEMENTS);
  const [qCorrectAnswer, setQCorrectAnswer] = useState("A");
  const [qExplanation, setQExplanation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [questionError, setQuestionError] = useState<string | null>(null);
  const [questionBusy, setQuestionBusy] = useState(false);
  const [questionMessage, setQuestionMessage] = useState<string | null>(null);
  const questionPending = useRef(false);
  const [bulkMode, setBulkMode] = useState(false);

  const closeQuestionModal = () => {
    if (!isSubmitting && confirm("Đóng trình soạn? Thay đổi câu hỏi chưa lưu sẽ bị bỏ.")) setModalOpen(false);
  };
  const questionAction = async (id: string, action: "duplicate" | "up" | "down") => {
    if (questionPending.current) return;
    questionPending.current = true; setQuestionBusy(true); setQuestionError(null); setQuestionMessage(null);
    try {
      await adminJson(`/api/admin/questions/${id}/actions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      await Promise.all([fetchLesson(), editor.refreshLesson()]);
      setQuestionMessage(action === "duplicate" ? "Đã nhân bản vào cuối danh sách." : "Đã lưu vị trí câu hỏi.");
    } catch (cause) { setQuestionError(errorMessage(cause)); }
    finally { questionPending.current = false; setQuestionBusy(false); }
  };

  const saveLessonFields = async (fields: Record<string, LessonFieldValue>) => {
    if (savePending.current) return;
    savePending.current = true;
    setSaveError(null);
    setSaveMessage(null);
    setSavingField(Object.keys(fields).join(","));
    try {
      const data = await adminJson<{ lesson: Lesson }>(`/api/admin/lessons/${lessonId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      editor.commitSaved(data.lesson, fields as LessonDraft);
      setSaveMessage("Đã lưu thay đổi.");
    } catch (error) {
      setSaveError(errorMessage(error));
    } finally {
      savePending.current = false;
      setSavingField(null);
    }
  };

  const toggleLessonStatus = () => {
    if (!lesson) return;
    saveLessonFields({ status: lesson.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED" });
  };

  // --- Question form helpers ---
  const resetQuestionForm = () => {
    setQType("MULTIPLE_CHOICE");
    setQContent("");
    setQImageUrl(null);
    setQOptions(EMPTY_OPTIONS);
    setQStatements(EMPTY_STATEMENTS);
    setQCorrectAnswer("A");
    setQExplanation("");
  };

  const openCreateQuestion = () => {
    setQuestionError(null);
    setEditing(null);
    resetQuestionForm();
    setModalOpen(true);
  };

  const openEditQuestion = (q: Question) => {
    resetQuestionForm();
    setQuestionError(null);
    setEditing(q);
    setQType(q.type);
    setQContent(q.content);
    setQImageUrl(q.imageUrl);
    setQExplanation(q.explanation || "");
    if (q.type === "MULTIPLE_CHOICE") {
      setQOptions((q.options as Option[]) || EMPTY_OPTIONS);
      setQCorrectAnswer(q.correctAnswer || "A");
    } else if (q.type === "TRUE_FALSE_GROUP") {
      setQStatements((q.options as Statement[]) || EMPTY_STATEMENTS);
    } else {
      setQCorrectAnswer(q.correctAnswer || "");
    }
    setModalOpen(true);
  };

  const handleOptionChange = (id: string, text: string) => {
    setQOptions(prev => prev.map(o => (o.id === id ? { ...o, text } : o)));
  };
  const handleStatementChange = (id: string, field: "text" | "isTrue", value: string | boolean) => {
    setQStatements(prev => prev.map(s => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!qContent) return;

    let options: Option[] | Statement[] | null = null;
    let correctAnswer: string | null = null;

    if (qType === "MULTIPLE_CHOICE") {
      if (qOptions.some(o => !o.text)) { setQuestionError("Vui lòng nhập đủ 4 đáp án."); return; }
      options = qOptions;
      correctAnswer = qCorrectAnswer;
    } else if (qType === "TRUE_FALSE_GROUP") {
      if (qStatements.some(s => !s.text)) { setQuestionError("Vui lòng nhập đủ nội dung các mệnh đề."); return; }
      options = qStatements;
    } else {
      if (!qCorrectAnswer) { setQuestionError("Vui lòng nhập đáp án."); return; }
      correctAnswer = qCorrectAnswer;
    }

    const validated = questionSchema.safeParse({ type: qType, content: qContent, imageUrl: qImageUrl, options, correctAnswer, explanation: qExplanation });
    if (!validated.success) { setQuestionError(validated.error.issues.map(issue => `${issue.path.join(".")}: ${issue.message}`).join(" · ")); return; }
    setQuestionError(null);
    setIsSubmitting(true);
    try {
      const payload = { ...(editing ? {} : { lessonId }), type: qType, content: qContent, imageUrl: qImageUrl, options, correctAnswer, explanation: qExplanation };
      const res = await fetch(editing ? `/api/admin/questions/${editing.id}` : "/api/admin/questions", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        await Promise.all([fetchLesson(), editor.refreshLesson()]);
        setModalOpen(false);
      } else {
        setQuestionError(data.message);
      }
    } catch {
      setQuestionError("Lỗi kết nối đến máy chủ. Nội dung vẫn được giữ; hãy kiểm tra danh sách trước khi lưu lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    try {
    if (!confirm("Xóa câu hỏi này?")) return;
    const res = await fetch(`/api/admin/questions/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) fetchLesson(); else alert(data.message);
    } catch { alert("Lỗi kết nối đến máy chủ. Vui lòng thử lại."); }
  };

  const theoryEmbed = videoTheoryUrl ? getYoutubeEmbedUrl(videoTheoryUrl) : null;
  const practiceEmbed = videoPracticeUrl ? getYoutubeEmbedUrl(videoPracticeUrl) : null;


  return { ...editor, mediaBusy, setMediaBusy, router, activeTab, setActiveTab, savingField, saveError, saveMessage, page, setPage, questionList, questions, fetchLesson, modalOpen, setModalOpen, editing, qType, setQType, qContent, setQContent, qImageUrl, setQImageUrl, qOptions, qStatements, qCorrectAnswer, setQCorrectAnswer, qExplanation, setQExplanation, isSubmitting, questionError, questionBusy, questionMessage, questionAction, closeQuestionModal, bulkMode, setBulkMode, saveLessonFields, toggleLessonStatus, openCreateQuestion, openEditQuestion, handleOptionChange, handleStatementChange, handleQuestionSubmit, handleDeleteQuestion, theoryEmbed, practiceEmbed };
}
