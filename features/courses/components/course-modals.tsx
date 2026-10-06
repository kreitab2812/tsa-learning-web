"use client";
import { Loader2, AlertTriangle } from "lucide-react";
import type { useCourseEditor } from "../hooks/use-course-editor";
import QuickLessonModal from "./quick-lesson-modal";

export default function CourseModals(w: ReturnType<typeof useCourseEditor>) {
  const { stageModal, setStageModal, subjectModal, setSubjectModal, chapterModal, setChapterModal, lessonModal, deleteModal, setDeleteModal, formTitle, setFormTitle, formDesc, setFormDesc, stageTimeframe, setStageTimeframe, stageAccessMode, setStageAccessMode, stageUnlockAt, setStageUnlockAt, subjectTeacherName, setSubjectTeacherName, isSubmitting, handleStageSubmit, handleSubjectSubmit, handleChapterSubmit, handleConfirmDelete } = w;
  return <>
      {/* Modal Giai đoạn */}
      {stageModal.open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-start sm:items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] max-w-lg w-full p-8 shadow-2xl animate-fade-in my-8">
            <h3 className="text-2xl font-black mb-6 text-center text-gray-900">{stageModal.editing ? "Chỉnh sửa" : "Thêm mới"}</h3>
            <form onSubmit={handleStageSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Tên <span className="text-red-500">*</span></label>
                <input type="text" required autoFocus value={formTitle} onChange={e => setFormTitle(e.target.value)} className="w-full px-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Mô tả</label>
                <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} className="w-full px-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-medium resize-none focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white transition-all" rows={3} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Thời gian dự kiến <span className="font-normal normal-case text-gray-400">(hiển thị cho học viên tham khảo)</span>
                </label>
                <input type="text" value={stageTimeframe} onChange={e => setStageTimeframe(e.target.value)} placeholder="VD: Tháng 6 - Tháng 8/2026" className="w-full px-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Chế độ truy cập</label>
                <div className="space-y-2">
                  {([
                    { value: "FREE", label: "Mở tự do", desc: "Vào Khóa học là học được ngay", icon: "🔓" },
                    { value: "TIME_LOCKED", label: "Khóa theo thời gian", desc: "Đúng ngày chọn mới mở", icon: "🔒" },
                    { value: "SEQUENTIAL", label: "Khóa tuần tự", desc: "Phải hoàn thành Giai đoạn trước mới mở", icon: "🔒" },
                  ] as const).map(opt => (
                    <button key={opt.value} type="button" onClick={() => setStageAccessMode(opt.value)} className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${stageAccessMode === opt.value ? "border-emerald-500 bg-emerald-50 ring-4 ring-emerald-500/10" : "border-gray-200 bg-gray-50/50 hover:border-gray-300"}`}>
                      <span className="font-bold text-sm text-gray-900">{opt.icon} {opt.label}</span>
                      <span className="block text-xs text-gray-500 mt-1 ml-5">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              {stageAccessMode === "TIME_LOCKED" && (
                <div className="animate-fade-in">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Ngày mở <span className="text-red-500">*</span></label>
                  <input type="datetime-local" value={stageUnlockAt} onChange={e => setStageUnlockAt(e.target.value)} className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all" />
                </div>
              )}
              {stageAccessMode === "SEQUENTIAL" && (
                <p className="text-xs text-gray-400 italic px-1">Logic kiểm tra học viên đã hoàn thành Giai đoạn trước sẽ được lập trình ở Sprint 2. Ở đây chỉ lưu lựa chọn này.</p>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStageModal({ open: false, editing: null })} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 rounded-xl text-sm transition-colors">Hủy</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl text-sm flex justify-center items-center shadow-md transition-all">{isSubmitting ? <Loader2 className="animate-spin" size={18} /> : "Lưu"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Môn học */}
      {subjectModal.open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-start sm:items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] max-w-[420px] w-full p-8 shadow-2xl animate-fade-in my-8">
            <h3 className="text-2xl font-black mb-6 text-center text-gray-900">{subjectModal.editing ? "Chỉnh sửa" : "Thêm mới"}</h3>
            <form onSubmit={handleSubjectSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Tên <span className="text-red-500">*</span></label>
                <input type="text" required autoFocus value={formTitle} onChange={e => setFormTitle(e.target.value)} className="w-full px-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Mô tả</label>
                <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} className="w-full px-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-medium resize-none focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all" rows={3} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Giáo viên phụ trách <span className="font-normal normal-case text-gray-400">(tùy chọn)</span></label>
                <input type="text" value={subjectTeacherName} onChange={e => setSubjectTeacherName(e.target.value)} placeholder="VD: Thầy Nguyễn Thanh Tùng" className="w-full px-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setSubjectModal({ open: false, stageId: null, editing: null })} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 rounded-xl text-sm transition-colors">Hủy</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl text-sm flex justify-center items-center shadow-md transition-all">{isSubmitting ? <Loader2 className="animate-spin" size={18} /> : "Lưu"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cụm kiến thức */}
      {chapterModal.open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-start sm:items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] max-w-md w-full p-8 shadow-2xl animate-fade-in my-8">
            <h3 className="text-2xl font-black mb-6 text-center text-gray-900">{chapterModal.editing ? "Chỉnh sửa" : chapterModal.parentId ? "Thêm Cụm con" : "Thêm mới"}</h3>
            <form onSubmit={handleChapterSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Tên cụm <span className="text-red-500">*</span></label>
                <input type="text" required autoFocus value={formTitle} onChange={e => setFormTitle(e.target.value)} className="w-full px-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-yellow-500/10 focus:border-yellow-500 focus:bg-white transition-all" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setChapterModal({ open: false, parentId: null, editing: null })} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 rounded-xl text-sm transition-colors">Hủy</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3.5 rounded-xl text-sm shadow-md transition-all">{isSubmitting ? <Loader2 className="animate-spin" size={18} /> : "Lưu"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {lessonModal.open && <QuickLessonModal w={w} />}

      {/* Modal Xóa 2 bước */}
      {deleteModal.open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-[2rem] w-full max-w-[400px] p-8 shadow-2xl border border-red-100 text-center animate-fade-up">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-5">
              <AlertTriangle size={32} strokeWidth={2.5} />
            </div>
            {deleteModal.step === 1 ? (
              <>
                <h3 className="text-xl font-black text-gray-900 mb-3">
                  {deleteModal.type === 'stage' ? 'Xóa Giai đoạn?'
                    : deleteModal.type === 'subject' ? 'Xóa Môn học?'
                      : deleteModal.type === 'chapter' ? 'Xóa Cụm kiến thức?'
                        : 'Xóa Bài học?'}
                </h3>
                <p className="text-sm text-gray-500 font-medium mb-8 leading-relaxed">
                  Bạn có chắc chắn muốn xóa {deleteModal.type === 'stage' ? 'giai đoạn' : deleteModal.type === 'subject' ? 'môn học' : deleteModal.type === 'chapter' ? 'cụm kiến thức (và mọi cụm con bên trong)' : 'bài học'} này không? Toàn bộ nội dung bên trong sẽ bị xóa theo và không thể hoàn tác.
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setDeleteModal({ open: false, id: "", type: "", step: 1 })} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 rounded-xl transition-colors text-sm">Hủy</button>
                  <button onClick={handleConfirmDelete} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-md text-sm">Tiếp tục</button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-xl font-black text-red-600 mb-3">Xác nhận xóa vĩnh viễn?</h3>
                <p className="text-sm text-gray-500 font-medium mb-8 leading-relaxed">Hành động này sẽ xóa sạch dữ liệu. Bạn không thể khôi phục lại.</p>
                <div className="flex gap-3">
                  <button onClick={() => setDeleteModal({ open: false, id: "", type: "", step: 1 })} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 rounded-xl transition-colors text-sm">Hủy bỏ</button>
                  <button onClick={handleConfirmDelete} className="flex-1 bg-red-600 hover:bg-red-800 text-white font-bold py-3.5 rounded-xl transition-all shadow-md text-sm">Xóa</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
  </>;
}
