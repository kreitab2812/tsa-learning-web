"use client";
import LoadingState, { LoadingIndicator } from "@/components/ui/loading-state";
import { useState } from "react";
import Link from "next/link";
import { toDatetimeLocalValue, toUtcISOString } from "@/lib/datetime";
import ImageField from "@/features/admin/components/image-field";
import ContentImage from "@/features/admin/components/content-image";
import {
  Plus, Trash2, Edit3, BookOpen, Loader2, FolderTree, AlertTriangle, Library,
  Eye, EyeOff, Clock, Timer
} from "lucide-react";

import { useAdminResource } from "@/features/admin/use-admin-resource";
import Pagination from "@/features/admin/components/pagination";
import RequestError from "@/features/admin/components/request-error";

type CourseStatus = "DRAFT" | "PUBLISHED" | "SCHEDULED";

type Course = {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  badge: string | null;
  status: CourseStatus;
  publishAt: string | null;
  showCountdown: boolean;
  _count?: { stages: number };
};

// Chuyển ISO string từ API -> định dạng input datetime-local ("YYYY-MM-DDTHH:mm")
function formatDateTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// Tính trạng thái hiển thị thực tế tại thời điểm render
function getEffectiveState(course: Course): "draft" | "published" | "waiting" {
  if (course.status === "PUBLISHED") return "published";
  if (course.status === "SCHEDULED" && course.publishAt) {
    return new Date() >= new Date(course.publishAt) ? "published" : "waiting";
  }
  return "draft";
}

