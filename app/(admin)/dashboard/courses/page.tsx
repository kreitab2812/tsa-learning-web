"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Trash2, Edit3, BookOpen, Loader2, FolderTree, AlertTriangle, Library } from "lucide-react";

type Course = {
  id: string;
  title: string;
  description: string | null;
  stages?: { id: string }[];
};

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // State Modal Nhập liệu
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State Modal Xóa (2 Bước)
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string; step: 1 | 2 }>({ open: false, id: "", step: 1 });

  const fetchCourses = async () => {
    try {
      const res = await fetch("/api/admin/courses");
      const data = await res.json();
      if (data.success) setCourses(data.courses);
    } catch (error) {
      console.error("Lỗi khi tải khóa học:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const openCreateModal = () => {
    setEditingCourse(null);
    setNewTitle("");
    setNewDesc("");
    setIsModalOpen(true);
  };

  const openEditModal = (course: Course) => {
    setEditingCourse(course);
    setNewTitle(course.title);
    setNewDesc(course.description || "");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;
    setIsSubmitting(true);

    try {
      const isEditing = !!editingCourse;
      const res = await fetch(
        isEditing ? `/api/admin/courses/${editingCourse!.id}` : "/api/admin/courses",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newTitle, description: newDesc }),
        }
      );
      const data = await res.json();

      if (data.success) {
        if (isEditing) {
          setCourses(courses.map(c => (c.id === data.course.id ? { ...c, ...data.course } : c)));
        } else {
          setCourses([data.course, ...courses]);
        }
        setIsModalOpen(false);
      } else {
        alert(data.message || "Có lỗi xảy ra.");
      }
    } catch (error) {
      alert("Lỗi kết nối đến máy chủ.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Logic Xóa 2 Bước
  const initiateDelete = (id: string) => {
    setDeleteModal({ open: true, id, step: 1 });
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
    } catch (error) {
      alert("Lỗi kết nối đến máy chủ.");
    }
  };

  return (
    <>
      <div className="space-y-6 animate-fade-up max-w-6xl mx-auto pb-20">

        {/* Header Khóa học */}
        <div className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-bkhn-pink flex items-center gap-4">
          <div className="w-12 h-12 bg-bkhn-rose rounded-2xl flex items-center justify-center text-bkhn-red border border-bkhn-pink flex-shrink-0">
            <Library size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Quản lý Khóa học</h1>
          </div>
        </div>

        {/* Nút Thêm mới (Đã thêm hiệu ứng hover và đổi Tên) */}
        <div className="flex justify-end">
          <button
            onClick={openCreateModal}
            className="bg-bkhn-red hover:bg-red-700 text-white font-bold px-6 py-3.5 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-red-500/30 flex items-center gap-2 text-sm"
          >
            <Plus size={18} strokeWidth={3} /> Thêm Khóa học mới
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="animate-spin text-bkhn-red" size={40} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {courses.length === 0 && (
              <div className="col-span-full text-center py-10 text-gray-500 font-medium bg-white rounded-3xl border border-dashed border-bkhn-pink">
                Chưa có khóa học nào. Hãy tạo khóa học đầu tiên!
              </div>
            )}
            {courses.map(course => (
              <div key={course.id} className="bg-white p-7 rounded-[1.5rem] shadow-sm border border-gray-100 hover:border-red-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group flex flex-col justify-between min-h-[220px]">
                
                {/* Vạch màu ngang ở trên cùng (Đồng bộ UI Giai đoạn) */}
                <div className="absolute top-0 left-0 w-full h-1.5 opacity-90 transition-colors bg-bkhn-red" />

                <div>
                  <div className="flex justify-between items-start mb-5">
                    <div className="w-12 h-12 bg-bkhn-rose rounded-2xl flex items-center justify-center text-bkhn-red border border-bkhn-pink group-hover:scale-105 transition-transform">
                      <BookOpen size={24} strokeWidth={2.5} />
                    </div>
                    <span className="bg-bkhn-pale text-bkhn-red px-3 py-1 rounded-full text-xs font-black">
                      {course.stages?.length || 0} Giai đoạn
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-gray-900 mb-2 line-clamp-1 group-hover:text-bkhn-red transition-colors">{course.title}</h3>
                  <p className="text-sm text-gray-500 font-medium leading-relaxed line-clamp-3">
                    {course.description || "Chưa có mô tả chi tiết."}
                  </p>
                  
                  <div className="mt-5">
                    <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">
                      <span>Tiến độ xây dựng</span>
                      <span className="text-bkhn-red">0%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-bkhn-red h-1.5 rounded-full w-0 transition-all duration-500"></div>
                    </div>
                  </div>
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
                    <button onClick={() => initiateDelete(course.id)} className="p-2 bg-gray-50 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors" title="Xóa">
                      <Trash2 size={16} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- MODAL TẠO/SỬA KHÓA HỌC --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-[420px] p-8 shadow-2xl border border-bkhn-pink animate-fade-up">
            <h3 className="text-2xl font-black text-gray-900 mb-6 text-center">
              {editingCourse ? "Chỉnh sửa" : "Thêm mới"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Tên <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full px-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-4 focus:ring-bkhn-red/10 focus:border-bkhn-red focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Mô tả</label>
                <textarea
                  rows={4}
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  className="w-full px-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-4 focus:ring-bkhn-red/10 focus:border-bkhn-red focus:bg-white transition-all resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
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
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : (editingCourse ? "Lưu" : "Thêm mới")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL XÁC NHẬN XÓA (2 BƯỚC) --- */}
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
                  <button
                    onClick={() => setDeleteModal({ open: false, id: "", step: 1 })}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 rounded-xl transition-colors text-sm"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-md text-sm"
                  >
                    Tiếp tục
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-xl font-black text-red-600 mb-3">Xác nhận xóa vĩnh viễn?</h3>
                <p className="text-sm text-gray-500 font-medium mb-8 leading-relaxed">
                  Hành động này sẽ xóa sạch dữ liệu. Bạn không thể khôi phục lại.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteModal({ open: false, id: "", step: 1 })}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 rounded-xl transition-colors text-sm"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    className="flex-1 bg-red-600 hover:bg-red-800 text-white font-bold py-3.5 rounded-xl transition-all shadow-md text-sm"
                  >
                    Xóa
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
