"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { toDatetimeLocalValue } from "@/lib/datetime";
import {
  Plus, Trash2, Edit3, ChevronRight, ArrowLeft,
  FolderOpen, BookOpen, ArrowRight,
  Lock, LockOpen
} from "lucide-react";

import LoadingState, { LoadingIndicator } from "@/components/ui/loading-state";
import OrderSaveBar from "./order-save-bar";
import ChapterNode from "./chapter-node";
import { useCourseEditor } from "../hooks/use-course-editor";
import CourseModals from "./course-modals";
import RequestError from "@/features/admin/components/request-error";
import SubjectViewNav from "./subject-view-nav";
import { allChapterIds, matchesChapter } from "../chapter-filter";
export default function CourseDetailPage() {
  const editor = useCourseEditor();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const focusedChapter = useSearchParams().get("chapter");
  const { order, isSubmitting, course, isLoading, activeStage, setActiveStage, activeSubject, setActiveSubject, fetchCourse, refreshSubject, error, branchLoading, expandedChapters, setStageModal, setSubjectModal, setChapterModal, setFormTitle, setFormDesc, setStageTimeframe, setStageAccessMode, setStageUnlockAt, setSubjectTeacherName, toggleExpand, handleReorderChapter, handleUpdateChapter, handleAddChildClick, handleDeleteChapterClick, handleAddLessonClick, handleEditLessonClick, handleDeleteLessonClick, handleReorderLesson, handleQuickToggleLessonStatus, initiateDelete } = editor;
  if (isLoading) return <LoadingState label="Đang tải khóa học…" />;
  if (!course) return <><RequestError message={error} retry={() => void fetchCourse()} /><div className="text-center py-20 text-gray-500 font-medium">Không tìm thấy khóa học.</div></>;

  return (
    <>
      <RequestError message={error} retry={() => { if (order.confirmLeave()) void (activeSubject ? refreshSubject() : fetchCourse()); }} />
      <div className="space-y-6 animate-fade-up max-w-5xl mx-auto pb-48">

        {/* BREADCRUMB */}
        <div className="flex items-center gap-2 text-sm font-bold text-gray-500 overflow-x-auto whitespace-nowrap px-1">
          <Link href="/dashboard/courses" className="hover:text-bkhn-red transition-colors flex items-center gap-1">
            <ArrowLeft size={16} /> Quản lý Khóa học
          </Link>
          <ChevronRight size={14} className="text-gray-400" />
          <button onClick={() => { setActiveStage(null); }} className={`transition-colors ${!activeStage ? 'text-gray-900 font-black' : 'hover:text-bkhn-red'}`}>
            {course.title}
          </button>
          {activeStage && (
            <>
              <ChevronRight size={14} className="text-gray-400" />
              <button onClick={() => setActiveSubject(null)} className={`transition-colors ${!activeSubject ? 'text-gray-900 font-black' : 'hover:text-bkhn-red'}`}>
                {activeStage.title}
              </button>
            </>
          )}
          {activeSubject && (
            <>
              <ChevronRight size={14} className="text-gray-400" />
              <span className="text-gray-900 font-black">{activeSubject.title}</span>
            </>
          )}
        </div>

        {/* TIÊU ĐỀ */}
        <div className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-bkhn-pink flex items-start sm:items-center gap-4">
          <div className="w-12 h-12 bg-bkhn-rose rounded-2xl flex items-center justify-center text-bkhn-red border border-bkhn-pink flex-shrink-0">
            <BookOpen size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              {!activeStage ? course.title : !activeSubject ? activeStage.title : activeSubject.title}
            </h1>
            <p className="text-sm text-gray-500 font-medium mt-1.5 leading-relaxed">
              {!activeStage ? course.description || "Chưa có mô tả chi tiết."
                : !activeSubject ? activeStage.description || "Chưa có mô tả chi tiết."
                : activeSubject.description || "Chưa có mô tả chi tiết."}
            </p>
          </div>
        </div>

        {activeSubject && <SubjectViewNav courseId={course.id} subjectId={activeSubject.id} chapterId={focusedChapter} active="edit" showAnalytics={false} />}
        {branchLoading && <LoadingIndicator label="Đang tải cụm kiến thức…" />}
        {activeSubject && branchLoading && !activeSubject.chapters.length && <LoadingState compact label="Đang chuẩn bị danh sách bài học…" />}
        {/* NÚT THÊM MỚI TƯƠNG ỨNG TỪNG TẦNG */}
        <div className="flex justify-end gap-3 flex-wrap">
          {!activeStage ? (
            <button onClick={() => { setStageModal({ open: true, editing: null }); setFormTitle(""); setFormDesc(""); setStageTimeframe(""); setStageAccessMode("FREE"); setStageUnlockAt(""); }} className="bg-bkhn-red hover:bg-red-700 text-white font-bold px-6 py-3.5 rounded-2xl transition-all duration-150 hover:-translate-y-1 hover:shadow-lg hover:shadow-bkhn-sm flex items-center gap-2 text-sm">
              <Plus size={18} strokeWidth={3} /> Thêm Giai đoạn mới
            </button>
          ) : !activeSubject ? (
            <button onClick={() => { setSubjectModal({ open: true, stageId: activeStage.id, editing: null }); setFormTitle(""); setFormDesc(""); setSubjectTeacherName(""); }} className="bg-bkhn-red hover:bg-red-700 text-white font-bold px-6 py-3.5 rounded-2xl transition-all duration-150 hover:-translate-y-1 hover:shadow-lg hover:shadow-bkhn-sm flex items-center gap-2 text-sm">
              <Plus size={18} strokeWidth={3} /> Thêm Môn học mới
            </button>
          ) : (
            <>
              <button disabled={order.dirty || order.saving || isSubmitting || branchLoading} onClick={() => { setChapterModal({ open: true, parentId: null, editing: null }); setFormTitle(""); }} className="bg-bkhn-red hover:bg-red-700 text-white font-bold px-6 py-3.5 rounded-2xl transition-all duration-150 hover:-translate-y-1 hover:shadow-lg hover:shadow-bkhn-sm flex items-center gap-2 text-sm">
                <Plus size={18} strokeWidth={3} /> Thêm Cụm kiến thức
              </button>
            </>
          )}
        </div>

        {/* TẦNG GIAI ĐOẠN */}
        {!activeStage && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {course.stages.length === 0 && <div className="col-span-full text-center py-12 text-gray-500 border border-dashed border-gray-300 rounded-3xl font-medium">Chưa có giai đoạn nào. Hãy thêm giai đoạn đầu tiên!</div>}
            {course.stages.map(stage => (
              <div key={stage.id} role="button" tabIndex={0} aria-label={`Mở giai đoạn ${stage.title}`} onKeyDown={e => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setActiveStage(stage); } }} onClick={() => setActiveStage(stage)} className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-gray-100 hover:border-emerald-200 hover:shadow-md cursor-pointer transition-all duration-150 relative overflow-hidden group flex flex-col justify-between min-h-[220px]">
                <div className="absolute top-0 left-0 w-full h-1.5 opacity-90 bg-emerald-600" />
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <h2 className="text-xl font-black text-gray-900 group-hover:text-emerald-600 transition-colors flex items-center gap-2">
                      <FolderOpen size={22} className="text-emerald-500" /> {stage.title}
                    </h2>
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <button aria-label={`Sửa ${stage.title}`} onClick={() => {
                        setStageModal({ open: true, editing: stage });
                        setFormTitle(stage.title); setFormDesc(stage.description || "");
                        setStageTimeframe(stage.timeframe || "");
                        setStageAccessMode(stage.accessMode);
                        setStageUnlockAt(toDatetimeLocalValue(stage.unlockAt));
                      }} className="p-2 text-gray-400 hover:bg-yellow-50 hover:text-yellow-600 rounded-xl transition-colors"><Edit3 size={16} /></button>
                      <button aria-label={`Xóa ${stage.title}`} onClick={() => initiateDelete(stage.id, 'stage')} className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 font-medium leading-relaxed line-clamp-2 mb-3">{stage.description || "Chưa có mô tả chi tiết."}</p>

                  <div className="flex items-center gap-3 mb-3 text-[11px] font-bold text-gray-500">
                    {stage.timeframe && <span>📅 {stage.timeframe}</span>}
                    <span className="flex items-center gap-1">
                      {stage.accessMode === "FREE" ? <LockOpen size={12} className="text-gray-400" /> : <Lock size={12} className="text-amber-500" />}
                      {stage.accessMode === "FREE" ? "Mở tự do" : stage.accessMode === "TIME_LOCKED" ? "Khóa theo thời gian" : "Khóa tuần tự"}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {stage.subjects.map(sub => (
                      <span key={sub.id} className="text-[11px] font-bold bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-md border border-emerald-100">{sub.title}</span>
                    ))}
                    {stage.subjects.length === 0 && <span className="text-[11px] text-gray-400 italic">Chưa có môn học</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TẦNG MÔN HỌC */}
        {activeStage && !activeSubject && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            {activeStage.subjects.length === 0 && <div className="col-span-full text-center py-10 text-gray-500 border border-dashed border-gray-300 rounded-3xl">Chưa có môn học nào trong giai đoạn này.</div>}
            {activeStage.subjects.map(subject => (
              <div key={subject.id} role="button" tabIndex={0} aria-label={`Mở môn ${subject.title}`} onKeyDown={e => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setActiveSubject(subject); } }} onClick={() => setActiveSubject(subject)} className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-gray-100 hover:border-blue-300 hover:shadow-md cursor-pointer transition-all duration-150 flex flex-col justify-between group h-full min-h-[160px]">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-gray-800 group-hover:text-blue-600 transition-colors flex items-center gap-2">
                      <BookOpen className="text-blue-500" size={18} /> {subject.title}
                    </h3>
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <button aria-label={`Sửa ${subject.title}`} onClick={() => {
                        setSubjectModal({ open: true, stageId: null, editing: subject });
                        setFormTitle(subject.title); setFormDesc(subject.description || "");
                        setSubjectTeacherName(subject.teacherName || "");
                      }} className="p-1.5 text-gray-400 hover:bg-yellow-50 hover:text-yellow-600 rounded-lg transition-colors"><Edit3 size={15} /></button>
                      <button aria-label={`Xóa ${subject.title}`} onClick={() => initiateDelete(subject.id, 'subject')} className="p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"><Trash2 size={15} /></button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mt-2">{subject.description || "Môn học cơ bản"}</p>
                  {subject.teacherName && (
                    <div className="flex items-center gap-2 mt-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[11px] font-black shrink-0">
                        {subject.teacherName.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs font-bold text-gray-600 truncate">{subject.teacherName}</span>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex items-center justify-between text-[11px] font-bold text-gray-400 pt-3 border-t border-gray-50">
                  <span>{(subject._count?.chapters ?? subject.chapters.length)} Cụm kiến thức</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TẦNG CỤM KIẾN THỨC — ACCORDION ĐỆ QUY */}
        {activeSubject && (!branchLoading || activeSubject.chapters.length > 0) && (
          <div className="space-y-2 animate-fade-in">
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200 bg-white p-3">
              <input aria-label="Tìm cụm hoặc bài học" placeholder="Tìm cụm, mô tả hoặc bài học…" disabled={editor.contentChanges.dirty} value={search} onChange={(event) => setSearch(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm disabled:opacity-50" />
              <select aria-label="Lọc trạng thái cụm" disabled={editor.contentChanges.dirty} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm disabled:opacity-50"><option value="all">Mọi trạng thái</option><option value="DRAFT">Bản nháp</option><option value="PUBLISHED">Đã xuất bản</option></select>
              <button disabled={editor.contentChanges.dirty} onClick={() => editor.expandChapters(allChapterIds(activeSubject.chapters))} className="rounded-xl px-3 py-2 text-xs font-bold text-bkhn-red hover:bg-bkhn-rose disabled:opacity-50">Mở tất cả</button>
              <button disabled={editor.contentChanges.dirty || Boolean(search.trim()) || statusFilter !== "all"} onClick={() => editor.expandChapters([])} className="rounded-xl px-3 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 disabled:opacity-50">Thu gọn</button>
            </div>
            {editor.contentChanges.dirty && <p role="status" className="rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-800">Có nội dung cụm chưa lưu. Lưu hoặc hủy ngay trên card trước khi lọc hay đổi thứ tự.</p>}
            {activeSubject.chapters.length > 0 && !activeSubject.chapters.some((chapter) => matchesChapter(chapter, search, statusFilter)) && <p className="p-8 text-center text-sm text-gray-500">Không tìm thấy cụm phù hợp.</p>}
            {activeSubject.chapters.length === 0 && (
              <div className="text-center py-12 text-gray-500 border border-dashed border-gray-300 rounded-3xl font-medium">
                Chưa có cụm kiến thức nào. Hãy thêm cụm đầu tiên!
              </div>
            )}
            {activeSubject.chapters.map((chapter, idx) => (
              <ChapterNode
                key={chapter.id}
                chapter={chapter}
                search={search}
                statusFilter={statusFilter}
                onDirtyChange={editor.contentChanges.setChapterDirty}
                hasUnsavedContent={editor.contentChanges.dirty}
                onMoveTo={order.moveTo}
                reorderDisabled={order.saving || isSubmitting || editor.contentChanges.dirty || Boolean(search.trim()) || statusFilter !== "all"}
                contentDisabled={order.dirty || order.saving || isSubmitting}
                depth={0}
                siblings={activeSubject.chapters}
                index={idx}
                expandedChapters={expandedChapters}
                onToggleExpand={toggleExpand}
                onAddChild={handleAddChildClick}
                onAddLesson={handleAddLessonClick}
                  onUpdateChapter={handleUpdateChapter}
                onDeleteChapter={handleDeleteChapterClick}
                onReorderChapter={handleReorderChapter}
                onEditLesson={handleEditLessonClick}
                onDeleteLesson={handleDeleteLessonClick}
                onReorderLesson={handleReorderLesson}
                onToggleLessonStatus={handleQuickToggleLessonStatus}
              />
            ))}
          </div>
        )}
      </div>

      <CourseModals {...editor} />
      <OrderSaveBar count={order.changedGroups} saving={order.saving} error={order.error} onCancel={order.discard} onSave={() => void order.save()} />
    </>
  );
}