export default function AdminCoursesPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refresh: fetchCourses, setData } = useAdminResource<{ courses: Course[]; hasMore: boolean }>(`/api/admin/courses?page=${page}`);
  const courses = data?.courses ?? [];
  const setCourses = (courses: Course[]) => setData((previous) => ({ ...previous, courses }));

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [fTitle, setFTitle] = useState("");
  const [fDesc, setFDesc] = useState("");
  const [fThumbnail, setFThumbnail] = useState<string | null>(null);
  const [fBadge, setFBadge] = useState("");
  const [fStatus, setFStatus] = useState<CourseStatus>("DRAFT");
  const [fPublishAt, setFPublishAt] = useState("");
  const [fShowCountdown, setFShowCountdown] = useState(true);

  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string; step: 1 | 2 }>({ open: false, id: "", step: 1 });

  const openCreateModal = () => {
    setEditingCourse(null);
    setFTitle(""); setFDesc(""); setFThumbnail(null); setFBadge("");
    setFStatus("DRAFT"); setFPublishAt(""); setFShowCountdown(true);
    setIsModalOpen(true);
  };

  const openEditModal = (course: Course) => {
    setEditingCourse(course);
    setFTitle(course.title);
    setFDesc(course.description || "");
    setFThumbnail(course.thumbnailUrl);
    setFBadge(course.badge || "");
    setFStatus(course.status);
    setFPublishAt(toDatetimeLocalValue(course.publishAt));
    setFShowCountdown(course.showCountdown);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fTitle) return;
    if (fStatus === "SCHEDULED" && !fPublishAt) {
      alert("Vui lòng chọn thời điểm mở khóa học khi dùng chế độ Hẹn giờ.");
      return;
    }
    setIsSubmitting(true);

    try {
      const isEditing = !!editingCourse;
      const payload = {
        title: fTitle,
        description: fDesc,
        thumbnailUrl: fThumbnail,
        badge: fBadge || null,
        status: fStatus,
        publishAt: fStatus === "SCHEDULED" ? toUtcISOString(fPublishAt) : null,
        showCountdown: fShowCountdown,
      };

      const res = await fetch(
        isEditing ? `/api/admin/courses/${editingCourse!.id}` : "/api/admin/courses",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();

      if (data.success) {
        await fetchCourses();
        setIsModalOpen(false);
      } else {
        alert(data.message || "Có lỗi xảy ra.");
      }
    } catch {
      alert("Lỗi kết nối đến máy chủ.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bấm nhanh badge: Draft <-> Published (Scheduled phải vào modal để chọn giờ)
  const handleQuickToggleStatus = async (course: Course) => {
    if (course.status === "SCHEDULED") {
      openEditModal(course);
      return;
    }
    const newStatus: CourseStatus = course.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    try {
      const res = await fetch(`/api/admin/courses/${course.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setCourses(courses.map(c => (c.id === course.id ? { ...c, status: newStatus } : c)));
      } else {
        alert(data.message);
      }
    } catch {
      alert("Lỗi kết nối đến máy chủ.");
    }
  };

  const handleConfirmDelete = async () => {
    if (deleteModal.step === 1) {
      setDeleteModal(prev => ({ ...prev, step: 2 }));
      return;
    }
    try {
      const res = await fetch(`/api/admin/courses/${deleteModal.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setCourses(courses.filter(c => c.id !== deleteModal.id));
        setDeleteModal({ open: false, id: "", step: 1 });
      } else {
        alert(data.message || "Lỗi xóa khóa học.");
      }
    } catch {
      alert("Lỗi kết nối đến máy chủ.");
    }
  };

  return (
    <>
      <RequestError message={error} retry={() => void fetchCourses()} />
      {isLoading && data && <LoadingIndicator label="Đang cập nhật khóa học…" />}
      <div className="space-y-6 animate-fade-up max-w-6xl mx-auto pb-20">

        <div className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-bkhn-pink flex items-center gap-4">
          <div className="w-12 h-12 bg-bkhn-rose rounded-2xl flex items-center justify-center text-bkhn-red border border-bkhn-pink flex-shrink-0">
            <Library size={24} strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Quản lý Khóa học</h1>
        </div>

        <div className="flex justify-end">
          <button
            onClick={openCreateModal}
            className="bg-bkhn-red hover:bg-red-700 text-white font-bold px-6 py-3.5 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-red-500/30 flex items-center gap-2 text-sm"
          >
            <Plus size={18} strokeWidth={3} /> Thêm Khóa học mới
          </button>
        </div>

        <Pagination itemCount={courses.length} itemLabel="khóa học" page={page} hasMore={data?.hasMore ?? false} busy={isLoading} onChange={setPage} />
        {isLoading && !data ? (
          <LoadingState label="Đang tải khóa học…" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {courses.length === 0 && (
              <div className="col-span-full text-center py-10 text-gray-500 font-medium bg-white rounded-3xl border border-dashed border-bkhn-pink">
                Chưa có khóa học nào. Hãy tạo khóa học đầu tiên!
              </div>
            )}
            {courses.map(course => {
              const state = getEffectiveState(course);
              return (
                <div key={course.id} className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 hover:border-red-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group flex flex-col">

                  {/* ẢNH BÌA */}
                  <div className="relative h-36 bg-bkhn-rose border-b border-bkhn-pink overflow-hidden">
                    {course.thumbnailUrl ? (
                      <ContentImage src={course.thumbnailUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-bkhn-pink">
                        <BookOpen size={40} strokeWidth={1.5} />
                      </div>
                    )}
                    {course.badge && (
                      <span className="absolute top-3 left-3 bg-bkhn-red text-white px-3 py-1 rounded-full text-[11px] font-black shadow-md">
                        {course.badge}
                      </span>
                    )}
                    <button
                      onClick={() => handleQuickToggleStatus(course)}
                      className={`absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black shadow-sm transition-colors ${
                        state === "published" ? "bg-green-500 text-white hover:bg-green-600"
                          : state === "waiting" ? "bg-amber-500 text-white hover:bg-amber-600"
                          : "bg-white/90 text-gray-600 hover:bg-white"
                      }`}
                      title={course.status === "SCHEDULED" ? "Bấm để chỉnh lịch mở" : "Bấm để đổi trạng thái"}
                    >
                      {state === "published" ? <Eye size={12} /> : state === "waiting" ? <Timer size={12} /> : <EyeOff size={12} />}
                      {state === "published" ? "Đang hiển thị" : state === "waiting" ? "Chờ mở" : "Nháp"}
                    </button>
                  </div>

                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <h3 className="text-xl font-black text-gray-900 line-clamp-1 group-hover:text-bkhn-red transition-colors">{course.title}</h3>
                        <span className="shrink-0 bg-bkhn-pale text-bkhn-red px-3 py-1 rounded-full text-xs font-black">
                          {course._count?.stages || 0} Giai đoạn
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 font-medium leading-relaxed line-clamp-2">
                        {course.description || "Chưa có mô tả chi tiết."}
                      </p>

                      {state === "waiting" && course.publishAt && (
                        <div className="mt-3 flex items-center gap-2 text-xs font-bold text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-100">
                          <Clock size={13} />
                          Mở lúc {formatDateTime(course.publishAt)}
                          <span className="text-amber-400 font-medium">
                            · {course.showCountdown ? "hiện kèm đếm ngược" : "ẩn hoàn toàn"}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center">
                      <Link
                        href={`/dashboard/courses/${course.id}`}
                        className="flex items-center gap-1.5 text-xs font-bold text-bkhn-red hover:underline"
                      >
                        <FolderTree size={15} strokeWidth={2.5} /> Quản lý Khóa học
                      </Link>
                      <div className="flex gap-2">
                        <button onClick={() => openEditModal(course)} className="p-2 bg-gray-50 text-gray-500 hover:bg-yellow-50 hover:text-yellow-600 rounded-xl transition-colors" title="Chỉnh sửa">
                          <Edit3 size={16} strokeWidth={2.5} />
                        </button>
                        <button onClick={() => setDeleteModal({ open: true, id: course.id, step: 1 })} className="p-2 bg-gray-50 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors" title="Xóa">
                          <Trash2 size={16} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL 2 CỘT */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] w-full max-w-3xl p-8 shadow-2xl border border-bkhn-pink animate-fade-up my-8">
            <h3 className="text-2xl font-black text-gray-900 mb-6 text-center">
              {editingCourse ? "Chỉnh sửa Khóa học" : "Tạo Khóa học Mới"}
            </h3>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* CỘT TRÁI — Thông tin cơ bản */}
                <div className="space-y-5">
                  <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">
                    Thông tin cơ bản
                  </p>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Tên khóa học <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text" required autoFocus value={fTitle}
                      onChange={e => setFTitle(e.target.value)}
                      placeholder="VD: Tổng ôn TSA 2026"
                      className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-bkhn-red/10 focus:border-bkhn-red focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Mô tả ngắn</label>
                    <textarea
                      rows={3} value={fDesc}
                      onChange={e => setFDesc(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-bkhn-red/10 focus:border-bkhn-red focus:bg-white transition-all resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Huy hiệu <span className="font-normal normal-case text-gray-400">(tùy chọn)</span>
                    </label>
                    <input
                      type="text" value={fBadge}
                      onChange={e => setFBadge(e.target.value)}
                      placeholder="VD: Hot, Mới, Luyện thi 2026"
                      className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-bkhn-red/10 focus:border-bkhn-red focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Ảnh bìa</label>
                    <ImageField value={fThumbnail} onChange={setFThumbnail} preset={process.env.NEXT_PUBLIC_CLOUDINARY_COURSE_PRESET} />
                  </div>
                </div>

                {/* CỘT PHẢI — Cài đặt hiển thị */}
                <div className="space-y-5">
                  <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">
                    Cài đặt hiển thị
                  </p>

                  <div className="space-y-2">
                    {([
                      { value: "DRAFT", label: "Bản nháp", desc: "Chỉ Admin thấy, dùng khi đang xây khung", dot: "bg-gray-400" },
                      { value: "PUBLISHED", label: "Xuất bản ngay", desc: "Học viên thấy và vào học được luôn", dot: "bg-green-500" },
                      { value: "SCHEDULED", label: "Hẹn giờ mở", desc: "Tự động mở đúng thời điểm đã chọn", dot: "bg-amber-500" },
                    ] as const).map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFStatus(opt.value)}
                        className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                          fStatus === opt.value ? "border-bkhn-red bg-bkhn-rose ring-4 ring-bkhn-red/10" : "border-gray-200 bg-gray-50/50 hover:border-gray-300"
                        }`}
                      >
                        <span className="flex items-center gap-2 font-bold text-sm text-gray-900">
                          <span className={`w-2 h-2 rounded-full ${opt.dot}`} />
                          {opt.label}
                        </span>
                        <span className="block text-xs text-gray-500 mt-1 ml-4">{opt.desc}</span>
                      </button>
                    ))}
                  </div>

                  {fStatus === "SCHEDULED" && (
                    <div className="space-y-4 p-4 bg-amber-50/50 border border-amber-100 rounded-xl animate-fade-in">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                          Thời điểm mở <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="datetime-local"
                          value={fPublishAt}
                          onChange={e => setFPublishAt(e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Trước giờ mở</label>
                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={() => setFShowCountdown(true)}
                            className={`w-full text-left px-3 py-2.5 rounded-lg border text-xs transition-all ${
                              fShowCountdown ? "border-amber-500 bg-white font-bold text-gray-900" : "border-gray-200 bg-white/50 text-gray-500"
                            }`}
                          >
                            Hiện kèm đồng hồ đếm ngược
                            <span className="block text-[11px] font-normal text-gray-400 mt-0.5">Học viên thấy khóa học nhưng chưa vào được</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setFShowCountdown(false)}
                            className={`w-full text-left px-3 py-2.5 rounded-lg border text-xs transition-all ${
                              !fShowCountdown ? "border-amber-500 bg-white font-bold text-gray-900" : "border-gray-200 bg-white/50 text-gray-500"
                            }`}
                          >
                            Ẩn hoàn toàn
                            <span className="block text-[11px] font-normal text-gray-400 mt-0.5">Đúng giờ mới xuất hiện trên trang chủ</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-8 max-w-sm ml-auto">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 rounded-xl transition-colors text-sm"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-bkhn-red hover:bg-red-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg text-sm flex justify-center items-center"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : (editingCourse ? "Lưu thay đổi" : "Tạo mới")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XÓA (giữ nguyên) */}
      {deleteModal.open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-[2rem] w-full max-w-[400px] p-8 shadow-2xl border border-red-100 text-center animate-fade-up">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-5">
              <AlertTriangle size={32} strokeWidth={2.5} />
            </div>
            {deleteModal.step === 1 ? (
              <>
                <h3 className="text-xl font-black text-gray-900 mb-3">Xóa khóa học?</h3>
                <p className="text-sm text-gray-500 font-medium mb-8 leading-relaxed">
                  Bạn có chắc chắn muốn xóa khóa học này không? Toàn bộ nội dung bên trong sẽ bị xóa theo và không thể hoàn tác.
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setDeleteModal({ open: false, id: "", step: 1 })} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 rounded-xl transition-colors text-sm">Hủy</button>
                  <button onClick={handleConfirmDelete} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-md text-sm">Tiếp tục</button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-xl font-black text-red-600 mb-3">Xác nhận xóa vĩnh viễn?</h3>
                <p className="text-sm text-gray-500 font-medium mb-8 leading-relaxed">Hành động này sẽ xóa sạch dữ liệu. Bạn không thể khôi phục lại.</p>
                <div className="flex gap-3">
                  <button onClick={() => setDeleteModal({ open: false, id: "", step: 1 })} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 rounded-xl transition-colors text-sm">Hủy bỏ</button>
                  <button onClick={handleConfirmDelete} className="flex-1 bg-red-600 hover:bg-red-800 text-white font-bold py-3.5 rounded-xl transition-all shadow-md text-sm">Xóa</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
