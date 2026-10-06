"use client";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Loader2, Save } from "lucide-react";
import { editorHref } from "@/features/courses/navigation";
import { TABS } from "../constants";
import type { useLessonWorkspace } from "../hooks/use-lesson-workspace";
import { useLessonLeaveGuard } from "../hooks/use-lesson-leave-guard";
import LessonSettings from "./lesson-settings";
import { availableLessonSteps } from "@/features/learning/lesson-steps";

export default function LessonBuilderFrame({ workspace: w, children }: {
  workspace: ReturnType<typeof useLessonWorkspace>; children: React.ReactNode;
}) {
  useLessonLeaveGuard(w.dirty || !!w.savingField || w.mediaBusy || w.modalOpen || w.bulkMode);
  const { lesson, values } = w;
  if (!lesson || !values) return null;
  const currentIndex = TABS.findIndex(tab => tab.key === w.activeTab);
  const back = editorHref(lesson.chapter.subject.stage.courseId, lesson.chapter.subjectId, lesson.chapter.id);
  const descriptions = ["Video & tài liệu đi kèm", "Bài giảng & hướng dẫn", "Tài nguyên của bài học", "Câu hỏi & lời giải"];
  const configuredSteps = availableLessonSteps({ ...lesson, ...values });
  return <div className="mx-auto max-w-[1600px] space-y-5 pb-28 animate-fade-up">
    <header className="rounded-3xl border border-bkhn-pink bg-white p-4 shadow-bkhn-sm sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href={back} className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-bkhn-red"><ArrowLeft size={15} />Trở về cụm kiến thức</Link>
        <span className="rounded-full bg-bkhn-pale px-3 py-1 text-[10px] font-black uppercase tracking-widest text-bkhn-red">Không gian soạn bài</span>
      </div>
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1 basis-64">
          <label htmlFor="lesson-title" className="text-xs font-bold text-gray-400">Tên bài học</label>
          <input id="lesson-title" value={values.title} maxLength={250} onChange={e => w.editField("title", e.target.value)} className="mt-1 w-full rounded-lg border border-transparent bg-transparent px-1 py-1 text-xl font-black tracking-tight text-gray-900 hover:border-gray-200 focus:border-bkhn-red focus:bg-white focus:outline-none sm:text-2xl" />
          <p className="mt-1 text-xs text-gray-500">{lesson.chapter.title}</p>
        </div>
        <button onClick={w.toggleLessonStatus} disabled={!!w.savingField || w.mediaBusy} className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold disabled:opacity-50 ${lesson.status === "PUBLISHED" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>
          {lesson.status === "PUBLISHED" ? <Eye size={14} /> : <EyeOff size={14} />}{lesson.status === "PUBLISHED" ? "Đã xuất bản" : "Bản nháp"}
        </button>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
          <span className="rounded-xl bg-bkhn-red px-4 py-2.5 text-white">Chỉnh sửa</span>
          <span className="text-xs font-medium text-gray-500">{configuredSteps.length}/4 phần có nội dung · Các phần đều tùy chọn</span>
        </div>
        <p role="status" aria-live="polite" className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
          {w.savingField ? <><Loader2 size={14} className="animate-spin" />Đang lưu…</> : w.dirty ? <><span className="h-2 w-2 rounded-full bg-amber-500" />Có thay đổi chưa lưu</> : <><Check size={14} className="text-green-600" />{w.saveMessage ?? "Nội dung đã lưu"}</>}
        </p>
      </div>
    </header>
    <div className="grid items-start gap-5 lg:grid-cols-[230px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-5">
        <nav aria-label="Các bước soạn bài" className="grid grid-cols-2 gap-2 rounded-2xl border border-bkhn-pink bg-white p-3 shadow-bkhn-sm lg:grid-cols-1">
          {TABS.map((tab, index) => <button key={tab.key} disabled={w.mediaBusy} onClick={() => w.setActiveTab(tab.key)} aria-current={w.activeTab === tab.key ? "step" : undefined} className={`flex items-center gap-3 rounded-xl p-3 text-left transition-colors ${w.activeTab === tab.key ? "bg-bkhn-red text-white shadow-sm" : "text-gray-600 hover:bg-bkhn-pale hover:text-bkhn-red"}`}>
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black ${w.activeTab === tab.key ? "bg-white/15" : "bg-gray-50"}`}>{index + 1}</span>
            <span><span className="block text-sm font-bold">{tab.label}</span><span className={`mt-1 block text-[11px] ${w.activeTab === tab.key ? "text-white/80" : "text-gray-400"}`}>{configuredSteps.includes(index) ? descriptions[index] : "Tùy chọn · Chưa có nội dung"}</span></span>
          </button>)}
        </nav>
        <p className="px-3 pt-4 text-xs leading-relaxed text-gray-400">Chỉ thêm các phần cần cho bài này. Phần để trống được bỏ qua khi học; bản sửa được giữ đến khi lưu hoặc hủy.</p>
      </aside>
      <div className="min-w-0 space-y-5">
        <div className="flex items-center justify-between gap-3 px-1"><div><p className="text-[10px] font-bold uppercase tracking-widest text-bkhn-red">Bước {currentIndex + 1} / 4</p><h1 className="mt-1 text-xl font-black text-gray-900">{TABS[currentIndex].label}</h1></div><TABSIcon index={currentIndex} /></div>
        {w.saveError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{w.saveError} Bản sửa vẫn được giữ; cậu có thể sửa lại và lưu tiếp.</p>}
        <fieldset disabled={!!w.savingField} className="min-w-0 space-y-5 disabled:opacity-70">{children}<LessonSettings values={values} onChange={w.editField} /></fieldset>
        <div className="flex justify-between gap-3 text-xs font-bold">
          <button disabled={currentIndex === 0 || w.mediaBusy} onClick={() => w.setActiveTab(TABS[currentIndex - 1].key)} className="flex items-center gap-2 rounded-xl px-3 py-3 text-gray-600 hover:bg-white disabled:opacity-30"><ArrowLeft size={15} />Bước trước</button>
          <button disabled={currentIndex === 3 || w.mediaBusy} onClick={() => w.setActiveTab(TABS[currentIndex + 1].key)} className="flex items-center gap-2 rounded-xl px-3 py-3 text-bkhn-red hover:bg-white disabled:opacity-30">Bước tiếp theo<ArrowRight size={15} /></button>
        </div>
      </div>
    </div>
    {(w.dirty || w.savingField) && <div className="fixed inset-x-3 bottom-4 z-40 mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-bkhn-pink bg-white/95 p-3 shadow-xl backdrop-blur-md sm:px-5">
      <div><p className="text-sm font-bold text-gray-900">{w.savingField ? "Đang lưu bài học…" : "Bài học có thay đổi chưa lưu"}</p><p className="mt-0.5 text-[11px] text-gray-500">Lưu nội dung & cài đặt · Câu hỏi có nút lưu riêng</p></div>
      <div className="flex gap-2"><button disabled={!!w.savingField || w.mediaBusy} onClick={w.discardChanges} className="rounded-xl px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-50">Hủy thay đổi</button><button disabled={!!w.savingField || w.mediaBusy || !w.dirty} onClick={() => void w.saveLessonFields(w.changedFields)} className="flex items-center gap-2 rounded-xl bg-bkhn-red px-4 py-2.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50">{w.savingField ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}Lưu bài học</button></div>
    </div>}
  </div>;
}

function TABSIcon({ index }: { index: number }) {
  const Icon = TABS[index].icon;
  return <span className="rounded-2xl border border-bkhn-pink bg-white p-3 text-bkhn-red"><Icon size={22} /></span>;
}
