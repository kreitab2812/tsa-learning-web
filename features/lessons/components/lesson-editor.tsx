"use client";
import dynamic from "next/dynamic";
import LoadingState, { LoadingIndicator } from "@/components/ui/loading-state";
import { Plus, Loader2 } from "lucide-react";
import Pagination from "@/features/admin/components/pagination";
import RequestError from "@/features/admin/components/request-error";
import LessonBuilderFrame from "./lesson-builder-frame";
import { useLessonWorkspace } from "../hooks/use-lesson-workspace";
const QuestionModal = dynamic(() => import("./question-modal"), { loading: () => <LoadingIndicator label="Đang mở trình soạn câu hỏi…" /> });
const QuestionCard = dynamic(() => import("./question-card"), { loading: () => <LoadingIndicator label="Đang hiển thị câu hỏi…" /> });
import MediaStepEditor from "./media-step-editor";
const DocumentHub = dynamic(() => import("./document-hub"), { loading: () => <LoadingState compact label="Đang mở thư viện tài liệu…" /> });
const QuizImportPanel = dynamic(() => import("./quiz-import-panel"), { loading: () => <LoadingIndicator label="Đang mở công cụ nhập câu hỏi…" /> });
export default function LessonDetailPage() {
  const workspace = useLessonWorkspace();
  const { activeTab, savingField, lesson, isLoading, error, refreshLesson, documentUrl, setDocumentUrl, exerciseUrl, setExerciseUrl, answerUrl, setAnswerUrl, page, setPage, questionList, questions, fetchLesson, bulkMode, setBulkMode, saveLessonFields, openCreateQuestion, openEditQuestion, handleDeleteQuestion } = workspace;
  const changeQuestionPage = (next: number) => {
    setPage(next);
    const list = document.getElementById("lesson-question-list");
    list?.scrollIntoView({ block: "start" });
    list?.focus({ preventScroll: true });
  };
  if (isLoading && !lesson) return <LoadingState label="Đang mở bài học…" />;
  if (!lesson || !workspace.values) return <><RequestError message={error} retry={() => void refreshLesson()} /><p>Không tìm thấy bài học.</p></>;
  return (
    <LessonBuilderFrame workspace={workspace}>
      {isLoading && <LoadingIndicator label="Đang cập nhật bài học · nội dung soạn vẫn được giữ…" />}
      <RequestError message={error} retry={() => void refreshLesson()} />

      {(activeTab === "theory" || activeTab === "practice") && <MediaStepEditor workspace={workspace} step={activeTab} />}

      {/* TAB: TÀI LIỆU */}
      {activeTab === "documents" && <DocumentHub lessonId={lesson.id} files={lesson.attachments} onBusyChange={workspace.setMediaBusy} onAttachmentChange={(file, removed) => {
        const attachments = removed ? lesson.attachments.filter(item => item.id !== file.id)
          : lesson.attachments.some(item => item.id === file.id) ? lesson.attachments.map(item => item.id === file.id ? file : item) : [...lesson.attachments, file];
        workspace.commitSaved({ attachments, ...(file.sourceKey ? { [file.sourceKey]: removed ? null : file.url } : {}) }, {});
      }} />}
      {activeTab === "documents" && (
        <details className="rounded-2xl border border-bkhn-pink bg-white p-4"><summary className="cursor-pointer text-xs font-bold text-gray-600">Ba link tài liệu gốc (giữ tương thích dữ liệu cũ)</summary>
        <div className="bg-white p-6 rounded-[1.5rem] border border-bkhn-pink shadow-sm space-y-5 animate-fade-in">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Tài liệu học tập (PDF/Google Drive)</label>
            <input type="text" value={documentUrl} onChange={e => setDocumentUrl(e.target.value)} placeholder="https://drive.google.com/..." className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-bkhn-red focus:bg-white transition-all" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Bài tập gốc (PDF, để tham khảo)</label>
            <input type="text" value={exerciseUrl} onChange={e => setExerciseUrl(e.target.value)} placeholder="https://drive.google.com/..." className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-bkhn-red focus:bg-white transition-all" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Đáp án gốc (PDF, để tham khảo)</label>
            <input type="text" value={answerUrl} onChange={e => setAnswerUrl(e.target.value)} placeholder="https://drive.google.com/..." className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-bkhn-red focus:bg-white transition-all" />
          </div>
          <p className="text-xs text-gray-400 italic">Đây là bản PDF gốc để học viên tải về tham khảo. Bài tập tương tác chấm điểm trực tiếp trên web nằm ở tab &quot;Bài tập&quot;.</p>
          <button
            onClick={() => saveLessonFields({ documentUrl, exerciseUrl, answerUrl })}
            disabled={!!savingField || workspace.mediaBusy}
            className="bg-bkhn-red hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2"
          >
            {savingField?.includes("documentUrl") ? <Loader2 className="animate-spin" size={16} /> : "Lưu"}
          </button>
        </div></details>
      )}

      {/* TAB: BÀI TẬP */}
      {activeTab === "questions" && (
        <div id="lesson-question-list" tabIndex={-1} className="scroll-mt-5 space-y-4 animate-fade-in">
          <div className="flex justify-between items-center gap-3 flex-wrap">
            <button onClick={openCreateQuestion} className="bg-bkhn-red hover:bg-red-700 text-white font-bold px-5 py-3 rounded-2xl transition-all shadow-sm flex items-center gap-2 text-sm">
              <Plus size={18} strokeWidth={3} /> Thêm câu hỏi
            </button>
            <button disabled={workspace.mediaBusy} onClick={() => { if (!bulkMode || confirm("Đóng phần nhập? Dữ liệu nhập chưa lưu sẽ bị bỏ.")) setBulkMode(!bulkMode); }} className="text-sm font-bold text-bkhn-red hover:underline">
              {bulkMode ? "Đóng Nhập nhanh" : "Nhập nhanh (nhiều câu)"}
            </button>
          </div>

          {bulkMode && <QuizImportPanel lessonId={lesson.id} onBusyChange={workspace.setMediaBusy} onDone={async () => { await Promise.all([fetchLesson(), refreshLesson()]); }} />}
          <p className="text-xs text-gray-500">Nút ↑ ↓ lưu vị trí ngay, kể cả chuyển qua trang kế tiếp. Nhân bản thêm câu vào cuối bài.</p>
          {workspace.questionError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{workspace.questionError}</p>}
          {workspace.questionMessage && <p role="status" className="text-xs text-green-700">{workspace.questionMessage}</p>}

<RequestError message={questionList.error} retry={() => void fetchLesson()} />
<Pagination itemCount={questions.length} itemLabel="câu hỏi" page={page} hasMore={questionList.data?.hasMore ?? false} busy={questionList.isLoading} onChange={changeQuestionPage} />
{questionList.isLoading && !questions.length && <LoadingState compact label="Đang tải câu hỏi…" />}
{!questionList.isLoading && questions.length === 0 && (
  <div className="text-center py-10 text-gray-500 font-medium bg-white rounded-3xl border border-dashed border-bkhn-pink">
    Chưa có câu hỏi nào. Hãy thêm câu hỏi đầu tiên!
  </div>
)}

          {questions.map((q, idx) => (
            <QuestionCard key={q.id} question={q} index={(page - 1) * 20 + idx + 1} onEdit={openEditQuestion} onDelete={handleDeleteQuestion} onAction={workspace.questionAction} busy={workspace.questionBusy || workspace.mediaBusy} first={page === 1 && idx === 0} last={!questionList.data?.hasMore && idx === questions.length - 1} />
          ))}
          {questions.length > 5 && <Pagination itemCount={questions.length} itemLabel="câu hỏi" page={page} hasMore={questionList.data?.hasMore ?? false} busy={questionList.isLoading} onChange={changeQuestionPage} />}
        </div>
      )}

      {workspace.modalOpen && <QuestionModal {...workspace} />}
    </LessonBuilderFrame>
  );
}
