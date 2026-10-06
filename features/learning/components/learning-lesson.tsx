"use client";
import { useState } from "react";
import Link from "next/link";
import { previewQuery } from "@/features/courses/navigation";
import PreviewBanner from "./preview-banner";
import { useErrorReporter } from "../use-error-reporter";
import SubjectViewNav from "@/features/courses/components/subject-view-nav";
import { CheckCircle2, Loader2, Send, LockKeyhole } from "lucide-react";
import QuizContent from "@/features/lessons/components/quiz-content";
import ContentImage from "@/features/admin/components/content-image";
import LessonMediaView from "@/features/lessons/components/lesson-media-view";
import DocumentLibrary from "@/features/lessons/components/document-library";
import type { LearningLessonView } from "../types";
import { canOpenStep, LEARNING_STEPS } from "../quiz-session";
import { useLearningWorkflow } from "../use-learning-workflow";
import { attachmentStep } from "../lesson-steps";

export default function LearningLesson({ initial: seed, unlock }: { initial: LearningLessonView; unlock: string | null }) {
  const [focusMode, setFocusMode] = useState(false);
  const w = useLearningWorkflow(seed, unlock);
  const initial = w.view, flow = initial.workflow, session = flow?.session, result = session?.result;
  const { reportMessage, reportError } = useErrorReporter(initial.id, initial.preview);
  const feedback = new Map(result?.feedback.map(item => [item.questionId, item]));
  const answers = w.answers;
  const step = flow?.currentStep ?? 0;
  const exhausted = !!flow && flow.maxAttempts !== null && flow.attemptCount >= flow.maxAttempts;
  const documentFiles = initial.attachments.filter(file => attachmentStep(file) === 2);
  const exerciseFiles = initial.attachments.filter(file => attachmentStep(file) === 3);
  function setStatement(questionId: string, statementId: string, value: boolean) {
    const current = answers[questionId];
    w.changeAnswers({ ...answers, [questionId]: { ...(typeof current === "object" ? current : {}), [statementId]: value } });
  }
  if (initial.locked || !flow) return <div className="rounded-2xl bg-white p-6"><h1 className="font-bold">Bài học hiện chưa thể truy cập</h1><p className="my-3 text-sm">{initial.lockReason}</p><Link href={`/learn/subjects/${initial.subjectId}${initial.preview ? previewQuery({ ...initial, unlock }) : ""}`} className="text-bkhn-red">Quay lại môn học</Link></div>;
  return <div className={`mx-auto max-w-7xl space-y-5 pb-12 ${focusMode ? "" : "animate-fade-up"}`}>
    {initial.preview && <><PreviewBanner courseId={initial.courseId} subjectId={initial.subjectId} chapterId={initial.chapterId} studentName={initial.previewStudentName} showDrafts={initial.showDrafts} simulated={initial.simulated} unlock={unlock} /><SubjectViewNav courseId={initial.courseId} subjectId={initial.subjectId} chapterId={initial.chapterId} active="preview" /></>}
    <header className="rounded-3xl border border-bkhn-pink bg-white p-5 shadow-bkhn-sm sm:p-6">
      <Link href={`/learn/subjects/${initial.subjectId}${initial.preview ? previewQuery({ ...initial, unlock }) : ""}`} className="text-xs font-bold text-bkhn-red hover:underline">← {initial.subjectTitle}</Link>
      <p className="mt-3 text-xs font-bold uppercase tracking-wider text-gray-400">{initial.chapterTitle}</p>
      <h1 className="mt-1 text-2xl font-black text-gray-900">{initial.title}</h1>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500"><span>{flow.completedSteps.length}/{flow.availableSteps.length} phần đã hoàn thành · {initial.completed ? "Đã hoàn thành bài học" : "Tiếp tục từ bước đã lưu"}</span>{initial.preview && <button disabled={w.pending} onClick={() => { if (confirm("Đặt lại tiến trình và các lần làm mô phỏng của bài này? Dữ liệu học viên thật không thay đổi.")) void w.action("RESET_PREVIEW"); }} className="font-bold text-amber-800">Đặt lại bài Preview</button>}</div>
      <nav aria-label="Các phần học" className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">{flow.availableSteps.map((index, position) => {
        const label = LEARNING_STEPS[index];
        const available = canOpenStep(index, flow.completedSteps, flow.navigation, flow.availableSteps);
        return <button key={label} disabled={!available || w.pending || !w.ready || !w.online} onClick={() => void w.action("STEP", { step: index })} aria-current={step === index ? "step" : undefined} className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-xs font-bold disabled:cursor-not-allowed ${step === index ? "border-bkhn-red bg-bkhn-red text-white" : available ? "border-gray-200 bg-gray-50 text-gray-600" : "border-gray-100 text-gray-300"}`}>{!available ? <LockKeyhole size={15} /> : flow.completedSteps.includes(index) ? <CheckCircle2 size={15} /> : <span>{position + 1}.</span>}{label}</button>;
      })}</nav>
    </header>
    {session && !result && <div className="sticky top-16 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-bkhn-pink bg-white/95 p-4 shadow-sm backdrop-blur">
      <div><p className="text-sm font-black text-bkhn-red">{session.deadlineAt ? w.remaining === null ? "Đang đồng bộ đồng hồ…" : w.remaining === 0 ? "Đã hết giờ · Đang xác nhận kết quả" : `Còn ${Math.floor(w.remaining / 60)}:${String(w.remaining % 60).padStart(2, "0")}` : "Không giới hạn thời gian"}</p><p className="mt-1 text-xs text-gray-500">Đồng hồ không dừng khi rời bước Bài tập hoặc tải lại trang.</p></div>
      <p role="status" className="text-xs font-semibold text-gray-600">{!w.online ? "Mất mạng · Bản nháp chỉ ở trên máy" : w.conflict ? "Cần chọn bản nháp" : w.pending ? "Đang đồng bộ…" : w.dirty ? "Chưa lưu lên máy chủ" : "Đã lưu lên máy chủ"}</p>
    </div>}
    {(!w.online || w.error || w.notice || w.conflict || !w.ready) && <aside className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
      {!w.ready && <p>Đang khôi phục bước học và phiên làm bài…</p>}
      {!w.online && <p>Mất kết nối. Cậu vẫn có thể sửa bản nháp trước khi hết giờ; máy chủ chỉ tính những câu trả lời đã nhận đúng hạn.</p>}
      {w.error && <p role="alert">{w.error}</p>}{w.notice && <p role="status">{w.notice}</p>}
      {w.conflict && <div><p className="font-bold">Có bản nháp khác trên máy chủ. Không tự ghi đè.</p><div className="mt-2 flex flex-wrap gap-2"><button disabled={w.pending} onClick={() => w.resolveConflict(true)} className="rounded-lg bg-white px-3 py-2 text-xs font-bold">Dùng bản trên máy này</button><button disabled={w.pending} onClick={() => w.resolveConflict(false)} className="rounded-lg bg-white px-3 py-2 text-xs font-bold">Dùng bản trên máy chủ</button></div></div>}
      <button disabled={w.pending || !w.online} onClick={() => void w.action("SYNC")} className="rounded-lg bg-white px-3 py-2 text-xs font-bold">Đồng bộ / kiểm tra kết quả</button>
    </aside>}
    {step >= 0 && step < 2 && ((step === 0 ? initial.videoTheoryUrl || initial.theoryDocumentUrl : initial.videoPracticeUrl || initial.practiceDocumentUrl) ? <LessonMediaView key={step} title={LEARNING_STEPS[step]} videoUrl={step === 0 ? initial.videoTheoryUrl : initial.videoPracticeUrl} documentUrl={step === 0 ? initial.theoryDocumentUrl : initial.practiceDocumentUrl} splitView={step === 0 ? initial.theorySplitView : initial.practiceSplitView}
      focusMode={focusMode} onFocusChange={setFocusMode}
      tracking={initial.preview ? undefined : { lessonId: initial.id, section: step === 0 ? "THEORY" : "PRACTICE" }}
      watermark={initial.attachments.find(file => file.sourceKey === (step === 0 ? "theoryDocumentUrl" : "practiceDocumentUrl"))?.watermark ? initial.viewerEmail : undefined}
      onReport={(type, message, url) => void reportError(type, message, url)} /> : <p className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500">Bước này chưa có nội dung. Cậu có thể tiếp tục.</p>)}
    {step === 2 && (documentFiles.length ? <DocumentLibrary files={documentFiles} viewerEmail={initial.viewerEmail} accessQuery={initial.preview ? previewQuery({ ...initial, unlock }) : ""} onReport={(type, message, url) => void reportError(type, message, url)} /> : <p className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500">Bước này chưa có tài liệu. Cậu có thể tiếp tục.</p>)}
    {step === 3 && exerciseFiles.length > 0 && <DocumentLibrary files={exerciseFiles} viewerEmail={initial.viewerEmail} accessQuery={initial.preview ? previewQuery({ ...initial, unlock }) : ""} onReport={(type, message, url) => void reportError(type, message, url)} />}
    {step === 3 && !session && flow.questionCount > 0 && <section className="space-y-4 rounded-3xl border border-bkhn-pink bg-white p-6">
      <h2 className="text-xl font-black">Sẵn sàng làm bài?</h2><p className="text-sm text-gray-600">{flow.questionCount} câu · {flow.timeLimitMinutes === null ? "Không giới hạn thời gian" : `${flow.timeLimitMinutes} phút`} · Điểm đạt từ {flow.passPercent}/100</p>
      <p className="text-xs text-gray-500">Đã dùng {flow.attemptCount}{flow.maxAttempts === null ? " lần · Không giới hạn số lần" : `/${flow.maxAttempts} lần`}. Thời gian bắt đầu khi máy chủ tạo phiên.</p>
      {flow.questionCount > 0 ? <button disabled={w.pending || !w.ready || !w.online || exhausted} onClick={() => void w.action("START")} className="rounded-xl bg-bkhn-red px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{exhausted ? "Đã hết số lần làm" : "Bắt đầu làm bài"}</button> : <p className="text-sm text-gray-500">Chưa có câu hỏi. {flow.completionMode === "MANUAL" ? "Có thể hoàn thành bài học sau các bước trên." : "Admin cần bổ sung bài tập hoặc đổi điều kiện hoàn thành."}</p>}
    </section>}
    {step === 3 && session && <section className="space-y-4">
      <div><h2 className="text-xl font-black">Bài tập tương tác</h2><p className="mt-1 text-xs text-gray-500">Đề và thứ tự được giữ cố định cho lần làm này · Điểm đạt {session.passPercent}/100</p></div>
      {initial.questions.map((question, index) => {
        const itemFeedback = feedback.get(question.id);
        const selected = answers[question.id];
        return <article key={question.id} className={`rounded-2xl border bg-white p-5 shadow-sm ${itemFeedback ? itemFeedback.correct ? "border-green-200" : "border-red-200" : "border-gray-200"}`}>
          <div className="mb-3 text-sm font-bold text-gray-900"><span className="mr-2 text-bkhn-red">Câu {index + 1}.</span><QuizContent text={question.content} /></div>
          {question.imageUrl && <ContentImage src={question.imageUrl} alt="" className="mb-3 max-h-64 rounded-xl border border-gray-100" />}
          {question.type === "MULTIPLE_CHOICE" && <div className="grid gap-2 sm:grid-cols-2">{(question.options ?? []).map((option) => <button key={option.id} type="button" disabled={!!result || !w.ready || w.conflict || w.remaining === 0} onClick={() => w.changeAnswers({ ...w.answers, [question.id]: option.id })} className={`rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${selected === option.id ? "border-bkhn-red bg-bkhn-pale font-bold text-bkhn-red" : "border-gray-200 hover:border-bkhn-pink"}`}><b>{option.id}.</b> <QuizContent text={option.text} /></button>)}</div>}
          {question.type === "TRUE_FALSE_GROUP" && <div className="space-y-2">{(question.options ?? []).map((option) => {
            const values = typeof selected === "object" ? selected : {};
            return <div key={option.id} className="flex flex-col gap-2 rounded-xl bg-gray-50 p-3 sm:flex-row sm:items-center"><div className="flex-1 text-sm"><b>{option.id})</b> <QuizContent text={option.text} /></div><div className="flex gap-1">{[true, false].map((value) => <button key={String(value)} type="button" disabled={!!result || !w.ready || w.conflict || w.remaining === 0} onClick={() => setStatement(question.id, option.id, value)} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${values[option.id] === value ? value ? "bg-green-600 text-white" : "bg-red-600 text-white" : "border border-gray-200 bg-white text-gray-500"}`}>{value ? "Đúng" : "Sai"}</button>)}</div></div>;
          })}</div>}
          {question.type === "SHORT_ANSWER" && <input disabled={!!result || !w.ready || w.conflict || w.remaining === 0} value={typeof selected === "string" ? selected : ""} onChange={(event) => w.changeAnswers({ ...w.answers, [question.id]: event.target.value })} maxLength={500} placeholder="Nhập đáp án" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-bkhn-red focus:ring-4 focus:ring-bkhn-red/10" />}
          {itemFeedback && <div className={`mt-3 rounded-xl px-3 py-2 text-xs font-semibold ${itemFeedback.correct ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{itemFeedback.correct ? "Chính xác" : "Chưa chính xác"}<p className="mt-1">Đáp án: {typeof itemFeedback.correctAnswer === "object" && itemFeedback.correctAnswer ? Object.entries(itemFeedback.correctAnswer).map(([id, value]) => `${id}: ${value ? "Đúng" : "Sai"}`).join(" · ") : itemFeedback.correctAnswer}</p>{itemFeedback.explanation && <div className="mt-2 font-medium"><QuizContent text={itemFeedback.explanation} /></div>}</div>}
        </article>;
      })}
      {!result ? <button onClick={() => void w.action("SUBMIT")} disabled={w.pending || !w.ready || w.conflict || !w.online || w.remaining === 0} className="flex items-center gap-2 rounded-2xl bg-bkhn-red px-5 py-3 text-sm font-black text-white shadow-bkhn-md hover:bg-red-700 disabled:opacity-60">{w.pending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />} Nộp bài</button> : <div className="rounded-2xl border border-bkhn-pink bg-bkhn-rose p-5"><p className="text-sm font-bold text-gray-600">Kết quả</p><p className="mt-1 text-3xl font-black text-bkhn-red">{result.score}/100</p><p className="text-xs text-gray-500">Đúng {result.correctCount}/{result.totalQuestions} câu · {result.passed ? "Đạt" : "Chưa đạt"}{result.timedOut && " · Thu bài do hết giờ"}</p><button disabled={w.pending || exhausted} onClick={() => void w.action("START")} className="mt-3 rounded-xl bg-white px-4 py-2 text-sm font-bold text-bkhn-red">{exhausted ? "Đã hết số lần làm" : "Bắt đầu lần làm mới"}</button></div>}
    </section>}
    {reportMessage && <p role="status" className="text-sm text-amber-800">{reportMessage}</p>}
    {!flow.availableSteps.length && <p className="rounded-2xl border border-dashed border-bkhn-pink bg-white p-8 text-center text-sm text-gray-500">Bài học chưa có nội dung. Vui lòng quay lại sau.</p>}
    {flow.availableSteps.length > 0 && <footer className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-bkhn-pink bg-white p-4">
      <p className="max-w-xl text-xs text-gray-500">{step < 3 ? "Tự xác nhận khi đã học xong phần này." : flow.completionMode === "MANUAL" ? "Cậu tự quyết định khi nào đã học xong." : flow.completionMode === "QUIZ_PASSED" ? "Cần đạt điểm bài tập và hoàn thành các bước trước." : "Cần nộp bài tập và hoàn thành các bước trước."}</p>
      {step < 3 ? <button disabled={initial.completed || w.pending || !w.ready || !w.online} onClick={() => void w.action("STEP", { step, complete: true })} className="rounded-xl bg-bkhn-red px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{initial.completed ? "Đã hoàn thành bài học" : step === flow.availableSteps.at(-1) ? "Hoàn thành bài học" : "Hoàn thành & tiếp tục →"}</button> : <button disabled={initial.completed || w.pending || !w.ready || !w.online || !!session && !result} onClick={() => void w.action("COMPLETE")} className="rounded-xl bg-green-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{initial.completed ? "Đã hoàn thành bài học" : "Hoàn thành bài học"}</button>}
      {initial.completed && <Link href={`/learn/subjects/${initial.subjectId}${initial.preview ? previewQuery({ ...initial, unlock }) : ""}`} className="text-sm font-bold text-bkhn-red">Chọn bài tiếp theo →</Link>}
    </footer>}
  </div>;
}
