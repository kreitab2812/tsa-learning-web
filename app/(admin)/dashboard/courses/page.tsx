"use client";
import { useState } from "react";
import { Plus, Video, Trash2, Edit3, BookOpen, Layers } from "lucide-react";

export default function AdminCoursesPage() {
  // Mock dữ liệu khóa học ban đầu
  const [courses, setCourses] = useState([
    { 
      id: "1", 
      title: "TSA: Tư duy Toán học", 
      description: "Chuyên đề luyện thi phần Toán tư duy định lượng.",
      lessonsCount: 12 
    },
    { 
      id: "2", 
      title: "TSA: Đọc hiểu & Khoa học", 
      description: "Phân tích cấu trúc văn bản và tư duy khoa học tự nhiên - xã hội.",
      lessonsCount: 8 
    },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const handleAddCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    const newCourse = {
      id: Date.now().toString(),
      title: newTitle,
      description: newDesc,
      lessonsCount: 0
    };

    setCourses([...courses, newCourse]);
    setNewTitle("");
    setNewDesc("");
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("Cậu có chắc chắn muốn xóa khóa học này không?")) {
      setCourses(courses.filter(c => c.id !== id));
    }
  };

  return (
    <div className="space-y-6 animate-fade-up max-w-6xl mx-auto">
      
      {/* Tiêu đề & Nút thêm */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl shadow-bkhn-sm border border-bkhn-pink">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Quản lý Khóa học & Video</h1>
          <p className="text-gray-500 text-sm font-medium mt-1">Thêm mới các chuyên đề ôn thi và liên kết video bài giảng YouTube.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-bkhn-red hover:bg-red-700 text-white font-bold px-5 py-3 rounded-2xl transition-all shadow-bkhn-md hover:shadow-bkhn-glow flex items-center gap-2 active:scale-95 text-sm"
        >
          <Plus size={18} strokeWidth={3} /> Thêm khóa học mới
        </button>
      </div>

      {/* Lưới hiển thị danh sách khóa học */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {courses.map(course => (
          <div key={course.id} className="bg-white p-6 rounded-3xl shadow-bkhn-sm border border-bkhn-pink flex flex-col justify-between hover:shadow-bkhn-lg transition-all relative group">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-bkhn-rose rounded-2xl flex items-center justify-center text-bkhn-red border border-bkhn-pink">
                  <BookOpen size={24} strokeWidth={2.5} />
                </div>
                <span className="bg-bkhn-pale text-bkhn-red px-3 py-1 rounded-full text-xs font-black">
                  {course.lessonsCount} Bài học
                </span>
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2">{course.title}</h3>
              <p className="text-sm text-gray-500 font-medium leading-relaxed">{course.description || "Chưa có mô tả chi tiết."}</p>
            </div>

            <div className="mt-6 pt-4 border-t border-bkhn-pink flex justify-end gap-2">
              <button className="p-2.5 bg-gray-50 text-gray-600 hover:bg-bkhn-pale hover:text-bkhn-red rounded-xl transition-colors" title="Chỉnh sửa">
                <Edit3 size={16} strokeWidth={2.5} />
              </button>
              <button onClick={() => handleDelete(course.id)} className="p-2.5 bg-gray-50 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors" title="Xóa">
                <Trash2 size={16} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Thêm Khóa học */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-bkhn-pink animate-fade-up">
            <h3 className="text-xl font-black text-gray-900 mb-4">Tạo Khóa học Mới</h3>
            
            <form onSubmit={handleAddCourse} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Tên khóa học</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="VD: TSA: Tư duy Khoa học..."
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
                  className="flex-1 bg-bkhn-red hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-all shadow-sm text-sm"
                >
                  Tạo mới
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
