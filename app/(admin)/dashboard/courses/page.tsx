"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Trash2, Edit3, BookOpen, Loader2, FolderTree } from "lucide-react";

type Course = {
  id: string;
  title: string;
  description: string | null;
  chapters?: { id: string }[];
};

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleDelete = async (id: string) => {
    if (!confirm("Cậu có chắc chắn muốn xóa khóa học này không? Toàn bộ Chương và Bài học bên trong sẽ bị xóa theo.")) return;

    try {
      const res = await fetch(`/api/admin/courses/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setCourses(courses.filter(c => c.id !== id));
      } else {
        alert(data.message || "Lỗi xóa khóa học.");
      }
    } catch (error) {
      alert("Lỗi kết nối đến máy chủ.");
    }
  };

  return (
    <>
      <div className="space-y-6 animate-fade-up max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-[1.5rem] shadow-bkhn-sm border border-bkhn-pink">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Quản lý Khóa học</h1>
            <p className="text-gray-500 text-sm font-medium mt-1">Quản lý các chuyên đề ôn thi và lộ trình học tập.</p>
          </div>
          <button
            onClick={openCreateModal}
            className="bg-bkhn-red hover:bg-red-700 text-white font-bold px-5 py-3 rounded-2xl transition-all shadow-bkhn-md hover:shadow-bkhn-glow flex items-center gap-2 active:scale-95 text-sm"
          >
            <Plus size={18} strokeWidth={3} /> Thêm khóa học mới
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
              <div key={course.id} className="bg-white p-6 rounded-[1.5rem] shadow-bkhn-sm border border-bkhn-pink flex flex-col justify-between hover:shadow-bkhn-lg transition-all relative group">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-bkhn-rose rounded-2xl flex items-center justify-center text-bkhn-red border border-bkhn-pink">
                      <BookOpen size={24} strokeWidth={2.5} />
                    </div>
                    <span className="bg-bkhn-pale text-bkhn-red px-3 py-1 rounded-full text-xs font-black">
                      {course.chapters?.length || 0} Chương
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-gray-900 mb-2 line-clamp-1">{course.title}</h3>
                  <p className="text-sm text-gray-500 font-medium leading-relaxed line-clamp-2">
                    {course.description || "Chưa có mô tả chi tiết."}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-bkhn-pink flex justify-between items-center">
                  <Link
                    href={`/dashboard/courses/${course.id}`}
                    className="flex items-center gap-1.5 text-xs font-bold text-bkhn-red hover:underline"
                  >
                    <FolderTree size={14} strokeWidth={2.5} /> Quản lý Chương & Bài học
                  </Link>
                  <div className="flex gap-2">
                    <button onClick={() => openEditModal(course)} className="p-2.5 bg-gray-50 text-gray-600 hover:bg-bkhn-pale hover:text-bkhn-red rounded-xl transition-colors" title="Chỉnh sửa">
                      <Edit3 size={16} strokeWidth={2.5} />
                    </button>
                    <button onClick={() => handleDelete(course.id)} className="p-2.5 bg-gray-50 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors" title="Xóa">
                      <Trash2 size={16} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal được đưa ra ngoài khối div có animate-fade-up */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-start sm:items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-[2rem] max-w-md w-full p-8 shadow-2xl border border-bkhn-pink animate-fade-up my-8">
            <h3 className="text-xl font-black text-gray-900 mb-4">
              {editingCourse ? "Chỉnh sửa Khóa học" : "Tạo Khóa học Mới"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Tên khóa học</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="VD: Tổng ôn TSA - Phần Tư duy Toán học"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-bkhn-red focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Mô tả ngắn</label>
                <textarea
                  rows={3}
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="Nhập mô tả tổng quan về khóa học..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-bkhn-red focus:bg-white transition-all resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition-colors text-sm"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-bkhn-red hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-all shadow-sm text-sm flex justify-center items-center"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : editingCourse ? "Lưu thay đổi" : "Tạo mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
