"use client";
import ImageField from "@/features/admin/components/image-field";
import QuizRichInput from "./quiz-rich-input";
import { Loader2, X } from "lucide-react";
import type { QuestionType } from "../types";
import type { useLessonWorkspace } from "../hooks/use-lesson-workspace";

export default function QuestionModal(w: ReturnType<typeof useLessonWorkspace>) {
  if (!w.modalOpen) return null;
  return <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/40 p-3 backdrop-blur-sm">
    <section role="dialog" aria-modal="true" aria-labelledby="question-heading" className="my-5 w-full max-w-3xl rounded-3xl border border-bkhn-pink bg-white p-5 shadow-2xl sm:p-7">
      <div className="mb-5 flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-widest text-bkhn-red">Quiz Builder</p><h2 id="question-heading" className="mt-1 text-xl font-black">{w.editing ? "Chỉnh sửa câu hỏi" : "Thêm câu hỏi"}</h2><p className="mt-1 text-xs text-gray-500">Định dạng, công thức, bảng và ảnh · Xem trước ngay tại từng ô</p></div><button type="button" aria-label="Đóng trình soạn" disabled={w.isSubmitting} onClick={w.closeQuestionModal} className="rounded-xl p-2 hover:bg-gray-100"><X size={20} /></button></div>
      <form onSubmit={w.handleQuestionSubmit} className="space-y-5">
        <fieldset disabled={w.isSubmitting} className="min-w-0 space-y-5 disabled:opacity-60">
          <div className="grid grid-cols-3 gap-2">
            {(["MULTIPLE_CHOICE", "TRUE_FALSE_GROUP", "SHORT_ANSWER"] as QuestionType[]).map(type => <button key={type} type="button" onClick={() => w.setQType(type)} className={`rounded-xl border px-2 py-3 text-xs font-bold ${w.qType === type ? "border-bkhn-red bg-bkhn-red text-white" : "border-gray-200 bg-gray-50 text-gray-600"}`}>{type === "MULTIPLE_CHOICE" ? "Trắc nghiệm" : type === "TRUE_FALSE_GROUP" ? "Đúng / Sai" : "Trả lời ngắn"}</button>)}
          </div>
          <QuizRichInput label="Đề bài" value={w.qContent} onChange={w.setQContent} required maxLength={20000} />
          <details className="rounded-xl border border-gray-200 p-3"><summary className="cursor-pointer text-xs font-bold text-gray-600">Ảnh minh họa riêng của câu hỏi</summary><div className="mt-3"><ImageField value={w.qImageUrl} onChange={w.setQImageUrl} preset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET} /></div></details>
          {w.qType === "MULTIPLE_CHOICE" && <div className="space-y-3"><p className="text-sm font-bold">Lựa chọn & đáp án đúng</p>{w.qOptions.map(option => <div key={option.id} className="rounded-2xl border border-gray-200 p-3"><label className="mb-2 flex items-center gap-2 text-xs font-bold text-gray-600"><input type="radio" name="correctAnswer" checked={w.qCorrectAnswer === option.id} onChange={() => w.setQCorrectAnswer(option.id)} className="accent-bkhn-red" />Chọn {option.id} là đáp án đúng</label><QuizRichInput label={`Đáp án ${option.id}`} required value={option.text} onChange={text => w.handleOptionChange(option.id, text)} /></div>)}</div>}
          {w.qType === "TRUE_FALSE_GROUP" && <div className="space-y-3">{w.qStatements.map(statement => <div key={statement.id} className="rounded-2xl border border-gray-200 p-3"><QuizRichInput label={`Mệnh đề ${statement.id}`} required value={statement.text} onChange={text => w.handleStatementChange(statement.id, "text", text)} /><label className="mt-2 flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={statement.isTrue} onChange={e => w.handleStatementChange(statement.id, "isTrue", e.target.checked)} className="accent-bkhn-red" />{statement.isTrue ? "Mệnh đề đúng" : "Mệnh đề sai"}</label></div>)}</div>}
          {w.qType === "SHORT_ANSWER" && <label className="block text-xs font-bold text-gray-700">Đáp án đúng (văn bản, không định dạng)<input required maxLength={500} value={w.qCorrectAnswer} onChange={e => w.setQCorrectAnswer(e.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-bkhn-red" /></label>}
          <div className="rounded-2xl bg-bkhn-pale/40 p-4"><QuizRichInput label="Lời giải chi tiết" value={w.qExplanation} onChange={w.setQExplanation} /><p className="mt-2 text-xs text-gray-500">Lời giải và ảnh trong lời giải chỉ được gửi sau khi nộp bài.</p></div>
        </fieldset>
        {w.questionError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{w.questionError}</p>}
        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-gray-100 bg-white/95 py-3 backdrop-blur"><button type="button" disabled={w.isSubmitting} onClick={w.closeQuestionModal} className="rounded-xl bg-gray-100 px-5 py-3 text-sm font-bold">Hủy</button><button disabled={w.isSubmitting} className="flex items-center gap-2 rounded-xl bg-bkhn-red px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{w.isSubmitting && <Loader2 size={16} className="animate-spin" />}Lưu câu hỏi</button></div>
      </form>
    </section>
  </div>;
}
