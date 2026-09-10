"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Plus, Trash2, Edit3, ChevronDown, ChevronRight,
  Loader2, FileText, Video, ArrowLeft, ListChecks
} from "lucide-react";

type Lesson = {
  id: string;
  title: string;
  order: number;
  videoUrl: string | null;
  documentUrl: string | null;
  questions?: { id: string }[];
};

type Chapter = {
  id: string;
  title: string;
  order: number;
  lessons: Lesson[];
};

type Course = {
  id: string;
  title: string;
  chapters: Chapter[];
};

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = params.id as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [openChapters, setOpenChapters] = useState<Set<string>>(new Set());

  // Modal Chapter
  const [chapterModal, setChapterModal] = useState<{ open: boolean; editing: Chapter | null }>({ open: false, editing: null });
  const [chapterTitle, setChapterTitle] = useState("");

  // Modal Lesson
  const [lessonModal, setLessonModal] = useState<{ open: boolean; chapterId: string | null; editing: Lesson | null }>({ open: false, chapterId: null, editing: null });
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonVideoUrl, setLessonVideoUrl] = useState("");
  const [lessonDocUrl, setLessonDocUrl] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCourse = async () => {
    try {
      const res = await fetch(`/api/admin/courses/${courseId}`);
      const data = await res.json();
      if (data.success) setCourse(data.course);
    } catch (error) {
      console.error("Lỗi khi tải khóa học:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (courseId) fetchCourse();
  }, [courseId]);

  const toggleChapter = (id: string) => {
    setOpenChapters(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // --- Chapter handlers ---
  const openCreateChapter = () => {
    setChapterModal({ open: true, editing: null });
    setChapterTitle("");
  };
  const openEditChapter = (chapter: Chapter) => {
    setChapterModal({ open: true, editing: chapter });
    setChapterTitle(chapter.title);
  };

  const handleChapterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chapterTitle) return;
    setIsSubmitting(true);
    try {
      const editing = chapterModal.editing;
      const res = await fetch(
        editing ? `/api/admin/chapters/${editing.id}` : "/api/admin/chapters",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editing ? { title: chapterTitle } : { courseId, title: chapterTitle }),
        }
      );
      const data = await res.json();
      if (data.success) {
        await fetchCourse();
        setChapterModal({ open: false, editing: null });
      } else {
        alert(data.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteChapter = async (id: string) => {
    if (!confirm("Xóa chương này sẽ xóa luôn toàn bộ Bài học bên trong. Chắc chắn chứ?")) return;
    const res = await fetch(`/api/admin/chapters/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) fetchCourse();
    else alert(data.message);
  };

  // --- Lesson handlers ---
  const openCreateLesson = (chapterId: string) => {
    setLessonModal({ open: true, chapterId, editing: null });
    setLessonTitle("");
    setLessonVideoUrl("");
    setLessonDocUrl("");
  };
  const openEditLesson = (chapterId: string, lesson: Lesson) => {
    setLessonModal({ open: true, chapterId, editing: lesson });
    setLessonTitle(lesson.title);
    setLessonVideoUrl(lesson.videoUrl || "");
    setLessonDocUrl(lesson.documentUrl || "");
  };

  const handleLessonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonTitle) return;
    setIsSubmitting(true);
    try {
      const editing = lessonModal.editing;
      const payload = editing
        ? { title: lessonTitle, videoUrl: lessonVideoUrl, documentUrl: lessonDocUrl }
        : { chapterId: lessonModal.chapterId, title: lessonTitle, videoUrl: lessonVideoUrl, documentUrl: lessonDocUrl };

      const res = await fetch(
        editing ? `/api/admin/lessons/${editing.id}` : "/api/admin/lessons",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (data.success) {
        await fetchCourse();
        setLessonModal({ open: false, chapterId: null, editing: null });
      } else {
        alert(data.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLesson = async (id: string) => {
    if (!confirm("Xóa bài học này? Toàn bộ câu hỏi bên trong sẽ bị xóa theo.")) return;
    const res = await fetch(`/api/admin/lessons/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) fetchCourse();
    else alert(data.message);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="animate-spin text-bkhn-red" size={40} />
      </div>
    );
  }

  if (!course) {
    return <div className="text-center py-20 text-gray-500 font-medium">Không tìm thấy khóa học.</div>;
  }

  return (
    <div className="space-y-6 animate-fade-up max-w-4xl mx-auto">

      <div className="flex items-center gap-3">
        <Link href="/dashboard/courses" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">{course.title}</h1>
          <p className="text-gray-500 text-sm font-medium">Quản lý Chương và Bài học</p>
        </div>
      </div>

      <button
        onClick={openCreateChapter}
        className="bg-bkhn-red hover:bg-red-700 text-white font-bold px-5 py-3 rounded-2xl transition-all shadow-bkhn-md flex items-center gap-2 active:scale-95 text-sm"
      >
        <Plus size={18} strokeWidth={3} /> Thêm chương mới
      </button>

      <div className="space-y-3">
        {course.chapters.length === 0 && (
          <div className="text-center py-10 text-gray-500 font-medium bg-white rounded-3xl border border-dashed border-bkhn-pink">
            Chưa có chương nào. Hãy thêm chương đầu tiên!
          </div>
        )}

        {course.chapters.map(chapter => {
          const isOpen = openChapters.has(chapter.id);
          return (
            <div key={chapter.id} className="bg-white rounded-2xl border border-bkhn-pink shadow-bkhn-sm overflow-hidden">
              <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => toggleChapter(chapter.id)}>
                <div className="flex items-center gap-2 font-bold text-gray-900">
                  {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  {chapter.title}
                  <span className="text-xs font-medium text-gray-400">({chapter.lessons.length} bài học)</span>
                </div>
                <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                  <button onClick={() => openEditChapter(chapter)} className="p-2 text-gray-500 hover:text-bkhn-red hover:bg-bkhn-pale rounded-lg">
                    <Edit3 size={15} />
                  </button>
                  <button onClick={() => handleDeleteChapter(chapter.id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-bkhn-pink bg-gray-50 p-4 space-y-2">
                  {chapter.lessons.map(lesson => (
                    <div key={lesson.id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-100">
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                        {lesson.videoUrl && <Video size={14} className="text-bkhn-red" />}
                        {lesson.documentUrl && <FileText size={14} className="text-gray-400" />}
                        {lesson.title}
                      </div>
                      <div className="flex gap-1.5">
                        <Link
                          href={`/dashboard/lessons/${lesson.id}/questions`}
                          className="p-2 text-gray-500 hover:text-bkhn-red hover:bg-bkhn-pale rounded-lg"
                          title="Quản lý câu hỏi"
                        >
                          <ListChecks size={15} />
                        </Link>
                        <button onClick={() => openEditLesson(chapter.id, lesson)} className="p-2 text-gray-500 hover:text-bkhn-red hover:bg-bkhn-pale rounded-lg">
                          <Edit3 size={15} />
                        </button>
                        <button onClick={() => handleDeleteLesson(lesson.id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => openCreateLesson(chapter.id)}
                    className="w-full text-sm font-bold text-bkhn-red hover:bg-bkhn-pale py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus size={14} /> Thêm bài học
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal Chapter */}
      {chapterModal.open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] max-w-md w-full p-8 shadow-2xl border border-bkhn-pink">
            <h3 className="text-xl font-black text-gray-900 mb-4">
              {chapterModal.editing ? "Sửa Chương" : "Thêm Chương mới"}
            </h3>
            <form onSubmit={handleChapterSubmit} className="space-y-4">
              <input
                type="text"
                required
                autoFocus
                value={chapterTitle}
                onChange={e => setChapterTitle(e.target.value)}
                placeholder="VD: THÁNG 6-2026"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-bkhn-red focus:bg-white transition-all"
              />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setChapterModal({ open: false, editing: null })} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl text-sm">
                  Hủy
                </button>
                <button type="submit" disabled={isSubmitting} className="flex-1 bg-bkhn-red hover:bg-red-700 text-white font-bold py-3 rounded-xl text-sm flex justify-center">
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : "Lưu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Lesson */}
      {lessonModal.open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] max-w-md w-full p-8 shadow-2xl border border-bkhn-pink">
            <h3 className="text-xl font-black text-gray-900 mb-4">
              {lessonModal.editing ? "Sửa Bài học" : "Thêm Bài học mới"}
            </h3>
            <form onSubmit={handleLessonSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Tên bài học</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={lessonTitle}
                  onChange={e => setLessonTitle(e.target.value)}
                  placeholder="VD: Bài 1 - Hàm số bậc nhất"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-bkhn-red focus:bg-white transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Link YouTube (video bài giảng)</label>
                <input
                  type="text"
                  value={lessonVideoUrl}
                  onChange={e => setLessonVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/embed/..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-bkhn-red focus:bg-white transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Link tài liệu PDF (Google Drive)</label>
                <input
                  type="text"
                  value={lessonDocUrl}
                  onChange={e => setLessonDocUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-bkhn-red focus:bg-white transition-all"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setLessonModal({ open: false, chapterId: null, editing: null })} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl text-sm">
                  Hủy
                </button>
                <button type="submit" disabled={isSubmitting} className="flex-1 bg-bkhn-red hover:bg-red-700 text-white font-bold py-3 rounded-xl text-sm flex justify-center">
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : "Lưu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
